/**
 * PhonicsWorld Vocabulary & Spaced Repetition System
 * Tracks every word, schedules reviews using SM-2 inspired algorithm
 */
const Vocabulary = (() => {
  // Word data: { word, strength, nextReview, interval, easeFactor, timesCorrect, timesIncorrect, introduced }
  let words = {};
  let listeners = [];

  const emit = (event, data) => {
    listeners.forEach(fn => fn(event, data));
  };

  const save = () => {
    localStorage.setItem('pw_vocabulary', JSON.stringify(words));
  };

  const load = () => {
    const saved = localStorage.getItem('pw_vocabulary');
    if (saved) {
      words = JSON.parse(saved);
    }
  };

  const normalizeWord = (w) => w.toLowerCase().replace(/[^a-z']/g, '');

  const getWordData = (word) => {
    const key = normalizeWord(word);
    if (!key) return null;
    if (!words[key]) {
      words[key] = {
        word: key,
        strength: 0,        // 0-5 (0=new, 5=mastered)
        nextReview: 0,       // timestamp
        interval: 0,         // days
        easeFactor: 2.5,     // SM-2 ease factor
        timesCorrect: 0,
        timesIncorrect: 0,
        introduced: Date.now(),
        lastSeen: Date.now()
      };
    }
    return words[key];
  };

  // SM-2 inspired algorithm
  const updateWord = (word, quality) => {
    // quality: 0 (wrong) to 5 (perfect)
    const data = getWordData(word);
    if (!data) return;

    data.lastSeen = Date.now();

    if (quality >= 3) {
      // Correct
      data.timesCorrect++;
      if (data.interval === 0) {
        data.interval = 1;
      } else if (data.interval === 1) {
        data.interval = 3;
      } else {
        data.interval = Math.round(data.interval * data.easeFactor);
      }
      data.easeFactor = Math.max(1.3, data.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
      data.strength = Math.min(5, data.strength + (quality >= 4 ? 1 : 0.5));
    } else {
      // Incorrect
      data.timesIncorrect++;
      data.interval = 0;
      data.strength = Math.max(0, data.strength - 1);
    }

    data.nextReview = Date.now() + data.interval * 24 * 60 * 60 * 1000;
    save();
    return data;
  };

  // Extract words from passage text
  const extractWords = (text) => {
    return text.replace(/<[^>]+>/g, '')
      .split(/\s+/)
      .map(w => normalizeWord(w))
      .filter(w => w.length >= 2);
  };

  // Introduce words from a passage
  const introduceFromPassage = (text) => {
    const passageWords = extractWords(text);
    const newWords = [];
    passageWords.forEach(w => {
      const data = getWordData(w);
      if (data && data.timesCorrect === 0 && data.timesIncorrect === 0) {
        newWords.push(w);
      }
    });
    save();
    return newWords;
  };

  return {
    load,
    save,

    onChange(fn) {
      listeners.push(fn);
      return () => { listeners = listeners.filter(f => f !== fn); };
    },

    // Record a correct response
    recordCorrect(word) {
      return updateWord(word, 4);
    },

    // Record a perfect response (fast, no hesitation)
    recordPerfect(word) {
      return updateWord(word, 5);
    },

    // Record an incorrect response
    recordIncorrect(word) {
      return updateWord(word, 1);
    },

    // Record a partial match
    recordPartial(word) {
      return updateWord(word, 3);
    },

    // Get words due for review
    getDueWords(limit = 20) {
      const now = Date.now();
      return Object.values(words)
        .filter(w => w.nextReview <= now && w.strength < 5)
        .sort((a, b) => a.nextReview - b.nextReview)
        .slice(0, limit);
    },

    // Get weak words (struggling with)
    getWeakWords(limit = 10) {
      return Object.values(words)
        .filter(w => w.timesIncorrect > 0)
        .sort((a, b) => {
          const aRatio = a.timesCorrect / (a.timesCorrect + a.timesIncorrect);
          const bRatio = b.timesCorrect / (b.timesCorrect + b.timesIncorrect);
          return aRatio - bRatio;
        })
        .slice(0, limit);
    },

    // Get recently learned words
    getRecentWords(limit = 20) {
      return Object.values(words)
        .sort((a, b) => b.introduced - a.introduced)
        .slice(0, limit);
    },

    // Get mastered words
    getMasteredWords() {
      return Object.values(words).filter(w => w.strength >= 4);
    },

    // Get total word count
    getTotalWords() {
      return Object.keys(words).length;
    },

    // Get strength distribution
    getStrengthDistribution() {
      const dist = [0, 0, 0, 0, 0, 0]; // strength 0-5
      Object.values(words).forEach(w => {
        dist[Math.floor(w.strength)]++;
      });
      return dist;
    },

    // Check if review is available
    hasReviewAvailable() {
      return this.getDueWords(1).length > 0;
    },

    // Get review count
    getReviewCount() {
      return this.getDueWords(100).length;
    },

    // Introduce words from passage
    introduceFromPassage,

    // Extract words from text
    extractWords,

    // Get word data
    getWordData(word) {
      const key = normalizeWord(word);
      return words[key] || null;
    },

    // Get all words
    getAllWords: () => ({ ...words }),

    reset() {
      words = {};
      save();
    }
  };
})();
