/**
 * PhonicsWorld Gamification System
 * XP, Levels, Hearts, Daily Goals, Streaks, Leagues
 */
const Gamification = (() => {
  // Level thresholds - exponential curve
  const LEVEL_XP = [];
  for (let i = 0; i <= 60; i++) {
    LEVEL_XP.push(Math.floor(i === 0 ? 0 : 50 * Math.pow(1.15, i - 1)));
  }

  const LEAGUES = [
    { id: 'bronze', name: 'Bronze', icon: '🥉', minLevel: 1, color: '#CD7F32' },
    { id: 'silver', name: 'Silver', icon: '🥈', minLevel: 5, color: '#C0C0C0' },
    { id: 'gold', name: 'Gold', icon: '🥇', minLevel: 10, color: '#FFD700' },
    { id: 'platinum', name: 'Platinum', icon: '💎', minLevel: 20, color: '#E5E4E2' },
    { id: 'diamond', name: 'Diamond', icon: '💠', minLevel: 30, color: '#B9F2FF' },
    { id: 'master', name: 'Master', icon: '👑', minLevel: 40, color: '#FF6B6B' },
    { id: 'legend', name: 'Legend', icon: '🌟', minLevel: 50, color: '#FFD700' }
  ];

  const DAILY_GOALS = [
    { xp: 10, label: 'Casual', icon: '🌱', desc: 'Perfect for busy days' },
    { xp: 20, label: 'Regular', icon: '📚', desc: 'Steady learning pace' },
    { xp: 30, label: 'Serious', icon: '🔥', desc: 'Make real progress' },
    { xp: 50, label: 'Intense', icon: '⚡', desc: 'For the dedicated learner' }
  ];

  const MAX_HEARTS = 5;
  const HEART_RECHARGE_MS = 4 * 60 * 60 * 1000; // 4 hours per heart

  // XP rewards
  const XP_REWARDS = {
    correctAnswer: 10,
    perfectLesson: 15,    // bonus
    streakBonus: 5,       // per combo level
    lessonComplete: 20,
    firstTry: 5,          // bonus for no mistakes
    speedBonus: 10,       // fast completion
    reviewComplete: 10,
    readAloud: 15,
    perfectPronunciation: 20
  };

  // Default state
  const defaultState = () => ({
    xp: 0,
    level: 1,
    hearts: MAX_HEARTS,
    lastHeartLoss: null,
    dailyGoal: 20,
    dailyXP: 0,
    dailyGoalStreak: 0,
    lastDailyGoalDate: null,
    totalLessonsCompleted: 0,
    totalCorrectAnswers: 0,
    totalIncorrectAnswers: 0,
    currentCombo: 0,
    bestCombo: 0,
    weeklyXP: [0, 0, 0, 0, 0, 0, 0], // Sun-Sat
    lessonHistory: [], // last 50 lessons
    perfectLessons: 0
  });

  let state = defaultState();
  let listeners = [];

  const emit = (event, data) => {
    listeners.forEach(fn => fn(event, data));
  };

  const save = () => {
    localStorage.setItem('pw_gamification', JSON.stringify(state));
  };

  const load = () => {
    const saved = localStorage.getItem('pw_gamification');
    if (saved) {
      const data = JSON.parse(saved);
      state = { ...defaultState(), ...data };
    }
    rechargeHearts();
    checkDailyReset();
  };

  const rechargeHearts = () => {
    if (state.hearts >= MAX_HEARTS || !state.lastHeartLoss) return;
    const elapsed = Date.now() - state.lastHeartLoss;
    const heartsToRecharge = Math.floor(elapsed / HEART_RECHARGE_MS);
    if (heartsToRecharge > 0) {
      state.hearts = Math.min(MAX_HEARTS, state.hearts + heartsToRecharge);
      if (state.hearts >= MAX_HEARTS) {
        state.lastHeartLoss = null;
      } else {
        state.lastHeartLoss += heartsToRecharge * HEART_RECHARGE_MS;
      }
      save();
    }
  };

  const checkDailyReset = () => {
    const today = new Date().toDateString();
    if (state.lastDailyGoalDate !== today) {
      // Check if yesterday's goal was met
      if (state.lastDailyGoalDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (state.lastDailyGoalDate === yesterday.toDateString()) {
          // Yesterday exists - check if goal was met
          // If daily XP was met, streak continues (handled in addXP)
        } else {
          // Missed a day - reset streak
          state.dailyGoalStreak = 0;
        }
      }
      state.dailyXP = 0;
      save();
    }
  };

  const getLevel = (xp) => {
    let totalNeeded = 0;
    for (let i = 1; i < LEVEL_XP.length; i++) {
      totalNeeded += LEVEL_XP[i];
      if (xp < totalNeeded) return i;
    }
    return LEVEL_XP.length;
  };

  const getXPForLevel = (level) => {
    let total = 0;
    for (let i = 1; i <= level; i++) {
      total += LEVEL_XP[i] || LEVEL_XP[LEVEL_XP.length - 1];
    }
    return total;
  };

  const getXPProgress = () => {
    let spent = 0;
    for (let i = 1; i < state.level; i++) {
      spent += LEVEL_XP[i] || LEVEL_XP[LEVEL_XP.length - 1];
    }
    const current = state.xp - spent;
    const needed = LEVEL_XP[state.level] || LEVEL_XP[LEVEL_XP.length - 1];
    return { current, needed, percentage: Math.min(100, (current / needed) * 100) };
  };

  const getLeague = () => {
    let league = LEAGUES[0];
    for (const l of LEAGUES) {
      if (state.level >= l.minLevel) league = l;
    }
    return league;
  };

  const getNextHeartTime = () => {
    if (state.hearts >= MAX_HEARTS || !state.lastHeartLoss) return null;
    const nextRecharge = state.lastHeartLoss + HEART_RECHARGE_MS;
    return Math.max(0, nextRecharge - Date.now());
  };

  return {
    DAILY_GOALS,
    LEAGUES,
    MAX_HEARTS,
    XP_REWARDS,

    load,
    save,
    getState: () => ({ ...state }),

    onChange(fn) {
      listeners.push(fn);
      return () => { listeners = listeners.filter(f => f !== fn); };
    },

    addXP(amount, reason = '') {
      const oldLevel = state.level;
      state.xp += amount;
      state.dailyXP += amount;
      state.level = getLevel(state.xp);

      // Track weekly XP
      const day = new Date().getDay();
      state.weeklyXP[day] = (state.weeklyXP[day] || 0) + amount;

      // Check daily goal
      const today = new Date().toDateString();
      if (state.dailyXP >= state.dailyGoal && state.lastDailyGoalDate !== today) {
        state.lastDailyGoalDate = today;
        state.dailyGoalStreak++;
        emit('dailyGoalMet', { streak: state.dailyGoalStreak });
      }

      // Check level up
      if (state.level > oldLevel) {
        emit('levelUp', { oldLevel, newLevel: state.level, league: getLeague() });
      }

      emit('xpGained', { amount, reason, total: state.xp });
      save();
    },

    loseHeart() {
      if (state.hearts <= 0) return false;
      state.hearts--;
      state.lastHeartLoss = Date.now();
      emit('heartLost', { remaining: state.hearts });
      save();
      return true;
    },

    getHearts() {
      rechargeHearts();
      return state.hearts;
    },

    hasHearts() {
      rechargeHearts();
      return state.hearts > 0;
    },

    refillHearts() {
      state.hearts = MAX_HEARTS;
      state.lastHeartLoss = null;
      save();
    },

    incrementCombo() {
      state.currentCombo++;
      if (state.currentCombo > state.bestCombo) {
        state.bestCombo = state.currentCombo;
      }
      emit('combo', { combo: state.currentCombo });
      return state.currentCombo;
    },

    resetCombo() {
      state.currentCombo = 0;
    },

    getCombo: () => state.currentCombo,
    getBestCombo: () => state.bestCombo,

    recordCorrect() {
      state.totalCorrectAnswers++;
      save();
    },

    recordIncorrect() {
      state.totalIncorrectAnswers++;
      save();
    },

    completedLesson(data) {
      state.totalLessonsCompleted++;
      if (data.perfect) state.perfectLessons++;
      state.lessonHistory.push({
        date: Date.now(),
        xp: data.xp,
        accuracy: data.accuracy,
        skill: data.skill
      });
      if (state.lessonHistory.length > 50) {
        state.lessonHistory = state.lessonHistory.slice(-50);
      }
      emit('lessonComplete', data);
      save();
    },

    setDailyGoal(xp) {
      state.dailyGoal = xp;
      save();
    },

    getLevel: () => state.level,
    getXP: () => state.xp,
    getDailyXP: () => state.dailyXP,
    getDailyGoal: () => state.dailyGoal,
    getDailyGoalStreak: () => state.dailyGoalStreak,
    getXPProgress,
    getLeague,
    getNextHeartTime,
    getTotalLessons: () => state.totalLessonsCompleted,
    getPerfectLessons: () => state.perfectLessons,
    getWeeklyXP: () => [...state.weeklyXP],
    getAccuracy: () => {
      const total = state.totalCorrectAnswers + state.totalIncorrectAnswers;
      return total > 0 ? Math.round((state.totalCorrectAnswers / total) * 100) : 0;
    },

    reset() {
      state = defaultState();
      save();
    }
  };
})();
