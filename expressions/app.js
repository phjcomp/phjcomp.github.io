/* ============================================
   English Expressions — Study Page Logic
   ============================================ */

(function () {
  'use strict';

  // --- Function words that remain visible in hints ---
  const FUNCTION_WORDS = new Set([
    // Articles
    'a', 'an', 'the',
    // Prepositions
    'in', 'on', 'at', 'of', 'to', 'for', 'by', 'with', 'from', 'into',
    'onto', 'upon', 'about', 'above', 'below', 'between', 'through',
    'during', 'without', 'within', 'against', 'along', 'among', 'around',
    'before', 'behind', 'beneath', 'beside', 'beyond', 'despite', 'down',
    'except', 'inside', 'near', 'off', 'out', 'outside', 'over', 'past',
    'since', 'toward', 'towards', 'under', 'until', 'up',
    // Be
    'be', 'is', 'am', 'are', 'was', 'were', 'been', 'being',
    // Negation
    'not',
    // Possessives / Reflexives
    "one's", 'oneself',
    // Conjunctions
    'and', 'or', 'but', 'nor', 'yet', 'so',
    // Other
    'as', 'if', 'than', 'that', 'no'
  ]);

  // --- State ---
  let expressions = [];
  let shuffled = [];
  let currentIndex = 0;
  let isRevealed = false;

  // --- DOM Elements ---
  const studyPage = document.getElementById('studyPage');
  const emptyState = document.getElementById('emptyState');
  const flashcard = document.getElementById('flashcard');
  const koreanText = document.getElementById('koreanText');
  const englishText = document.getElementById('englishText');
  const counter = document.getElementById('counter');
  const footerHint = document.getElementById('footerHint');

  // --- Initialize ---
  async function init() {
    try {
      const response = await fetch('data.json?t=' + Date.now());
      expressions = await response.json();
    } catch (e) {
      expressions = [];
    }

    if (expressions.length === 0) {
      studyPage.style.display = 'none';
      emptyState.style.display = '';
      return;
    }

    studyPage.style.display = '';
    emptyState.style.display = 'none';

    shuffled = shuffle([...expressions]);
    currentIndex = 0;
    isRevealed = false;
    showCurrent();
  }

  // --- Fisher-Yates Shuffle ---
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // --- Generate Hint HTML ---
  function generateHint(englishStr) {
    const words = englishStr.split(/\s+/);

    // Check if there are any function words
    const hasFunctionWords = words.some(w => {
      const clean = w.replace(/[^a-zA-Z']/g, '').toLowerCase();
      return FUNCTION_WORDS.has(clean);
    });

    return words.map(word => {
      // Preserve punctuation around the word
      const match = word.match(/^([^a-zA-Z']*)([\w']+)([^a-zA-Z']*)$/);
      if (!match) return word;

      const [, prefix, core, suffix] = match;
      const lower = core.toLowerCase();

      if (FUNCTION_WORDS.has(lower)) {
        // Show function words as-is
        return prefix + core + suffix;
      }

      if (hasFunctionWords) {
        // Blank out content words: show as ___
        const blankWidth = Math.max(core.length * 0.6, 2);
        return `${prefix}<span class="blank" style="min-width:${blankWidth}em" data-word="${core}">${core}</span>${suffix}`;
      } else {
        // Fallback: show first letter + blanks
        const firstLetter = core[0];
        const rest = '___';
        return `${prefix}<span class="first-letter">${firstLetter}</span><span class="blank" data-word="${core.slice(1)}">${core.slice(1)}</span>${suffix}`;
      }
    }).join(' ');
  }

  // --- Generate Revealed HTML ---
  function generateRevealed(englishStr) {
    const words = englishStr.split(/\s+/);

    return words.map(word => {
      const match = word.match(/^([^a-zA-Z']*)([\w']+)([^a-zA-Z']*)$/);
      if (!match) return word;

      const [, prefix, core, suffix] = match;
      const lower = core.toLowerCase();

      if (FUNCTION_WORDS.has(lower)) {
        return prefix + core + suffix;
      }
      // Highlight content words
      return `${prefix}<span class="blank">${core}</span>${suffix}`;
    }).join(' ');
  }

  // --- Show Current Expression ---
  function showCurrent() {
    const expr = shuffled[currentIndex];

    // Animate
    flashcard.classList.remove('flashcard--animate');
    void flashcard.offsetWidth; // Force reflow
    flashcard.classList.add('flashcard--animate');

    // Korean
    koreanText.textContent = expr.ko;

    // English hint
    englishText.innerHTML = generateHint(expr.en);
    englishText.classList.remove('flashcard__english--revealed');

    // Counter
    counter.textContent = `${currentIndex + 1} / ${shuffled.length}`;

    // Footer
    footerHint.textContent = '탭하여 정답 확인';

    isRevealed = false;
  }

  // --- Handle Tap ---
  function handleTap(e) {
    // Don't trigger on link clicks
    if (e.target.closest('a')) return;

    if (!isRevealed) {
      // Reveal answer
      englishText.innerHTML = generateRevealed(shuffled[currentIndex].en);
      englishText.classList.add('flashcard__english--revealed');
      footerHint.textContent = '탭하여 다음 표현';
      isRevealed = true;
    } else {
      // Next expression
      currentIndex++;
      if (currentIndex >= shuffled.length) {
        // Reshuffle and start over
        shuffled = shuffle([...expressions]);
        currentIndex = 0;
      }
      showCurrent();
    }
  }

  // --- Event Listeners ---
  studyPage.addEventListener('click', handleTap);

  // Prevent double-tap zoom on mobile
  studyPage.addEventListener('touchend', function (e) {
    if (!e.target.closest('a')) {
      e.preventDefault();
      handleTap(e);
    }
  }, { passive: false });

  // --- Start ---
  init();
})();
