document.addEventListener('DOMContentLoaded', () => {
  let passages = [],
      currentIndex = 0,
    wordRanges = [],
      currentSpeakingSpan = null,
      stars = 0,
      currentSpeed = 0.6,
      utter = null,
      charPos = 0,
      isPlaying = false,
      isPaused = false;
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
        readProgressBar = document.getElementById('read-progress-bar');

  // Initialize button text with default speed
  const speeds = [0.3, 0.6, 0.9, 1.2]; // Very Slow, Slow, Normal, Fast
  const labels = ['Very Slow', 'Slow', 'Normal', 'Fast']; // Ensure 1:1 mapping
  if (!speeds.includes(currentSpeed)) currentSpeed = 0.6; // Fallback
  speedBtn.textContent = `Speed: ${labels[speeds.indexOf(currentSpeed)]}`;
  console.log(`Initial speed set to: ${currentSpeed}, Label: ${labels[speeds.indexOf(currentSpeed)]}`); // Debug initial state

  // Load the stories JSON
  fetch('passages.json')
    .then(response => {
      if (!response.ok) throw new Error('Failed to load stories');
      return response.json();
    })
    .then(data => {
      passages = data;
      document.getElementById('total-stories').textContent = passages.length;
      document.documentElement.style.setProperty('--total', passages.length);
       buildStoryMap();
      const saved = localStorage.getItem('progress');
      if (saved) {
        const { story, char } = JSON.parse(saved);
        showPassage(story);
        charPos = char || 0;
        updateReadProgress(charPos / (passages[story].text.length));
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
    const pg = container;

    // Reset wordRanges for the new passage
    wordRanges = [];

    pg.innerHTML = `
      <h1 id="passage-title">${p.title}</h1>
      <p id="passage-info">Story <span>${i + 1}</span> / ${passages.length}</p>
      <div id="passage-text">${p.text}</div>
      <img id="passage-image" src="${p.image}" alt="${p.title.replace(/<[^>]+>/g, '')}" onerror="this.style.display='none';">
    `;

    const textDiv = pg.querySelector('#passage-text'); // Use pg to ensure correct context
    wrapWords(textDiv);
    buildRanges(textDiv);

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
    wordRanges = []; // Ensure ranges are rebuilt
    Array.from(div.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        cumulative += node.textContent.length;
      } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('word')) {
        const len = node.textContent.length;
        wordRanges.push({ span: node, start: cumulative, end: cumulative + len - 1 });
        cumulative += len;
      }
    });
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
  }

  function updateReadProgress(progress) {
    readProgressBar.style.setProperty('--progress', progress);
    readProgressBar.style.width = (progress * 100) + '%';
  }

  function buildStoryMap() {
    storyGrid.innerHTML = '';
    passages.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'story-card';
      card.innerHTML = `<img src="${p.image}" alt="${p.title}"><div class="story-title">${p.title}</div>`;
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
    const currentIndex = speeds.indexOf(currentSpeed);
    if (currentIndex === -1) {
      console.error('Current speed not found in speeds array:', currentSpeed);
      currentSpeed = 0.6; // Fallback to default
    }
    const nextIndex = (currentIndex + 1) % speeds.length;
    currentSpeed = speeds[nextIndex];
    const label = labels[nextIndex] || 'Unknown';
    speedBtn.textContent = `Speed: ${label}`;
    console.log(`Speed adjusted to: ${currentSpeed}, Label: ${label}`); // Enhanced debug
  }

 function startNarration(start = 0) {
    stopNarration(false);

    const text = document.getElementById('passage-text').textContent || '';
const speakText = text.slice(start);
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
        updateReadProgress(globalIndex / text.length);
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
    };

 speechSynthesis.speak(utter);
    isPlaying = true;
    isPaused = false;
    updateControlButtons();
  }

  function pauseNarration() {
    if (!isPlaying) return;
    speechSynthesis.pause();
    isPaused = true;
    isPlaying = false;
    updateControlButtons();
  }

  function resumeNarration() {
    if (!isPaused) return;
    speechSynthesis.resume();
    isPaused = false;
    isPlaying = true;
    updateControlButtons();
  }

  function stopNarration(clearSaved = true) {
    speechSynthesis.cancel();
    if (currentSpeakingSpan) {
      currentSpeakingSpan.classList.remove('speaking');
      currentSpeakingSpan = null;
    }
    isPlaying = false;
    isPaused = false;
    utter = null;
    if (clearSaved) {
      charPos = 0;
      localStorage.removeItem('progress');
      updateReadProgress(0);
    }
    updateControlButtons();
  }

  // Speed button with enhanced touch support
  speedBtn.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent default click behavior
    console.log('Click event fired');
    adjustSpeed();
  });
  speedBtn.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent default touch behavior
    console.log('Touchstart event fired');
    adjustSpeed();
    e.stopPropagation(); // Prevent multiple triggers
  }, { passive: false });
  speedBtn.addEventListener('touchend', (e) => {
    e.preventDefault(); // Prevent default touchend behavior
    console.log('Touchend event fired');
    adjustSpeed();
  }, { passive: false });

  // Prev/Next buttons
  document.getElementById('prev-btn').addEventListener('click', () => flipTo(currentIndex - 1, 'prev'));
  document.getElementById('next-btn').addEventListener('click', () => flipTo(currentIndex + 1, 'next'));
  
  playBtn.addEventListener('click', () => startNarration(charPos));
  pauseBtn.addEventListener('click', pauseNarration);
  resumeBtn.addEventListener('click', resumeNarration);
  stopBtn.addEventListener('click', () => stopNarration());

  mapBtn.addEventListener('click', () => {
    stopNarration(false);
    storyMap.classList.remove('hidden');
  });
  closeMapBtn.addEventListener('click', () => storyMap.classList.add('hidden'));

  window.addEventListener('beforeunload', () => {
    if (isPlaying || isPaused) {
      localStorage.setItem('progress', JSON.stringify({ story: currentIndex, char: charPos }));
    }
    stopNarration(false);
  });
});
