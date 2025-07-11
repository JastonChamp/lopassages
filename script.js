```javascript
document.addEventListener('DOMContentLoaded', () => {
  let passages = [],
      currentIndex = 0,
      wordRanges = [],
      currentSpeakingSpan = null,
      stars = 0;

  const clapSound  = document.getElementById('clap-sound'),
        cheerSound = document.getElementById('cheer-sound');

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
  function showPassage(i) {
    currentIndex = i;
    const p  = passages[i];
    const pg = document.getElementById('page');

    pg.innerHTML = `
      <h1 id="passage-title">${p.title}</h1>
      <p id="passage-info">
        Story <span class="highlight">${i+1}</span> / ${passages.length}
      </p>
      <div id="passage-text">${p.text}</div>
      <img id="passage-image" src="${p.image}" alt="Story Image" onerror="this.style.display='none'">
    `;

    // Wrap words and highlight vowels
    const textDiv = document.getElementById('passage-text');
    wrapWords(textDiv);
    highlightVowelsOnDOM(textDiv);
    buildRanges(textDiv);

    // Update counters
    document.getElementById('current-story').textContent = i+1;
    document.documentElement.style.setProperty('--current', i+1);
    updateNavButtons();
  }

  // Wrap each word in a <span class="word">
  function wrapWords(container) {
    Array.from(container.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split(/(\s+)/),
              frag  = document.createDocumentFragment();
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
      }
    });
  }

  // Highlight vowels inside each word-span without mangling HTML
  function highlightVowelsOnDOM(container) {
    container.querySelectorAll('.word').forEach(span => {
      const chars = span.textContent.split('');
      span.innerHTML = chars.map(ch => 
        /[aeiou]/i.test(ch)
          ? `<span class="highlight">${ch}</span>`
          : ch
      ).join('');
    });
  }

  // Build character-index ranges for syncing spoken words
  function buildRanges(div) {
    let cumulative = 0;
    wordRanges = [];
    Array.from(div.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        cumulative += node.textContent.length;
      } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('word')) {
        const length = node.textContent.length;
        wordRanges.push({ span: node, start: cumulative, end: cumulative + length - 1 });
        cumulative += length;
      }
    });
  }

  // Enable/disable Prev, Next, and Star buttons
  function updateNavButtons() {
    document.getElementById('prev-btn').disabled = currentIndex === 0;
    document.getElementById('next-btn').disabled = currentIndex === passages.length - 1;
    document.getElementById('star-btn').disabled = currentIndex === 0 || stars >= passages.length;
  }

  // Flip to another passage with animation
  function flipTo(index, direction) {
    if (index < 0 || index >= passages.length) return;
    clapSound.play();

    const oldPage = document.getElementById('page'),
          newPage = oldPage.cloneNode(false);
    newPage.id = 'page';
    newPage.classList.add(direction === 'next' ? 'slide-right' : 'slide-left');

    showPassage(index);
    document.getElementById('book').appendChild(newPage);

    requestAnimationFrame(() => {
      oldPage.classList.add(direction === 'next' ? 'slide-left' : 'slide-right');
      newPage.classList.remove(direction === 'next' ? 'slide-right' : 'slide-left');
    });

    setTimeout(() => oldPage.remove(), 500);
  }

  // Earn a star and trigger confetti
  document.getElementById('star-btn').addEventListener('click', () => {
    if (currentIndex > 0 && stars < passages.length) {
      stars++;
      document.getElementById('star-count').textContent = stars;
      cheerSound.play();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      updateNavButtons();
    }
  });

  // Read-aloud functionality with word highlighting
  document.getElementById('play-btn').addEventListener('click', () => {
    window.speechSynthesis.cancel();
    if (currentSpeakingSpan) currentSpeakingSpan.classList.remove('speaking');

    const text = document.getElementById('passage-text').textContent || '';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;

    utterance.onboundary = event => {
      if (event.name === 'word') {
        if (currentSpeakingSpan) currentSpeakingSpan.classList.remove('speaking');
        const range = wordRanges.find(r => event.charIndex >= r.start && event.charIndex <= r.end);
        if (range) {
          range.span.classList.add('speaking');
          currentSpeakingSpan = range.span;
        }
      }
    };

    utterance.onend = () => {
      if (currentSpeakingSpan) currentSpeakingSpan.classList.remove('speaking');
      currentSpeakingSpan = null;
    };

    window.speechSynthesis.speak(utterance);
  });

  // Prev/Next handlers
  document.getElementById('prev-btn').addEventListener('click', () => flipTo(currentIndex - 1, 'prev'));
  document.getElementById('next-btn').addEventListener('click', () => flipTo(currentIndex + 1, 'next'));
});
```
