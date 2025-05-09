console.log('[background.js] Script evaluating. Registering listeners...');

// Listen for clicks on the extension icon
chrome.action.onClicked.addListener((tab) => {
  console.log('[background.js] Extension icon clicked. Tab ID:', tab.id);
  // Send a message to the content script to open the chat panel
  chrome.tabs.sendMessage(tab.id, { action: "openChatPanel" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[background.js] Error sending message from icon click:', chrome.runtime.lastError.message);
    } else {
      console.log('[background.js] Message sent from icon click, response:', response);
    }
  });
});

// Listen for keyboard shortcut (Ctrl+Shift+A)
chrome.commands.onCommand.addListener((command) => {
  console.log('[background.js] Command received:', command);
  if (command === "toggle_chat_panel") {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs.length > 0) {
        console.log('[background.js] Sending message from command to Tab ID:', tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, {action: "openChatPanel"}, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[background.js] Error sending message from command:', chrome.runtime.lastError.message);
          } else {
            console.log('[background.js] Message sent from command, response:', response);
          }
        });
      } else {
        console.error('[background.js] No active tab found for command.');
      }
    });
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openSettingsPopup") {
    console.log('[background.js] Received openSettingsPopup request');
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 400,
      height: 550 // Adjusted height slightly for typical popup content
    }, (window) => {
      if (chrome.runtime.lastError) {
        console.error('[background.js] Error opening settings window:', chrome.runtime.lastError.message);
        sendResponse({success: false, error: chrome.runtime.lastError.message});
      } else {
        console.log('[background.js] Settings popup window created:', window.id);
        sendResponse({success: true});
      }
    });
    return true; // Indicate asynchronous response
  }
  // Handle other messages if any
  return true; // Keep the message channel open for other asynchronous responses
});
