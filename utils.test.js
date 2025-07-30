const { cleanForTTS, levenshtein } = require('./script.js');

test('cleanForTTS removes extra spaces and punctuation', () => {
  expect(cleanForTTS('Dan sat on the sand. It was damp.')).toBe('Dan sat on the sand. It was damp.');
});

test('levenshtein distance basic', () => {
  expect(levenshtein('cat', 'cat')).toBe(0);
  expect(levenshtein('cat', 'bat')).toBe(1);
});
