// Helper to check if current page is the remote exercise application
function isRemoteApp(remoteUrl) {
  if (!remoteUrl) return false;
  try {
    const remote = new URL(remoteUrl);
    const current = new URL(window.location.href);
    
    // Match origin (protocol + host + port) and check if pathname starts with remote path
    return current.origin === remote.origin && current.pathname.startsWith(remote.pathname);
  } catch (e) {
    return false;
  }
}

// Check storage and set up message listener if matched
chrome.storage.local.get(['exerciseProvider', 'remoteExerciseUrl'], (data) => {
  const provider = data.exerciseProvider || 'local';
  const remoteUrl = data.remoteExerciseUrl;

  if (provider === 'remote' && isRemoteApp(remoteUrl)) {
    console.log('Math Lock: Injected and listening on remote exercise app.');

    window.addEventListener('message', (event) => {
      // Security check: only process events matching our schema
      if (event.data && event.data.type === 'MATH_LOCK_EXERCISE_COMPLETED') {
        
        // Extract target URL from postMessage data, or fall back to window.location.hash
        let targetUrl = event.data.targetUrl;
        if (!targetUrl && window.location.hash) {
          targetUrl = decodeURIComponent(window.location.hash.slice(1));
        }

        if (!targetUrl) {
          console.error('Math Lock: No target destination URL could be resolved.');
          return;
        }

        // Sanitize and resolve domain to unlock
        let domain = '';
        try {
          const urlObj = new URL(targetUrl);
          domain = urlObj.hostname;
          if (domain.startsWith('www.')) {
            domain = domain.slice(4);
          }
        } catch (e) {
          console.error('Math Lock: Target URL is invalid:', targetUrl);
          return;
        }

        console.log(`Math Lock: Challenge solved. Unlocking ${domain}...`);

        // Message background service worker to temporarily disable declarative rules
        chrome.runtime.sendMessage({ action: 'unlockDomain', domain }, (response) => {
          if (response && response.success) {
            console.log(`Math Lock: Successfully unlocked. Redirecting back to target URL...`);
            window.location.replace(targetUrl);
          } else {
            console.error('Math Lock: Background script failed to unlock the site.');
          }
        });
      }
    });
  }
});
