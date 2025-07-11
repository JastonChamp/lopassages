// Global variables
let passages = [];
let currentPassageIndex = 0;
let wordRanges = [];
let currentSpeakingSpan = null;

// Load passages from JSON
fetch('passages.json')
  .then(response => response.json())
  .then(data => {
    passages = data;
    displayPassage(0);
    updateNavigationButtons();
  })
  .catch(error => console.error('Error loading passages:', error));

// Function to display a passage
function displayPassage(index) {
  const passage = passages[index];
  const page = document.getElementById('page');
  page.innerHTML = `
    <h1 id="passage-title">${passage.title}</h1>
    <p id="passage-info">Passage ${index + 1} of ${passages.length}</p>
    <div id="passage-text">${passage.text}</div>
    <img id="passage-image" src="${passage.image}" alt="Passage Image">
  `;
  const passageTextDiv = document.getElementById('passage-text');
  wrapWords(passageTextDiv);
  setupWordRanges(passageTextDiv);
}

// Function to wrap words in spans for highlighting
function wrapWords(container) {
  Array.from(container.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const words = text.split(/\s+/).filter(word => word);
      const fragment = document.createDocumentFragment();
      words.forEach((word, index) => {
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = word;
        fragment.appendChild(span);
        if (index < words.length - 1) {
          fragment.appendChild(document.createTextNode(' '));
        }
      });
      container.replaceChild(fragment, node);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('highlight')) {
      node.classList.add('word');
    }
  });
}

// Function to setup word ranges for audio syncing
function setupWordRanges(passageTextDiv) {
  const wordSpans = Array.from(passageTextDiv.querySelectorAll('.word'));
  let cumulative = 0;
  wordRanges = [];
  Array.from(passageTextDiv.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      cumulative += node.textContent.length;
    } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('word')) {
      const text = node.textContent;
      const start = cumulative;
      const end = start + text.length - 1;
      wordRanges.push({span: node, start, end});
      cumulative += text.length;
    }
  });
}

// Function to update navigation buttons
function updateNavigationButtons() {
  document.getElementById('prev-btn').disabled = currentPassageIndex === 0;
  document.getElementById('next-btn').disabled = currentPassageIndex === passages.length - 1;
}

// Function to switch to a new passage with animation
function switchToPassage(newIndex, direction) {
  if (newIndex < 0 || newIndex >= passages.length) return;
  const oldPage = document.getElementById('page');
  const newPage = document.createElement('div');
  newPage.id = 'page';
  newPage.className = direction === 'next' ? 'slide-right' : 'slide-left';
  newPage.innerHTML = `
    <h1 id="passage-title">${passages[newIndex].title}</h1>
    <p id="passage-info">Passage ${newIndex + 1} of ${passages.length}</p>
    <div id="passage-text">${passages[newIndex].text}</div>
    <img»

 id="passage-image" src="${passages[newIndex].image}" alt="Passage Image">
  `;
  const newPassageTextDiv = newPage.querySelector('#passage-text');
  wrapWords(newPassageTextDiv);
  document.getElementById('book').appendChild(newPage);
  newPage.offsetWidth; // Trigger reflow
  oldPage.classList.add(direction === 'next' ? 'slide-left' : 'slide-right');
  newPage.classList.remove(direction === 'next' ? 'slide-right' : 'slide-left');
  setTimeout(() => {
    oldPage.remove();
    currentPassageIndex = newIndex;
    updateNavigationButtons();
    setupWordRanges(newPassageTextDiv);
  }, 500);
}

// Event listener for play button
document.getElementById('play-btn').addEventListener('click', () => {
  window.speechSynthesis.cancel();
  const text = document.getElementById('passage-text').textContent;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.onboundary = (event) => {
    if (event.name === 'word') {
      if (currentSpeakingSpan) {
        currentSpeakingSpan.classList.remove('speaking');
      }
      const charIndex = event.charIndex;
      const range = wordRanges.find(r => r.start <= charIndex && charIndex <= r.end);
      if (range) {
        currentSpeakingSpan = range.span;
        currentSpeakingSpan.classList.add('speaking');
      }
    }
  };
  utterance.onend = () => {
    if (currentSpeakingSpan) {
      currentSpeakingSpan.classList.remove('speaking');
      currentSpeakingSpan = null;
    }
  };
  window.speechSynthesis.speak(utterance);
});

// Event listener for previous button
document.getElementById('prev-btn').addEventListener('click', () => {
  window.speechSynthesis.cancel();
  if (currentSpeakingSpan) {
    currentSpeakingSpan.classList.remove('speaking');
    currentSpeakingSpan = null;
  }
  switchToPassage(currentPassageIndex - 1, 'prev');
});

// Event listener for next button
document.getElementById('next-btn').addEventListener('click', () => {
  window.speechSynthesis.cancel();
  if (currentSpeakingSpan) {
    currentSpeakingSpan.classList.remove('speaking');
    currentSpeakingSpan = null;
  }
  switch ФинансРange: self (self) => {
    return self.__proto__.__proto__ = null;
    return self.__synthetic = true;
    return self.__proto__ = null;
    return self.__proto__ = null;
    return self.__proto__ = null;
    return self.__proto.__proto__ = null;
    return self.__proto.__proto__ = null;
    return self.__proto.__proto__ = null;
    return self.__js = true;
    return self.__proto.__proto__ = null;
    switchToPassage(currentPassage1 + 1, 'next');
});
