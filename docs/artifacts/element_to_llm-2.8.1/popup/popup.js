// Popup script
document.addEventListener('DOMContentLoaded', async () => {
  const selectButton = document.getElementById('selectElement');
  const dropdownToggle = document.getElementById('dropdownToggle');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const capturePageButton = document.getElementById('capturePage');
  const statusDiv = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const lastCaptureDiv = document.getElementById('lastCapture');
  const captureSelector = document.getElementById('captureSelector');
  const captureTime = document.getElementById('captureTime');
  const captureSiblings = document.getElementById('captureSiblings');
  const copyAgainButton = document.getElementById('copyAgain');
  const formatSelector = document.getElementById('formatVersion');
  const saveToFileCheckbox = document.getElementById('saveToFile');
  const saveLastCaptureButton = document.getElementById('saveLastCapture');
  const versionText = document.getElementById('versionText');

  let lastCaptureData = null;

  // Consent overlay elements
  const consentOverlay = document.getElementById('consent-overlay');
  const consentAccept = document.getElementById('consent-accept');
  const consentDecline = document.getElementById('consent-decline');

  // Check if consent is needed (null = not yet asked)
  chrome.storage.local.get('telemetryConsent', (result) => {
    if (result.telemetryConsent === null || result.telemetryConsent === undefined) {
      consentOverlay.classList.remove('hidden');
    }
  });

  // Handle consent accept
  consentAccept.addEventListener('click', () => {
    chrome.storage.local.set({ telemetryConsent: true, consentLastAsked: Date.now() }, () => {
      consentOverlay.classList.add('hidden');
    });
  });

  // Handle consent decline
  consentDecline.addEventListener('click', () => {
    chrome.storage.local.set({ telemetryConsent: false, consentLastAsked: Date.now() }, () => {
      consentOverlay.classList.add('hidden');
    });
  });

  // Set version from manifest
  const manifest = chrome.runtime.getManifest();
  versionText.textContent = `v${manifest.version} - Firefox Extension`;

  // Dropdown toggle
  dropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    dropdownMenu.classList.add('hidden');
  });

  // Capture entire page
  capturePageButton.addEventListener('click', async () => {
    try {
      dropdownMenu.classList.add('hidden');
      selectButton.disabled = true;
      dropdownToggle.disabled = true;
      statusText.textContent = 'Capturing page...';
      statusDiv.className = 'status';

      chrome.runtime.sendMessage({action: 'capturePage'}, (response) => {
        if (chrome.runtime.lastError || (response && response.error)) {
          statusText.textContent = response?.error || 'Error: Could not capture page';
          statusDiv.className = 'status error';
          selectButton.disabled = false;
          dropdownToggle.disabled = false;
        } else {
          window.close();
        }
      });
    } catch (error) {
      console.error('Error capturing page:', error);
      statusText.textContent = 'Error: Failed to capture page';
      statusDiv.className = 'status error';
      selectButton.disabled = false;
      dropdownToggle.disabled = false;
    }
  });
  
  // Wake up background script when popup opens
  try {
    chrome.runtime.sendMessage({action: 'ping'}, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Background script may be inactive:', chrome.runtime.lastError);
      } else {
        console.log('Background script is responsive');
      }
    });
  } catch (error) {
    console.warn('Failed to ping background script on popup open:', error);
  }
  
  // Load last capture and format preference from storage
  try {
    chrome.storage.local.get(['lastCapture', 'formatVersion', 'saveToFile'], (result) => {
      if (result.lastCapture) {
        lastCaptureData = result.lastCapture;
        displayLastCapture(result.lastCapture);
      }

      // Set format preference (default to v2)
      if (result.formatVersion) {
        formatSelector.value = result.formatVersion;
      } else {
        formatSelector.value = 'v2';
        // Save default preference
        chrome.storage.local.set({ formatVersion: 'v2' });
      }

      // Set save to file preference
      saveToFileCheckbox.checked = result.saveToFile || false;
    });
  } catch (error) {
    console.error('Failed to load last capture:', error);
  }

  // Handle format selector change
  formatSelector.addEventListener('change', () => {
    const selectedFormat = formatSelector.value;
    chrome.storage.local.set({ formatVersion: selectedFormat }, () => {
      console.log('Format preference saved:', selectedFormat);
      statusText.textContent = `Format changed to ${selectedFormat}`;
      statusDiv.className = 'status';

      // Clear status after 2 seconds
      setTimeout(() => {
        statusText.textContent = 'Ready';
      }, 2000);
    });
  });
  
  // Handle save to file checkbox change
  saveToFileCheckbox.addEventListener('change', () => {
    chrome.storage.local.set({ saveToFile: saveToFileCheckbox.checked });
  });

  // Handle save last capture to file
  saveLastCaptureButton.addEventListener('click', () => {
    if (lastCaptureData) {
      let jsonString;
      if (lastCaptureData['====NODES====']) {
        jsonString = Utils.serializeWithVisualMarkers(lastCaptureData);
      } else {
        jsonString = JSON.stringify(lastCaptureData);
      }
      const url = lastCaptureData['====METADATA====']?.url
        || lastCaptureData.captureInfo?.url || 'unknown';
      const filename = Utils.generateCaptureFilename(url);
      Utils.saveToFile(jsonString, filename).then(ok => {
        statusText.textContent = ok ? `Saved: ${filename}` : 'Save failed';
        statusDiv.className = ok ? 'status success' : 'status error';
        setTimeout(() => { statusText.textContent = 'Ready'; statusDiv.className = 'status'; }, 3000);
      });
    }
  });

  // Handle select button click
  selectButton.addEventListener('click', async () => {
    try {
      // Update UI
      selectButton.disabled = true;
      statusText.textContent = 'Injecting scripts...';
      statusDiv.className = 'status';
      
      // Send message to background script to inject and start selection
      chrome.runtime.sendMessage({action: 'startSelection'}, (response) => {
        if (chrome.runtime.lastError || (response && response.error)) {
          statusText.textContent = response?.error || 'Error: Could not connect to page';
          statusDiv.className = 'status error';
          selectButton.disabled = false;
        } else {
          // Close popup to allow selection
          window.close();
        }
      });
    } catch (error) {
      console.error('Error starting selection:', error);
      statusText.textContent = 'Error: Failed to start selection';
      statusDiv.className = 'status error';
      selectButton.disabled = false;
    }
  });
  
  // Handle copy again button
  copyAgainButton.addEventListener('click', () => {
    try {
      if (lastCaptureData) {
        const jsonString = JSON.stringify(lastCaptureData);
        navigator.clipboard.writeText(jsonString).then(() => {
          statusText.textContent = 'Copied to clipboard!';
          statusDiv.className = 'status success';
          setTimeout(() => {
            statusText.textContent = 'Ready';
            statusDiv.className = 'status';
          }, 2000);
        }).catch(error => {
          console.error('Failed to copy:', error);
          statusText.textContent = 'Failed to copy';
          statusDiv.className = 'status error';
        });
      }
    } catch (error) {
      console.error('Error copying data:', error);
      statusText.textContent = 'Error copying data';
      statusDiv.className = 'status error';
    }
  });
  
  // Display last capture info
  function displayLastCapture(data) {
    try {
      if (!data || !data.targetElement) return;
      
      lastCaptureDiv.classList.remove('hidden');
      captureSelector.textContent = data.targetElement.selector || '[no-selector]';
      
      // Format time
      const time = new Date(data.captureInfo?.timestamp || Date.now());
      const now = new Date();
      const diff = now - time;
      
      if (diff < 60000) {
        captureTime.textContent = 'Just now';
      } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        captureTime.textContent = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      } else if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        captureTime.textContent = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        captureTime.textContent = time.toLocaleString();
      }
      
      // Count siblings
      let totalSiblings = 0;
      if (data.ancestorChain) {
        data.ancestorChain.forEach(level => {
          if (level.siblings) {
            totalSiblings += level.siblings.length - 1; // Exclude current element
          }
        });
      }
      captureSiblings.textContent = `${totalSiblings} elements (${data.ancestorChain ? data.ancestorChain.length : 0} levels)`;
    } catch (error) {
      console.error('Error displaying last capture:', error);
    }
  }
  
  // Listen for capture complete message
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      if (request.action === 'captureComplete') {
        lastCaptureData = request.data;
        displayLastCapture(request.data);
        statusText.textContent = 'Element captured!';
        statusDiv.className = 'status success';
        selectButton.disabled = false;
      }
    } catch (error) {
      console.error('Error handling capture complete message:', error);
    }
  });
});