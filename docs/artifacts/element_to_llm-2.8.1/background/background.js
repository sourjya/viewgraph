// Track injected tabs to prevent re-injection (persistent storage)
let injectedTabs = new Set();

// ============================================================================
// TELEMETRY CONFIGURATION
// ============================================================================
const TELEMETRY_ENDPOINT = 'https://stats.insitu.im/e2llm';

// ============================================================================
// TELEMETRY FUNCTIONS
// ============================================================================

async function initTelemetry(isInstall) {
  const data = await chrome.storage.local.get(['visitorId', 'telemetryConsent', 'consentLastAsked', 'dailyStats']);

  // Ensure visitorId exists (fresh install OR upgrade from pre-telemetry version)
  if (!data.visitorId) {
    await chrome.storage.local.set({ visitorId: crypto.randomUUID() });
  }

  // Initialize telemetry state on fresh install only
  if (isInstall) {
    await chrome.storage.local.set({
      telemetryConsent: null,  // null = not yet asked
      currentDay: new Date().toISOString().split('T')[0],
      dailyStats: { captures: 0, formatV2: 0, formatV1: 0, captureElement: 0, captureFullPage: 0 }
    });
  } else {
    // On upgrade: re-ask if declined AND >30 days since last ask
    if (data.telemetryConsent === false && data.consentLastAsked) {
      const daysSinceAsked = (Date.now() - data.consentLastAsked) / (1000 * 60 * 60 * 24);
      if (daysSinceAsked >= 30) {
        await chrome.storage.local.set({ telemetryConsent: null });
      }
    }
  }

  // Ensure dailyStats exists (upgrade from pre-telemetry)
  if (!data.dailyStats) {
    await chrome.storage.local.set({
      currentDay: new Date().toISOString().split('T')[0],
      dailyStats: { captures: 0, formatV2: 0, formatV1: 0, captureElement: 0, captureFullPage: 0 }
    });
  }

  // Create/update daily alarm (fires every 24h)
  chrome.alarms.create('dailyTelemetryFlush', { periodInMinutes: 1440 });
}

async function incrementStats(format, isFullPage) {
  try {
    const data = await chrome.storage.local.get(['telemetryConsent', 'currentDay', 'dailyStats']);
    if (!data.telemetryConsent) return;  // no consent = no tracking

    const today = new Date().toISOString().split('T')[0];
    let stats = data.dailyStats || { captures: 0, formatV2: 0, formatV1: 0, captureElement: 0, captureFullPage: 0 };

    // New day? Flush old stats first
    if (data.currentDay && data.currentDay !== today) {
      await flushStats(data.currentDay, stats);
      stats = { captures: 0, formatV2: 0, formatV1: 0, captureElement: 0, captureFullPage: 0 };
    }

    stats.captures++;
    if (format === 'v2') stats.formatV2++; else stats.formatV1++;
    if (isFullPage) stats.captureFullPage++; else stats.captureElement++;

    await chrome.storage.local.set({ currentDay: today, dailyStats: stats });
  } catch (error) {
    console.debug('Telemetry increment failed:', error);
  }
}

async function sendPayload(payload) {
  const response = await fetch(TELEMETRY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

async function flushStats(day, stats) {
  if (!stats || stats.captures === 0) return;

  try {
    const { visitorId, telemetryQueue = [] } = await chrome.storage.local.get(['visitorId', 'telemetryQueue']);
    const total = stats.captures;

    const payload = {
      visitorId,
      version: chrome.runtime.getManifest().version,
      day,
      captures: total,
      formatV2Pct: Math.round((stats.formatV2 / total) * 100),
      formatV1Pct: Math.round((stats.formatV1 / total) * 100),
      elementPct: Math.round((stats.captureElement / total) * 100),
      fullPagePct: Math.round((stats.captureFullPage / total) * 100)
    };

    // Try to send current payload
    try {
      await sendPayload(payload);
    } catch {
      // Add to retry queue
      telemetryQueue.push(payload);
    }

    // Process retry queue (oldest first)
    const stillQueued = [];
    for (const queued of telemetryQueue) {
      try {
        await sendPayload(queued);
      } catch {
        stillQueued.push(queued);
      }
    }

    // Keep only last 7 days worth of failures
    const trimmedQueue = stillQueued.slice(-7);
    await chrome.storage.local.set({ telemetryQueue: trimmedQueue });
  } catch (error) {
    console.debug('Telemetry flush failed:', error);
  }
}

async function checkAndFlushIfNewDay() {
  try {
    const { currentDay, dailyStats, telemetryConsent } = await chrome.storage.local.get(['currentDay', 'dailyStats', 'telemetryConsent']);
    if (!telemetryConsent) return;

    const today = new Date().toISOString().split('T')[0];
    if (currentDay && currentDay !== today && dailyStats) {
      await flushStats(currentDay, dailyStats);
      await chrome.storage.local.set({
        currentDay: today,
        dailyStats: { captures: 0, formatV2: 0, formatV1: 0, captureElement: 0, captureFullPage: 0 }
      });
    }
  } catch (error) {
    console.debug('Telemetry day check failed:', error);
  }
}

// Alarm handler for daily telemetry flush
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyTelemetryFlush') {
    await checkAndFlushIfNewDay();
  }
});

// ============================================================================
// LIFECYCLE EVENTS
// ============================================================================

// Background script startup - restore state from storage
chrome.runtime.onStartup.addListener(async () => {
  console.log('Element-to-LLM background script started');
  await restoreInjectedTabsState();
  checkAndFlushIfNewDay();  // Check for day rollover on startup
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  console.log('Element-to-LLM extension installed/updated');
  await restoreInjectedTabsState();
  // Initialize telemetry (UUID only on fresh install)
  initTelemetry(reason === 'install');
});

// Restore injected tabs state from persistent storage
async function restoreInjectedTabsState() {
  try {
    const result = await chrome.storage.local.get(['injectedTabs']);
    if (result.injectedTabs && Array.isArray(result.injectedTabs)) {
      injectedTabs = new Set(result.injectedTabs);
      console.log(`Restored ${injectedTabs.size} injected tabs from storage`);
    }
  } catch (error) {
    console.warn('Failed to restore injected tabs state:', error);
    injectedTabs = new Set();
  }
}

// Persist injected tabs state to storage
async function persistInjectedTabsState() {
  try {
    await chrome.storage.local.set({
      injectedTabs: Array.from(injectedTabs),
      backgroundScriptAlive: Date.now()
    });
  } catch (error) {
    console.warn('Failed to persist injected tabs state:', error);
  }
}

// Clean up tracking when tabs are closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  injectedTabs.delete(tabId);
  await persistInjectedTabsState();
});

// Clean up tracking on navigation
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    injectedTabs.delete(tabId);
    await persistInjectedTabsState();
  }
});

// On-demand cleanup of stale tab references
async function cleanupStaleTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    const activeTabs = new Set(tabs.map(tab => tab.id));
    
    let cleaned = 0;
    for (const tabId of injectedTabs) {
      if (!activeTabs.has(tabId)) {
        injectedTabs.delete(tabId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} stale tab references`);
      await persistInjectedTabsState();
    }
  } catch (error) {
    console.warn('Failed to cleanup stale tabs:', error);
  }
}

// Update alive timestamp when actively used
async function updateAliveTimestamp() {
  try {
    await chrome.storage.local.set({backgroundScriptAlive: Date.now()});
  } catch (error) {
    console.warn('Failed to update alive timestamp:', error);
  }
}

// Initialize on script load
restoreInjectedTabsState();

// Message handler for communication between popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startSelection') {
    // Update alive timestamp when actively used
    updateAliveTimestamp();
    cleanupStaleTabs(); // Clean stale tabs on activity
    
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      try {
        const tab = tabs[0];
        
        // Check if content script is already loaded
        const alreadyInjected = injectedTabs.has(tab.id);
        
        if (!alreadyInjected) {
          // Inject content scripts and CSS
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/content.min.js']
          });
          
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['content/overlay.css']
          });
          
          injectedTabs.add(tab.id);
          await persistInjectedTabsState();
        }
        
        // Wait a moment for scripts to load, then send start selection message
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, {action: 'startSelection'}, (response) => {
            if (chrome.runtime.lastError) {
              // Content script not ready, try re-injecting
              injectedTabs.delete(tab.id);
              sendResponse({error: 'Content script not ready'});
            } else {
              sendResponse(response || {status: 'selection started'});
            }
          });
        }, alreadyInjected ? 50 : 150); // Shorter wait if already injected
      } catch (error) {
        console.error('Failed to inject content script:', error);
        sendResponse({error: error.message});
      }
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'capturePage') {
    updateAliveTimestamp();
    cleanupStaleTabs();

    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      try {
        const tab = tabs[0];
        const alreadyInjected = injectedTabs.has(tab.id);

        if (!alreadyInjected) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/content.min.js']
          });

          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['content/overlay.css']
          });

          injectedTabs.add(tab.id);
          await persistInjectedTabsState();
        }

        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, {action: 'capturePage'}, (response) => {
            if (chrome.runtime.lastError) {
              injectedTabs.delete(tab.id);
              sendResponse({error: 'Content script not ready'});
            } else {
              sendResponse(response || {status: 'page capture started'});
            }
          });
        }, alreadyInjected ? 50 : 150);
      } catch (error) {
        console.error('Failed to capture page:', error);
        sendResponse({error: error.message});
      }
    });
    return true;
  }

  if (request.action === 'copyToClipboard') {
    // Update alive timestamp when actively used
    updateAliveTimestamp();
    
    // Handle clipboard operations from content scripts
    navigator.clipboard.writeText(request.text).then(() => {
      sendResponse({success: true});
    }).catch((error) => {
      console.error('Background clipboard failed:', error);
      sendResponse({success: false, error: error.message});
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'saveToFile') {
    updateAliveTimestamp();
    const blob = new Blob([request.text], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: blobUrl,
      filename: 'sifr-captures/' + request.filename,
      conflictAction: 'uniquify',
      saveAs: false
    }, (downloadId) => {
      // Delay revoke — Windows Firefox reads blob data asynchronously after callback
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3500);
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    return true;
  }

  if (request.action === 'elementCaptured') {
    // Store the captured data temporarily
    chrome.storage.local.set({lastCapture: request.data}, () => {
      // Notify popup
      chrome.runtime.sendMessage({action: 'captureComplete', data: request.data}).catch(() => {});
    });
    // Track telemetry (format and capture type from request)
    incrementStats(request.format || 'v2', request.isFullPage || false);
  }
  
  if (request.action === 'ping') {
    // Health check ping from content scripts - update timestamp
    updateAliveTimestamp();
    sendResponse({status: 'alive', timestamp: Date.now()});
  }
});

// Handle extension icon click (alternative to popup)
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Wake up and update alive timestamp
    updateAliveTimestamp();
    await cleanupStaleTabs();
    
    // Check if content script is already loaded
    const alreadyInjected = injectedTabs.has(tab.id);
    
    if (!alreadyInjected) {
      // Inject content scripts and CSS
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.min.js']
      });
      
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content/overlay.css']
      });
      
      injectedTabs.add(tab.id);
      await persistInjectedTabsState();
    }
    
    // Wait a moment for scripts to load, then start selection
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, {action: 'startSelection'}, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not ready, remove from tracking
          injectedTabs.delete(tab.id);
          console.warn('Content script not ready:', chrome.runtime.lastError);
        }
      });
    }, alreadyInjected ? 50 : 150); // Shorter wait if already injected
  } catch (error) {
    console.error('Failed to inject content script:', error);
  }
});