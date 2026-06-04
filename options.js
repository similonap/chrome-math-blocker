// Select DOM Elements
const domainInput = document.getElementById('domain-input');
const btnAddDomain = document.getElementById('btn-add-domain');
const addFeedback = document.getElementById('add-feedback');
const domainList = document.getElementById('domain-list');
const emptyState = document.getElementById('empty-state');

const exerciseProviderSelect = document.getElementById('exercise-provider-select');
const remoteUrlGroup = document.getElementById('remote-url-group');
const remoteUrlInput = document.getElementById('remote-url-input');
const remoteUrlFeedback = document.getElementById('remote-url-feedback');
const localSettingsGroup = document.getElementById('local-settings-group');

const difficultySelect = document.getElementById('difficulty-select');
const questionCountSlider = document.getElementById('question-count-slider');
const questionCountVal = document.getElementById('question-count-val');
const unlockDurationSlider = document.getElementById('unlock-duration-slider');
const unlockDurationVal = document.getElementById('unlock-duration-val');

const statSolved = document.getElementById('stat-solved');
const statSaved = document.getElementById('stat-saved');
const btnResetStats = document.getElementById('btn-reset-stats');

// Local Data State
let blockedDomains = [];
let unlockDuration = 15;

// Load and Initialize Dashboard Settings
function initDashboard() {
  chrome.storage.local.get(
    ['blockedDomains', 'difficulty', 'questionCount', 'unlockDuration', 'stats', 'exerciseProvider', 'remoteExerciseUrl'],
    (data) => {
      blockedDomains = data.blockedDomains || [];
      unlockDuration = data.unlockDuration || 15;
      const difficulty = data.difficulty || 'medium';
      const questionCount = data.questionCount || 5;
      const stats = data.stats || { quizzesSolved: 0, blocksTriggered: 0 };
      const provider = data.exerciseProvider || 'local';
      const remoteUrl = data.remoteExerciseUrl || '';

      // Render Blocklist
      renderDomainList();

      // Set Provider options
      exerciseProviderSelect.value = provider;
      remoteUrlInput.value = remoteUrl;
      toggleProviderUI(provider);

      // Set Challenge Settings Inputs
      difficultySelect.value = difficulty;
      
      questionCountSlider.value = questionCount;
      questionCountVal.textContent = questionCount;
      
      unlockDurationSlider.value = unlockDuration;
      unlockDurationVal.textContent = unlockDuration;

      // Render Stats
      renderStats(stats);
    }
  );
}

// Show/hide relevant options depending on provider choice
function toggleProviderUI(provider) {
  if (provider === 'remote') {
    remoteUrlGroup.classList.remove('hidden');
    localSettingsGroup.classList.add('hidden');
  } else {
    remoteUrlGroup.classList.add('hidden');
    localSettingsGroup.classList.remove('hidden');
  }
}

// Render the blocked domains list
function renderDomainList() {
  domainList.innerHTML = '';
  
  if (blockedDomains.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  blockedDomains.forEach((domain) => {
    const li = document.createElement('li');
    li.className = 'domain-item';
    
    // Use Google favicon service for premium list icons
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    
    li.innerHTML = `
      <div class="domain-info">
        <img class="favicon" src="${faviconUrl}" onerror="this.src='data:image/svg+xml;utf8,<svg viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222%22 xmlns=%22http://www.w3.org/2000/svg%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/><line x1=%222%22 y1=%2212%22 x2=%2222%22 y2=%2212%22/></svg>';" alt="">
        <span class="domain-name">${domain}</span>
      </div>
      <button class="btn-delete" data-domain="${domain}" title="Remove rule">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
    `;
    
    domainList.appendChild(li);
  });

  // Attach delete events
  document.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const domainToRemove = btn.getAttribute('data-domain');
      removeDomain(domainToRemove);
    });
  });
}

// Sanitize inputs to extract pure domain name (e.g. https://www.facebook.com/messages -> facebook.com)
function sanitizeDomain(input) {
  let cleaned = input.trim().toLowerCase();
  
  // Remove protocol and www
  cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?/, '');
  
  // Extract hostname if path is present
  const slashIdx = cleaned.indexOf('/');
  if (slashIdx !== -1) {
    cleaned = cleaned.slice(0, slashIdx);
  }
  
  // Extract hostname if port is present
  const colonIdx = cleaned.indexOf(':');
  if (colonIdx !== -1) {
    cleaned = cleaned.slice(0, colonIdx);
  }

  // Regex to validate standard domain strings
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,24}$/;
  if (domainRegex.test(cleaned)) {
    return cleaned;
  }
  return null;
}

// Add a domain to the blocklist
function addDomain() {
  const inputVal = domainInput.value;
  const domain = sanitizeDomain(inputVal);
  
  addFeedback.textContent = '';
  addFeedback.className = 'feedback-text';

  if (!inputVal) {
    showAddFeedback('Domain field cannot be empty.', 'error');
    return;
  }

  if (!domain) {
    showAddFeedback('Please enter a valid domain name (e.g., youtube.com).', 'error');
    return;
  }

  if (blockedDomains.includes(domain)) {
    showAddFeedback('Website is already in the blocklist.', 'error');
    return;
  }

  // Update State & Storage
  blockedDomains.push(domain);
  chrome.storage.local.set({ blockedDomains }, () => {
    showAddFeedback(`Added ${domain} to blocklist.`, 'success');
    domainInput.value = '';
    renderDomainList();
  });
}

// Remove a domain from blocklist
function removeDomain(domain) {
  blockedDomains = blockedDomains.filter((d) => d !== domain);
  chrome.storage.local.set({ blockedDomains }, () => {
    renderDomainList();
  });
}

// Show feedback message for adding domain
function showAddFeedback(msg, type) {
  addFeedback.textContent = msg;
  if (type === 'error') {
    addFeedback.className = 'feedback-text';
  } else {
    addFeedback.className = 'feedback-text success-text';
  }
  
  // Clear success feedback after 3s
  if (type === 'success') {
    setTimeout(() => {
      if (addFeedback.textContent === msg) {
        addFeedback.textContent = '';
      }
    }, 3000);
  }
}

// Validate Remote App URL
function validateRemoteUrl(input) {
  const val = input.trim();
  if (!val) {
    return { valid: false, msg: 'URL cannot be empty.' };
  }
  try {
    const url = new URL(val);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, msg: 'URL protocol must be HTTP or HTTPS.' };
    }
    return { valid: true, url: url.href };
  } catch (e) {
    return { valid: false, msg: 'Please enter a valid URL (e.g., https://myapp.com).' };
  }
}

// Render Statistics Card values
function renderStats(stats) {
  const solved = stats.quizzesSolved || 0;
  statSolved.textContent = solved;
  
  // Calculate estimation: each completed puzzle blocks scrolling distraction and redirects back to work.
  const savedMinutes = solved * unlockDuration;
  statSaved.textContent = `${savedMinutes} mins`;
}

// Reset Stats metrics in storage
function resetStats() {
  if (confirm('Are you sure you want to reset your metrics? This cannot be undone.')) {
    const stats = { quizzesSolved: 0, blocksTriggered: 0 };
    chrome.storage.local.set({ stats }, () => {
      renderStats(stats);
    });
  }
}

// Register Listeners
btnAddDomain.addEventListener('click', addDomain);
domainInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    addDomain();
  }
});

exerciseProviderSelect.addEventListener('change', (e) => {
  const provider = e.target.value;
  toggleProviderUI(provider);
  chrome.storage.local.set({ exerciseProvider: provider });
  
  // Clear remote URL validation messages on switch
  remoteUrlFeedback.textContent = '';
  remoteUrlFeedback.className = 'feedback-text';
});

remoteUrlInput.addEventListener('input', (e) => {
  const val = e.target.value;
  const check = validateRemoteUrl(val);
  
  if (check.valid) {
    remoteUrlFeedback.textContent = 'Remote URL saved successfully.';
    remoteUrlFeedback.className = 'feedback-text success-text';
    chrome.storage.local.set({ remoteExerciseUrl: check.url });
  } else {
    remoteUrlFeedback.textContent = check.msg;
    remoteUrlFeedback.className = 'feedback-text';
  }
});

difficultySelect.addEventListener('change', (e) => {
  chrome.storage.local.set({ difficulty: e.target.value });
});

questionCountSlider.addEventListener('input', (e) => {
  const val = e.target.value;
  questionCountVal.textContent = val;
  chrome.storage.local.set({ questionCount: parseInt(val, 10) });
});

unlockDurationSlider.addEventListener('input', (e) => {
  const val = e.target.value;
  unlockDurationVal.textContent = val;
  unlockDuration = parseInt(val, 10);
  chrome.storage.local.set({ unlockDuration });
  
  // Update stats display projection immediately
  chrome.storage.local.get(['stats'], (data) => {
    renderStats(data.stats || { quizzesSolved: 0 });
  });
});

btnResetStats.addEventListener('click', resetStats);

// Page Load
document.addEventListener('DOMContentLoaded', initDashboard);
