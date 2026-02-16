/**
 * PhonicsWorld Sound Effects Engine
 * Synthesized sounds using Web Audio API - no external files needed
 */
const SoundEngine = (() => {
  let ctx = null;
  let enabled = true;

  const getCtx = () => {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio not supported');
        return null;
      }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  const playTone = (freq, duration, type = 'sine', volume = 0.3, delay = 0) => {
    const c = getCtx();
    if (!c || !enabled) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration);
  };

  const playNoise = (duration, volume = 0.1) => {
    const c = getCtx();
    if (!c || !enabled) return;
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }
    const source = c.createBufferSource();
    source.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    source.connect(gain);
    gain.connect(c.destination);
    source.start();
  };

  return {
    enable() { enabled = true; },
    disable() { enabled = false; },
    toggle() { enabled = !enabled; return enabled; },
    isEnabled() { return enabled; },

    // Correct answer - cheerful ascending ding
    correct() {
      playTone(523, 0.12, 'sine', 0.25);       // C5
      playTone(659, 0.12, 'sine', 0.25, 0.08);  // E5
      playTone(784, 0.2, 'sine', 0.3, 0.16);    // G5
    },

    // Wrong answer - gentle low buzz
    incorrect() {
      playTone(200, 0.15, 'square', 0.12);
      playTone(180, 0.2, 'square', 0.1, 0.1);
    },

    // Tap/click feedback
    tap() {
      playTone(800, 0.05, 'sine', 0.15);
    },

    // Select an option
    select() {
      playTone(600, 0.08, 'sine', 0.2);
      playTone(900, 0.06, 'sine', 0.15, 0.06);
    },

    // Complete a lesson - triumphant fanfare
    lessonComplete() {
      playTone(523, 0.15, 'sine', 0.25);         // C5
      playTone(659, 0.15, 'sine', 0.25, 0.12);   // E5
      playTone(784, 0.15, 'sine', 0.25, 0.24);   // G5
      playTone(1047, 0.4, 'sine', 0.35, 0.36);   // C6
      playTone(784, 0.15, 'sine', 0.2, 0.56);    // G5
      playTone(1047, 0.5, 'sine', 0.3, 0.68);    // C6
    },

    // Level up - epic ascending
    levelUp() {
      const notes = [262, 330, 392, 523, 659, 784, 1047];
      notes.forEach((f, i) => {
        playTone(f, 0.15, 'sine', 0.2 + i * 0.02, i * 0.08);
      });
    },

    // Lost a heart
    heartLost() {
      playTone(400, 0.2, 'sine', 0.2);
      playTone(350, 0.2, 'sine', 0.18, 0.15);
      playTone(300, 0.3, 'sine', 0.15, 0.3);
    },

    // Earn XP tick
    xpTick() {
      playTone(1200, 0.04, 'sine', 0.1);
    },

    // Star earned
    starEarned() {
      playTone(784, 0.1, 'sine', 0.25);
      playTone(988, 0.1, 'sine', 0.25, 0.08);
      playTone(1175, 0.1, 'sine', 0.3, 0.16);
      playTone(1568, 0.3, 'sine', 0.35, 0.24);
    },

    // Achievement unlock
    achievement() {
      playTone(523, 0.1, 'triangle', 0.2);
      playTone(659, 0.1, 'triangle', 0.2, 0.1);
      playTone(784, 0.1, 'triangle', 0.2, 0.2);
      playTone(1047, 0.15, 'triangle', 0.25, 0.3);
      playTone(1175, 0.1, 'triangle', 0.2, 0.42);
      playTone(1318, 0.1, 'triangle', 0.2, 0.5);
      playTone(1568, 0.4, 'triangle', 0.3, 0.6);
    },

    // Streak milestone
    streak() {
      for (let i = 0; i < 5; i++) {
        playTone(600 + i * 100, 0.1, 'sine', 0.2, i * 0.06);
      }
    },

    // Button hover
    hover() {
      playTone(1000, 0.03, 'sine', 0.05);
    },

    // Countdown tick
    tick() {
      playTone(1000, 0.03, 'square', 0.08);
    },

    // Combo multiplier
    combo(level) {
      const base = 400 + level * 100;
      playTone(base, 0.08, 'sine', 0.2);
      playTone(base * 1.5, 0.1, 'sine', 0.25, 0.05);
    },

    // Whoosh transition
    whoosh() {
      const c = getCtx();
      if (!c || !enabled) return;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2000, c.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.2);
    },

    // Initialize on first user interaction
    init() {
      getCtx();
    }
  };
})();
