document.addEventListener('DOMContentLoaded', () => {
  let categories = {},
      passages = [],
      currentBook = 'book1',
      currentIndex = 0,
      wordRanges = [],
      currentSpeakingSpan = null,
      stars = 0,
      currentSpeed = 0.6,
      utter = null,
      charPos = 0,
      isPlaying = false,
     isPaused = false,
      recognition = null;
  const whooshSound = document.getElementById('whoosh-sound'),
        cheerSound = document.getElementById('cheer-sound'),
        speedBtn = document.getElementById('speed-btn'),
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
        feedbackDiv = document.getElementById('feedback'),
        readProgressBar = document.getElementById('read-progress-bar'),
         seekRange = document.getElementById('seek-range'),
        bookSelect = document.getElementById('book-select');

  // Initialize button text with default speed
  const speeds = [0.3, 0.6, 0.9, 1.2]; // Very Slow, Slow, Normal, Fast
  const labels = ['🐢', '🚶', '🏃', '🚀']; // Icon representation for speeds
  if (!speeds.includes(currentSpeed)) currentSpeed = 0.6; // Fallback
  speedBtn.textContent = labels[speeds.indexOf(currentSpeed)];
  console.log(`Initial speed set to: ${currentSpeed}, Label: ${labels[speeds.indexOf(currentSpeed)]}`); // Debug initial state

  // Load the stories JSON and default to Book 1
  fetch('passages.json')
    .then(response => {
      if (!response.ok) throw new Error('Failed to load stories');
      return response.json();
    })
    .then(data => {
      categories = data || {};
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
          passages = categories[currentBook] || [];
          document.getElementById('total-stories').textContent = passages.length;
          document.documentElement.style.setProperty('--total', passages.length);
          buildStoryMap();
          showPassage(0);
          updateNavButtons();
        });
      }
      passages = categories[currentBook] || [];
      if (!passages.length) {
        console.warn('No passages found for current book:', currentBook);
        document.getElementById('page').textContent = 'No stories available.';
        return;
      }
      document.getElementById('total-stories').textContent = passages.length;
      document.documentElement.style.setProperty('--total', passages.length);
      buildStoryMap();
      const saved = localStorage.getItem('progress');
      if (saved) {
        const { story, char } = JSON.parse(saved);
        if (story >= 0 && story < passages.length) {
          showPassage(story);
          charPos = char || 0;
          const textLength = passages[story]?.text?.length || 1; // Prevent division by zero
          updateReadProgress(charPos / textLength);
        } else {
          showPassage(0);
        }
      } else {
        showPassage(0);
      }
      updateNavButtons();
    })
    .catch(err => {
      console.error(err);
      document.getElementById('page').textContent = 'Oops! Unable to load stories.';
    });

  // Render a passage by index
  function showPassage(i, container = document.getElementById('page')) {
    currentIndex = i;
    const p = passages[i];
    if (!p) {
      console.error('Invalid passage index:', i);
      return;
    }
    const pg = container;

    // Reset wordRanges for the new passage
    wordRanges = [];

     const imgPath = p.image ? `images/${p.image}` : '';
    const imgTag = imgPath ? `<img id="passage-image" src="${imgPath}" alt="${p.title.replace(/<[^>]+>/g, '')}" onerror="this.style.display='none';">` : '';
    const formattedText = formatText(p.text);
    pg.innerHTML = `
      <h1 id="passage-title">${p.title}</h1>
      <p id="passage-info">Story <span>${i + 1}</span> / ${passages.length}</p>
      <div id="passage-text">${formattedText}</div>
      ${imgTag}
    `;

    const textDiv = pg.querySelector('#passage-text');
    if (textDiv) {
      wrapWords(textDiv);
      buildRanges(textDiv);
    }

    document.getElementById('current-story').textContent = i + 1;
    document.documentElement.style.setProperty('--current', i + 1);
    updateNavButtons();
    updateControlButtons();
    updateReadProgress(0);
    charPos = 0;
  }

  // Wrap each word in a <span class="word">
  function wrapWords(container) {
    Array.from(container.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split(/(\s+)/),
              frag = document.createDocumentFragment();
        parts.forEach(tok => {
          if (/^\s+$/.test(tok)) {
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

  // Build character-index ranges for speech syncing
  function buildRanges(div) {
    let cumulative = 0;
    wordRanges = [];
    Array.from(div.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        cumulative += node.textContent.length;
      return;
      }
   
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.classList.contains('word')) {
          const len = node.textContent.length;
          wordRanges.push({ span: node, start: cumulative, end: cumulative + len - 1 });
          cumulative += len;
        } else {
          Array.from(node.childNodes).forEach(traverse);
        }
      }
    }

    traverse(div);
  }

  // Format raw story text into paragraphs
  function formatText(text) {
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

  // Enable/disable navigation and control buttons
  function updateNavButtons() {
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    document.getElementById('next-btn').disabled = currentIndex === passages.length - 1;
    document.getElementById('star-btn').disabled = currentIndex === 0 || stars >= passages.length;
  }

  function updateControlButtons() {
    playBtn.disabled = isPlaying || isPaused;
    pauseBtn.disabled = !isPlaying;
    resumeBtn.disabled = !isPaused;
    stopBtn.disabled = !(isPlaying || isPaused);
    resumeBtn.style.display = isPaused ? 'inline-block' : 'none';
  }

  function updateReadProgress(progress) {
    if (readProgressBar) {
      readProgressBar.style.setProperty('--progress', isNaN(progress) ? 0 : progress);
      readProgressBar.style.width = (isNaN(progress) ? 0 : progress * 100) + '%';
    }
    if (seekRange) {
      seekRange.value = isNaN(progress) ? 0 : progress * 100;
    }
  }

  function buildStoryMap() {
    if (!storyGrid) return;
    storyGrid.innerHTML = '';
    passages.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'story-card';
     const imgPath = p.image ? `images/${p.image}` : '';
      card.innerHTML = `<img src="${imgPath}" alt="${p.title}"><div class="story-title">${p.title}</div>`;
      card.addEventListener('click', () => {
        storyMap.classList.add('hidden');
        flipTo(idx, idx > currentIndex ? 'next' : 'prev');
      });
      storyGrid.appendChild(card);
    });
  }

  // Flip pages with animation
  function flipTo(idx, dir) {
    if (idx < 0 || idx >= passages.length) return;
    stopNarration();
    whooshSound.play();

    const oldPg = document.getElementById('page');
    oldPg.innerHTML = '<div class="loader"></div>';

    setTimeout(() => {
      const newPg = oldPg.cloneNode(false);
      newPg.id = 'page';
      newPg.classList.add(dir === 'next' ? 'slide-right' : 'slide-left');
      showPassage(idx, newPg);
      document.getElementById('book').appendChild(newPg);

      requestAnimationFrame(() => {
        oldPg.classList.add(dir === 'next' ? 'slide-left' : 'slide-right');
        newPg.classList.remove(dir === 'next' ? 'slide-right' : 'slide-left');
      });

      setTimeout(() => oldPg.remove(), 500);
    }, 300);
  }

  // Earn a star
  document.getElementById('star-btn').addEventListener('click', () => {
    if (currentIndex > 0 && stars < passages.length) {
      stars++;
      document.getElementById('star-count').textContent = stars;
      cheerSound.play();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      updateNavButtons();
    }
  });

  // Adjust reading speed
  function adjustSpeed() {
    const idx = speeds.indexOf(currentSpeed);
    if (idx === -1) {
      console.error('Current speed not found in speeds array:', currentSpeed);
      currentSpeed = 0.6; // Fallback to default
    }
    const nextIndex = (idx + 1) % speeds.length;
    currentSpeed = speeds[nextIndex];
    const label = labels[nextIndex] || '';
    speedBtn.textContent = label;
    console.log(`Speed adjusted to: ${currentSpeed}, Label: ${label}`); // Enhanced debug
  }

  function startNarration(start = 0) {
    stopNarration(false);

    const text = document.getElementById('passage-text')?.textContent || '';
    const speakText = text.slice(start);
    if (!speakText) return;
    utter = new SpeechSynthesisUtterance(speakText);
    utter.rate = currentSpeed;

    utter.onboundary = event => {
      if (event.name === 'word') {
        const globalIndex = start + event.charIndex;
        charPos = globalIndex;
        if (currentSpeakingSpan) currentSpeakingSpan.classList.remove('speaking');
        const range = wordRanges.find(r => globalIndex >= r.start && globalIndex <= r.end);
        if (range) {
          range.span.classList.add('speaking');
          currentSpeakingSpan = range.span;
        }
        const textLength = text.length || 1; // Prevent division by zero
        updateReadProgress(globalIndex / textLength);
        localStorage.setItem('progress', JSON.stringify({ story: currentIndex, char: charPos }));
      }
    };

    utter.onend = () => {
      if (currentSpeakingSpan) {
        currentSpeakingSpan.classList.remove('speaking');
        currentSpeakingSpan = null;
      }
      isPlaying = false;
      isPaused = false;
      charPos = 0;
      updateControlButtons();
      updateReadProgress(1);
      localStorage.removeItem('progress');
      playBtn.classList.remove('playing');
      pauseBtn.classList.remove('paused');
      resumeBtn.classList.remove('resume-highlight');
    };

    speechSynthesis.speak(utter);
    isPlaying = true;
    isPaused = false;
    playBtn.classList.add('playing');
    pauseBtn.classList.remove('paused');
    resumeBtn.classList.remove('resume-highlight');
    updateControlButtons();
  }

  function pauseNarration() {
    if (!isPlaying) return;
    speechSynthesis.pause();
    isPaused = true;
    isPlaying = false;
    playBtn.classList.remove('playing');
    pauseBtn.classList.add('paused');
    resumeBtn.classList.add('resume-highlight');
    updateControlButtons();
  }

  function resumeNarration() {
    if (!isPaused) return;
    speechSynthesis.resume();
    isPaused = false;
    isPlaying = true;
    playBtn.classList.add('playing');
    pauseBtn.classList.remove('paused');
    resumeBtn.classList.remove('resume-highlight');
    updateControlButtons();
  }

  function stopNarration(clearSaved = true) {
    speechSynthesis.cancel();
    if (currentSpeakingSpan) {
      currentSpeakingSpan.classList.remove('speaking');
      currentSpeakingSpan = null;
    }
    document.querySelectorAll('#passage-text .speaking').forEach(span => span.classList.remove('speaking'));
    isPlaying = false;
    isPaused = false;
    playBtn.classList.remove('playing');
    pauseBtn.classList.remove('paused');
    resumeBtn.classList.remove('resume-highlight');
    utter = null;
    if (clearSaved) {
      charPos = 0;
      localStorage.removeItem('progress');
      updateReadProgress(0);
        if (seekRange) seekRange.value = 0;
    }
    updateControlButtons();
  }
// Voice capture setup
  function initVoiceCapture() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported');
      return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join(' ');
      const storyText = passages[currentIndex]?.text || '';
      highlightReading(transcript, storyText);
      if (feedbackDiv) feedbackDiv.textContent = transcript;
    };
    recognition.onstart = () => {
      if (micBtn) micBtn.disabled = true;
      if (micStopBtn) micStopBtn.disabled = false;
    };
    recognition.onend = () => {
      if (micBtn) micBtn.disabled = false;
      if (micStopBtn) micStopBtn.disabled = true;
    };
  }

  function startVoiceCapture() {
    if (!recognition) initVoiceCapture();
    recognition && recognition.start();
  }

  function stopVoiceCapture() {
    recognition && recognition.stop();
  }

  function highlightReading(transcript, storyText) {
    const expected = storyText.split(/\s+/);
    const spoken = transcript.trim().split(/\s+/);
    let correct = 0;
    expected.forEach((word, i) => {
      const span = document.querySelector(`#passage-text .word:nth-child(${i + 1})`);
      if (!span) return;
      span.classList.remove('correct', 'incorrect');
      if (spoken[i]) {
        if (spoken[i].toLowerCase() === word.toLowerCase()) {
          span.classList.add('correct');
          correct++;
        } else {
          span.classList.add('incorrect');
        }
      }
    });
    updateReadProgress(correct / expected.length);
  }

  // Speed button with enhanced touch support
  speedBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Click event fired');
    adjustSpeed();
  });
  speedBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    console.log('Touchstart event fired');
    adjustSpeed();
    e.stopPropagation();
  }, { passive: false });
  speedBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    console.log('Touchend event fired');
    adjustSpeed();
  }, { passive: false });

  // Prev/Next buttons
  document.getElementById('prev-btn')?.addEventListener('click', () => flipTo(currentIndex - 1, 'prev'));
  document.getElementById('next-btn')?.addEventListener('click', () => flipTo(currentIndex + 1, 'next'));

  // Set up Web Speech API reading with word highlighting
  function readAloud() {
    // Stop any ongoing speech before starting a new utterance
    window.speechSynthesis.cancel();

    const container = document.getElementById('passage-text');
    if (!container) return;

    const text = container.textContent;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8; // steady pace for kids

    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        // remove highlight from previously spoken word
        if (currentSpeakingSpan) currentSpeakingSpan.classList.remove('speaking');

        // find the span that contains the char index of this boundary
        const range = wordRanges.find(r => e.charIndex >= r.start && e.charIndex <= r.end);
        if (range) {
          range.span.classList.add('speaking');
          currentSpeakingSpan = range.span;
        }
      }
    };

    utterance.onend = () => {
      // clean up any leftover highlight when the utterance finishes
      if (currentSpeakingSpan) {
        currentSpeakingSpan.classList.remove('speaking');
        currentSpeakingSpan = null;
      }
    };

    window.speechSynthesis.speak(utterance);
  }

playBtn?.addEventListener('click', () => startNarration(charPos));
  pauseBtn?.addEventListener('click', pauseNarration);
  resumeBtn?.addEventListener('click', resumeNarration);
  stopBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to stop?')) stopNarration();
  });
micBtn?.addEventListener('click', startVoiceCapture);
  micStopBtn?.addEventListener('click', stopVoiceCapture);
  if (seekRange) {
    seekRange.value = 0; // Initialize seek range
    seekRange.addEventListener('change', (e) => {
      const pos = Math.floor((e.target.value / 100) * (passages[currentIndex]?.text?.length || 1));
      charPos = pos;
      if (isPlaying || isPaused) {
        startNarration(charPos);
      } else {
        updateReadProgress(charPos / (passages[currentIndex]?.text?.length || 1));
      }
    });
  }

  mapBtn?.addEventListener('click', () => {
    stopNarration(false);
    storyMap.classList.remove('hidden');
  });
  closeMapBtn?.addEventListener('click', () => storyMap.classList.add('hidden'));

  window.addEventListener('beforeunload', () => {
    if (isPlaying || isPaused) {
      localStorage.setItem('progress', JSON.stringify({ story: currentIndex, char: charPos }));
    }
    stopNarration(false);
    stopVoiceCapture();
  });
});
