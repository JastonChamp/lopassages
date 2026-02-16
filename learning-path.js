/**
 * PhonicsWorld Learning Path
 * Visual skill tree / lesson map inspired by Duolingo's path
 */
const LearningPath = (() => {
  // Skill status
  const STATUS = {
    LOCKED: 'locked',
    AVAILABLE: 'available',
    IN_PROGRESS: 'in_progress',
    COMPLETE: 'complete',
    PERFECT: 'perfect'   // completed with 100% accuracy
  };

  // Skill icons by theme
  const SKILL_ICONS = [
    '📖', '🌟', '🎯', '🔤', '📝', '🎵', '🌈', '🦋',
    '🌻', '🐱', '🐶', '🏠', '🌊', '🎨', '🚀', '🌙',
    '⭐', '🎪', '🎭', '🎸', '🌺', '🦊', '🐸', '🎈'
  ];

  // Generate skills from passages data
  const generateSkills = (categories) => {
    const skills = {};

    Object.keys(categories).forEach(bookKey => {
      const passages = categories[bookKey];
      if (!Array.isArray(passages) || passages.length === 0) return;

      skills[bookKey] = passages.map((passage, index) => ({
        id: `${bookKey}_${index}`,
        bookKey,
        passageIndex: index,
        title: (passage.title || '').replace(/<[^>]+>/g, ''),
        icon: SKILL_ICONS[index % SKILL_ICONS.length],
        image: passage.image,
        lessons: 1,          // Can be expanded for multi-lesson skills
        completedLessons: 0,
        bestAccuracy: 0,
        bestXP: 0,
        timesCompleted: 0,
        status: STATUS.LOCKED
      }));
    });

    return skills;
  };

  // Load/save skill progress
  const STORAGE_KEY = 'pw_learning_path';

  let skills = {};
  let currentBook = 'book1';

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ skills, currentBook }));
  };

  const load = (categories) => {
    const freshSkills = generateSkills(categories);
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const data = JSON.parse(saved);
      currentBook = data.currentBook || 'book1';

      // Merge saved progress with fresh skills
      Object.keys(freshSkills).forEach(bookKey => {
        if (data.skills && data.skills[bookKey]) {
          freshSkills[bookKey].forEach((skill, i) => {
            const savedSkill = data.skills[bookKey]?.[i];
            if (savedSkill) {
              skill.completedLessons = savedSkill.completedLessons || 0;
              skill.bestAccuracy = savedSkill.bestAccuracy || 0;
              skill.bestXP = savedSkill.bestXP || 0;
              skill.timesCompleted = savedSkill.timesCompleted || 0;
            }
          });
        }
      });
    }

    skills = freshSkills;
    updateStatuses();
    save();
  };

  // Update skill statuses based on progress
  const updateStatuses = () => {
    Object.keys(skills).forEach(bookKey => {
      const bookSkills = skills[bookKey];
      if (!bookSkills) return;

      bookSkills.forEach((skill, index) => {
        if (skill.timesCompleted > 0 && skill.bestAccuracy >= 95) {
          skill.status = STATUS.PERFECT;
        } else if (skill.timesCompleted > 0) {
          skill.status = STATUS.COMPLETE;
        } else if (index === 0) {
          // First skill in each book is always available
          skill.status = STATUS.AVAILABLE;
        } else {
          // Available if previous skill is complete
          const prev = bookSkills[index - 1];
          if (prev && (prev.status === STATUS.COMPLETE || prev.status === STATUS.PERFECT)) {
            skill.status = STATUS.AVAILABLE;
          } else {
            skill.status = STATUS.LOCKED;
          }
        }
      });

      // Unlock first skill of next book if all skills in current book are complete
      const allComplete = bookSkills.every(s =>
        s.status === STATUS.COMPLETE || s.status === STATUS.PERFECT
      );
      if (allComplete) {
        const bookKeys = Object.keys(skills);
        const nextBookIndex = bookKeys.indexOf(bookKey) + 1;
        if (nextBookIndex < bookKeys.length) {
          const nextBook = skills[bookKeys[nextBookIndex]];
          if (nextBook && nextBook.length > 0 && nextBook[0].status === STATUS.LOCKED) {
            nextBook[0].status = STATUS.AVAILABLE;
          }
        }
      }
    });
  };

  // Mark a skill as completed
  const completeSkill = (skillId, accuracy, xp) => {
    for (const bookKey of Object.keys(skills)) {
      const skill = skills[bookKey]?.find(s => s.id === skillId);
      if (skill) {
        skill.timesCompleted++;
        skill.completedLessons = skill.lessons;
        if (accuracy > skill.bestAccuracy) skill.bestAccuracy = accuracy;
        if (xp > skill.bestXP) skill.bestXP = xp;
        break;
      }
    }
    updateStatuses();
    save();
  };

  // Get skills for a specific book
  const getBookSkills = (bookKey) => {
    return skills[bookKey] || [];
  };

  // Get current book skills
  const getCurrentSkills = () => {
    return skills[currentBook] || [];
  };

  // Get next available skill
  const getNextAvailable = () => {
    const bookSkills = getCurrentSkills();
    return bookSkills.find(s => s.status === STATUS.AVAILABLE || s.status === STATUS.IN_PROGRESS);
  };

  // Get overall progress
  const getProgress = () => {
    let total = 0;
    let completed = 0;
    let perfect = 0;

    Object.values(skills).forEach(bookSkills => {
      if (!Array.isArray(bookSkills)) return;
      total += bookSkills.length;
      completed += bookSkills.filter(s => s.status === STATUS.COMPLETE || s.status === STATUS.PERFECT).length;
      perfect += bookSkills.filter(s => s.status === STATUS.PERFECT).length;
    });

    return { total, completed, perfect, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  // Get book progress
  const getBookProgress = (bookKey) => {
    const bookSkills = skills[bookKey] || [];
    const completed = bookSkills.filter(s => s.status === STATUS.COMPLETE || s.status === STATUS.PERFECT).length;
    return {
      total: bookSkills.length,
      completed,
      percentage: bookSkills.length > 0 ? Math.round((completed / bookSkills.length) * 100) : 0
    };
  };

  // Check if a book is unlocked
  const isBookUnlocked = (bookKey) => {
    const bookKeys = Object.keys(skills);
    const index = bookKeys.indexOf(bookKey);
    if (index <= 0) return true; // First book always unlocked

    // Check if previous book has at least one completion
    const prevBook = skills[bookKeys[index - 1]];
    if (!prevBook) return false;
    return prevBook.some(s => s.status === STATUS.COMPLETE || s.status === STATUS.PERFECT);
  };

  return {
    STATUS,
    load,
    save,
    completeSkill,
    getBookSkills,
    getCurrentSkills,
    getNextAvailable,
    getProgress,
    getBookProgress,
    isBookUnlocked,
    updateStatuses,
    getBooks: () => Object.keys(skills),

    getCurrentBook: () => currentBook,
    setCurrentBook(bookKey) {
      currentBook = bookKey;
      save();
    },

    getSkill(skillId) {
      for (const bookKey of Object.keys(skills)) {
        const skill = skills[bookKey]?.find(s => s.id === skillId);
        if (skill) return skill;
      }
      return null;
    },

    reset() {
      skills = {};
      currentBook = 'book1';
      localStorage.removeItem(STORAGE_KEY);
    }
  };
})();
