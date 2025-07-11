// Global variables
let passages = [],
    currentPassageIndex = 0,
    wordRanges = [],
    currentSpeakingSpan = null,
    starsEarned = 0;

const clapSound  = document.getElementById('clap-sound'),
      cheerSound = document.getElementById('cheer-sound');

// Load passages from JSON
fetch('passages.json')
  .then(response => {
    if (!response.ok) throw new Error('Failed to load stories');
    return response.json();
  })
  .then(data => {
    passages = data;
    if (!passages.length) throw new Error('No stories available');
    document.getElementById('total-stories').textContent = passages.length;
    document.documentElement.style.setProperty('--total', passages.length);
    displayPassage(0);
    updateNavigationButtons();
  })
  .catch(error => {
    console.error(error);
    document.getElementById('page').textContent = 'Oops! Stories didn’t load.';
  });

// Display a passage by index
function displayPassage(index) {
  currentPassageIndex = index;
  const p = passages[index],
        page = document.getElementById('page');

  page.innerHTML = `
    <h1 id="passage-title">${p.title}</h1>
    <p id="passage-info">
      Story <span class="highlight">${index + 1}</span> / ${passages.length}
    </p>
    <div id="passage-text">${highlightVowels(p.text)}</div>
    <img id="passage-image" src="${p.image}" alt="Story Image">
  `;

  wrapWords(document.getElementById('passage-text'));
  setupWordRanges(document.getElementById('passage-text'));

  document.getElementById('current-story').textContent = index + 1;
  document.documentElement.style.setProperty('--current', index + 1);
  updateNavigationButtons();
}

// Wrap only vowels in <span class="highlight">
function highlightVowels(text) {
  return text.replace(/[aeiou]/gi, v => `<span class="highlight">${v}</span>`);
}

// Wrap each word in a span for read-aloud highlighting
function wrapWords(container) {
  Array.from(container.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const words   = node.textContent.split(/(\s+)/),
            frag    = document.createDocumentFragment();
      words.forEach(w => {
        if (/^\s+$/.test(w)) {
          frag.append(w);
        } else {
          const span = document.createElement('span');
          span.className = 'word';
          span.innerHTML = w;  // keeps the <span class="highlight"> tags intact
          frag.append(span);
        }
      });
      container.replaceChild(frag, node);
    }
  });
}

// Build character-index ranges for each word span
function setupWordRanges(textDiv) {
  let cumulative = 0;
  wordRanges = [];
  Array.from(textDiv.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      cumulative += node.textContent.length;
    } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('word')) {
      const len = node.textContent.length;
      wordRanges.push({ span: node, start: cumulative, end: cumulative + len - 1 });
      cumulative += len;
    }
  });
}

// Enable/disable nav & star buttons
function updateNavigationButtons() {
  document.getElementById('prev-btn').disabled = currentPassageIndex === 0;
  document.getElementById('next-btn').disabled = currentPassageIndex === passages.length - 1;
  document.getElementById('star-btn').disabled = currentPassageIndex === 0 || starsEarned >= passages.length;
}

// Animate page flip and switch passage
function switchToPassage(newIndex, direction) {
  if (newIndex < 0 || newIndex >= passages.length) return;
  clapSound.play();

  const oldPage = document.getElementById('page'),
        newPage = oldPage.cloneNode(false);

  newPage.id = 'page';
  newPage.classList.add(direction === 'next' ? 'slide-right' : 'slide-left');
  newPage.innerHTML = oldPage.innerHTML;
  document.getElementById('book').append(newPage);

  requestAnimationFrame(() => {
    oldPage.classList.add(direction === 'next' ? 'slide-left' : 'slide-right');
    newPage.classList.remove(direction === 'next' ? 'slide-right' : 'slide-left');
  });

  setTimeout(() => {
    oldPage.remove();
    displayPassage(newIndex);
  }, 500);
}

// Award a star and trigger confetti
function earnStar() {
  if (currentPassageIndex > 0 && starsEarned < passages.length) {
    starsEarned++;
    document.getElementById('star-count').textContent = starsEarned;
    cheerSound.play();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    document.getElementById('star-btn').disabled = true;
    if (starsEarned === passages.length) {
      alert('Wow! You read all stories! You’re a superstar! 🌟');
    }
  }
}

// Read-aloud button
document.getElementById('play-btn').addEventListener('click', () => {
  window.speechSynthesis.cancel();
  if (currentSpeakingSpan) currentSpeakingSpan.classList.remove('speaking');

  const text = document.getElementById('passage-text').textContent,
        u    = new SpeechSynthesisUtterance(text);

  u.rate = 0.8;
  u.onboundary = event => {
    if (event.name === 'word') {
      currentSpeakingSpan?.classList.remove('speaking');
      const r = wordRanges.find(r => event.charIndex >= r.start && event.charIndex <= r.end);
      if (r) {
        currentSpeakingSpan = r.span;
        r.span.classList.add('speaking');
      }
    }
  };
  u.onend = () => currentSpeakingSpan?.classList.remove('speaking');

  window.speechSynthesis.speak(u);
});

// Prev/Next event handlers
document.getElementById('prev-btn').addEventListener('click', () => {
  window.speechSynthesis.cancel();
  currentSpeakingSpan?.classList.remove('speaking');
  switchToPassage(currentPassageIndex - 1, 'prev');
});

document.getElementById('next-btn').addEventListener('click', () => {
  window.speechSynthesis.cancel();
  currentSpeakingSpan?.classList.remove('speaking');
  switchToPassage(currentPassageIndex + 1, 'next');
});

// Star button
document.getElementById('star-btn').addEventListener('click', earnStar);
