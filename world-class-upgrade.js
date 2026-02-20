/**
 * World-class upgrades: mission system, smart coach, league table, and tab UX.
 */
(() => {
  const STORAGE_KEY = 'pw_daily_missions';

  const missionTemplates = [
    { id: 'xp20', label: 'Earn 20 XP', xpReward: 10, goal: 20, type: 'xp' },
    { id: 'read1', label: 'Read 1 story', xpReward: 8, goal: 1, type: 'stories' },
    { id: 'review5', label: 'Review 5 words', xpReward: 12, goal: 5, type: 'reviews' },
    { id: 'combo3', label: 'Hit a 3 combo', xpReward: 10, goal: 3, type: 'combo' }
  ];

  const safeParse = (value, fallback) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  const getTodayKey = () => new Date().toISOString().slice(0, 10);

  const getMissionState = () => {
    const raw = safeParse(localStorage.getItem(STORAGE_KEY), null);
    const today = getTodayKey();
    if (raw && raw.date === today) return raw;

    const picks = [missionTemplates[0], missionTemplates[1], missionTemplates[2]].map(m => ({ ...m, progress: 0, claimed: false }));
    const fresh = { date: today, missions: picks };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  };

  const saveMissionState = (state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const getPhonicsState = () => safeParse(localStorage.getItem('phonicsworld_state'), {}) || {};

  const syncMissionProgress = (state) => {
    const app = getPhonicsState();
    const gamification = (typeof Gamification !== 'undefined' && Gamification.getState) ? Gamification.getState() : { dailyXP: 0, currentCombo: 0 };
    const reviewCount = (typeof Vocabulary !== 'undefined' && Vocabulary.getReviewCount) ? Vocabulary.getReviewCount() : 0;

    state.missions.forEach((mission) => {
      if (mission.type === 'xp') mission.progress = Math.min(mission.goal, gamification.dailyXP || 0);
      if (mission.type === 'stories') mission.progress = Math.min(mission.goal, app.storiesRead || 0);
      if (mission.type === 'reviews') mission.progress = Math.min(mission.goal, reviewCount);
      if (mission.type === 'combo') mission.progress = Math.min(mission.goal, gamification.currentCombo || 0);
    });
  };

  const createMissionRow = (mission, state, rerender) => {
    const wrap = document.createElement('div');
    wrap.className = 'mission-row';

    const done = mission.progress >= mission.goal;

    wrap.innerHTML = `
      <div class="mission-main">
        <strong>${mission.label}</strong>
        <span>${mission.progress}/${mission.goal}</span>
      </div>
      <div class="mission-track"><div class="mission-fill" style="width:${Math.min(100, (mission.progress / mission.goal) * 100)}%"></div></div>
      <button class="mission-claim" ${(!done || mission.claimed) ? 'disabled' : ''}>${mission.claimed ? 'Claimed' : `Claim +${mission.xpReward} XP`}</button>
    `;

    wrap.querySelector('.mission-claim')?.addEventListener('click', () => {
      if (!done || mission.claimed) return;
      mission.claimed = true;
      if (typeof Gamification !== 'undefined' && Gamification.addXP) {
        Gamification.addXP(mission.xpReward, 'Daily mission');
      }
      saveMissionState(state);
      rerender();
    });

    return wrap;
  };

  const renderMissions = () => {
    const list = document.getElementById('missions-list');
    const xpLeft = document.getElementById('missions-xp-left');
    if (!list || !xpLeft) return;

    const state = getMissionState();
    syncMissionProgress(state);
    saveMissionState(state);

    list.innerHTML = '';
    let remaining = 0;

    const rerender = () => renderMissions();
    state.missions.forEach((mission) => {
      if (!mission.claimed) remaining += mission.xpReward;
      list.appendChild(createMissionRow(mission, state, rerender));
    });

    xpLeft.textContent = `+${remaining} XP left`;
  };

  const renderLeague = () => {
    const leagueList = document.getElementById('league-list');
    if (!leagueList || typeof Gamification === 'undefined') return;

    const me = {
      name: 'You',
      xp: Gamification.getXP(),
      isMe: true
    };

    const bots = ['Luna', 'Kai', 'Milo', 'Zoe', 'Noah', 'Ava'].map((name, i) => ({
      name,
      xp: Math.max(0, me.xp + (i - 2) * 35 + (i * 7)),
      isMe: false
    }));

    const table = [me, ...bots].sort((a, b) => b.xp - a.xp).slice(0, 7);

    leagueList.innerHTML = '';
    table.forEach((player, idx) => {
      const row = document.createElement('div');
      row.className = `league-row ${player.isMe ? 'is-me' : ''}`;
      row.innerHTML = `<span>#${idx + 1} ${player.name}</span><strong>${player.xp} XP</strong>`;
      leagueList.appendChild(row);
    });
  };

  const renderCoachTip = () => {
    const tip = document.getElementById('coach-tip');
    if (!tip || typeof Vocabulary === 'undefined' || typeof Gamification === 'undefined') return;

    const weak = Vocabulary.getWeakWords(3);
    const streak = getPhonicsState().streak || 0;

    if (weak.length > 0) {
      tip.textContent = `Focus words: ${weak.map(w => w.word).join(', ')}. You are ${Math.max(0, 7 - streak)} days from a 7-day streak badge.`;
      return;
    }

    const due = Vocabulary.getReviewCount();
    tip.textContent = due > 0
      ? `${due} words are ready for practice. A short session now keeps your streak alive.`
      : `Great momentum. Try a Power Minute to stack quick XP and climb your league.`;
  };

  const bindCoachActions = () => {
    document.getElementById('coach-power-minute')?.addEventListener('click', () => {
      if (typeof Gamification !== 'undefined' && Gamification.addXP) {
        Gamification.addXP(5, 'Power minute');
      }
      renderMissions();
      renderLeague();
      renderCoachTip();
    });

    document.getElementById('coach-practice-weak')?.addEventListener('click', () => {
      if (typeof Vocabulary === 'undefined') return;
      const weak = Vocabulary.getWeakWords(1);
      if (weak.length) {
        Vocabulary.recordCorrect(weak[0].word);
      }
      renderCoachTip();
      renderMissions();
    });
  };

  const setupTabNavigation = () => {
    const tabs = [...document.querySelectorAll('.tab-item')];
    const contents = [...document.querySelectorAll('.tab-content')];
    if (!tabs.length || !contents.length) return;

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach(t => t.classList.toggle('active', t === tab));
        contents.forEach(c => c.classList.toggle('active', c.id === `tab-${target}`));
      });
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    setupTabNavigation();
    bindCoachActions();
    renderMissions();
    renderCoachTip();
    renderLeague();

    if (typeof Gamification !== 'undefined' && Gamification.onChange) {
      Gamification.onChange(() => {
        renderMissions();
        renderLeague();
      });
    }
  });
})();

if (typeof module !== 'undefined') {
  module.exports = {};
}
