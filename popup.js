
// popup.js - JavaScript for the popup
document.addEventListener('DOMContentLoaded', function() {
  const apiProviderSelect = document.getElementById('api-provider');
  const apiKeyInput = document.getElementById('api-key');
  const saveApiSettingsButton = document.getElementById('save-api-settings');
  const clearChatButton = document.getElementById('clear-chat');
  const resetSettingsButton = document.getElementById('reset-settings');

  // Load saved settings
  chrome.storage.local.get(['apiProvider', 'apiKey'], function(result) {
    if (result.apiProvider) {
      apiProviderSelect.value = result.apiProvider;
    }
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });

  // Helper function to show status messages
  function showStatus(message, isError = false) {
    const existingStatus = document.querySelector('.status-message');
    if (existingStatus) {
      existingStatus.remove();
    }
    
    const status = document.createElement('div');
    status.className = 'status-message';
    status.textContent = message;
    
    if (isError) {
      status.style.backgroundColor = 'rgba(248, 113, 113, 0.1)';
      status.style.color = 'var(--error)';
    }
    
    const container = document.querySelector('.container');
    container.appendChild(status);
    
    setTimeout(function() {
      if (document.body.contains(status)) {
        status.remove();
      }
    }, 5000);
  }

  // Save API settings
  saveApiSettingsButton.addEventListener('click', function() {
    const apiProvider = apiProviderSelect.value;
    const apiKey = apiKeyInput.value;
    
    if (!apiKey) {
      showStatus('Please enter an API key', true);
      return;
    }
    
    chrome.storage.local.set({
      apiProvider: apiProvider,
      apiKey: apiKey
    }, function() {
      showStatus('Settings saved successfully!');
    });
  });
  
  // Clear chat history
  clearChatButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "clearChat"}, function(response) {
        if (response && response.success) {
          showStatus('Chat history cleared!');
        }
      });
    });
  });

  // Reset all settings
  resetSettingsButton.addEventListener('click', function() {
    if (confirm('Are you sure you want to reset all settings?')) {
      chrome.storage.local.clear(function() {
        apiProviderSelect.value = 'openai';
        apiKeyInput.value = '';
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {action: "resetSettings"});
        });
        
        showStatus('All settings reset!');
      });
    }
  });
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to save settings
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      saveApiSettingsButton.click();
    }
    
    // Escape to close popup
    if (e.key === 'Escape') {
      // If in an iframe, send a message to the parent to close
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ action: 'closeSettingsPopupFromIframe' }, '*');
      } else {
        // Fallback for when not in an iframe (e.g., opened directly)
        window.close();
      }
    }
  });
});
