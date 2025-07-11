document.addEventListener('DOMContentLoaded', () => {
  let passages = [],
      currentIndex = 0,
      wordRanges = [], // Global, but reset per passage
      currentSpeakingSpan = null,
      stars = 0,
      currentSpeed = 0.6; // Default to "Slow" for 4-5-year-olds

  const whooshSound = document.getElementById('whoosh-sound'),
        cheerSound = document.getElementById('cheer-sound'),
        speedBtn = document.getElementById('speed-btn');

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
      showPassage(0);
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

  // Enable/disable Prev, Next, Star buttons
  function updateNavButtons() {
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    document.getElementById('next-btn').disabled = currentIndex === passages.length - 1;
    document.getElementById('star-btn').disabled = currentIndex === 0 || stars >= passages.length;
  }

  // Flip pages with animation
  function flipTo(idx, dir) {
    if (idx < 0 || idx >= passages.length) return;
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
    const speeds = [0.3, 0.6, 0.9, 1.2]; // Very Slow, Slow, Normal, Fast
    const labels = ['Very Slow', 'Slow', 'Normal', 'Fast'];
    const currentIndex = speeds.indexOf(currentSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    currentSpeed = speeds[nextIndex];
    speedBtn.textContent = `Speed: ${labels[nextIndex]}`;
    console.log(`Speed set to: ${currentSpeed}`); // Debug log
  }

  // Read-aloud with word highlighting
  document.getElementById('play-btn').addEventListener('click', () => {
    window.speechSynthesis.cancel();
    if (currentSpeakingSpan) {
      currentSpeakingSpan.classList.remove('speaking');
      currentSpeakingSpan = null;
    }

    const text = document.getElementById('passage-text').textContent || '';
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = currentSpeed; // Use current speed

    utter.onboundary = event => {
      if (event.name === 'word') {
        if (currentSpeakingSpan) {
          currentSpeakingSpan.classList.remove('speaking');
        }
        const range = wordRanges.find(r =>
          event.charIndex >= r.start && event.charIndex <= r.end
        );
        if (range) {
          range.span.classList.add('speaking');
          currentSpeakingSpan = range.span;
        }
      }
    };

    utter.onend = () => {
      if (currentSpeakingSpan) {
        currentSpeakingSpan.classList.remove('speaking');
        currentSpeakingSpan = null;
      }
    };

    window.speechSynthesis.speak(utter);
  });

  // Speed button with touch support
  speedBtn.addEventListener('click', adjustSpeed);
  speedBtn.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent default touch behavior
    adjustSpeed();
  }, { passive: false });

  // Prev/Next buttons
  document.getElementById('prev-btn').addEventListener('click', () => flipTo(currentIndex - 1, 'prev'));
  document.getElementById('next-btn').addEventListener('click', () => flipTo(currentIndex + 1, 'next'));
});
