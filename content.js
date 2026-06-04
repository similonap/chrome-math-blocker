// Helper to check if current page is the remote exercise application
function isRemoteApp(remoteUrl) {
  if (!remoteUrl) return false;
  try {
    const remote = new URL(remoteUrl);
    const current = new URL(window.location.href);
    
    // Normalize hostnames by removing 'www.' for more flexible matching
    const remoteHost = remote.hostname.replace(/^www\./, '');
    const currentHost = current.hostname.replace(/^www\./, '');
    
    const protocolsMatch = remote.protocol === current.protocol;
    const hostsMatch = remoteHost === currentHost;
    const pathsMatch = current.pathname.startsWith(remote.pathname);

    return protocolsMatch && hostsMatch && pathsMatch;
  } catch (e) {
    console.error('Math Lock: Error parsing URLs in isRemoteApp', e);
    return false;
  }
}

// Check storage and set up message listener if matched
chrome.storage.local.get(['exerciseProvider', 'remoteExerciseUrl'], (data) => {
  const provider = data.exerciseProvider || 'local';
  const remoteUrl = data.remoteExerciseUrl;

  console.log('Math Lock: Content script loaded. Provider:', provider, 'Remote URL Configured:', remoteUrl);

  if (provider === 'remote' && isRemoteApp(remoteUrl)) {
    console.log('Math Lock: Confirmed as remote exercise app. Listening for completion message...');

    window.addEventListener('message', (event) => {
      // Security check: only process events matching our schema
      if (event.data && event.data.type === 'MATH_LOCK_EXERCISE_COMPLETED') {
        console.log('Math Lock: Received completion message!', event.data);
        
        // Extract target URL from postMessage data, or fall back to window.location.hash
        let targetUrl = event.data.targetUrl;
        if (!targetUrl && window.location.hash) {
          targetUrl = decodeURIComponent(window.location.hash.slice(1));
        }

        if (!targetUrl) {
          console.error('Math Lock: No target destination URL could be resolved. (Hash missing or empty data)');
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

        console.log(`Math Lock: Challenge solved. Requesting unlock for ${domain}...`);

        // Message background service worker to temporarily disable declarative rules
        chrome.runtime.sendMessage({ action: 'unlockDomain', domain }, (response) => {
          if (response && response.success) {
            console.log(`Math Lock: Successfully unlocked ${domain}. Redirecting to: ${targetUrl}`);
            window.location.replace(targetUrl);
          } else {
            console.error('Math Lock: Background script failed to unlock the site. Check background console.');
          }
        });
      }
    });
  } else if (provider === 'remote') {
    console.warn('Math Lock: Current URL does not match configured Remote Exercise URL.');
    console.log('Current:', window.location.href);
    console.log('Configured:', remoteUrl);
  }
});
