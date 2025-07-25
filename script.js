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
      recognition = null,
      accuracyScore = 0,
      currentWordIndex = 0;
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
        bookSelect = document.getElementById('book-select'),
        darkModeBtn = document.getElementById('dark-mode-btn'),
        fullscreenBtn = document.getElementById('fullscreen-btn'),
        starCount = document.getElementById('star-count');

  // Speeds and labels
  const speeds = [0.3, 0.6, 0.9, 1.2];
  const labels = ['🐢', '🚶', '🏃', '🚀'];
  speedBtn.textContent = labels[speeds.indexOf(currentSpeed)];

  // Placeholder story for empty books
  const placeholderStory = {
    title: "Coming Soon!",
    text: "More adventures are on the way! Check back later. 🎉",
    image: "placeholder.png"
  };

  // Load stories JSON
  fetch('passages.json')
    .then(response => response.json())
    .then(data => {
      categories = data;
      Object.keys(categories).forEach(key => {
        if (categories[key].length === 0) {
          categories[key] = [placeholderStory];
        }
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
    })
    .catch(err => {
      console.error(err);
      document.getElementById('page').textContent = 'Oops! Unable to load stories.';
    });

  function loadBook() {
    passages = categories[currentBook] || [];
    document.getElementById('total-stories').textContent = passages.length;
    document.documentElement.style.setProperty('--total', passages.length);
    buildStoryMap();
    showPassage(0);
    updateNavButtons();
  }

  // Dark mode toggle
  darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });

  // Full-screen toggle
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  });

  // Button feedback
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.style.transform = 'scale(1.1)';
      setTimeout(() => btn.style.transform = 'scale(1)', 200);
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && !document.getElementById('prev-btn').disabled) flipTo(currentIndex - 1, 'prev');
    if (e.key === 'ArrowRight' && !document.getElementById('next-btn').disabled) flipTo(currentIndex + 1, 'next');
  });

  // Unlock logic (example: book2 after 5 stars)
  function isBookUnlocked(book) {
    if (book === 'book1') return true;
    if (book === 'book2' && stars >= 5) return true;
    return false; // Add more as needed
  }

  // Update book select to disable locked
  bookSelect.addEventListener('change', () => {
    if (!isBookUnlocked(currentBook)) {
      alert('Complete more stories in previous books to unlock!');
      bookSelect.value = 'book1';
      currentBook = 'book1';
    }
    loadBook();
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
    const imgTag = imgPath ? `<img id="passage-image" src="${imgPath}" alt="${p.title.replace(/<[^>]+>/g, '')}">` : '';
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
        const parts = node.textContent.split(/(\s+/),
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

  // Traverse function for building ranges
  function traverse(node, cumulative) {
    if (node.nodeType === Node.TEXT_NODE) {
      cumulative += node.textContent.length;
      return cumulative;
    }
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
          Array.from(node.childNodes).forEach(child => {
            cumulative = traverse(child, cumulative);
          });
        }
      }
    });
    cumulative = traverse(div, cumulative);
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
      if (idx > stars) card.classList.add('locked');
      const imgPath = p.image ? `images/${p.image}` : '';
      card.innerHTML = `<img loading="lazy" src="${imgPath}" alt="${p.title}"><div class="story-title">${p.title}</div>`;
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
      updateStars();
      cheerSound.play();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      updateNavButtons();
      buildStoryMap(); // Rebuild to unlock
    }
  });

  // Update star icons
  function updateStars() {
    starIcons.innerHTML = '';
    for (let i = 0; i < passages.length; i++) {
      const star = document.createElement('span');
      star.textContent = i < stars ? '⭐' : '☆';
      starIcons.appendChild(star);
    }
  }

  // Adjust reading speed
  function adjustSpeed() {
    const idx = speeds.indexOf(currentSpeed);
    const nextIndex = (idx + 1) % speeds.length;
    currentSpeed = speeds[nextIndex];
    speedBtn.textContent = labels[nextIndex];
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
        const textLength = text.length || 1;
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
        if (spoken[i].toLowerCase() === word.toLowerCase()) {
          span.classList.add('correct');
          correct++;
          currentWordIndex = i + 1; // Update current word on correct
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
    if (accuracyScore > 80) confetti({ particleCount: 50, spread: 50 });
    highlightNextWord(nextIndex); // Highlight the first unmatched word
  }

  speedBtn.addEventListener('click', (e) => {
    e.preventDefault();
    adjustSpeed();
  });
  speedBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    adjustSpeed();
    e.stopPropagation();
  }, { passive: false });
  speedBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    adjustSpeed();
  }, { passive: false });

  document.getElementById('prev-btn')?.addEventListener('click', () => flipTo(currentIndex - 1, 'prev'));
  document.getElementById('next-btn')?.addEventListener('click', () => flipTo(currentIndex + 1, 'next'));

  playBtn?.addEventListener('click', () => startNarration(charPos));
  pauseBtn?.addEventListener('click', pauseNarration);
  resumeBtn?.addEventListener('click', resumeNarration);
  stopBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to stop?')) stopNarration();
  });
  micBtn?.addEventListener('click', startVoiceCapture);
  micStopBtn?.addEventListener('click', stopVoiceCapture);
  if (seekRange) {
    seekRange.value = 0;
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
