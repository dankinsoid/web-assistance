// Listen for clicks on the extension icon
chrome.action.onClicked.addListener((tab) => {
  // Send a message to the content script to toggle the chat panel
  chrome.tabs.sendMessage(tab.id, { action: "toggleChatPanel" });
});

// Listen for keyboard shortcut (Ctrl+Shift+A)
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle_chat_panel") {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "toggleChatPanel"});
    });
  }
});
