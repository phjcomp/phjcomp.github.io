/* ============================================
   English Expressions — Manage Page Logic
   ============================================ */

(function () {
  'use strict';

  // --- GitHub Configuration ---
  const GITHUB_CONFIG = {
    owner: 'phjcomp',
    repo: 'phjcomp.github.io',
    path: 'expressions/data.json',
    branch: 'main'
  };

  // --- State ---
  let expressions = [];          // All expressions (loaded from GitHub/data.json)
  let hasUnsavedChanges = false;
  let currentEditIndex = -1;
  let fileSHA = null;            // SHA of data.json on GitHub (needed for updates)

  // --- DOM Elements ---
  const inputText = document.getElementById('inputText');
  const expressionList = document.getElementById('expressionList');
  const totalCount = document.getElementById('totalCount');
  const tokenInput = document.getElementById('tokenInput');
  const tokenStatus = document.getElementById('tokenStatus');
  const btnPush = document.getElementById('btnPush');

  // --- Initialize ---
  async function init() {
    // Load token
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
      tokenInput.value = savedToken;
      tokenStatus.textContent = '✅ 토큰 저장됨';
    }

    // Load expressions
    await loadExpressions();
    renderExpressionList();
  }

  // --- Load expressions from data.json (local fetch) ---
  async function loadExpressions() {
    try {
      const response = await fetch('data.json?t=' + Date.now());
      if (response.ok) {
        expressions = await response.json();
      }
    } catch (e) {
      expressions = [];
    }
  }

  // --- Parse Korean/English text ---
  function parseText(text) {
    const results = [];
    // Trim and normalize whitespace
    text = text.trim();
    if (!text) return results;

    // Strategy: Find boundaries where Korean text transitions to English text
    // Korean Unicode ranges: AC00-D7AF (syllables), 3130-318F (jamo), 1100-11FF (jamo)
    const koreanRegex = /[\uAC00-\uD7AF\u3130-\u318F\u1100-\u11FF]/;
    const latinRegex = /[a-zA-Z]/;

    // Split into segments by finding ko→en transitions
    let i = 0;
    const chars = [...text]; // Handle multi-byte correctly

    while (i < chars.length) {
      // Skip leading whitespace/newlines
      while (i < chars.length && /[\s\n\r]/.test(chars[i]) && !koreanRegex.test(chars[i])) {
        i++;
      }
      if (i >= chars.length) break;

      // Find Korean part
      let koStart = i;
      let koEnd = -1;
      let enStart = -1;

      // Scan forward to find where Korean ends and English begins
      let lastKoreanPos = -1;
      for (let j = i; j < chars.length; j++) {
        if (koreanRegex.test(chars[j])) {
          lastKoreanPos = j;
        }
        if (latinRegex.test(chars[j]) && lastKoreanPos >= 0) {
          // Check if this is truly an English segment (not a single letter in Korean text)
          let englishRunLength = 0;
          for (let k = j; k < chars.length && !koreanRegex.test(chars[k]); k++) {
            if (latinRegex.test(chars[k])) englishRunLength++;
          }
          if (englishRunLength >= 2) {
            koEnd = lastKoreanPos + 1;
            enStart = j;
            break;
          }
        }
      }

      if (koEnd === -1 || enStart === -1) {
        // No English found — rest is Korean only, skip
        break;
      }

      // Find English part end (next Korean char or end of text)
      let enEnd = chars.length;
      for (let j = enStart; j < chars.length; j++) {
        if (koreanRegex.test(chars[j])) {
          enEnd = j;
          break;
        }
      }

      const ko = chars.slice(koStart, koEnd).join('').trim();
      const en = chars.slice(enStart, enEnd).join('').trim();

      if (ko && en) {
        results.push({ ko, en });
      }

      i = enEnd;
    }

    return results;
  }

  // --- Check for duplicates ---
  function checkDuplicate(item) {
    return expressions.some(
      expr => expr.ko === item.ko || expr.en.toLowerCase() === item.en.toLowerCase()
    );
  }

  // --- Parse and add directly ---
  window.parseAndPreview = function () {
    const text = inputText.value;
    const parsed = parseText(text);

    if (parsed.length === 0) {
      showToast('파싱 결과가 없습니다. 입력을 확인해주세요.', 'warning');
      return;
    }

    // Filter out duplicates
    const newItems = parsed.filter(item => !checkDuplicate(item));
    const duplicateCount = parsed.length - newItems.length;

    if (newItems.length === 0) {
      showToast('추가할 새 표현이 없습니다 (모두 중복)', 'warning');
      inputText.value = '';
      return;
    }

    // Mark new items and add
    newItems.forEach(item => item._isNew = true);
    expressions.push(...newItems);
    hasUnsavedChanges = true;

    // Clear input
    inputText.value = '';

    // Update list
    renderExpressionList();

    let msg = `${newItems.length}개 표현 추가됨`;
    if (duplicateCount > 0) {
      msg += ` (${duplicateCount}개 중복 제외)`;
    }
    showToast(msg, 'success');

    // Update push button state
    updatePushButton();
  };

  // --- Render expression list ---
  function renderExpressionList() {
    expressionList.innerHTML = '';
    totalCount.textContent = `${expressions.length}개`;

    expressions.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'expression-item';
      li.innerHTML = `
        <span class="expression-item__number">${idx + 1}</span>
        <div class="expression-item__text">
          <div class="expression-item__ko">
            ${escapeHtml(item.ko)}
            ${item._isNew ? '<span class="expression-item__new-badge">NEW</span>' : ''}
          </div>
          <div class="expression-item__en">→ ${escapeHtml(item.en)}</div>
        </div>
        <div class="expression-item__actions">
          <button class="btn-icon" onclick="editExpression(${idx})" title="수정">✏️</button>
          <button class="btn-icon btn-icon--danger" onclick="deleteExpression(${idx})" title="삭제">🗑️</button>
        </div>
      `;
      expressionList.appendChild(li);
    });
  }

  // --- Edit expression ---
  window.editExpression = function (idx) {
    currentEditIndex = idx;
    const item = expressions[idx];
    document.getElementById('editKo').value = item.ko;
    document.getElementById('editEn').value = item.en;
    document.getElementById('editModal').classList.add('modal-overlay--active');
    document.getElementById('editKo').focus();
    document.getElementById('editModal').dataset.mode = 'list';
  };

  // --- Delete expression ---
  window.deleteExpression = function (idx) {
    if (confirm(`"${expressions[idx].ko}" 표현을 삭제하시겠습니까?`)) {
      expressions.splice(idx, 1);
      hasUnsavedChanges = true;
      renderExpressionList();
      updatePushButton();
      showToast('표현 삭제됨', 'success');
    }
  };

  // --- Save edit (modal) ---
  window.saveEdit = function () {
    const ko = document.getElementById('editKo').value.trim();
    const en = document.getElementById('editEn').value.trim();

    if (!ko || !en) {
      showToast('한국어와 영어 모두 입력해주세요', 'warning');
      return;
    }

    expressions[currentEditIndex] = { ko, en };
    hasUnsavedChanges = true;
    renderExpressionList();
    updatePushButton();

    closeModal();
    showToast('수정 완료', 'success');
  };

  // --- Close modal ---
  window.closeModal = function () {
    document.getElementById('editModal').classList.remove('modal-overlay--active');
    currentEditIndex = -1;
  };

  // Close modal on overlay click
  document.getElementById('editModal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  // Close modal on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  // --- GitHub Token ---
  window.saveToken = function () {
    const token = tokenInput.value.trim();
    if (token) {
      localStorage.setItem('github_token', token);
      tokenStatus.textContent = '✅ 토큰 저장됨';
      showToast('토큰이 저장되었습니다', 'success');
    }
  };

  window.toggleTokenVisibility = function () {
    tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
  };

  // --- Push to GitHub ---
  window.pushToGitHub = async function () {
    const token = localStorage.getItem('github_token');
    if (!token) {
      showToast('먼저 GitHub 토큰을 설정해주세요', 'warning');
      document.getElementById('tokenSection').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Clean _isNew flags before saving
    const cleanExpressions = expressions.map(({ ko, en }) => ({ ko, en }));

    btnPush.disabled = true;
    btnPush.classList.add('btn-push--loading');
    btnPush.textContent = '⏳ Pushing...';

    try {
      // Step 1: Get current file SHA (needed for update)
      const getUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}?ref=${GITHUB_CONFIG.branch}`;

      const getResponse = await fetch(getUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (getResponse.ok) {
        const fileData = await getResponse.json();
        fileSHA = fileData.sha;
      } else if (getResponse.status === 404) {
        // File doesn't exist yet — will create
        fileSHA = null;
      } else {
        throw new Error(`GitHub API 오류: ${getResponse.status}`);
      }

      // Step 2: Update or create file
      const content = JSON.stringify(cleanExpressions, null, 2) + '\n';
      const base64Content = btoa(unescape(encodeURIComponent(content)));

      const putUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`;

      const body = {
        message: `Update expressions (${cleanExpressions.length} items)`,
        content: base64Content,
        branch: GITHUB_CONFIG.branch
      };

      if (fileSHA) {
        body.sha = fileSHA;
      }

      const putResponse = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!putResponse.ok) {
        const errorData = await putResponse.json();
        throw new Error(errorData.message || `Push 실패: ${putResponse.status}`);
      }

      // Success
      hasUnsavedChanges = false;
      // Clear new badges
      expressions.forEach(item => delete item._isNew);
      renderExpressionList();
      showToast(`✅ ${cleanExpressions.length}개 표현 Push 완료!`, 'success');

    } catch (error) {
      console.error('Push error:', error);
      showToast(`Push 실패: ${error.message}`, 'error');
    } finally {
      btnPush.disabled = false;
      btnPush.classList.remove('btn-push--loading');
      btnPush.textContent = '🚀 Push to GitHub';
      updatePushButton();
    }
  };

  // --- Update push button state ---
  function updatePushButton() {
    if (hasUnsavedChanges) {
      btnPush.style.background = '#2C2C2C';
      btnPush.style.animation = 'none';
    }
  }

  // --- Toast ---
  function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast--${type} toast--visible`;

    setTimeout(() => {
      toast.classList.remove('toast--visible');
    }, 3000);
  }

  // --- Escape HTML ---
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Warn before leaving with unsaved changes ---
  window.addEventListener('beforeunload', function (e) {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // --- Start ---
  init();
})();
