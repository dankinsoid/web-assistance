
// popup.js - JavaScript for the popup
document.addEventListener('DOMContentLoaded', function() {
  const apiProviderSelect = document.getElementById('api-provider');
  const apiKeyInput = document.getElementById('api-key');
  const saveApiSettingsButton = document.getElementById('save-api-settings');
  const toggleChatPanelButton = document.getElementById('toggle-chat-panel');
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

  // Save API settings
  saveApiSettingsButton.addEventListener('click', function() {
    const apiProvider = apiProviderSelect.value;
    const apiKey = apiKeyInput.value;
    
    chrome.storage.local.set({
      apiProvider: apiProvider,
      apiKey: apiKey
    }, function() {
      const status = document.createElement('div');
      status.textContent = 'Settings saved!';
      status.style.color = 'green';
      status.style.marginTop = '10px';
      status.style.textAlign = 'center';
      
      const container = document.querySelector('.container');
      container.appendChild(status);
      
      setTimeout(function() {
        status.remove();
      }, 2000);
    });
  });

  // Toggle chat panel
  toggleChatPanelButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "toggleChatPanel"});
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
        
        const status = document.createElement('div');
        status.textContent = 'All settings reset!';
        status.style.color = 'green';
        status.style.marginTop = '10px';
        status.style.textAlign = 'center';
        
        const container = document.querySelector('.container');
        container.appendChild(status);
        
        setTimeout(function() {
          status.remove();
        }, 2000);
      });
    }
  });
});
