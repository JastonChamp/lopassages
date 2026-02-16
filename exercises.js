/**
 * PhonicsWorld Exercise Engine
 * Generates and manages interactive exercises from passage data
 * 8 exercise types with adaptive difficulty
 */
const ExerciseEngine = (() => {
  // Exercise type definitions
  const TYPES = {
    TAP_WORD: 'tapWord',           // Hear a word, tap the correct one
    FILL_BLANK: 'fillBlank',       // Sentence with missing word
    WORD_BANK: 'wordBank',         // Arrange words to form sentence
    SPELLING: 'spelling',          // Type the word letter by letter
    LISTENING: 'listening',        // Hear a word/sentence, pick answer
    MATCH_PAIRS: 'matchPairs',     // Match words to meanings/sounds
    MULTIPLE_CHOICE: 'multipleChoice', // Pick the right word
    READ_ALOUD: 'readAloud'        // Pronunciation practice
  };

  const LESSON_SIZE = 12;

  // Utility: get random items from array
  const sample = (arr, n) => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  };

  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Extract sentences from passage text
  const getSentences = (text) => {
    const clean = text.replace(/<[^>]+>/g, '').replace(/\n+/g, ' ');
    return clean.split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.split(/\s+/).length >= 4);
  };

  // Extract unique words from text
  const getWords = (text) => {
    const clean = text.replace(/<[^>]+>/g, '');
    return [...new Set(
      clean.split(/\s+/)
        .map(w => w.replace(/[^a-zA-Z']/g, '').toLowerCase())
        .filter(w => w.length >= 2)
    )];
  };

  // Get distractors (wrong answers) from other passages
  const getDistractors = (correctWord, allWords, count = 3) => {
    const similar = allWords
      .filter(w => w !== correctWord && Math.abs(w.length - correctWord.length) <= 2)
      .sort(() => Math.random() - 0.5);
    if (similar.length >= count) return similar.slice(0, count);
    return allWords
      .filter(w => w !== correctWord)
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  };

  // Common phonics patterns for matching exercises
  const PHONICS_PATTERNS = {
    'short a': /^[bcdfghjklmnpqrstvwxyz]a[bcdfghjklmnpqrstvwxyz]$/,
    'short e': /^[bcdfghjklmnpqrstvwxyz]e[bcdfghjklmnpqrstvwxyz]$/,
    'short i': /^[bcdfghjklmnpqrstvwxyz]i[bcdfghjklmnpqrstvwxyz]$/,
    'short o': /^[bcdfghjklmnpqrstvwxyz]o[bcdfghjklmnpqrstvwxyz]$/,
    'long a': /a[iy]|a_e/,
    'long e': /ee|ea/,
    'long i': /igh|i_e|ie$/,
    'long o': /oa|ow$|o_e/,
    'th sound': /th/,
    'sh sound': /sh/,
    'ch sound': /ch/,
    'bl blend': /^bl/,
    'br blend': /^br/,
    'cr blend': /^cr/,
    'ing ending': /ing$/,
    'ed ending': /ed$/
  };

  // ===== Exercise Generators =====

  const generateTapWord = (passage, allWords) => {
    const words = getWords(passage.text);
    const target = pickRandom(words.filter(w => w.length >= 3));
    if (!target) return null;
    const distractors = getDistractors(target, allWords, 3);
    const options = sample([target, ...distractors], 4);
    return {
      type: TYPES.TAP_WORD,
      instruction: 'Tap the word you hear',
      audioWord: target,
      options,
      correctAnswer: target,
      points: 10
    };
  };

  const generateFillBlank = (passage, allWords) => {
    const sentences = getSentences(passage.text);
    if (sentences.length === 0) return null;
    const sentence = pickRandom(sentences);
    const sentenceWords = sentence.split(/\s+/);
    if (sentenceWords.length < 4) return null;

    // Pick a content word (not too short, not first/last)
    const candidates = sentenceWords.slice(1, -1)
      .filter(w => w.replace(/[^a-zA-Z]/g, '').length >= 3);
    if (candidates.length === 0) return null;

    const target = pickRandom(candidates);
    const cleanTarget = target.replace(/[^a-zA-Z']/g, '').toLowerCase();
    const blankSentence = sentence.replace(target, '______');
    const distractors = getDistractors(cleanTarget, allWords, 3);
    const options = sample([cleanTarget, ...distractors], 4);

    return {
      type: TYPES.FILL_BLANK,
      instruction: 'Fill in the blank',
      sentence: blankSentence,
      options,
      correctAnswer: cleanTarget,
      points: 10
    };
  };

  const generateWordBank = (passage) => {
    const sentences = getSentences(passage.text);
    if (sentences.length === 0) return null;
    // Pick a shorter sentence
    const shortSentences = sentences.filter(s => {
      const wc = s.split(/\s+/).length;
      return wc >= 4 && wc <= 10;
    });
    if (shortSentences.length === 0) return null;

    const sentence = pickRandom(shortSentences);
    const words = sentence.split(/\s+/).map(w => w.trim()).filter(w => w);
    const shuffled = [...words].sort(() => Math.random() - 0.5);

    return {
      type: TYPES.WORD_BANK,
      instruction: 'Tap the words in the right order',
      correctOrder: words,
      scrambled: shuffled,
      points: 15
    };
  };

  const generateSpelling = (passage) => {
    const words = getWords(passage.text).filter(w => w.length >= 3 && w.length <= 8);
    if (words.length === 0) return null;
    const target = pickRandom(words);

    return {
      type: TYPES.SPELLING,
      instruction: 'Spell the word you hear',
      audioWord: target,
      correctAnswer: target,
      hint: target[0] + '_'.repeat(target.length - 1),
      points: 15
    };
  };

  const generateListening = (passage, allWords) => {
    const sentences = getSentences(passage.text);
    if (sentences.length === 0) return null;
    const sentence = pickRandom(sentences);
    // Extract the last meaningful word
    const words = sentence.split(/\s+/).map(w => w.replace(/[^a-zA-Z']/g, '').toLowerCase()).filter(w => w.length >= 3);
    if (words.length < 2) return null;
    const target = pickRandom(words);
    const distractors = getDistractors(target, allWords, 3);
    const options = sample([target, ...distractors], 4);

    return {
      type: TYPES.LISTENING,
      instruction: 'Listen and choose the word you hear',
      audioText: target,
      options,
      correctAnswer: target,
      points: 10
    };
  };

  const generateMatchPairs = (passage) => {
    const words = getWords(passage.text).filter(w => w.length >= 3);
    if (words.length < 4) return null;

    // Create pairs: word -> first letter + word length hint
    const selected = sample(words, 4);
    const pairs = selected.map(w => ({
      left: w,
      right: w.split('').join(' - ')  // Phonetic-style breakdown
    }));

    return {
      type: TYPES.MATCH_PAIRS,
      instruction: 'Match the words to their spelling',
      pairs,
      points: 20
    };
  };

  const generateMultipleChoice = (passage, allWords) => {
    const sentences = getSentences(passage.text);
    if (sentences.length === 0) return null;
    const sentence = pickRandom(sentences);
    const words = sentence.split(/\s+/);
    const contentWords = words.filter(w => w.replace(/[^a-zA-Z]/g, '').length >= 3);
    if (contentWords.length === 0) return null;

    const target = pickRandom(contentWords);
    const cleanTarget = target.replace(/[^a-zA-Z']/g, '').toLowerCase();

    // Question: which word fits in the context
    const context = sentence.replace(target, '___');
    const distractors = getDistractors(cleanTarget, allWords, 3);
    const options = sample([cleanTarget, ...distractors], 4);

    return {
      type: TYPES.MULTIPLE_CHOICE,
      instruction: 'Which word completes the sentence?',
      context,
      options,
      correctAnswer: cleanTarget,
      points: 10
    };
  };

  const generateReadAloud = (passage) => {
    const sentences = getSentences(passage.text);
    if (sentences.length === 0) return null;
    const sentence = pickRandom(sentences.filter(s => s.split(/\s+/).length <= 12));
    if (!sentence) return null;

    return {
      type: TYPES.READ_ALOUD,
      instruction: 'Read this sentence aloud',
      sentence,
      points: 15
    };
  };

  // ===== Lesson Generation =====

  const generateLesson = (passage, allPassages, bookKey) => {
    // Collect all words across passages for distractors
    const allWords = [];
    Object.values(allPassages).forEach(book => {
      if (Array.isArray(book)) {
        book.forEach(p => {
          allWords.push(...getWords(p.text));
        });
      }
    });
    const uniqueAllWords = [...new Set(allWords)];

    // Generator functions
    const generators = [
      () => generateTapWord(passage, uniqueAllWords),
      () => generateFillBlank(passage, uniqueAllWords),
      () => generateWordBank(passage),
      () => generateSpelling(passage),
      () => generateListening(passage, uniqueAllWords),
      () => generateMatchPairs(passage),
      () => generateMultipleChoice(passage, uniqueAllWords),
      () => generateReadAloud(passage)
    ];

    const exercises = [];
    let attempts = 0;
    const maxAttempts = LESSON_SIZE * 4;

    // Ensure variety: try to get at least one of each type
    const usedTypes = new Set();
    while (exercises.length < LESSON_SIZE && attempts < maxAttempts) {
      attempts++;
      let gen;
      if (usedTypes.size < generators.length && exercises.length < generators.length) {
        // Pick an unused type
        const unused = generators.filter((_, i) => !usedTypes.has(i));
        const idx = generators.indexOf(pickRandom(unused));
        gen = generators[idx];
        usedTypes.add(idx);
      } else {
        gen = pickRandom(generators);
      }

      const exercise = gen();
      if (exercise) {
        exercise.id = `ex_${Date.now()}_${exercises.length}`;
        exercises.push(exercise);
      }
    }

    return {
      id: `lesson_${Date.now()}`,
      passageTitle: passage.title?.replace(/<[^>]+>/g, '') || 'Lesson',
      bookKey,
      exercises,
      totalPoints: exercises.reduce((sum, e) => sum + e.points, 0)
    };
  };

  // ===== Generate Review Lesson from weak/due words =====
  const generateReviewLesson = (dueWords, allPassages) => {
    const allWords = [];
    Object.values(allPassages).forEach(book => {
      if (Array.isArray(book)) {
        book.forEach(p => allWords.push(...getWords(p.text)));
      }
    });
    const uniqueAllWords = [...new Set(allWords)];

    const exercises = [];
    const wordsToReview = dueWords.slice(0, 10);

    wordsToReview.forEach(wordData => {
      const word = wordData.word;
      // Generate 1-2 exercises per word
      const distractors = getDistractors(word, uniqueAllWords, 3);
      const options = sample([word, ...distractors], 4);

      // Tap word exercise
      exercises.push({
        id: `rev_${Date.now()}_${exercises.length}`,
        type: TYPES.TAP_WORD,
        instruction: 'Tap the word you hear',
        audioWord: word,
        options,
        correctAnswer: word,
        points: 10,
        isReview: true,
        reviewWord: word
      });

      // Spelling exercise for weaker words
      if (wordData.strength < 2) {
        exercises.push({
          id: `rev_${Date.now()}_${exercises.length}`,
          type: TYPES.SPELLING,
          instruction: 'Spell the word you hear',
          audioWord: word,
          correctAnswer: word,
          hint: word[0] + '_'.repeat(word.length - 1),
          points: 15,
          isReview: true,
          reviewWord: word
        });
      }
    });

    return {
      id: `review_${Date.now()}`,
      passageTitle: 'Review Session',
      isReview: true,
      exercises: exercises.slice(0, LESSON_SIZE),
      totalPoints: exercises.slice(0, LESSON_SIZE).reduce((sum, e) => sum + e.points, 0)
    };
  };

  return {
    TYPES,
    LESSON_SIZE,
    generateLesson,
    generateReviewLesson,
    getSentences,
    getWords
  };
})();
