/* ============================================
   English Expressions — Study Page Logic
   ============================================ */

(function () {
  'use strict';



  // --- State ---
  let expressions = [];
  let shuffled = [];
  let currentIndex = 0;

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

  // --- Show Current Expression ---
  function showCurrent() {
    const expr = shuffled[currentIndex];

    // Animate
    flashcard.classList.remove('flashcard--animate');
    void flashcard.offsetWidth; // Force reflow
    flashcard.classList.add('flashcard--animate');

    // Korean
    koreanText.textContent = expr.ko;

    // English (directly visible)
    englishText.textContent = expr.en;

    // Counter
    counter.textContent = `${currentIndex + 1} / ${shuffled.length}`;
  }

  // --- Handle Action Button ---
  btnAction.addEventListener('click', function (e) {
    e.stopPropagation();
    // Next expression
    currentIndex++;
    if (currentIndex >= shuffled.length) {
      // Reshuffle and start over
      shuffled = shuffle([...expressions]);
      currentIndex = 0;
    }
    showCurrent();
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
