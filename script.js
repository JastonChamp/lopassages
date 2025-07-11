// Global variables
let passages = [];
let currentPassageIndex = 0;
let wordRanges = [];
let currentSpeakingSpan = null;
let starsEarned = 0;

const clapSound = document.getElementById('clap-sound');
const cheerSound = document.getElementById('cheer-sound');

// Load passages from JSON
fetch('passages.json')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('Fetched data:', data); // Debug log
    passages = data;
    if (!passages.length) throw new Error('No stories available');
    document.getElementById('total-stories').textContent = passages.length;
    document.documentElement.style.setProperty('--total', passages.length);
    displayPassage(0);
    updateNavigationButtons();
  })
  .catch(error => {
    console.error('Error loading stories:', error);
    document.getElementById('page').innerHTML = `
      <p>Oops! Stories didn’t load. Check the console for details or ensure 'passages.json' is in the same folder.</p>
      <p>Try running a local server (e.g., 'python -m http.server 8000') and access via http://localhost:8000.</p>
    `;
    // Fallback to a sample passage if fetch fails
    passages = [{
      "title": "Sample Story",
      "text": "This is a <span class='highlight'>s</span>ample <span class='highlight'>t</span>ext.",
      "image": "images/sample.png"
    }];
    displayPassage(0);
  });

// Display a passage by index
function displayPassage(index) {
  currentPassageIndex = index;
  const passage = passages[index];
  const page = document.getElementById('page');
  if (!passage) {
    page.innerHTML = `<p>No story found at index ${index}!</p>`;
    return;
  }
  page.innerHTML = `
    <h1 id="passage-title">${passage.title}</h1>
    <p id="passage-info">Story <span class="highlight">${index + 1}</span> / ${passages.length}</p>
    <div id="passage-text">${highlightVowels(passage.text)}</div>
    <img id="passage-image" src="${passage.image}" alt="Story Image">
  `;
  wrapWords(document.getElementById('passage-text'));
  setupWordRanges(document.getElementById('passage-text'));
  document.getElementById('current-story').textContent = index + 1;
  document.documentElement.style.setProperty('--current', index + 1);
  updateNavigationButtons();
  console.log('Displayed passage:', passage); // Debug log
}

// Highlight only vowels
function highlightVowels(text) {
  return text.replace(/[aeiou]/gi, match => `<span class="highlight">${match}</span>`);
}

// Wrap each word in a span, preserving punctuation and highlights
function wrapWords(container) {
  Array.from(container.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const words = node.textContent.replace(/([.,!?])/g, '$1 ').split(/\s+/).filter(w => w);
      const fragment = document.createDocumentFragment();
      words.forEach((word, i) => {
        const span = document.createElement('span');
        span.className = 'word';
        span.innerHTML = word.replace(/([.,!?])$/, '<span class="punct">$1</span>');
        fragment.appendChild(span);
        if (i < words.length - 1) fragment.appendChild(document.createTextNode(' '));
      });
      container.replaceChild(fragment, node);
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
      const text = node.textContent;
      const start = cumulative;
      const end = start + text.length - 1;
      wordRanges.push({ span: node, start, end });
      cumulative += text.length + 1; // Add 1 for space
    }
  });
  console.log('Word ranges:', wordRanges); // Debug log
}

// Update navigation and star buttons
function updateNavigationButtons() {
  document.getElementById('prev-btn').disabled = currentPassageIndex === 0;
  document.getElementById('next-btn').disabled = currentPassageIndex === passages.length - 1;
  document.getElementById('star-btn').disabled = currentPassageIndex === 0 || starsEarned >= passages.length;
}

// Animate page flip and switch passage
function switchToPassage(newIndex, direction) {
  if (newIndex < 0 || newIndex >= passages.length) return;
  clapSound.play();

  const book = document.getElementById('book');
  const oldPage = document.getElementById('page');
  const newPage = document.createElement('div');
  newPage.id = 'page';
  newPage.classList.add(direction === 'next' ? 'slide-right' : 'slide-left');
  displayPassage(newIndex);
  book.appendChild(newPage);
  requestAnimationFrame(() => {
    oldPage.classList.add(direction === 'next' ? 'slide-left' : 'slide-right');
    newPage.classList.remove(direction === 'next' ? 'slide-right' : 'slide-left');
  });
  setTimeout(() => oldPage.remove(), 500);
}

// Award a star and trigger confetti
function earnStar() {
  if (currentPassageIndex > 0 && starsEarned < passages.length) {
    starsEarned++;
    document.getElementById('star-count').textContent = starsEarned;
    cheerSound.play();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    alert('You did it! 🎉 Earned a star!');
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

  const text = document.getElementById('passage-text').textContent;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.8;
  utterance.onboundary = (event) => {
    if (event.name === 'word') {
      if (currentSpeakingSpan) currentSpeakingSpan.classList.remove('speaking');
      const range = wordRanges.find(r => event.charIndex >= r.start && event.charIndex <= r.end);
      if (range) {
        currentSpeakingSpan = range.span;
        currentSpeakingSpan.classList.add('speaking');
      }
    }
  };
  utterance.onend = () => {
    if (currentSpeakingSpan) currentSpeakingSpan.classList.remove('speaking');
    currentSpeakingSpan = null;
  };
  window.speechSynthesis.speak(utterance);
});

// Navigation buttons
document.getElementById('prev-btn').addEventListener('click', () => {
  window.speechSynthesis.cancel();
  if (currentSpeakingSpan) currentSpeakingSpan.classList.remove('speaking');
  switchToPassage(currentPassageIndex - 1, 'prev');
});

document.getElementById('next-btn').addEventListener('click', () => {
  window.speechSynthesis.cancel();
  if (currentSpeakingSpan) currentSpeakingSpan.classList.remove('speaking');
  switchToPassage(currentPassageIndex + 1, 'next');
});

document.getElementById('star-btn').addEventListener('click', earnStar);
