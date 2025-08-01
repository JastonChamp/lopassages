document.addEventListener('DOMContentLoaded', () => {
  const VERSION = '1.0'; // For caching
  let categories = {},
      passages = [],
      currentBook = 'book1',
      currentIndex = 0,
      wordRanges = [],
      stars = 0,
      currentSpeed = 0.6,
      charPos = 0,
      isPlaying = false,
      isPaused = false,
      recognition = null,
      accuracyScore = 0,
      currentWordIndex = 0,
      micPermissionGranted = false;
  const speedBtn = document.getElementById('speed-btn'),
        playBtn = document.getElementById('play-btn'),
        pauseBtn = document.getElementById('pause-btn'),
        resumeBtn = document.getElementById('resume-btn'),
        stopBtn = document.getElementById('stop-btn'),
        mapBtn = document.getElementById('map-btn'),
        closeMapBtn = document.getElementById('close-map'),
        storyMap = document.getElementById('story-map'),
        storyGrid = document.getElementById('story-grid'),
        micBtn = document.getElementById('mic-btn'),
        micStopBtn = document.getElementById('mic-stop-btn'),
        voiceSelect = document.getElementById('voice-select'),
        feedbackDiv = document.getElementById('feedback'),
        readProgressBar = document.getElementById('read-progress-bar'),
        seekRange = document.getElementById('seek-range'),
        bookSelect = document.getElementById('book-select'),
        darkModeBtn = document.getElementById('dark-mode-btn'),
        fullscreenBtn = document.getElementById('fullscreen-btn'),
        starCount = document.getElementById('star-count'),
        starIcons = document.getElementById('star-icons'),
        topBtn = document.getElementById('top-btn');
   // Speeds and labels
  const speeds = [0.3, 0.6, 0.9, 1.2];
  const labels = ['🐢', '🚶', '🏃', '🚀'];
  speedBtn && (speedBtn.textContent = labels[speeds.indexOf(currentSpeed)]);
  // Voice selection
  let availableVoices = [];
  function populateVoices() {
    availableVoices = speechSynthesis.getVoices();
    if (!voiceSelect) return;
    voiceSelect.innerHTML = '';
    availableVoices.forEach((v, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = v.name;
      voiceSelect.appendChild(opt);
    });
    const saved = localStorage.getItem('voiceIndex');
    if (saved && voiceSelect.options[saved]) voiceSelect.value = saved;
  }
  populateVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = populateVoices;
  voiceSelect?.addEventListener('change', () => localStorage.setItem('voiceIndex', voiceSelect.value));
  // Placeholder story
  const placeholderStory = {
    title: "Coming Soon!",
    text: "More adventures are on the way! Check back later. 🎉",
    image: "placeholder.png"
  };
  // Enhanced loadData with full timeout via Promise.race
  async function loadData() {
    const cached = localStorage.getItem('passages');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.version === VERSION) {
        return parsed.data;
      }
    }
    const controller = new AbortController();
    const fetchPromise = fetch('passages.json', { cache: 'no-store', signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        localStorage.setItem('passages', JSON.stringify({ version: VERSION, data }));
        return data;
      });
    return Promise.race([
      fetchPromise,
      new Promise((_, reject) => setTimeout(() => {
        controller.abort();
        reject(new Error('Load timeout after 10s'));
      }, 10000))
    ]);
  }
  // Load with error handling (no overlay)
  loadData().then(data => {
    categories = data || {};
    Object.keys(categories).forEach(key => {
      if (!categories[key]?.length) categories[key] = [placeholderStory];
    });
    if (bookSelect) {
      bookSelect.innerHTML = '';
      Object.keys(categories).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = key.replace('book', 'Book ');
        bookSelect.appendChild(opt);
      });
      bookSelect.value = currentBook;
      bookSelect.addEventListener('change', () => {
        currentBook = bookSelect.value;
        loadBook();
      });
    }
    loadBook();
  }).catch(err => {
    console.error('Load error:', err);
    let msg = 'Error loading stories. Using cached or placeholder data.';
    if (err.message === 'Load timeout after 10s' || err.name === 'AbortError') {
      msg = 'Loading timed out. Check your connection and refresh.';
    } else if (err.message.startsWith('HTTP error')) {
      msg = 'Server error loading stories.';
    } else if (err.message === 'Failed to fetch') {
      msg = 'Network error. Are you offline?';
    }
    feedbackDiv.textContent = msg;
    // Fallback to any cached data (even outdated) or placeholder
    const cached = localStorage.getItem('passages');
    if (cached) {
      const parsed = JSON.parse(cached);
      categories = parsed.data;
    } else {
      categories = { book1: [placeholderStory] };
    }
    if (bookSelect) {
      bookSelect.innerHTML = '';
      Object.keys(categories).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = key.replace('book', 'Book ');
        bookSelect.appendChild(opt);
      });
      bookSelect.value = currentBook;
      bookSelect.addEventListener('change', () => {
        currentBook = bookSelect.value;
        loadBook();
      });
    }
    loadBook();
  });
  function loadBook() {
    passages = categories[currentBook] || [];
    if (document.getElementById('total-stories')) document.getElementById('total-stories').textContent = passages.length;
    document.documentElement.style.setProperty('--total', passages.length);
    buildStoryMap();
    showPassage(0);
    updateNavButtons();
  }
  // Dark mode
  darkModeBtn?.addEventListener('click', () => document.body.classList.toggle('dark-mode'));
  // Full-screen
  fullscreenBtn?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error('Fullscreen error:', err));
    } else {
      document.exitFullscreen();
    }
  });
  // Button feedback
  document.querySelectorAll('button').forEach(btn => {
    btn?.addEventListener('click', () => {
      btn.style.transform = 'scale(1.1)';
      setTimeout(() => btn.style.transform = 'scale(1)', 200);
    });
  });
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && !document.getElementById('prev-btn')?.disabled) flipTo(currentIndex - 1, 'prev');
    if (e.key === 'ArrowRight' && !document.getElementById('next-btn')?.disabled) flipTo(currentIndex + 1, 'next');
    if (e.key === 'Enter' && document.activeElement?.classList.contains('story-card')) document.activeElement.click();
  });
  // Unlock logic
  function isBookUnlocked(book) {
    if (book === 'book1') return true;
    if (book === 'book2' && stars >= 5) return true;
    return false;
  }
  bookSelect?.addEventListener('change', () => {
    if (!isBookUnlocked(currentBook)) {
      alert('Complete more stories in previous books to unlock!');
      bookSelect.value = 'book1';
      currentBook = 'book1';
    }
    loadBook();
  });
  // Show passage
  function showPassage(i, container = document.getElementById('page')) {
    currentIndex = i;
    const p = passages[i];
    if (!p || !container) return;
    wordRanges = [];
    const imgPath = p.image ? `images/${p.image}` : 'https://via.placeholder.com/120x80.png?text=No+Image';
    const altText = p.image ? `Illustration for ${p.title.replace(/<[^>]+>/g, '')}` : 'Placeholder image';
    const imgTag = `<img id="passage-image" loading="lazy" src="${imgPath}" alt="${altText}">`;
    const formattedText = formatText(p.text);
    container.innerHTML = `
      <h1 id="passage-title">${p.title}</h1>
      <p id="passage-info">Story <span>${i + 1}</span> / ${passages.length}</p>
      <div id="passage-text" role="region" aria-live="polite">${formattedText}</div>
      ${imgTag}
    `;
    const textDiv = container.querySelector('#passage-text');
    if (textDiv) {
      wrapWords(textDiv);
      buildRanges(textDiv);
    }
    if (document.getElementById('current-story')) document.getElementById('current-story').textContent = i + 1;
    document.documentElement.style.setProperty('--current', i + 1);
    updateNavButtons();
    updateControlButtons();
    updateReadProgress(0);
    charPos = 0;
    // Preload next/prev images
    if (i > 0) new Image().src = `images/${passages[i-1].image}`;
    if (i < passages.length - 1) new Image().src = `images/${passages[i+1].image}`;
  }
  // Clean text for TTS
  function cleanForTTS(text) {
    return text.replace(/\./g, ' ')
               .replace(/([.!?])/g, '$1 ')
               .replace(/\s+/g, ' ')
               .trim();
  }
  // Wrap words, separate punctuation
  function wrapWords(container) {
    if (!container) return;
    Array.from(container.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split(/(\s+|[.,!?;:"'()])/);
        const frag = document.createDocumentFragment();
        parts.forEach(tok => {
          if (/^\s+$/.test(tok) || /[.,!?;:"'()]/.test(tok)) {
            frag.append(tok);
          } else {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = tok;
            frag.append(span);
          }
        });
        container.replaceChild(frag, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        wrapWords(node);
      }
    });
  }
  // Build ranges
  function traverse(node, cumulative) {
    if (node.nodeType === Node.TEXT_NODE) return cumulative + node.textContent.length;
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList.contains('word')) {
        const len = node.textContent.length;
        wordRanges.push({ span: node, start: cumulative, end: cumulative + len - 1 });
        cumulative += len;
      } else {
        Array.from(node.childNodes).forEach(child => {
          cumulative = traverse(child, cumulative);
        });
      }
    }
    return cumulative;
  }
  function buildRanges(div) {
    wordRanges = [];
    if (div) traverse(div, 0);
  }
  // Format text
  function formatText(text) {
    if (!text) return '';
    const sentences = text.split(/(?<=[.!?])\s+/);
    const paragraphs = [];
    let buf = [];
    sentences.forEach((s, idx) => {
      buf.push(s);
      if (buf.length === 2 || idx === sentences.length - 1) {
        paragraphs.push(buf.join(' '));
        buf = [];
      }
    });
    return paragraphs.map(p => `<p>${p}</p>`).join('');
  }
  // Nav buttons
  function updateNavButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const starBtn = document.getElementById('star-btn');
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === passages.length - 1;
    if (starBtn) starBtn.disabled = currentIndex === 0 || stars >= passages.length;
  }
  function updateControlButtons() {
    if (playBtn) playBtn.disabled = isPlaying || isPaused;
    if (pauseBtn) pauseBtn.disabled = !isPlaying;
    if (resumeBtn) resumeBtn.disabled = !isPaused;
    if (stopBtn) stopBtn.disabled = !(isPlaying || isPaused);
    if (resumeBtn) resumeBtn.style.display = isPaused ? 'inline-block' : 'none';
  }
  function updateReadProgress(progress) {
    const safeProgress = isNaN(progress) ? 0 : Math.min(1, Math.max(0, progress));
    if (readProgressBar) readProgressBar.style.width = (safeProgress * 100) + '%';
    if (seekRange) seekRange.value = safeProgress * 100;
  }
  // Story map
  function buildStoryMap() {
    if (!storyGrid) return;
    storyGrid.innerHTML = '';
    passages.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'story-card';
      card.tabIndex = 0; // Keyboard focus
      card.role = 'listitem';
      if (idx > stars) card.classList.add('locked');
      const imgPath = p.image ? `images/${p.image}` : 'https://via.placeholder.com/120x80.png?text=No+Image';
      card.innerHTML = `<img loading="lazy" src="${imgPath}" alt="${p.title} illustration"><div class="story-title">${p.title}</div>`;
      card.addEventListener('click', () => {
        if (idx <= stars) {
          storyMap.classList.add('hidden');
          flipTo(idx, idx > currentIndex ? 'next' : 'prev');
        } else {
          alert('Earn more stars to unlock!');
        }
      });
      storyGrid.appendChild(card);
    });
  }
  // Flip to
  function flipTo(idx, dir) {
    if (idx < 0 || idx >= passages.length) return;
    narrator.stop(true);
    const oldPg = document.getElementById('page');
    if (!oldPg) return;
    oldPg.innerHTML = '<div class="loader"></div>';
    setTimeout(() => {
      const newPg = oldPg.cloneNode(false);
      newPg.id = 'page';
      newPg.classList.add(dir === 'next' ? 'slide-right' : 'slide-left');
      showPassage(idx, newPg);
      if (document.getElementById('book')) document.getElementById('book').appendChild(newPg);
      requestAnimationFrame(() => {
        oldPg.classList.add(dir === 'next' ? 'slide-left' : 'slide-right');
        newPg.classList.remove(dir === 'next' ? 'slide-right' : 'slide-left');
      });
      setTimeout(() => oldPg.remove(), 500);
    }, 300);
  }
  // Star earning
  document.getElementById('star-btn')?.addEventListener('click', () => {
    if (currentIndex > 0 && stars < passages.length) {
      stars++;
      updateStars();
      updateNavButtons();
      buildStoryMap();
    }
  });
  function updateStars() {
    if (starCount) starCount.textContent = stars;
    if (starIcons) {
      starIcons.innerHTML = '';
      for (let i = 0; i < passages.length; i++) {
        const star = document.createElement('span');
        star.textContent = i < stars ? '⭐' : '☆';
        starIcons.appendChild(star);
      }
    }
  }
  // Speed adjust
  function adjustSpeed() {
    const idx = (speeds.indexOf(currentSpeed) + 1) % speeds.length;
    currentSpeed = speeds[idx];
    if (speedBtn) speedBtn.textContent = labels[idx];
  }
  // Narrator class
  class Narrator {
    constructor() {
      this.utter = null;
      this.currentSpeakingSpan = null;
    }
    start(start = 0) {
      this.stop(false);
      const textElem = document.getElementById('passage-text');
      if (!textElem) {
        feedbackDiv.textContent = 'Text element not found. Please reload.';
        return;
      }
      let text = textElem.textContent || '';
      const speakText = cleanForTTS(text.slice(start));
      if (!speakText) return;
      this.utter = new SpeechSynthesisUtterance(speakText);
      this.utter.rate = currentSpeed;
      if (voiceSelect && availableVoices.length) {
        const voice = availableVoices[voiceSelect.value];
        if (voice) this.utter.voice = voice;
      }
      this.utter.onboundary = (event) => {
        if (event.name === 'word') {
          const globalIndex = start + event.charIndex;
          charPos = globalIndex;
          if (this.currentSpeakingSpan) this.currentSpeakingSpan.classList.remove('speaking');
          const range = wordRanges.find(r => globalIndex >= r.start && globalIndex <= r.end);
          if (range) {
            range.span.classList.add('speaking');
            this.currentSpeakingSpan = range.span;
          }
          updateReadProgress(globalIndex / (text.length || 1));
          localStorage.setItem('progress', JSON.stringify({ story: currentIndex, char: charPos }));
        }
      };
      this.utter.onend = () => this.reset();
      this.utter.onerror = (e) => {
        console.error('Speech error:', e);
        feedbackDiv.textContent = 'Narration error. Try a different voice or refresh.';
        this.reset();
      };
      try {
        speechSynthesis.speak(this.utter);
        isPlaying = true;
        isPaused = false;
        updateControlButtons();
      } catch (e) {
        console.error('SpeechSynthesis error:', e);
        feedbackDiv.textContent = 'Speech synthesis failed. Check browser settings.';
      }
    }
    pause() {
      if (!isPlaying) return;
      speechSynthesis.pause();
      isPaused = true;
      isPlaying = false;
      updateControlButtons();
    }
    resume() {
      if (!isPaused) return;
      speechSynthesis.resume();
      isPaused = false;
      isPlaying = true;
      updateControlButtons();
    }
    stop(clearSaved = true) {
      speechSynthesis.cancel();
      if (this.currentSpeakingSpan) this.currentSpeakingSpan.classList.remove('speaking');
      document.querySelectorAll('#passage-text .speaking').forEach(span => span.classList.remove('speaking'));
      this.currentSpeakingSpan = null;
      this.utter = null;
      isPlaying = false;
      isPaused = false;
      if (clearSaved) {
        charPos = 0;
        localStorage.removeItem('progress');
        updateReadProgress(0);
        if (seekRange) seekRange.value = 0;
      }
      updateControlButtons();
    }
    reset() {
      this.currentSpeakingSpan = null;
      isPlaying = false;
      isPaused = false;
      charPos = 0;
      updateControlButtons();
      updateReadProgress(1);
      localStorage.removeItem('progress');
    }
  }
  const narrator = new Narrator();
  // Voice capture setup with improvements
  function initVoiceCapture() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported');
      feedbackDiv.textContent = 'Speech recognition not supported in this browser. Try Chrome.';
      return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // Tune to 'en-GB' or 'en-AU' if needed for better accent match
    recognition.continuous = true; // Improved: Continuous for longer reading
    recognition.interimResults = true; // Improved: Real-time feedback
    recognition.maxAlternatives = 3; // Improved: Multiple guesses for better matching
    // Improved: Grammar from story words for accuracy
    const storyText = passages[currentIndex]?.text || '';
    const words = [...new Set(storyText.toLowerCase().split(/\s+/).filter(w => w.length > 1))]; // Unique words >1 char
    const grammar = `#JSGF V1.0; grammar story; public <word> = ${words.join(' | ')};`;
    if (SpeechGrammarList) {
      const speechRecognitionList = new SpeechGrammarList();
      speechRecognitionList.addFromString(grammar, 1);
      recognition.grammars = speechRecognitionList;
    }
    recognition.onresult = (event) => {
      const results = Array.from(event.results);
      let transcript = '';
      results.forEach(result => {
        // Improved: Pick best alternative by checking against story text
        let bestAlt = result[0].transcript;
        for (let alt of result) {
          if (storyText.toLowerCase().includes(alt.transcript.toLowerCase())) {
            bestAlt = alt.transcript;
            break;
          }
        }
        transcript += bestAlt + ' ';
      });
      const trimmedTranscript = transcript.trim();
      const storyTextCurrent = passages[currentIndex]?.text || '';
      highlightReading(trimmedTranscript, storyTextCurrent);
    };
    recognition.onstart = () => {
      micBtn.disabled = true;
      micStopBtn.disabled = false;
      feedbackDiv.textContent = 'Listening... Speak clearly and slowly in a quiet room.';
      highlightNextWord(0); // Start highlighting the first word
    };
    recognition.onend = () => {
      micBtn.disabled = false;
      micStopBtn.disabled = true;
    };
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      feedbackDiv.textContent = 'Error: ' + event.error + '. Try again - speak louder or check mic permissions.';
    };
    recognition.onnomatch = () => {
      feedbackDiv.textContent = 'No match found. Try speaking slower or more clearly.';
    };
  }
  function highlightNextWord(index) {
    document.querySelectorAll('#passage-text .next-word').forEach(span => span.classList.remove('next-word'));
    const span = document.querySelector(`#passage-text .word:nth-child(${index + 1})`);
    if (span) span.classList.add('next-word');
  }
  function similarity(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    if (s1.length !== s2.length) return 0;
    let matches = 0;
    for (let i = 0; i < s1.length; i++) if (s1[i] === s2[i]) matches++;
    return (matches / s1.length) * 100;
  }
  function highlightReading(transcript, storyText) {
    const expected = storyText.split(/\s+/);
    const spoken = transcript.trim().split(/\s+/);
    let correct = 0;
    let nextIndex = expected.length;
    expected.forEach((word, i) => {
      const span = document.querySelector(`#passage-text .word:nth-child(${i + 1})`);
      if (!span) return;
      span.classList.remove('correct', 'incorrect');
      if (spoken[i]) {
        if (spoken[i].toLowerCase() === word.toLowerCase() || similarity(spoken[i], word) > 80) {
          span.classList.add('correct');
          correct++;
          currentWordIndex = i + 1;
        } else {
          span.classList.add('incorrect');
          nextIndex = Math.min(nextIndex, i);
        }
      } else {
        nextIndex = Math.min(nextIndex, i);
      }
    });
    accuracyScore = (correct / expected.length) * 100;
    feedbackDiv.textContent = `${transcript} | Score: ${accuracyScore.toFixed(0)}%`;
    updateReadProgress(correct / expected.length);
    highlightNextWord(nextIndex);
  }
  function startVoiceCapture() {
    if (!micPermissionGranted) {
      micPermissionGranted = confirm('Allow microphone access to practice reading aloud?');
      if (!micPermissionGranted) return;
    }
    if (!recognition) initVoiceCapture();
    try {
      recognition?.start();
    } catch (err) {
      console.error('Unable to start voice capture:', err);
    }
  }
  function stopVoiceCapture() {
    try {
      recognition?.stop();
    } catch (err) {
      console.error('Unable to stop voice capture:', err);
    }
    feedbackDiv.textContent = '';
    document.querySelectorAll('#passage-text .next-word').forEach(span => span.classList.remove('next-word'));
  }
  // Event listeners with null checks
  speedBtn?.addEventListener('click', adjustSpeed);
  document.getElementById('prev-btn')?.addEventListener('click', () => flipTo(currentIndex - 1, 'prev'));
  document.getElementById('next-btn')?.addEventListener('click', () => flipTo(currentIndex + 1, 'next'));
  playBtn?.addEventListener('click', () => narrator.start(charPos));
  pauseBtn?.addEventListener('click', () => narrator.pause());
  resumeBtn?.addEventListener('click', () => narrator.resume());
  stopBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to stop?')) narrator.stop();
  });
  micBtn?.addEventListener('click', startVoiceCapture);
  micStopBtn?.addEventListener('click', stopVoiceCapture);
  seekRange?.addEventListener('input', (e) => {
    const pos = Math.floor((e.target.value / 100) * (passages[currentIndex]?.text?.length || 1));
    charPos = pos;
    if (isPlaying || isPaused) narrator.start(charPos);
    else updateReadProgress(pos / (passages[currentIndex]?.text?.length || 1));
  });
  mapBtn?.addEventListener('click', () => {
    narrator.stop(false);
    storyMap.classList.remove('hidden');
  });
  closeMapBtn?.addEventListener('click', () => storyMap.classList.add('hidden'));
  topBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => {
    if (window.scrollY > 200) topBtn.classList.add('show');
    else topBtn.classList.remove('show');
  });
  window.addEventListener('beforeunload', () => {
    if (isPlaying || isPaused) localStorage.setItem('progress', JSON.stringify({ story: currentIndex, char: charPos }));
    narrator.stop(false);
    stopVoiceCapture();
  });
  if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.error('SW error:', err));
  }
});
