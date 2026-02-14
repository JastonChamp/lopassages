/**
 * PhonicsWorld - World-Class Reading App
 * A comprehensive phonics learning application for children
 */

document.addEventListener('DOMContentLoaded', () => {
  // ===== Password Protection =====
  const PASSWORD = 'kingstonrocks';
  const passwordScreen = document.getElementById('password-screen');
  const passwordForm = document.getElementById('password-form');
  const passwordInput = document.getElementById('password-input');
  const passwordError = document.getElementById('password-error');
  const appContainer = document.getElementById('app');

  // Check if already authenticated this session
  if (sessionStorage.getItem('phonicsworld_auth') === 'true') {
    passwordScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');
  }

  passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (passwordInput.value === PASSWORD) {
      sessionStorage.setItem('phonicsworld_auth', 'true');
      passwordScreen.classList.add('hidden');
      appContainer.classList.remove('hidden');
    } else {
      passwordError.classList.remove('hidden');
      passwordInput.value = '';
      passwordInput.focus();
      // Shake animation
      passwordInput.style.animation = 'shake 0.5s ease';
      setTimeout(() => passwordInput.style.animation = '', 500);
    }
  });

  // ===== Constants =====
  const VERSION = '3.0';
  const SPEEDS = [0.15, 0.25, 0.4, 0.6, 0.85, 1.1];
  const SPEED_LABELS = ['🐌', '🐢', '🐇', '🚶', '🏃', '🚀'];
  const SPEED_NAMES = ['Super Slow', 'Very Slow', 'Slow', 'Normal', 'Fast', 'Turbo'];

  // Placeholder image SVG
  const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 350 200'%3E%3Crect fill='%23E8E8E8' width='350' height='200' rx='10'/%3E%3Ctext x='175' y='100' font-size='16' text-anchor='middle' fill='%23999'%3EImage Coming Soon%3C/text%3E%3Ctext x='175' y='125' font-size='40' text-anchor='middle'%3E📚%3C/text%3E%3C/svg%3E";

  // Achievements definitions
  const ACHIEVEMENTS = [
    { id: 'first_story', name: 'First Steps', desc: 'Read your first story', icon: '📖', condition: (s) => s.storiesRead >= 1 },
    { id: 'five_stories', name: 'Bookworm', desc: 'Read 5 stories', icon: '🐛', condition: (s) => s.storiesRead >= 5 },
    { id: 'ten_stories', name: 'Story Master', desc: 'Read 10 stories', icon: '📚', condition: (s) => s.storiesRead >= 10 },
    { id: 'first_star', name: 'Rising Star', desc: 'Earn your first star', icon: '⭐', condition: (s) => s.stars >= 1 },
    { id: 'five_stars', name: 'Star Collector', desc: 'Earn 5 stars', icon: '🌟', condition: (s) => s.stars >= 5 },
    { id: 'ten_stars', name: 'Superstar', desc: 'Earn 10 stars', icon: '💫', condition: (s) => s.stars >= 10 },
    { id: 'perfect_read', name: 'Perfect Reader', desc: 'Get 100% accuracy', icon: '🎯', condition: (s) => s.perfectReads >= 1 },
    { id: 'streak_3', name: 'On a Roll', desc: '3 day reading streak', icon: '🔥', condition: (s) => s.streak >= 3 },
    { id: 'streak_7', name: 'Week Warrior', desc: '7 day reading streak', icon: '🏆', condition: (s) => s.streak >= 7 },
    { id: 'speed_demon', name: 'Speed Reader', desc: 'Use turbo speed', icon: '🚀', condition: (s) => s.usedTurbo },
    { id: 'night_owl', name: 'Night Owl', desc: 'Read in dark mode', icon: '🦉', condition: (s) => s.usedDarkMode },
    { id: 'mic_master', name: 'Voice Star', desc: 'Practice reading aloud', icon: '🎤', condition: (s) => s.usedMic }
  ];

  // ===== State =====
  let state = {
    categories: {},
    passages: [],
    currentBook: 'book1',
    currentIndex: 0,
    wordRanges: [],
    stars: 0,
    currentSpeed: 0.4,
    charPos: 0,
    isPlaying: false,
    isPaused: false,
    recognition: null,
    accuracyScore: 0,
    storiesRead: 0,
    totalReadingTime: 0,
    streak: 0,
    lastReadDate: null,
    perfectReads: 0,
    usedTurbo: false,
    usedDarkMode: false,
    usedMic: false,
    unlockedAchievements: [],
    settings: {
      autoAdvance: true,
      wordHints: true,
      textSize: 1.5,
      theme: 'light',
      showMascot: true
    },
    focusMode: false
  };

  // ===== DOM Elements =====
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  const elements = {
    // Stats
    starCount: $('star-count'),
    storiesRead: $('stories-read'),
    accuracyStat: $('accuracy-stat'),
    timeSpent: $('time-spent'),
    streakCount: $('streak-count'),

    // Controls
    bookSelect: $('book-select'),
    voiceSelect: $('voice-select'),
    settingsVoiceSelect: $('settings-voice-select'),
    playBtn: $('play-btn'),
    pauseBtn: $('pause-btn'),
    resumeBtn: $('resume-btn'),
    stopBtn: $('stop-btn'),
    prevBtn: $('prev-btn'),
    nextBtn: $('next-btn'),
    mapBtn: $('map-btn'),
    speedBtn: $('speed-btn'),
    starBtn: $('star-btn'),
    micBtn: $('mic-btn'),
    micStopBtn: $('mic-stop-btn'),
    fullscreenBtn: $('fullscreen-btn'),
    darkModeBtn: $('dark-mode-btn'),
    helpBtn: $('help-btn'),
    settingsBtn: $('settings-btn'),
    achievementsBtn: $('achievements-btn'),
    topBtn: $('top-btn'),

    // Content
    book: $('book'),
    page: $('page'),
    feedback: $('feedback'),
    progressBar: $('progress-bar'),
    readProgressBar: $('read-progress-bar'),
    seekRange: $('seek-range'),
    currentStory: $('current-story'),
    totalStories: $('total-stories'),

    // Modals
    storyMap: $('story-map'),
    storyGrid: $('story-grid'),
    closeMap: $('close-map'),
    settingsModal: $('settings-modal'),
    closeSettings: $('close-settings'),
    achievementsModal: $('achievements-modal'),
    closeAchievements: $('close-achievements'),
    achievementsGrid: $('achievements-grid'),
    helpModal: $('help-modal'),
    closeHelp: $('close-help'),

    // Word hint
    wordHint: $('word-hint'),
    hintWord: $('hint-word'),
    hintPhonics: $('hint-phonics'),
    hintSpeak: $('hint-speak'),

    // Achievement toast
    achievementToast: $('achievement-toast'),
    toastTitle: $('toast-title'),
    toastMessage: $('toast-message'),

    // Settings controls
    textSize: $('text-size'),
    autoAdvance: $('auto-advance'),
    wordHintsCheckbox: $('word-hints'),
    showMascotCheckbox: $('show-mascot'),
    resetProgress: $('reset-progress'),

    // Focus mode
    focusModeBtn: $('focus-mode-btn'),

    // Mascot
    mascotHelper: $('mascot-helper'),
    mascotBubble: $('mascot-bubble'),
    mascotMessage: $('mascot-message'),
    mascotCharacter: $('mascot-character'),

    // Celebration
    celebrationOverlay: $('celebration-overlay'),
    celebrationTitle: $('celebration-title'),
    celebrationMessage: $('celebration-message'),

    // Achievements count
    unlockedCount: $('unlocked-count'),
    totalAchievements: $('total-achievements')
  };

  // ===== Utility Functions =====
  const safeConfetti = (options) => {
    if (typeof confetti === 'function') {
      try { confetti(options); } catch (e) { console.warn('Confetti error:', e); }
    }
  };

  const setFeedback = (msg, type = '') => {
    if (!elements.feedback) return;
    elements.feedback.textContent = msg;
    elements.feedback.className = 'feedback-area';
    if (type) elements.feedback.classList.add(type);
    if (msg) setTimeout(() => setFeedback(''), 5000);
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const cleanForTTS = (text) => {
    return text.replace(/<[^>]+>/g, '')
               .replace(/([.!?])/g, '$1 ')
               .replace(/\s+/g, ' ')
               .trim();
  };

  const stripHtml = (html) => html.replace(/<[^>]+>/g, '');

  // ===== Mascot Messages =====
  const MASCOT_MESSAGES = {
    welcome: ["Hi! I'm Buddy! Let's read together!", "Ready to read? Let's go!", "Welcome back, superstar!"],
    playing: ["Great! Listen carefully!", "Follow along with the words!", "You're doing awesome!"],
    recording: ["I'm listening! Read to me!", "Speak clearly, you've got this!", "Take your time!"],
    correct: ["Amazing job!", "You're a reading star!", "Fantastic!", "Keep it up!", "Wow, so good!"],
    encouragement: ["You can do it!", "Try again, I believe in you!", "Practice makes perfect!"],
    starEarned: ["You earned a star!", "Awesome! Another star!", "You're a superstar!"],
    storyComplete: ["Great story!", "You finished it!", "Ready for the next one?"]
  };

  const getRandomMessage = (category) => {
    const messages = MASCOT_MESSAGES[category] || MASCOT_MESSAGES.welcome;
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const showMascotMessage = (category, duration = 4000) => {
    if (!state.settings.showMascot || !elements.mascotMessage) return;

    const message = getRandomMessage(category);
    elements.mascotMessage.textContent = message;

    // Animate bubble
    if (elements.mascotBubble) {
      elements.mascotBubble.style.animation = 'none';
      elements.mascotBubble.offsetHeight; // Trigger reflow
      elements.mascotBubble.style.animation = 'bubblePop 0.3s ease';
    }

    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(() => {
        if (elements.mascotMessage) {
          elements.mascotMessage.textContent = getRandomMessage('welcome');
        }
      }, duration);
    }
  };

  const toggleFocusMode = () => {
    state.focusMode = !state.focusMode;
    document.body.classList.toggle('focus-mode', state.focusMode);

    if (elements.focusModeBtn) {
      elements.focusModeBtn.textContent = state.focusMode ? '📺' : '📖';
      elements.focusModeBtn.title = state.focusMode ? 'Exit Focus Mode' : 'Focus Mode';
    }

    setFeedback(state.focusMode ? 'Focus mode: ON - Distraction-free reading!' : 'Focus mode: OFF', 'info');
  };

  const showCelebration = (title, message, duration = 2500) => {
    if (!elements.celebrationOverlay) return;

    if (elements.celebrationTitle) elements.celebrationTitle.textContent = title;
    if (elements.celebrationMessage) elements.celebrationMessage.textContent = message;

    elements.celebrationOverlay.classList.remove('hidden');
    safeConfetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });

    setTimeout(() => {
      elements.celebrationOverlay.classList.add('hidden');
    }, duration);
  };

  // ===== Storage Functions =====
  const saveState = () => {
    const saveData = {
      stars: state.stars,
      currentBook: state.currentBook,
      currentIndex: state.currentIndex,
      currentSpeed: state.currentSpeed,
      storiesRead: state.storiesRead,
      totalReadingTime: state.totalReadingTime,
      streak: state.streak,
      lastReadDate: state.lastReadDate,
      perfectReads: state.perfectReads,
      usedTurbo: state.usedTurbo,
      usedDarkMode: state.usedDarkMode,
      usedMic: state.usedMic,
      unlockedAchievements: state.unlockedAchievements,
      settings: state.settings
    };
    localStorage.setItem('phonicsworld_state', JSON.stringify(saveData));
  };

  const loadState = () => {
    const saved = localStorage.getItem('phonicsworld_state');
    if (saved) {
      const data = JSON.parse(saved);
      Object.assign(state, data);
      updateStreak();
    }
  };

  const updateStreak = () => {
    const today = new Date().toDateString();
    const lastRead = state.lastReadDate;

    if (!lastRead) {
      state.streak = 0;
    } else if (lastRead === today) {
      // Already read today, keep streak
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastRead === yesterday.toDateString()) {
        // Read yesterday, streak continues
      } else {
        // Streak broken
        state.streak = 0;
      }
    }
  };

  const markReadToday = () => {
    const today = new Date().toDateString();
    if (state.lastReadDate !== today) {
      state.streak++;
      state.lastReadDate = today;
      saveState();
      checkAchievements();
    }
  };

  // ===== Voice Functions =====
  let availableVoices = [];

  const populateVoices = () => {
    availableVoices = speechSynthesis.getVoices();
    [elements.voiceSelect, elements.settingsVoiceSelect].forEach(select => {
      if (!select) return;
      select.innerHTML = '';
      availableVoices.forEach((v, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = v.name.substring(0, 30);
        select.appendChild(opt);
      });
      const saved = localStorage.getItem('voiceIndex');
      if (saved && select.options[saved]) select.value = saved;
    });
  };

  populateVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoices;
  }

  // ===== Data Loading =====
  const loadData = async () => {
    const cached = localStorage.getItem('passages');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.version === VERSION) return parsed.data;
    }

    const controller = new AbortController();
    const fetchPromise = fetch('passages.json', { cache: 'no-store', signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        localStorage.setItem('passages', JSON.stringify({ version: VERSION, data }));
        return data;
      });

    return Promise.race([
      fetchPromise,
      new Promise((_, reject) => setTimeout(() => {
        controller.abort();
        reject(new Error('Load timeout'));
      }, 10000))
    ]);
  };

  // ===== UI Update Functions =====
  const updateStats = () => {
    if (elements.starCount) elements.starCount.textContent = state.stars;
    if (elements.storiesRead) elements.storiesRead.textContent = state.storiesRead;
    if (elements.accuracyStat) elements.accuracyStat.textContent = `${Math.round(state.accuracyScore)}%`;
    if (elements.timeSpent) elements.timeSpent.textContent = formatTime(state.totalReadingTime);
    if (elements.streakCount) elements.streakCount.textContent = state.streak;
  };

  const updateProgress = () => {
    const progress = ((state.currentIndex + 1) / state.passages.length) * 100;
    if (elements.progressBar) {
      elements.progressBar.style.width = `${progress}%`;
    }
    if (elements.currentStory) elements.currentStory.textContent = state.currentIndex + 1;
    if (elements.totalStories) elements.totalStories.textContent = state.passages.length;
  };

  const updateNavButtons = () => {
    if (elements.prevBtn) elements.prevBtn.disabled = state.currentIndex === 0;
    if (elements.nextBtn) elements.nextBtn.disabled = state.currentIndex === state.passages.length - 1;
    if (elements.starBtn) elements.starBtn.disabled = state.stars >= state.passages.length;
  };

  const updateControlButtons = () => {
    // Handle play/pause/resume visibility for simplified UI
    if (elements.playBtn && elements.pauseBtn && elements.resumeBtn) {
      if (state.isPlaying) {
        // Playing: show pause, hide play and resume
        elements.playBtn.classList.add('hidden');
        elements.pauseBtn.classList.remove('hidden');
        elements.pauseBtn.disabled = false;
        elements.resumeBtn.classList.add('hidden');
      } else if (state.isPaused) {
        // Paused: show resume, hide play and pause
        elements.playBtn.classList.add('hidden');
        elements.pauseBtn.classList.add('hidden');
        elements.resumeBtn.classList.remove('hidden');
        elements.resumeBtn.disabled = false;
      } else {
        // Stopped: show play, hide pause and resume
        elements.playBtn.classList.remove('hidden');
        elements.playBtn.disabled = false;
        elements.pauseBtn.classList.add('hidden');
        elements.resumeBtn.classList.add('hidden');
      }
    }
    if (elements.stopBtn) elements.stopBtn.disabled = !(state.isPlaying || state.isPaused);
  };

  const updateReadProgress = (progress) => {
    const safeProgress = isNaN(progress) ? 0 : Math.min(1, Math.max(0, progress));
    if (elements.readProgressBar) {
      elements.readProgressBar.style.width = `${safeProgress * 100}%`;
    }
    if (elements.seekRange) elements.seekRange.value = safeProgress * 100;
  };

  const updateSpeedButton = () => {
    const idx = SPEEDS.indexOf(state.currentSpeed);
    if (elements.speedBtn) {
      // Try all selectors for old and new UI
      const btnIcon = elements.speedBtn.querySelector('.pb-icon') || elements.speedBtn.querySelector('.btn-icon') || elements.speedBtn.querySelector('.speed-icon');
      const label = SPEED_LABELS[idx >= 0 ? idx : 2]; // Default to slow (index 2)
      if (btnIcon) {
        btnIcon.textContent = label;
      } else {
        elements.speedBtn.textContent = label;
      }
    }
  };

  // ===== Story Display =====
  const formatText = (text) => {
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
  };

  const wrapWords = (container) => {
    if (!container) return;
    Array.from(container.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split(/(\s+|[.,!?;:"'()])/);
        const frag = document.createDocumentFragment();
        parts.forEach(tok => {
          if (/^\s+$/.test(tok) || /^[.,!?;:"'()]$/.test(tok)) {
            frag.append(tok);
          } else if (tok.trim()) {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = tok;
            span.dataset.word = tok.toLowerCase();
            frag.append(span);
          }
        });
        container.replaceChild(frag, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        wrapWords(node);
      }
    });
  };

  const buildRanges = (div) => {
    state.wordRanges = [];
    if (!div) return;

    const traverse = (node, cumulative) => {
      if (node.nodeType === Node.TEXT_NODE) return cumulative + node.textContent.length;
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.classList.contains('word')) {
          const len = node.textContent.length;
          state.wordRanges.push({ span: node, start: cumulative, end: cumulative + len - 1 });
          cumulative += len;
        } else {
          Array.from(node.childNodes).forEach(child => {
            cumulative = traverse(child, cumulative);
          });
        }
      }
      return cumulative;
    };

    traverse(div, 0);
  };

  const showPassage = (index, container = elements.page) => {
    state.currentIndex = index;
    const passage = state.passages[index];
    if (!passage || !container) return;

    state.wordRanges = [];
    const imgPath = passage.image ? `images/${passage.image}` : PLACEHOLDER_IMAGE;
    const altText = passage.image ? `Illustration for ${stripHtml(passage.title)}` : 'Story illustration';
    const formattedText = formatText(passage.text);

    container.innerHTML = `
      <h1 class="passage-title">${passage.title}</h1>
      <div class="passage-info">
        <span class="passage-info-badge">Story ${index + 1} of ${state.passages.length}</span>
        ${index < state.stars ? '<span class="passage-info-badge" style="background: var(--success-light); color: var(--success);">✓ Completed</span>' : ''}
      </div>
      <div class="passage-text" role="region" aria-live="polite">${formattedText}</div>
      <img class="passage-image" src="${imgPath}" alt="${altText}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMAGE}'">
    `;

    const textDiv = container.querySelector('.passage-text');
    if (textDiv) {
      wrapWords(textDiv);
      buildRanges(textDiv);
      setupWordHints(textDiv);
    }

    updateProgress();
    updateNavButtons();
    updateControlButtons();
    updateReadProgress(0);
    state.charPos = 0;

    // Preload adjacent images
    const preloadImage = (src) => {
      if (!src) return;
      const img = new Image();
      img.onerror = () => {};
      img.src = `images/${src}`;
    };
    if (index > 0 && state.passages[index - 1]?.image) preloadImage(state.passages[index - 1].image);
    if (index < state.passages.length - 1 && state.passages[index + 1]?.image) preloadImage(state.passages[index + 1].image);
  };

  // ===== Story Map =====
  const buildStoryMap = () => {
    if (!elements.storyGrid) return;
    elements.storyGrid.innerHTML = '';

    state.passages.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'story-card';
      card.tabIndex = 0;
      card.role = 'listitem';

           if (idx === state.currentIndex) card.classList.add('current');
      if (idx < state.stars) card.classList.add('completed');

      const imgPath = p.image ? `images/${p.image}` : PLACEHOLDER_IMAGE;
       const status = idx < state.stars ? '✓ Completed' : (idx === state.currentIndex ? 'Current' : 'Available');

      card.innerHTML = `
        <img class="story-card-image" src="${imgPath}" alt="${stripHtml(p.title)}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMAGE}'">
        <div class="story-card-content">
          <div class="story-card-title">${stripHtml(p.title)}</div>
          <div class="story-card-status">${status}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        elements.storyMap.classList.add('hidden');
        flipTo(idx, idx > state.currentIndex ? 'next' : 'prev');
      });

      elements.storyGrid.appendChild(card);
    });
  };

  // ===== Page Transitions =====
  const flipTo = (idx, dir) => {
    if (idx < 0 || idx >= state.passages.length) return;
    narrator.stop(true);

    const oldPage = elements.page;
    if (!oldPage) return;

    oldPage.style.opacity = '0';
    oldPage.style.transform = dir === 'next' ? 'translateX(-50px)' : 'translateX(50px)';

    setTimeout(() => {
      showPassage(idx);
      elements.page.style.opacity = '1';
      elements.page.style.transform = 'translateX(0)';
    }, 300);
  };

  // ===== Book Loading =====
  const loadBook = () => {
    state.passages = state.categories[state.currentBook] || [];
    if (state.passages.length === 0) {
      state.passages = [{ title: 'Coming Soon!', text: 'More adventures are on the way!', image: null }];
    }
    buildStoryMap();
    showPassage(0);
    updateNavButtons();
    updateStats();
  };

 const isBookUnlocked = () => true;

  // ===== Narrator Class =====
  class Narrator {
    constructor() {
      this.utter = null;
      this.currentSpan = null;
      this.timer = null;
      this.startTime = null;
      this.wordIndex = 0;
      this.words = [];
      this.wordSpans = [];
      this.boundarySupported = false;
    }

    start(startWordIndex = 0) {
      this.stop(false);
      const textElem = document.querySelector('.passage-text');
      if (!textElem) {
        setFeedback('Cannot find text to read.', 'error');
        return;
      }

      // Show mascot encouragement
      showMascotMessage('playing', 3000);

      // Get all word spans for highlighting
      this.wordSpans = Array.from(document.querySelectorAll('.passage-text .word'));
      if (this.wordSpans.length === 0) {
        setFeedback('No words found to read.', 'error');
        return;
      }

      // Build text from word spans for accurate sync
      this.words = this.wordSpans.map(span => span.textContent.trim());
      const speakText = this.words.slice(startWordIndex).join(' ');
      if (!speakText) return;

      this.wordIndex = startWordIndex;
      this.boundarySupported = false;

      this.utter = new SpeechSynthesisUtterance(speakText);
      this.utter.rate = state.currentSpeed;

      if (elements.voiceSelect && availableVoices.length) {
        const voice = availableVoices[elements.voiceSelect.value];
        if (voice) this.utter.voice = voice;
      }

      // Track word boundaries - onboundary fires at START of each word
      let lastCharIndex = -1;

      this.utter.onboundary = (event) => {
        if (event.name === 'word' && event.charIndex !== lastCharIndex) {
          lastCharIndex = event.charIndex;
          this.boundarySupported = true;

          // Calculate which word is being spoken based on character position
          // Count spaces before this position to determine word index
          const textBeforeBoundary = speakText.substring(0, event.charIndex);
          const wordsBefore = textBeforeBoundary.split(/\s+/).filter(w => w.length > 0).length;
          const newIndex = startWordIndex + wordsBefore;

          if (newIndex !== this.wordIndex && newIndex < this.wordSpans.length) {
            this.highlightWord(newIndex);
          }
        }
      };

      this.utter.onend = () => this.reset();
      this.utter.onerror = (e) => {
        if (e.error !== 'interrupted') {
          console.error('Speech error:', e);
          setFeedback('Narration error. Try a different voice.', 'error');
        }
        this.reset();
      };

      try {
        this.startTime = Date.now();
        speechSynthesis.speak(this.utter);
        state.isPlaying = true;
        state.isPaused = false;
        updateControlButtons();
        markReadToday();

        // Highlight first word immediately
        this.highlightWord(startWordIndex);

        // Precise fallback timer for browsers without boundary support
        const words = speakText.split(/\s+/).filter(w => w);
        const totalChars = speakText.length;

        // Estimate total duration: ~150 chars/min at rate 1.0
        // Adjusted for speech rate
        const charsPerSecond = 2.5 * state.currentSpeed;
        const estimatedTotalMs = (totalChars / charsPerSecond) * 1000;

        // Pre-calculate word start times based on character positions
        const wordStartTimes = [];
        let charCount = 0;
        words.forEach((word, i) => {
          const startRatio = charCount / totalChars;
          wordStartTimes.push(startRatio * estimatedTotalMs);
          charCount += word.length + 1; // +1 for space
        });

        this.timer = setInterval(() => {
          if (!state.isPlaying || state.isPaused) return;

          const elapsed = Date.now() - this.startTime;

          // Only use fallback if boundary events aren't firing
          if (!this.boundarySupported) {
            // Find which word should be highlighted based on elapsed time
            let targetIndex = startWordIndex;
            for (let i = 0; i < wordStartTimes.length; i++) {
              if (elapsed >= wordStartTimes[i]) {
                targetIndex = startWordIndex + i;
              } else {
                break;
              }
            }

            if (targetIndex !== this.wordIndex && targetIndex < this.wordSpans.length) {
              this.highlightWord(targetIndex);
            }
          }

          // Update progress
          updateReadProgress(this.wordIndex / (this.wordSpans.length || 1));
        }, 30); // Very frequent checks for smooth sync

      } catch (e) {
        console.error('Speech synthesis error:', e);
        setFeedback('Speech not available in this browser.', 'error');
      }
    }

    highlightWord(index) {
      if (index < 0 || index >= this.wordSpans.length) return;

      // Remove previous highlight
      if (this.currentSpan) {
        this.currentSpan.classList.remove('speaking');
      }

      // Add new highlight
      this.wordIndex = index;
      this.currentSpan = this.wordSpans[index];
      this.currentSpan.classList.add('speaking');

      // Scroll word into view within the book container only (not the whole page)
      const bookContainer = document.querySelector('.book-container');
      if (bookContainer && this.currentSpan) {
        const containerRect = bookContainer.getBoundingClientRect();
        const wordRect = this.currentSpan.getBoundingClientRect();

        // Only scroll if word is outside the visible area of the container
        if (wordRect.top < containerRect.top + 50 || wordRect.bottom > containerRect.bottom - 50) {
          const scrollTop = this.currentSpan.offsetTop - bookContainer.offsetTop - (containerRect.height / 2);
          bookContainer.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }

      state.charPos = index;
    }

    pause() {
      if (!state.isPlaying) return;
      speechSynthesis.pause();
      state.isPaused = true;
      state.isPlaying = false;
      updateControlButtons();
    }

    resume() {
      if (!state.isPaused) return;
      speechSynthesis.resume();
      state.isPaused = false;
      state.isPlaying = true;
      updateControlButtons();
    }

    stop(clearSaved = true) {
      speechSynthesis.cancel();
      clearInterval(this.timer);

      if (this.currentSpan) this.currentSpan.classList.remove('speaking');
      document.querySelectorAll('.passage-text .speaking').forEach(s => s.classList.remove('speaking'));

      // Track reading time
      if (this.startTime) {
        const elapsed = (Date.now() - this.startTime) / 60000;
        state.totalReadingTime += elapsed;
        saveState();
      }

      this.currentSpan = null;
      this.utter = null;
      this.startTime = null;
      this.wordIndex = 0;
      state.isPlaying = false;
      state.isPaused = false;

      if (clearSaved) {
        state.charPos = 0;
        updateReadProgress(0);
      }

      updateControlButtons();
    }

    reset() {
      clearInterval(this.timer);

      if (this.startTime) {
        const elapsed = (Date.now() - this.startTime) / 60000;
        state.totalReadingTime += elapsed;
        state.storiesRead++;
        saveState();
        updateStats();
        checkAchievements();
      }

      if (this.currentSpan) this.currentSpan.classList.remove('speaking');

      this.currentSpan = null;
      this.startTime = null;
      this.wordIndex = 0;
      state.isPlaying = false;
      state.isPaused = false;
      state.charPos = 0;
      updateControlButtons();
      updateReadProgress(1);
    }
  }

  const narrator = new Narrator();

  // ===== Speech Recognition =====
  let accumulatedTranscript = '';
  let isRecognitionActive = false;
  let shouldRestartRecognition = false;

  const initVoiceCapture = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedback('Speech recognition not supported. Try Chrome.', 'error');
      return;
    }

    state.recognition = new SpeechRecognition();
    state.recognition.lang = 'en-US';
    state.recognition.continuous = true;
    state.recognition.interimResults = true;
    state.recognition.maxAlternatives = 3;

    state.recognition.onresult = (event) => {
      // Build transcript from final and interim results
      let finalTranscript = accumulatedTranscript;
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript + ' ';
        }
      }

      // Update accumulated transcript with finals
      accumulatedTranscript = finalTranscript;

      // Use combined transcript for matching
      const fullTranscript = (finalTranscript + interimTranscript).trim();
      const storyText = state.passages[state.currentIndex]?.text || '';
      highlightReading(fullTranscript, storyText);
    };

    state.recognition.onstart = () => {
      isRecognitionActive = true;
      // Toggle button visibility
      if (elements.micBtn) elements.micBtn.classList.add('hidden');
      if (elements.micStopBtn) {
        elements.micStopBtn.classList.remove('hidden');
        elements.micStopBtn.disabled = false;
      }
      setFeedback('🎤 Listening... Read the story aloud!', 'info');
      if (accumulatedTranscript === '') {
        highlightNextWord(0);
      }
      state.usedMic = true;
      saveState();
      checkAchievements();
    };

    state.recognition.onend = () => {
      isRecognitionActive = false;
      // Auto-restart if we should keep listening
      if (shouldRestartRecognition) {
        setTimeout(() => {
          try {
            state.recognition?.start();
          } catch (e) {
            console.log('Recognition restart failed:', e);
          }
        }, 100);
      } else {
        // Toggle button visibility back
        if (elements.micBtn) {
          elements.micBtn.classList.remove('hidden');
          elements.micBtn.disabled = false;
        }
        if (elements.micStopBtn) {
          elements.micStopBtn.classList.add('hidden');
          elements.micStopBtn.disabled = true;
        }
      }
    };

    state.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Don't stop - just keep listening
        setFeedback('🎤 Keep reading... I\'m listening!', 'info');
      } else if (event.error === 'audio-capture') {
        setFeedback('No microphone found. Check your settings.', 'error');
        shouldRestartRecognition = false;
        resetMicButtons();
      } else if (event.error === 'not-allowed') {
        setFeedback('Microphone access denied. Allow it in browser settings.', 'error');
        shouldRestartRecognition = false;
        resetMicButtons();
      } else if (event.error === 'aborted') {
        // User stopped - don't show error
      } else {
        setFeedback(`Microphone error: ${event.error}`, 'error');
        shouldRestartRecognition = false;
        resetMicButtons();
      }
    };
  };

  const highlightNextWord = (index) => {
    document.querySelectorAll('.passage-text .next-word').forEach(s => s.classList.remove('next-word'));
    const words = document.querySelectorAll('.passage-text .word');
    if (words[index]) {
      words[index].classList.add('next-word');

      // Scroll within book container only
      const bookContainer = document.querySelector('.book-container');
      if (bookContainer) {
        const containerRect = bookContainer.getBoundingClientRect();
        const wordRect = words[index].getBoundingClientRect();

        if (wordRect.top < containerRect.top + 50 || wordRect.bottom > containerRect.bottom - 50) {
          const scrollTop = words[index].offsetTop - bookContainer.offsetTop - (containerRect.height / 2);
          bookContainer.scrollTo({ top: scrollTop, behavior: 'smooth' });
        }
      }
    }
  };

  // Levenshtein distance for better fuzzy matching
  const levenshteinDistance = (s1, s2) => {
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    const matrix = [];
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2[i - 1] === s1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[s2.length][s1.length];
  };

  // Calculate similarity percentage using Levenshtein distance
  // Optimized for young readers with many phonetic variations
  const similarity = (s1, s2) => {
    s1 = s1.toLowerCase().replace(/[^a-z]/g, '');
    s2 = s2.toLowerCase().replace(/[^a-z]/g, '');

    if (s1.length === 0 || s2.length === 0) return 0;
    if (s1 === s2) return 100;

    // Extensive phonetic normalization for young readers
    const normalize = (s) => s
      // Common consonant confusions
      .replace(/th/g, 'd')     // "the" sounds like "de"
      .replace(/ph/g, 'f')     // "phone" sounds like "fone"
      .replace(/wh/g, 'w')     // "what" sounds like "wat"
      .replace(/ck/g, 'k')     // "back" sounds like "bak"
      .replace(/gh/g, '')      // "night" -> "nit"
      .replace(/ght/g, 't')    // "night" -> "nit"
      .replace(/kn/g, 'n')     // "know" -> "now"
      .replace(/wr/g, 'r')     // "write" -> "rite"
      .replace(/mb$/g, 'm')    // "climb" -> "clim"
      // Vowel confusions common in children
      .replace(/ee/g, 'e')     // "see" -> "se"
      .replace(/oo/g, 'u')     // "book" -> "buk"
      .replace(/ea/g, 'e')     // "read" -> "red"
      .replace(/ou/g, 'o')     // "house" -> "hose"
      .replace(/ai/g, 'a')     // "rain" -> "ran"
      .replace(/ay/g, 'a')     // "day" -> "da"
      .replace(/ow/g, 'o')     // "cow" -> "co"
      // Common endings
      .replace(/tion/g, 'shun')
      .replace(/sion/g, 'zhun')
      .replace(/ing$/g, 'in')  // "running" -> "runnin"
      .replace(/ed$/g, 'd')    // "walked" -> "walkd"
      // Remove silent letters and double letters
      .replace(/([aeiou])\1+/g, '$1')
      .replace(/([bcdfghjklmnpqrstvwxyz])\1/g, '$1');

    const n1 = normalize(s1);
    const n2 = normalize(s2);

    // Try normalized comparison first
    if (n1 === n2) return 95;

    const maxLen = Math.max(s1.length, s2.length);
    const distance = levenshteinDistance(s1, s2);
    const normalizedDistance = levenshteinDistance(n1, n2);

    // Use the better of the two scores
    const score1 = ((maxLen - distance) / maxLen) * 100;
    const score2 = ((maxLen - normalizedDistance) / maxLen) * 100;

    // Bonus points if the words sound similar at the start
    let bonus = 0;
    if (n1.length >= 2 && n2.length >= 2 && n1.substring(0, 2) === n2.substring(0, 2)) {
      bonus = 10;
    }

    return Math.min(100, Math.max(score1, score2) + bonus);
  };

  // Check if spoken word matches expected (with very flexible matching for young readers)
  const wordsMatch = (spoken, expected) => {
    if (!spoken || !expected) return false;

    const s = spoken.toLowerCase().replace(/[^a-z]/g, '');
    const e = expected.toLowerCase().replace(/[^a-z]/g, '');

    // Exact match
    if (s === e) return true;

    // Very short words (1-2 chars) - be more lenient
    if (e.length <= 2) {
      // Allow if spoken starts with expected or vice versa
      return s === e || s.startsWith(e) || e.startsWith(s);
    }

    // For words 3+ chars, use very lenient similarity threshold
    // Young readers often add/skip sounds
    const threshold = e.length <= 3 ? 50 : e.length <= 5 ? 45 : 40;
    const sim = similarity(s, e);

    // Also check if word starts similarly (first 2-3 chars match)
    const prefixLen = Math.min(3, Math.floor(e.length / 2));
    const prefixMatch = s.substring(0, prefixLen) === e.substring(0, prefixLen);

    return sim >= threshold || (prefixMatch && sim >= 30);
  };

  const highlightReading = (transcript, storyText) => {
    const wordSpans = document.querySelectorAll('.passage-text .word');
    const expected = Array.from(wordSpans).map(span =>
      span.textContent.replace(/[^a-zA-Z']/g, '').toLowerCase()
    ).filter(w => w);

    const spoken = transcript.split(/\s+/)
      .map(w => w.replace(/[^a-zA-Z']/g, '').toLowerCase())
      .filter(w => w);

    let correct = 0;
    let firstIncorrect = expected.length;
    let lastCorrect = -1;

    // Use a wider sliding window for young readers who might skip or add words
    let spokenIndex = 0;

    expected.forEach((word, i) => {
      const span = wordSpans[i];
      if (!span) return;
      span.classList.remove('correct', 'incorrect');

      // Look for a match in the next several spoken words (very forgiving)
      let matched = false;
      const searchWindow = Math.min(5, spoken.length - spokenIndex);
      for (let offset = 0; offset < searchWindow; offset++) {
        if (wordsMatch(spoken[spokenIndex + offset], word)) {
          matched = true;
          spokenIndex += offset + 1;
          break;
        }
      }

      // Also try looking back one word in case child skipped ahead
      if (!matched && spokenIndex > 0) {
        if (wordsMatch(spoken[spokenIndex - 1], word)) {
          matched = true;
        }
      }

      if (matched) {
        span.classList.add('correct');
        correct++;
        lastCorrect = i;
      } else if (spokenIndex < spoken.length && i <= lastCorrect + 3) {
        // Only mark as incorrect if we have more spoken words
        // and we're close to where we expect the reader to be
        span.classList.add('incorrect');
        if (firstIncorrect > i) firstIncorrect = i;
        spokenIndex++;
      }
    });

    // Determine next word to read
    const nextIndex = lastCorrect >= 0 ? Math.min(lastCorrect + 1, expected.length) : 0;

    state.accuracyScore = expected.length > 0 ? (correct / expected.length) * 100 : 0;
    const scoreText = `🎯 Score: ${state.accuracyScore.toFixed(0)}% (${correct}/${expected.length} words)`;
    setFeedback(scoreText, state.accuracyScore > 70 ? 'success' : state.accuracyScore > 40 ? 'info' : 'error');
    updateReadProgress(correct / expected.length);
    updateStats();

    if (state.accuracyScore >= 100) {
      state.perfectReads++;
      saveState();
      checkAchievements();
    }

    if (state.accuracyScore > 80) {
      safeConfetti({ particleCount: 50, spread: 50 });
      showMascotMessage('correct', 3000);
    } else if (state.accuracyScore > 40) {
      showMascotMessage('encouragement', 3000);
    }

    highlightNextWord(nextIndex);
  };

  const startVoiceCapture = () => {
    if (!state.recognition) initVoiceCapture();
    if (!state.recognition) {
      setFeedback('Speech recognition not available. Try Chrome.', 'error');
      return;
    }

    // Stop narrator if playing
    narrator.stop(false);

    // Reset accumulated transcript for fresh start
    accumulatedTranscript = '';
    shouldRestartRecognition = true;

    // Show mascot encouragement
    showMascotMessage('recording', 3000);

    try {
      // Stop any existing recognition first
      if (isRecognitionActive) {
        state.recognition.stop();
        // Wait a moment then restart
        setTimeout(() => {
          try { state.recognition.start(); } catch (e) {
            console.error('Voice capture restart error:', e);
            resetMicButtons();
          }
        }, 200);
      } else {
        state.recognition.start();
      }
    } catch (e) {
      console.error('Voice capture error:', e);
      setFeedback('Could not start microphone. Please try again.', 'error');
      resetMicButtons();
    }
  };

  const resetMicButtons = () => {
    if (elements.micBtn) {
      elements.micBtn.classList.remove('hidden');
      elements.micBtn.disabled = false;
    }
    if (elements.micStopBtn) {
      elements.micStopBtn.classList.add('hidden');
      elements.micStopBtn.disabled = true;
    }
  };

  const stopVoiceCapture = () => {
    shouldRestartRecognition = false;
    try {
      state.recognition?.stop();
    } catch (e) {
      console.error('Voice stop error:', e);
    }
    setFeedback('');
    document.querySelectorAll('.passage-text .next-word').forEach(s => s.classList.remove('next-word'));
  };

  // ===== Word Hints =====
  const getPhonics = (word) => {
    // Simple phonics breakdown
    const vowels = 'aeiou';
    const parts = [];
    let current = '';

    for (const char of word.toLowerCase()) {
      if (vowels.includes(char)) {
        if (current) parts.push(current);
        parts.push(char.toUpperCase());
        current = '';
      } else {
        current += char;
      }
    }
    if (current) parts.push(current);

    return parts.join('-') || word;
  };

  const setupWordHints = (container) => {
    if (!state.settings.wordHints) return;

    container.querySelectorAll('.word').forEach(word => {
      word.addEventListener('click', (e) => {
        e.stopPropagation();
        showWordHint(word, e);
      });
    });
  };

  const showWordHint = (wordElement, event) => {
    const word = wordElement.textContent;
    if (!word || !elements.wordHint) return;

    elements.hintWord.textContent = word;
    elements.hintPhonics.textContent = `Sounds like: ${getPhonics(word)}`;

    const rect = wordElement.getBoundingClientRect();
    elements.wordHint.style.left = `${rect.left}px`;
    elements.wordHint.style.top = `${rect.bottom + 10}px`;
    elements.wordHint.classList.remove('hidden');

    // Auto-hide after 3 seconds
    setTimeout(() => elements.wordHint.classList.add('hidden'), 3000);
  };

  const speakWord = (word) => {
    const utter = new SpeechSynthesisUtterance(word);
    utter.rate = 0.7;
    if (elements.voiceSelect && availableVoices.length) {
      utter.voice = availableVoices[elements.voiceSelect.value];
    }
    speechSynthesis.speak(utter);
  };

  // ===== Achievements =====
  const checkAchievements = () => {
    ACHIEVEMENTS.forEach(achievement => {
      if (!state.unlockedAchievements.includes(achievement.id) && achievement.condition(state)) {
        unlockAchievement(achievement);
      }
    });
  };

  const unlockAchievement = (achievement) => {
    state.unlockedAchievements.push(achievement.id);
    saveState();

    // Show toast
    if (elements.achievementToast) {
      elements.toastMessage.textContent = `${achievement.icon} ${achievement.name}`;
      elements.achievementToast.classList.remove('hidden');
      safeConfetti({ particleCount: 100, spread: 70, origin: { y: 0.8 } });

      setTimeout(() => {
        elements.achievementToast.classList.add('hidden');
      }, 4000);
    }
  };

  const renderAchievements = () => {
    if (!elements.achievementsGrid) return;
    elements.achievementsGrid.innerHTML = '';

    ACHIEVEMENTS.forEach(a => {
      const unlocked = state.unlockedAchievements.includes(a.id);
      const item = document.createElement('div');
      item.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;
      item.innerHTML = `
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-name">${a.name}</div>
        <div class="achievement-desc">${a.desc}</div>
      `;
      elements.achievementsGrid.appendChild(item);
    });
  };

  // ===== Settings =====
  const applySettings = () => {
    // Theme
    document.body.classList.remove('dark-mode', 'sepia-mode');
    if (state.settings.theme === 'dark') {
      document.body.classList.add('dark-mode');
      state.usedDarkMode = true;
      saveState();
      checkAchievements();
    } else if (state.settings.theme === 'sepia') {
      document.body.classList.add('sepia-mode');
    }

    // Text size
    document.documentElement.style.setProperty('--text-size-base', `${state.settings.textSize}rem`);

    // Update UI
    if (elements.textSize) elements.textSize.value = state.settings.textSize;
    if (elements.autoAdvance) elements.autoAdvance.checked = state.settings.autoAdvance;
    if (elements.wordHintsCheckbox) elements.wordHintsCheckbox.checked = state.settings.wordHints;

    // Theme buttons
    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === state.settings.theme);
    });

    // Speed buttons
    document.querySelectorAll('.speed-option').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === state.currentSpeed);
    });
  };

  // ===== Event Handlers =====
  const setupEventListeners = () => {
    // Navigation (both old and new buttons)
    elements.prevBtn?.addEventListener('click', () => flipTo(state.currentIndex - 1, 'prev'));
    elements.nextBtn?.addEventListener('click', () => flipTo(state.currentIndex + 1, 'next'));

    // New simplified nav buttons
    const prevNavBtn = document.getElementById('prev-nav-btn');
    const nextNavBtn = document.getElementById('next-nav-btn');
    prevNavBtn?.addEventListener('click', () => flipTo(state.currentIndex - 1, 'prev'));
    nextNavBtn?.addEventListener('click', () => flipTo(state.currentIndex + 1, 'next'));

    // Playback
    elements.playBtn?.addEventListener('click', () => narrator.start(state.charPos));
    elements.pauseBtn?.addEventListener('click', () => narrator.pause());
    elements.resumeBtn?.addEventListener('click', () => narrator.resume());
    elements.stopBtn?.addEventListener('click', () => narrator.stop());

    // Speed
    elements.speedBtn?.addEventListener('click', () => {
      const idx = (SPEEDS.indexOf(state.currentSpeed) + 1) % SPEEDS.length;
      state.currentSpeed = SPEEDS[idx];
      if (state.currentSpeed === 1.1) {
        state.usedTurbo = true;
        saveState();
        checkAchievements();
      }
      updateSpeedButton();
      saveState();
    });

    // Voice capture
    elements.micBtn?.addEventListener('click', startVoiceCapture);
    elements.micStopBtn?.addEventListener('click', stopVoiceCapture);

    // Star earning
    elements.starBtn?.addEventListener('click', () => {
      if (state.stars < state.passages.length) {
        state.stars++;
        saveState();
        updateStats();
        buildStoryMap();
        updateNavButtons();
        safeConfetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        checkAchievements();
      }
    });

    // Book selector
    elements.bookSelect?.addEventListener('change', () => {
      const selected = elements.bookSelect.value;
      if (!isBookUnlocked(selected)) {
        setFeedback('Complete more stories to unlock this book!', 'info');
        elements.bookSelect.value = state.currentBook;
        return;
      }
      state.currentBook = selected;
      loadBook();
      saveState();
    });

    // Voice selector
    [elements.voiceSelect, elements.settingsVoiceSelect].forEach(select => {
      select?.addEventListener('change', () => {
        localStorage.setItem('voiceIndex', select.value);
        // Sync both selects
        if (elements.voiceSelect) elements.voiceSelect.value = select.value;
        if (elements.settingsVoiceSelect) elements.settingsVoiceSelect.value = select.value;
      });
    });

    // Seek slider
    elements.seekRange?.addEventListener('input', (e) => {
      const wordSpans = document.querySelectorAll('.passage-text .word');
      const wordIndex = Math.floor((e.target.value / 100) * wordSpans.length);
      state.charPos = wordIndex;
      if (state.isPlaying || state.isPaused) narrator.start(wordIndex);
      else updateReadProgress(wordIndex / (wordSpans.length || 1));
    });

    // Story map
    elements.mapBtn?.addEventListener('click', () => {
      narrator.stop(false);
      elements.storyMap.classList.remove('hidden');
    });
    elements.closeMap?.addEventListener('click', () => elements.storyMap.classList.add('hidden'));

    // Settings
    elements.settingsBtn?.addEventListener('click', () => elements.settingsModal.classList.remove('hidden'));
    elements.closeSettings?.addEventListener('click', () => elements.settingsModal.classList.add('hidden'));

    // Achievements
    elements.achievementsBtn?.addEventListener('click', () => {
      renderAchievements();
      elements.achievementsModal.classList.remove('hidden');
    });
    elements.closeAchievements?.addEventListener('click', () => elements.achievementsModal.classList.add('hidden'));

    // Help
    elements.helpBtn?.addEventListener('click', () => elements.helpModal.classList.remove('hidden'));
    elements.closeHelp?.addEventListener('click', () => elements.helpModal.classList.add('hidden'));

    // Dark mode toggle
    elements.darkModeBtn?.addEventListener('click', () => {
      state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
      applySettings();
      saveState();
    });

    // Fullscreen
    elements.fullscreenBtn?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(console.error);
      } else {
        document.exitFullscreen();
      }
    });

    // Back to top
    elements.topBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', () => {
      elements.topBtn?.classList.toggle('show', window.scrollY > 300);
    });

    // Settings controls
    elements.textSize?.addEventListener('input', (e) => {
      state.settings.textSize = parseFloat(e.target.value);
      applySettings();
      saveState();
    });

    elements.autoAdvance?.addEventListener('change', (e) => {
      state.settings.autoAdvance = e.target.checked;
      saveState();
    });

    elements.wordHintsCheckbox?.addEventListener('change', (e) => {
      state.settings.wordHints = e.target.checked;
      saveState();
    });

    // Mascot visibility
    elements.showMascotCheckbox?.addEventListener('change', (e) => {
      state.settings.showMascot = e.target.checked;
      if (elements.mascotHelper) {
        elements.mascotHelper.classList.toggle('hidden', !e.target.checked);
      }
      saveState();
    });

    // Focus mode toggle
    elements.focusModeBtn?.addEventListener('click', toggleFocusMode);

    // Mascot click for encouragement
    elements.mascotCharacter?.addEventListener('click', () => {
      showMascotMessage('encouragement');
    });

    // Celebration overlay click to dismiss
    elements.celebrationOverlay?.addEventListener('click', () => {
      elements.celebrationOverlay.classList.add('hidden');
    });

    elements.resetProgress?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
        localStorage.removeItem('phonicsworld_state');
        location.reload();
      }
    });

    // Theme options
    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', () => {
        state.settings.theme = btn.dataset.theme;
        applySettings();
        saveState();
      });
    });

    // Speed options
    document.querySelectorAll('.speed-option').forEach(btn => {
      btn.addEventListener('click', () => {
        state.currentSpeed = parseFloat(btn.dataset.speed);
        if (state.currentSpeed === 1.1) {
          state.usedTurbo = true;
          checkAchievements();
        }
        applySettings();
        updateSpeedButton();
        saveState();
      });
    });

    // Word hint speak button
    elements.hintSpeak?.addEventListener('click', () => {
      const word = elements.hintWord?.textContent;
      if (word) speakWord(word);
    });

    // Close word hint when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.word-hint') && !e.target.classList.contains('word')) {
        elements.wordHint?.classList.add('hidden');
      }
    });

    // Close modals on backdrop click
    [elements.storyMap, elements.settingsModal, elements.achievementsModal, elements.helpModal].forEach(modal => {
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      switch (e.key) {
        case 'ArrowLeft':
          if (!elements.prevBtn?.disabled) flipTo(state.currentIndex - 1, 'prev');
          break;
        case 'ArrowRight':
          if (!elements.nextBtn?.disabled) flipTo(state.currentIndex + 1, 'next');
          break;
        case ' ':
          e.preventDefault();
          if (state.isPlaying) narrator.pause();
          else if (state.isPaused) narrator.resume();
          else narrator.start(state.charPos);
          break;
        case 'm':
        case 'M':
          elements.mapBtn?.click();
          break;
        case 'f':
        case 'F':
          elements.fullscreenBtn?.click();
          break;
        case 'Escape':
          [elements.storyMap, elements.settingsModal, elements.achievementsModal, elements.helpModal].forEach(m => {
            m?.classList.add('hidden');
          });
          break;
      }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      narrator.stop(false);
      stopVoiceCapture();
      saveState();
    });
  };

  // ===== Initialization =====
  const init = async () => {
    loadState();
    applySettings();
    updateStats();
    updateSpeedButton();

    try {
      state.categories = await loadData() || {};
      Object.keys(state.categories).forEach(key => {
        if (!state.categories[key]?.length) {
          state.categories[key] = [{ title: 'Coming Soon!', text: 'More adventures on the way!', image: null }];
        }
      });

      // Populate book selector
      if (elements.bookSelect) {
        elements.bookSelect.innerHTML = '';
        Object.keys(state.categories).forEach(key => {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = key.replace('book', 'Book ');
          if (!isBookUnlocked(key)) opt.textContent += ' 🔒';
          elements.bookSelect.appendChild(opt);
        });
        elements.bookSelect.value = state.currentBook;
      }

      loadBook();
      setFeedback('Welcome to PhonicsWorld! Press Play to start.', 'success');

    } catch (err) {
      console.error('Load error:', err);
      setFeedback('Loading stories... Check your connection.', 'error');

      const cached = localStorage.getItem('passages');
      if (cached) {
        state.categories = JSON.parse(cached).data || {};
      } else {
        state.categories = {
          book1: [{ title: 'Welcome!', text: 'Stories are loading. Please wait or refresh.', image: null }]
        };
      }
      loadBook();
    }

    setupEventListeners();

    // Initialize mascot visibility
    if (elements.mascotHelper) {
      elements.mascotHelper.classList.toggle('hidden', !state.settings.showMascot);
    }
    if (elements.showMascotCheckbox) {
      elements.showMascotCheckbox.checked = state.settings.showMascot;
    }

    // Show welcome mascot message
    setTimeout(() => showMascotMessage('welcome', 5000), 1000);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(console.error);
    }
  };

  init();
});
