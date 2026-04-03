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
  const btnSpeak = document.getElementById('btnSpeak');
  const btnAction = document.getElementById('btnAction');

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

    // Button
    btnAction.textContent = '정답확인';
    btnAction.classList.remove('btn-action--next');

    isRevealed = false;
  }

  // --- Handle Action Button ---
  btnAction.addEventListener('click', function (e) {
    e.stopPropagation();
    if (!isRevealed) {
      // Reveal answer
      englishText.innerHTML = generateRevealed(shuffled[currentIndex].en);
      englishText.classList.add('flashcard__english--revealed');
      btnAction.textContent = 'Next →';
      btnAction.classList.add('btn-action--next');
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
  });

  // --- Handle Speak Button (TTS) ---
  btnSpeak.addEventListener('click', function (e) {
    e.stopPropagation();
    const expr = shuffled[currentIndex];
    speakEnglish(expr.en);
  });

  // --- Text-to-Speech ---
  function speakEnglish(text) {
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1;

    // Try to find a good English voice
    const voices = speechSynthesis.getVoices();
    const englishVoice = voices.find(v =>
      v.lang.startsWith('en') && v.name.includes('Samantha')
    ) || voices.find(v =>
      v.lang.startsWith('en-US')
    ) || voices.find(v =>
      v.lang.startsWith('en')
    );

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    // Animate button
    btnSpeak.classList.add('btn-speak--active');
    utterance.onend = () => btnSpeak.classList.remove('btn-speak--active');
    utterance.onerror = () => btnSpeak.classList.remove('btn-speak--active');

    speechSynthesis.speak(utterance);
  }

  // Preload voices
  if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  }

  // --- Start ---
  init();
})();
