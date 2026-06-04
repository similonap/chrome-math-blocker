// Helper to generate a unique, deterministic rule ID for a domain
function getRuleIdForDomain(domain) {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash << 5) - hash + domain.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  // Ensure the ID is positive and within a safe range for Chrome extension rule IDs
  return (Math.abs(hash) % 2000000000) + 1;
}

// Generate the declarativeNetRequest rule for a domain
function makeRedirectRule(domain, provider, remoteUrl) {
  const ruleId = getRuleIdForDomain(domain);
  let redirectUrl = chrome.runtime.getURL('/block.html');
  
  if (provider === 'remote' && remoteUrl) {
    // Standardize URL: ensure trailing slash before hash
    redirectUrl = remoteUrl.endsWith('/') ? remoteUrl : remoteUrl + '/';
  }
  
  // Escape domain for use in regular expression
  const escapedDomain = domain.replace(/\./g, '\\.');
  
  return {
    id: ruleId,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: {
        regexSubstitution: `${redirectUrl}#\\0`
      }
    },
    condition: {
      // Matches http://domain.com/path, https://domain.com/path, and any subdomains
      regexFilter: `^https?://([a-zA-Z0-9-]+\\.)*${escapedDomain}([/:].*)?$`,
      resourceTypes: ['main_frame']
    }
  };
}

// Sync declarativeNetRequest rules with the current blockedDomains list
async function syncRules() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['blockedDomains', 'unlockedUntil', 'exerciseProvider', 'remoteExerciseUrl'], async (data) => {
      try {
        const blockedDomains = data.blockedDomains || [];
        const unlockedUntil = data.unlockedUntil || {};
        const exerciseProvider = data.exerciseProvider || 'local';
        const remoteExerciseUrl = data.remoteExerciseUrl || '';
        const now = Date.now();

        // Only block domains that are in the blocklist AND are not unlocked (or unlock has expired)
        const domainsToBlock = blockedDomains.filter(domain => {
          const expiration = unlockedUntil[domain];
          return !expiration || expiration < now;
        });

        const newRules = domainsToBlock.map(domain => makeRedirectRule(domain, exerciseProvider, remoteExerciseUrl));

        // Retrieve all current dynamic rules to clean them up
        const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
        const currentRuleIds = currentRules.map(r => r.id);

        // Atomically replace the rules
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: currentRuleIds,
          addRules: newRules
        });

        // Setup re-locking alarms for unblocked domains
        await syncAlarms(unlockedUntil);

        console.log('Rules synced. Blocked domains active:', domainsToBlock);
        resolve(true);
      } catch (err) {
        console.error('Error syncing rules:', err);
        resolve(false);
      }
    });
  });
}

// Synchronize chrome alarms for any unlocked domains that need to be re-locked
async function syncAlarms(unlockedUntil) {
  const now = Date.now();
  
  // Get active alarms to check if we need to modify them
  const activeAlarms = await chrome.alarms.getAll();
  const activeAlarmNames = new Set(activeAlarms.map(a => a.name));

  for (const [domain, expiration] of Object.entries(unlockedUntil)) {
    const alarmName = `lock-${domain}`;
    if (expiration > now) {
      if (!activeAlarmNames.has(alarmName)) {
        const delayInMinutes = (expiration - now) / 60000;
        // Ensure delay is at least slightly positive
        chrome.alarms.create(alarmName, { delayInMinutes: Math.max(0.01, delayInMinutes) });
        console.log(`Scheduled alarm to re-lock ${domain} in ${delayInMinutes.toFixed(2)} mins.`);
      }
    } else {
      // Cleanup expired entries from unlocked list
      delete unlockedUntil[domain];
    }
  }
}

// Handle lock expiration alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('lock-')) {
    const domain = alarm.name.slice(5);
    console.log(`Alarm fired. Re-locking domain: ${domain}`);
    
    chrome.storage.local.get(['unlockedUntil'], (data) => {
      const unlockedUntil = data.unlockedUntil || {};
      if (unlockedUntil[domain]) {
        delete unlockedUntil[domain];
        chrome.storage.local.set({ unlockedUntil }, async () => {
          await syncRules();
        });
      }
    });
  }
});

// Listen to storage changes to keep blocking rules up-to-date reactively
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'local' && (changes.blockedDomains || changes.unlockedUntil || changes.exerciseProvider || changes.remoteExerciseUrl)) {
    await syncRules();
  }
});

// Sync rules on browser startup and extension install/update
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['blockedDomains', 'unlockDuration', 'difficulty', 'questionCount', 'stats', 'exerciseProvider', 'remoteExerciseUrl'], (data) => {
    const defaults = {
      blockedDomains: ['facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'reddit.com', 'tiktok.com'],
      unlockDuration: 15, // in minutes
      difficulty: 'medium', // 'easy', 'medium', 'hard'
      questionCount: 5, // number of math exercises
      stats: {
        quizzesSolved: 0,
        blocksTriggered: 0
      },
      unlockedUntil: {},
      exerciseProvider: 'local',
      remoteExerciseUrl: ''
    };

    const updates = {};
    for (const [key, val] of Object.entries(defaults)) {
      if (data[key] === undefined) {
        updates[key] = val;
      }
    }

    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates, async () => {
        console.log('Initialized extension defaults:', updates);
        await syncRules();
      });
    } else {
      syncRules();
    }
  });
});

chrome.runtime.onStartup.addListener(async () => {
  await syncRules();
});

// Handle messages from block.js or content.js (unlock requests)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'unlockDomain') {
    const { domain } = message;
    
    chrome.storage.local.get(['unlockedUntil', 'unlockDuration', 'stats'], (data) => {
      const unlockedUntil = data.unlockedUntil || {};
      const unlockDuration = data.unlockDuration || 15;
      const now = Date.now();
      
      unlockedUntil[domain] = now + (unlockDuration * 60 * 1000);
      
      const stats = data.stats || { quizzesSolved: 0, blocksTriggered: 0 };
      stats.quizzesSolved += 1;

      chrome.storage.local.set({ unlockedUntil, stats }, async () => {
        await syncRules();
        sendResponse({ success: true, unlockedUntil: unlockedUntil[domain] });
      });
    });
    return true; // Keep message channel open for async response
  }
});
