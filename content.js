
// content.js - Script that runs in the context of web pages
(function() {
  // State variables
  let chatPanelVisible = false;
  let userActionHistory = [];
  let chatMessages = []; // Store chat messages
  
  // Panel position and dragging state
  let isDragging = false;
  let isResizing = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialPanelX = 0;
  let initialPanelY = 0;
  let initialPanelWidth = 0;
  let initialPanelHeight = 0;
  // let settingsPopupIframe = null; // No longer needed
  let isSettingsViewActive = false; // To track if settings view is shown
  let chatPanelContentArea = null; // Div to hold chat or settings
  let chatMessagesContainer = null;
  let chatQuickActions = null;
  let chatInputContainer = null;
  let settingsViewDOM = null; // To store the settings DOM

  // Create and add the chat panel to the page
  function createChatPanel() {
    console.log('[content.js] createChatPanel called');
    const panel = document.createElement('div');
    panel.className = 'ai-chat-panel';
    panel.style.display = 'none'; // Initially hidden
    
    panel.innerHTML = `
      <div class="ai-chat-header">
        <h3>AI Page Assistant</h3>
        <div class="ai-chat-controls">
          <button class="ai-chat-settings">⚙️</button> 
          <button class="ai-chat-close">✕</button>
        </div>
      </div>
      <div class="ai-chat-panel-content-area"></div>
      <div class="resize-handle"></div>
    `;
    
    document.body.appendChild(panel);
    chatPanelContentArea = panel.querySelector('.ai-chat-panel-content-area');

    // Create chat view components
    chatMessagesContainer = document.createElement('div');
    chatMessagesContainer.className = 'ai-chat-messages';

    chatQuickActions = document.createElement('div');
    chatQuickActions.className = 'ai-chat-quick-actions';
    chatQuickActions.innerHTML = `
      <button class="ai-action-button" data-action="translate">Translate Page</button>
      <button class="ai-action-button" data-action="summarize">Summarize</button>
      <button class="ai-action-button" data-action="highlight">Highlight Keywords</button>
      <button class="ai-action-button" data-action="click">Click Element</button>
    `;

    chatInputContainer = document.createElement('div');
    chatInputContainer.className = 'ai-chat-input-container';
    chatInputContainer.innerHTML = `
      <textarea class="ai-chat-input" placeholder="Ask AI to help with this page..."></textarea>
      <button class="ai-chat-send">➤</button>
    `;
    
    // Initially show chat view
    showChatView();

    // Add event listeners to chat panel elements
    const header = panel.querySelector('.ai-chat-header');
    const settingsBtn = panel.querySelector('.ai-chat-settings');
    const closeBtn = panel.querySelector('.ai-chat-close');
    const input = chatInputContainer.querySelector('.ai-chat-input');
    const sendBtn = chatInputContainer.querySelector('.ai-chat-send');
    const quickActionButtons = chatQuickActions.querySelectorAll('.ai-action-button');
    const resizeHandle = panel.querySelector('.resize-handle');
    
    // Set up dragging functionality
    setupDraggable(panel, header);
    
    // Set up resizing functionality
    setupResizable(panel, resizeHandle);
        
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent header drag event
      toggleSettingsView();
    });
    
    // Close the panel
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent header drag event
      panel.style.display = 'none';
      chatPanelVisible = false;
    });
    
    // Send message on button click
    sendBtn.addEventListener('click', () => {
      const message = input.value.trim();
      if (message) {
        sendMessage(message);
        input.value = '';
      }
    });
    
    // Send message on Enter (but allow Shift+Enter for new lines)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = input.value.trim();
        if (message) {
          sendMessage(message);
          input.value = '';
        }
      }
    });
    
    // Auto-resize textarea as user types
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = (input.scrollHeight < 100) ? `${input.scrollHeight}px` : '100px';
    });
    
    // Quick action buttons
    quickActionButtons.forEach(button => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-action');
        performAction(action);
      });
    });
    
    return panel;
  }

  function showChatView() {
    chatPanelContentArea.innerHTML = ''; // Clear previous content
    chatPanelContentArea.appendChild(chatMessagesContainer);
    chatPanelContentArea.appendChild(chatQuickActions);
    chatPanelContentArea.appendChild(chatInputContainer);
    isSettingsViewActive = false;
  }

  function createSettingsViewDOM() {
    if (settingsViewDOM) return settingsViewDOM; // Return cached DOM if already created

    settingsViewDOM = document.createElement('div');
    settingsViewDOM.className = 'ai-settings-view';
    // Mimic structure from popup.html
    settingsViewDOM.innerHTML = `
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="settings-back-to-chat">← Back to Chat</button>
      </div>
      <div class="settings-content">
        <div class="api-settings">
          <h3>API Settings</h3>
          <div class="form-group">
            <label for="settings-api-provider">AI Provider:</label>
            <select id="settings-api-provider">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
          <div class="form-group">
            <label for="settings-api-key">API Key:</label>
            <input type="password" id="settings-api-key" placeholder="Enter your API key">
          </div>
          <button id="settings-save-api">Save Settings</button>
        </div>
        <div class="actions">
          <h3>Chat Actions</h3>
          <button id="settings-clear-chat">Clear History</button>
          <button id="settings-reset-all">Reset All</button>
        </div>
        <div class="settings-status-message"></div>
      </div>
    `;

    // Add event listeners for settings elements
    const backButton = settingsViewDOM.querySelector('.settings-back-to-chat');
    const apiProviderSelect = settingsViewDOM.querySelector('#settings-api-provider');
    const apiKeyInput = settingsViewDOM.querySelector('#settings-api-key');
    const saveApiSettingsButton = settingsViewDOM.querySelector('#settings-save-api');
    const clearChatButton = settingsViewDOM.querySelector('#settings-clear-chat');
    const resetSettingsButton = settingsViewDOM.querySelector('#settings-reset-all');

    backButton.addEventListener('click', () => toggleSettingsView());

    saveApiSettingsButton.addEventListener('click', () => {
      const apiProvider = apiProviderSelect.value;
      const apiKey = apiKeyInput.value;
      if (!apiKey) {
        showStatusInSettingsPanel('Please enter an API key', true);
        return;
      }
      chrome.storage.local.set({ apiProvider: apiProvider, apiKey: apiKey }, () => {
        showStatusInSettingsPanel('Settings saved successfully!');
      });
    });

    clearChatButton.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: "clearChat" }, (response) => {
        if (response && response.success) {
          showStatusInSettingsPanel('Chat history cleared!');
        }
      });
    });

    resetSettingsButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all settings?')) {
        chrome.storage.local.clear(() => {
          apiProviderSelect.value = 'openai'; // Default
          apiKeyInput.value = '';
          chrome.runtime.sendMessage({ action: "resetSettings" });
          showStatusInSettingsPanel('All settings reset!');
        });
      }
    });
    
    // Keyboard shortcuts within settings
    settingsViewDOM.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            saveApiSettingsButton.click();
        }
        if (e.key === 'Escape') {
            backButton.click();
        }
    });

    return settingsViewDOM;
  }
  
  function showStatusInSettingsPanel(message, isError = false) {
    const statusElement = settingsViewDOM.querySelector('.settings-status-message');
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.style.color = isError ? 'var(--error-color, #f87171)' : 'var(--success-color, #34d399)';
    statusElement.style.display = 'block';
    
    setTimeout(() => {
      statusElement.style.display = 'none';
      statusElement.textContent = '';
    }, 5000);
  }

  function loadApiSettingsToUI() {
    const apiProviderSelect = settingsViewDOM.querySelector('#settings-api-provider');
    const apiKeyInput = settingsViewDOM.querySelector('#settings-api-key');
    chrome.storage.local.get(['apiProvider', 'apiKey'], (result) => {
      if (result.apiProvider) apiProviderSelect.value = result.apiProvider;
      if (result.apiKey) apiKeyInput.value = result.apiKey;
    });
  }

  function toggleSettingsView() {
    if (isSettingsViewActive) {
      showChatView();
      // Reload messages for chat view if needed
      const panel = document.querySelector('.ai-chat-panel');
      if (panel && chatPanelVisible) { // Ensure panel is supposed to be visible
          loadChatMessages().then(messagesLoaded => {
            if (!messagesLoaded) {
              addMessage("Hello! I'm your AI assistant. I can help you with this page. Try asking me to translate content, highlight information, click elements, or perform other tasks.", 'ai');
              const pageTopic = inferPageTopic();
              if (pageTopic) {
                addMessage(`This page seems to be about ${pageTopic}. Would you like me to summarize it or highlight key points?`, 'ai');
              }
            }
          });
      }
    } else {
      chatPanelContentArea.innerHTML = ''; // Clear previous content
      chatPanelContentArea.appendChild(createSettingsViewDOM());
      loadApiSettingsToUI(); // Load current settings into the form
      isSettingsViewActive = true;
    }
  }

  // Ensure the chat panel is visible
  function ensureChatPanelIsVisible() {
    console.log('[content.js] ensureChatPanelIsVisible called. chatPanelVisible:', chatPanelVisible);
    const panel = document.querySelector('.ai-chat-panel') || createChatPanel();
    
    const needsInitialization = !chatPanelVisible; // Check if it was previously hidden or is being shown for the first time
    console.log('[content.js] needsInitialization:', needsInitialization);

    panel.style.display = 'flex'; // Always ensure it's set to be visible
    console.log('[content.js] Panel display set to flex.');

    if (needsInitialization) { 
      console.log('[content.js] Panel needs initialization.');
      // This block runs only if the panel was not visible and is now being made visible.
      restorePanelPositionAndSize(panel);
      
      loadChatMessages().then(messagesLoaded => {
        if (!messagesLoaded) {
          // Add a welcome message if no previous messages were loaded for this page
          addMessage("Hello! I'm your AI assistant. I can help you with this page. Try asking me to translate content, highlight information, click elements, or perform other tasks.", 'ai');
          
          const pageTopic = inferPageTopic();
          if (pageTopic) {
            addMessage(`This page seems to be about ${pageTopic}. Would you like me to summarize it or highlight key points?`, 'ai');
          }
        }
      });
      chatPanelVisible = true; // Update state to visible
    }
    // If it was already visible (chatPanelVisible was true), panel.style.display = 'flex' just re-affirms it.
    // We don't re-run restorePanelPositionAndSize or loadChatMessages if it was already visible.
  }
  
  // Restore panel position and size from storage
  function restorePanelPositionAndSize(panel) {
    chrome.storage.local.get(['panelPosition', 'panelDimensions'], (result) => {
      // Restore position if saved
      if (result.panelPosition) {
        // Check if position is within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Ensure panel is visible in viewport
        const left = Math.min(Math.max(0, result.panelPosition.left), viewportWidth - 300);
        const top = Math.min(Math.max(0, result.panelPosition.top), viewportHeight - 300);
        
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
      }
      
      // Restore dimensions if saved
      if (result.panelDimensions) {
        panel.style.width = `${result.panelDimensions.width}px`;
        panel.style.height = `${result.panelDimensions.height}px`;
      }
    });
  }
  
  // Load chat messages from chrome.storage
  async function loadChatMessages() {
    return new Promise(resolve => {
      chrome.storage.local.get(['chatMessages', 'pageUrl'], result => {
        // const messagesContainer = document.querySelector('.ai-chat-messages');
        // Ensure chatMessagesContainer is used
        if (!chatMessagesContainer) { // Should not happen if panel is visible
            resolve(false);
            return;
        }
        
        // Clear existing messages in the DOM
        chatMessagesContainer.innerHTML = '';
        
        // Check if we have messages for this URL
        if (result.chatMessages && result.chatMessages.length > 0 && result.pageUrl === window.location.href) {
          chatMessages = result.chatMessages;
          
          // Add messages to the DOM
          chatMessages.forEach(msg => {
            const message = document.createElement('div');
            message.className = `ai-chat-message ${msg.sender}`;
            
            if (msg.sender === 'ai' && msg.text.includes('[[') && msg.text.includes(']]')) {
              // Handle action buttons in stored messages
              const processedText = msg.text.replace(/\[\[(.*?):(.*?)\]\]/g, (match, action, label) => {
                return `<button class="ai-action-button" data-action="${action}">${label}</button>`;
              });
              message.innerHTML = processedText;
              
              // Add event listeners to action buttons
              setTimeout(() => {
                message.querySelectorAll('.ai-action-button').forEach(button => {
                  button.addEventListener('click', () => {
                    const action = button.getAttribute('data-action');
                    performAction(action);
                  });
                });
              }, 0);
            } else {
              message.textContent = msg.text;
            }
          
            chatMessagesContainer.appendChild(message);
          });
        
          // Scroll to bottom
          chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
          resolve(true);
        } else {
          // No messages found for this URL or no messages at all
          chatMessages = [];
          resolve(false);
        }
      });
    });
  }
  
  // Add a message to the chat
  function addMessage(text, sender) {
    // const messagesContainer = document.querySelector('.ai-chat-messages');
    // Ensure chatMessagesContainer is used
    if (!chatMessagesContainer) return; // Don't add if container not ready

    const message = document.createElement('div');
    message.className = `ai-chat-message ${sender}`;
    
    // If it's an AI message, check for action buttons
    if (sender === 'ai' && text.includes('[[') && text.includes(']]')) {
      // Replace [[action:label]] with action buttons
      text = text.replace(/\[\[(.*?):(.*?)\]\]/g, (match, action, label) => {
        return `<button class="ai-action-button" data-action="${action}">${label}</button>`;
      });
      message.innerHTML = text;
      
      // Add event listeners to the newly created action buttons
      setTimeout(() => {
        message.querySelectorAll('.ai-action-button').forEach(button => {
          button.addEventListener('click', () => {
            const action = button.getAttribute('data-action');
            performAction(action);
          });
        });
      }, 0);
    } else {
      message.textContent = text;
    }
    
    chatMessagesContainer.appendChild(message);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    
    // Store message in memory and in chrome.storage
    chatMessages.push({ text, sender });
    saveChatMessages();
  }
  
  // Save chat messages to chrome.storage
  function saveChatMessages() {
    chrome.storage.local.set({ 
      chatMessages: chatMessages,
      pageUrl: window.location.href
    });
  }
  
  // Send a message to the AI and display the response
  async function sendMessage(message) {
    // Add user message to chat
    addMessage(message, 'user');
    
    // Save user action to history
    userActionHistory.push({
      type: 'message',
      content: message,
      timestamp: new Date().toISOString()
    });
    
    // Add temporary "thinking" message
    addMessage("Thinking...", 'ai');
    
    try {
      // Get API settings
      const apiSettings = await new Promise(resolve => {
        chrome.storage.local.get(['apiProvider', 'apiKey'], resolve);
      });
      
      if (!apiSettings.apiKey) {
        // Replace the "thinking" message with an error
        const thinkingMsg = document.querySelector('.ai-chat-message.ai:last-child');
        thinkingMsg.textContent = "Please set up your API key in the extension popup.";
        return;
      }
      
      // Get the page context
      const pageContext = getPageContext();
      
      // Send to appropriate AI API
      const response = await callAI(message, pageContext, apiSettings);
      
      // Replace the "thinking" message with the AI response
      const thinkingMsg = chatMessagesContainer.querySelector('.ai-chat-message.ai:last-child');
      if (thinkingMsg) {
        // messagesContainer = document.querySelector('.ai-chat-messages');
        chatMessagesContainer.removeChild(thinkingMsg);
      }
      
      // Add the actual response
      addMessage(response, 'ai');
      
      // Check if response contains instructions to modify the page
      processAIResponse(response);
      
    } catch (error) {
      console.error('Error sending message to AI:', error);
      // Replace the "thinking" message with an error
      const thinkingMsg = document.querySelector('.ai-chat-message.ai:last-child');
      thinkingMsg.textContent = "Sorry, I encountered an error. Please try again.";
    }
  }
  
  // Call the appropriate AI API based on settings
  async function callAI(message, pageContext, apiSettings) {
    const { apiProvider, apiKey } = apiSettings;
    
    // Construct the prompt with page context
    const prompt = `
      You are an AI assistant embedded in a web page as a Chrome extension.
      Current page: ${document.title} - ${window.location.href}
      
      USER REQUEST: ${message}
      
      PAGE CONTEXT:
      ${pageContext}
      
      You can perform actions on the page using special commands:
      - To highlight text: Use [[highlight:text to find]]
      - To click a button or link: Use [[click:element description or text]]
      - To translate content: Use [[translate:VALID_CSS_SELECTOR]] (e.g., [[translate:p]] or [[translate:#main-article p]]). Do not use descriptive phrases like "textContent" as a selector.
      - To extract data: Use [[extract:what to extract]]
      
      Include these commands in your response when you can help with the request.
      
      Consider the user's recent actions:
      ${JSON.stringify(userActionHistory.slice(-5))}
      
      If you understand the request and can map it to one of the special commands, perform the action directly by including the command in your response.
      If the request is ambiguous, or you need more information to use a command (e.g., a more specific selector), ask for clarification.
      Otherwise, respond conversationally.
    `;
    
    // Different API calls based on provider
    const systemMessage = 'You are an AI assistant that helps users interact with web pages.';
    const max_tokens = 500;

    try {
      switch (apiProvider) {
        case 'openai':
          return await _callOpenAI_API(apiKey, 'gpt-3.5-turbo', [{ role: 'system', content: systemMessage }, { role: 'user', content: prompt }], max_tokens);
        case 'anthropic':
          return await _callAnthropic_API(apiKey, 'claude-3-haiku-20240307', systemMessage, [{ role: 'user', content: prompt }], max_tokens);
        case 'gemini':
          // Gemini combines system and user prompt for basic models
          const geminiPrompt = `${systemMessage}\n\n${prompt}`;
          return await _callGemini_API(apiKey, 'gemini-1.0-pro', geminiPrompt, max_tokens);
        default:
          return "Please select a valid AI provider in the extension settings.";
      }
    } catch (error) {
      console.error(`Error calling AI provider ${apiProvider}:`, error);
      return `Sorry, there was an error contacting the AI (${apiProvider}). Please check your API key and network connection.`;
    }
  }

  // --- Low-level API Callers ---
  async function _callOpenAI_API(apiKey, model, messages, max_tokens) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages, max_tokens })
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API Error:", errorData);
      throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || ''}`);
    }
    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  async function _callAnthropic_API(apiKey, model, systemMessage, userMessages, max_tokens) {
    const body = {
      model,
      max_tokens,
      messages: userMessages
    };
    if (systemMessage) {
      body.system = systemMessage;
    }
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Anthropic API Error:", errorData);
      throw new Error(`Anthropic API error: ${response.status} ${errorData.error?.message || ''}`);
    }
    const data = await response.json();
    return data.content[0]?.text || "";
  }

  async function _callGemini_API(apiKey, model, promptText, max_tokens) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { maxOutputTokens: max_tokens }
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      throw new Error(`Gemini API error: ${response.status} ${errorData.error?.message || ''}`);
    }
    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || "";
  }
  // --- End Low-level API Callers ---

  // Get relevant context from the current page
  function getPageContext() {
    // Get the page title
    const title = document.title;
    
    // Get main content (try to exclude navigation, footer, etc.)
    const mainContent = document.querySelector('main') || 
                        document.querySelector('article') || 
                        document.querySelector('.content') || 
                        document.body;
    
    // Get text content with some structure preservation
    const textContent = extractStructuredText(mainContent);
    
    // Get meta description
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    
    // Get current URL
    const url = window.location.href;
    
    // Get all forms on the page
    const forms = Array.from(document.forms).map(form => {
      return {
        id: form.id,
        name: form.name,
        action: form.action,
        method: form.method,
        fields: Array.from(form.elements).filter(el => el.tagName !== 'FIELDSET').map(field => {
          return {
            type: field.type,
            name: field.name,
            id: field.id,
            placeholder: field.placeholder
          };
        })
      };
    });
    
    // Get all buttons and links
    const interactiveElements = [...document.querySelectorAll('button, a, [role="button"]')].map(el => {
      return {
        type: el.tagName.toLowerCase(),
        text: el.textContent.trim(),
        id: el.id,
        class: el.className,
        href: el.href || null,
        visible: isElementVisible(el)
      };
    }).filter(el => el.text && el.visible);
    
    // Combine all context
    const context = {
      title,
      url,
      metaDescription,
      textContent: textContent.substring(0, 3000) + (textContent.length > 3000 ? '...' : ''),
      forms: forms.slice(0, 5), // Limit to 5 forms
      interactiveElements: interactiveElements.slice(0, 20) // Limit to 20 elements
    };
    
    return JSON.stringify(context, null, 2);
  }

  async function fetchTranslation(textToTranslate, targetLanguage, apiSettings) {
    if (!textToTranslate || !textToTranslate.trim()) {
      return ""; // Nothing to translate
    }
    const { apiProvider, apiKey } = apiSettings;
    const systemPrompt = "You are a precise translation engine. Output ONLY the translated text.";
    const userPrompt = `Translate the following text to ${targetLanguage}. Output ONLY the translated text, without any additional explanations or conversation.\n\nText to translate:\n"${textToTranslate}"`;
    // Estimate tokens for translation, roughly 1.5x characters for some languages, plus prompt.
    const max_tokens = Math.max(100, Math.floor(textToTranslate.length * 1.5) + 50);

    try {
      switch (apiProvider) {
        case 'openai':
          return await _callOpenAI_API(apiKey, 'gpt-3.5-turbo', [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], max_tokens);
        case 'anthropic':
          return await _callAnthropic_API(apiKey, 'claude-3-haiku-20240307', systemPrompt, [{ role: 'user', content: userPrompt }], max_tokens);
        case 'gemini':
          const geminiFullPrompt = `${systemPrompt}\n\n${userPrompt}`;
          return await _callGemini_API(apiKey, 'gemini-1.0-pro', geminiFullPrompt, max_tokens);
        default:
          console.warn(`Translation not supported for provider: ${apiProvider}`);
          return `${textToTranslate} (Translation for ${apiProvider} not implemented, target: ${targetLanguage})`;
      }
    } catch (error) {
      console.error(`Error fetching translation from ${apiProvider}:`, error);
      addMessage(`Error translating text using ${apiProvider}. Check console for details.`, 'ai');
      return textToTranslate; // Fallback to original text
    }
  }
  
  // Extract text while preserving some structure
  function extractStructuredText(element) {
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const paragraphs = element.querySelectorAll('p');
    
    let result = '';
    
    // Add headings with their levels
    headings.forEach(heading => {
      const level = heading.tagName.charAt(1);
      const text = heading.textContent.trim();
      if (text) {
        result += `[Heading ${level}] ${text}\n`;
      }
    });
    
    // Add paragraphs
    paragraphs.forEach(p => {
      const text = p.textContent.trim();
      if (text) {
        result += `${text}\n\n`;
      }
    });
    
    // If we didn't get much content, fall back to all text
    if (result.length < 200) {
      result = element.textContent.trim()
        .replace(/\s+/g, ' ')
        .split('. ')
        .join('.\n');
    }
    
    return result;
  }
  
  // Check if an element is visible on the page
  function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           el.offsetWidth > 0 && 
           el.offsetHeight > 0;
  }
  
  // Process AI response for special commands and perform actions
  function processAIResponse(response) {
    // Extract action commands like [[action:target]]
    const actionRegex = /\[\[(.*?):(.*?)\]\]/g;
    let match;
    
    // Keep track of all actions to log
    const actions = [];
    
    while ((match = actionRegex.exec(response)) !== null) {
      const action = match[1];
      const target = match[2];
      
      // Perform the action
      try {
        performAction(action, target);
        actions.push({ action, target });
      } catch (error) {
        console.error(`Error performing action ${action}:`, error);
      }
    }
    
    // Log performed actions
    if (actions.length > 0) {
      userActionHistory.push({
        type: 'ai_actions',
        actions: actions,
        timestamp: new Date().toISOString()
      });
      
      // Save to storage
      chrome.storage.local.set({ userActionHistory: userActionHistory });
    }
  }
  
  // Perform various actions on the page
  function performAction(action, target) {
    switch (action) {
      case 'translate':
        translateContent(target);
        break;
      case 'highlight':
        highlightText(target);
        break;
      case 'click':
        clickElement(target);
        break;
      case 'summarize':
        summarizePage();
        break;
      case 'extract':
        extractData(target);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
    
    // Log user action
    userActionHistory.push({
      type: 'action',
      action: action,
      target: target,
      timestamp: new Date().toISOString()
    });
    
    // Save to storage
    chrome.storage.local.set({ userActionHistory: userActionHistory });
  }
  
  // Translate content function
  async function translateContent(selectorOrDescription) {
    addMessage("Preparing to translate content...", 'ai');

    const apiSettings = await new Promise(resolve => {
      chrome.storage.local.get(['apiProvider', 'apiKey'], resolve);
    });

    if (!apiSettings.apiKey) {
      addMessage("Please set up your API key in the extension settings to use translation.", 'ai');
      return;
    }

    const targetLanguage = "English"; // Hardcoded for now. Future: make this configurable or infer from user query.
    let elementsToTranslate = [];
    const commonNonSelectors = ["textcontent", "all text", "the content", "page content", "entire page", "text content"];

    if (!selectorOrDescription || 
        selectorOrDescription.toLowerCase() === "page" || 
        selectorOrDescription.toLowerCase() === "this page" ||
        commonNonSelectors.includes(selectorOrDescription.toLowerCase().trim())) {
      // Default elements if "page", no specific selector, or a common non-selector phrase is given
      elementsToTranslate = Array.from(document.querySelectorAll('h1, h2, h3, h4, p, li, span, div, article, section, main'))
                                  .filter(el => el.offsetParent !== null && el.textContent.trim().length > 10 && !el.closest('.ai-chat-panel')); 
      if (elementsToTranslate.length === 0 && commonNonSelectors.includes(selectorOrDescription?.toLowerCase().trim())) {
         addMessage(`Interpreted "${selectorOrDescription}" as a request to translate the page, but found no meaningful content.`, 'ai');
         return;
      }
    } else { // Attempt to use selectorOrDescription as a CSS selector
      try {
        elementsToTranslate = Array.from(document.querySelectorAll(selectorOrDescription))
                                    .filter(el => el.offsetParent !== null && !el.closest('.ai-chat-panel'));
        if (elementsToTranslate.length === 0) {
          addMessage(`No elements found for selector "${selectorOrDescription}". Please try a different selector or ask to translate "this page".`, 'ai');
          return;
        }
      } catch (e) {
        addMessage(`"${selectorOrDescription}" is not a valid CSS selector. Ask to translate "this page" or provide a valid selector.`, 'ai');
        console.error("Invalid selector for translation:", e);
        return;
      }
    }
    
    if (elementsToTranslate.length === 0) {
        addMessage("No content found to translate with the given criteria.", 'ai');
        return;
    }

    addMessage(`Translating ${elementsToTranslate.length} element(s) to ${targetLanguage}... This may take a moment.`, 'ai');
    let translatedCount = 0;

    for (const el of elementsToTranslate) {
      const originalText = el.textContent.trim();
      if (originalText) {
        // Avoid re-translating if already marked (e.g. for nested elements)
        if (el.dataset.aiTranslated === targetLanguage) continue;

        const translatedText = await fetchTranslation(originalText, targetLanguage, apiSettings);
        if (translatedText && translatedText !== originalText) {
          el.textContent = translatedText;
          el.dataset.aiTranslated = targetLanguage; // Mark as translated to this language
          translatedCount++;
        }
        // Small delay to be kind to APIs and allow UI to update if many elements
        await new Promise(resolve => setTimeout(resolve, 100)); 
      }
    }

    if (translatedCount > 0) {
      addMessage(`Translation complete! ${translatedCount} element(s) translated to ${targetLanguage}.`, 'ai');
    } else {
      addMessage("No text was translated. Content might already be in the target language or could not be translated.", 'ai');
    }
  }
  
  // Highlight text on the page
  function highlightText(textToFind) {
    if (!textToFind) {
      // If no specific text provided, ask user what to highlight
      addMessage("What text would you like me to highlight on the page?", 'ai');
      return;
    }
    
    // Get all text nodes in the document
    const textNodes = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      { acceptNode: node => node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
    );
    
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }
    
    // Counter for highlighted instances
    let highlightCount = 0;
    
    // Function to highlight text in a node
    function highlightInNode(node, text) {
      const content = node.nodeValue;
      const indexOfText = content.toLowerCase().indexOf(text.toLowerCase());
      
      if (indexOfText >= 0) {
        // Split the node into three parts: before match, match, and after match
        const before = content.substring(0, indexOfText);
        const match = content.substring(indexOfText, indexOfText + text.length);
        const after = content.substring(indexOfText + text.length);
        
        const span = document.createElement('span');
        span.className = 'ai-highlighted-text';
        span.textContent = match;
        
        // Replace the text node with new structure
        const fragment = document.createDocumentFragment();
        if (before) fragment.appendChild(document.createTextNode(before));
        fragment.appendChild(span);
        if (after) fragment.appendChild(document.createTextNode(after));
        
        node.parentNode.replaceChild(fragment, node);
        highlightCount++;
        return true;
      }
      return false;
    }
    
    // Search through all text nodes for matches
    textNodes.forEach(node => {
      // Skip if node is in the AI chat panel
      if (node.parentNode.closest('.ai-chat-panel')) {
        return;
      }
      
      highlightInNode(node, textToFind);
    });
    
    // Report results
    if (highlightCount > 0) {
      addMessage(`I've highlighted ${highlightCount} instances of "${textToFind}" on the page.`, 'ai');
    } else {
      addMessage(`I couldn't find any instances of "${textToFind}" on the page.`, 'ai');
    }
  }
  
  // Click an element on the page
  function clickElement(targetDescription) {
    if (!targetDescription) {
      addMessage("What element would you like me to click?", 'ai');
      return;
    }
    
    // First try to find by exact text content
    let elements = [...document.querySelectorAll('button, a, [role="button"], input[type="submit"], input[type="button"]')]
      .filter(el => el.textContent.trim().toLowerCase() === targetDescription.toLowerCase());
    
    // If not found, try to find by partial text match
    if (elements.length === 0) {
      elements = [...document.querySelectorAll('button, a, [role="button"], input[type="submit"], input[type="button"]')]
        .filter(el => el.textContent.trim().toLowerCase().includes(targetDescription.toLowerCase()));
    }
    
    // If still not found, try to find by ID, class, or name attributes
    if (elements.length === 0) {
      elements = [...document.querySelectorAll(`button[id*="${targetDescription}"], a[id*="${targetDescription}"], 
        [role="button"][id*="${targetDescription}"], button[class*="${targetDescription}"], 
        a[class*="${targetDescription}"], [role="button"][class*="${targetDescription}"],
        button[name*="${targetDescription}"], a[name*="${targetDescription}"]`)]
        .filter(isElementVisible);
    }
    
    // Filter out invisible elements
    elements = elements.filter(isElementVisible);
    
    if (elements.length > 0) {
      // If multiple elements found, use the most likely one (first visible one)
      const element = elements[0];
      
      // Highlight the element briefly
      const originalBg = element.style.backgroundColor;
      const originalOutline = element.style.outline;
      
      element.style.backgroundColor = 'rgba(66, 133, 244, 0.3)';
      element.style.outline = '2px solid #4285f4';
      
      // Scroll to the element
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Click after a short delay
      setTimeout(() => {
        // Restore original styles
        element.style.backgroundColor = originalBg;
        element.style.outline = originalOutline;
        
        // Click the element
        element.click();
        
        addMessage(`I clicked the "${element.textContent.trim() || targetDescription}" element.`, 'ai');
      }, 1000);
    } else {
      addMessage(`I couldn't find any clickable elements matching "${targetDescription}".`, 'ai');
    }
  }
  
  // Summarize the current page
  async function summarizePage() {
    // Add message about summarization in progress
    addMessage("Analyzing the page to create a summary...", 'ai');
    
    // Get relevant content for summarization
    const mainContent = document.querySelector('main') || 
                        document.querySelector('article') || 
                        document.querySelector('.content') || 
                        document.body;
    
    // Extract heading and paragraph text
    const headings = Array.from(mainContent.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent.trim())
      .filter(text => text.length > 0);
    
    const paragraphs = Array.from(mainContent.querySelectorAll('p'))
      .map(p => p.textContent.trim())
      .filter(text => text.length > 15); // Filter out very short paragraphs
    
    // Prepare content for summarization
    const title = document.title;
    const url = window.location.href;
    
    let contentToSummarize = `
      Title: ${title}
      URL: ${url}
      Main Headings: ${headings.slice(0, 5).join(' | ')}
      
      Content to Summarize:
      ${paragraphs.slice(0, 10).join('\n\n')}
    `;
    
    // Get API settings
    const apiSettings = await new Promise(resolve => {
      chrome.storage.local.get(['apiProvider', 'apiKey'], resolve);
    });
    
    if (!apiSettings.apiKey) {
      addMessage("Please set up your API key in the extension settings to use the summarization feature.", 'ai');
      return;
    }
    
    // Create prompt for summarization
    const prompt = `
      Please summarize the following webpage content concisely:
      
      ${contentToSummarize}
      
      Provide a 3-5 sentence summary that captures the main points. 
      Then list 3-5 key takeaways in bullet point format.
    `;
    
    try {
      // Call appropriate AI API based on settings
      let summary;
      switch (apiSettings.apiProvider) {
        case 'openai':
          summary = await callOpenAI(prompt, apiSettings.apiKey);
          break;
        case 'anthropic':
          summary = await callAnthropic(prompt, apiSettings.apiKey);
          break;
        case 'gemini':
          summary = await callGemini(prompt, apiSettings.apiKey);
          break;
        default:
          throw new Error("Invalid API provider");
      }
      
      // Replace the "analyzing" message
      const analyzeMsg = chatMessagesContainer.querySelector('.ai-chat-message.ai:last-child');
      if (analyzeMsg) {
        // const messagesContainer = document.querySelector('.ai-chat-messages');
        chatMessagesContainer.removeChild(analyzeMsg);
      }
      
      // Add the summary
      addMessage(`📝 Summary of "${title}":\n\n${summary}`, 'ai');
      
    } catch (error) {
      console.error('Error generating summary:', error);
      addMessage("Sorry, I encountered an error while trying to summarize this page. Please try again later.", 'ai');
    }
  }
  
  // Extract data from the page
  function extractData(dataType) {
    if (!dataType) {
      addMessage("What kind of data would you like me to extract from this page?", 'ai');
      return;
    }
    
    let extractedData = null;
    
    // Different extraction strategies based on what's requested
    switch (dataType.toLowerCase()) {
      case 'links':
        extractedData = extractLinks();
        break;
      case 'images':
        extractedData = extractImages();
        break;
      case 'tables':
        extractedData = extractTables();
        break;
      case 'emails':
        extractedData = extractEmails();
        break;
      case 'prices':
        extractedData = extractPrices();
        break;
      default:
        // Try to extract based on the general description
        extractedData = extractCustomData(dataType);
    }
    
    if (extractedData && extractedData.items && extractedData.items.length > 0) {
      // Format the response
      let response = `Here's the ${extractedData.type} I extracted from this page:\n\n`;
      
      extractedData.items.forEach((item, index) => {
        if (index < 15) { // Limit to avoid too long messages
          response += `${index + 1}. ${item}\n`;
        }
      });
      
      if (extractedData.items.length > 15) {
        response += `\n...and ${extractedData.items.length - 15} more items.`;
      }
      
      addMessage(response, 'ai');
    } else {
      addMessage(`I couldn't find any ${dataType} on this page.`, 'ai');
    }
  }
  
  // Helper functions for data extraction
  function extractLinks() {
    const links = Array.from(document.querySelectorAll('a[href]'))
      .filter(link => {
        // Filter out javascript: links, anchor links, and empty links
        const href = link.getAttribute('href');
        return href && href.trim() !== '' && 
               !href.startsWith('javascript:') && 
               !href.startsWith('#') &&
               isElementVisible(link);
      })
      .map(link => {
        return `${link.textContent.trim()} - ${link.href}`;
      });
    
    return {
      type: 'links',
      items: links
    };
  }
  
  function extractImages() {
    const images = Array.from(document.querySelectorAll('img'))
      .filter(img => {
        // Filter out tiny images and hidden images
        return img.naturalWidth > 50 && 
               img.naturalHeight > 50 && 
               isElementVisible(img);
      })
      .map(img => {
        return `${img.alt || 'Image'} - ${img.src}`;
      });
    
    return {
      type: 'images',
      items: images
    };
  }
  
  function extractTables() {
    const tables = Array.from(document.querySelectorAll('table'))
      .filter(table => isElementVisible(table))
      .map((table, index) => {
        // Get table headers
        const headers = Array.from(table.querySelectorAll('th'))
          .map(th => th.textContent.trim());
        
        // Get sample of rows (first 3)
        const sampleRows = Array.from(table.querySelectorAll('tr'))
          .slice(0, 4)
          .map(tr => {
            return Array.from(tr.querySelectorAll('td'))
              .map(td => td.textContent.trim())
              .join(' | ');
          })
          .filter(row => row); // Remove empty rows
        
        return `Table ${index + 1}: [${headers.join(' | ')}]\nSample: ${sampleRows.join('\n')}`;
      });
    
    return {
      type: 'tables',
      items: tables
    };
  }
  
  function extractEmails() {
    // Get all text content
    const text = document.body.innerText;
    
    // Use regex to find email patterns
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = [...new Set(text.match(emailRegex) || [])]; // Use Set to remove duplicates
    
    return {
      type: 'email addresses',
      items: emails
    };
  }
  
  function extractPrices() {
    // Get all text content
    const text = document.body.innerText;
    
    // Use regex to find price patterns
    const priceRegex = /\$\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:USD|EUR|GBP|JPY|CAD|AUD|CHF)/g;
    const prices = [...new Set(text.match(priceRegex) || [])]; // Use Set to remove duplicates
    
    return {
      type: 'prices',
      items: prices
    };
  }
  
  function extractCustomData(description) {
    // Try to infer what kind of data the user wants
    const lowerDesc = description.toLowerCase();
    
    // Try to find elements that match the description
    let elements = [];
    
    // Check if looking for specific HTML elements
    if (lowerDesc.includes('heading') || lowerDesc.includes('title')) {
      elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .filter(isElementVisible)
        .map(el => el.textContent.trim());
    } else if (lowerDesc.includes('paragraph') || lowerDesc.includes('text')) {
      elements = Array.from(document.querySelectorAll('p'))
        .filter(isElementVisible)
        .map(el => el.textContent.trim());
    } else if (lowerDesc.includes('button')) {
      elements = Array.from(document.querySelectorAll('button, [role="button"], .btn, input[type="button"], input[type="submit"]'))
        .filter(isElementVisible)
        .map(el => el.textContent.trim() || el.value || 'Button');
    } else if (lowerDesc.includes('list')) {
      elements = Array.from(document.querySelectorAll('ul, ol'))
        .filter(isElementVisible)
        .map((list, index) => {
          const items = Array.from(list.querySelectorAll('li'))
            .map(li => li.textContent.trim())
            .join(', ');
          return `List ${index + 1}: ${items}`;
        });
    } else {
      // Try a general approach by looking for elements with matching class or id
      const keywords = description.split(/\s+/);
      for (const keyword of keywords) {
        if (keyword.length < 3) continue;
        
        const matchingElements = document.querySelectorAll(`[class*="${keyword}"], [id*="${keyword}"]`);
        if (matchingElements.length > 0) {
          elements = Array.from(matchingElements)
            .filter(isElementVisible)
            .map(el => el.textContent.trim());
          break;
        }
      }
    }
    
    return {
      type: description,
      items: elements
    };
  }
  
  // Infer the topic of the current page
  function inferPageTopic() {
    // Get the page title
    const title = document.title;
    
    // Get meta keywords and description
    const keywords = document.querySelector('meta[name="keywords"]')?.content || '';
    const description = document.querySelector('meta[name="description"]')?.content || '';
    
    // Get h1 headings
    const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim());
    
    // Combine all these signals
    const signals = [title, keywords, description, ...h1s].filter(s => s).join(' ');
    
    // Simple keyword extraction
    const words = signals.toLowerCase()
                   .replace(/[^\w\s]/g, '')
                   .split(/\s+/)
                   .filter(word => word.length > 3);
    
    // Count word frequency
    const wordCounts = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Get top 3 words
    const topWords = Object.entries(wordCounts)
                     .sort((a, b) => b[1] - a[1])
                     .slice(0, 3)
                     .map(entry => entry[0]);
    
    if (topWords.length > 0) {
      return topWords.join(', ');
    }
    
    return null;
  }
  
  // Set up message listeners for background communication
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[content.js] Message received:', message);
    if (message.action === 'openChatPanel') {
      console.log('[content.js] Action "openChatPanel" received.');
      ensureChatPanelIsVisible();
      sendResponse({success: true, status: 'Chat panel opened/ensured visible'});
    } else if (message.action === 'resetSettings') {
      // Reset any page-specific settings
      userActionHistory = [];
      chatMessages = [];
      
      // Clear storage for this page
      chrome.storage.local.remove(['chatMessages', 'pageUrl']);
      
      // const panel = document.querySelector('.ai-chat-panel');
      if (chatMessagesContainer) { // Use the direct reference
        chatMessagesContainer.innerHTML = '';
        addMessage("Settings have been reset. Let me know if you need anything else!", 'ai');
      }
      sendResponse({success: true});
    } else if (message.action === 'clearChat') {
      // Clear just the chat history
      chatMessages = [];
      chrome.storage.local.remove(['chatMessages', 'pageUrl']);
      
      // const panel = document.querySelector('.ai-chat-panel');
      if (chatMessagesContainer) { // Use the direct reference
        chatMessagesContainer.innerHTML = '';
        addMessage("Chat history has been cleared. How can I help you now?", 'ai');
      }
      sendResponse({success: true});
    }
    
    return true; // Indicate we want to send a response asynchronously
  });

  // Removed iframe message listener as iframe is no longer used.
  
  // Load saved action history and chat messages
  chrome.storage.local.get(['userActionHistory', 'chatMessages', 'pageUrl'], (result) => {
    if (result.userActionHistory) {
      userActionHistory = result.userActionHistory;
    }
    
    // Only load chat messages if they're for the current URL
    if (result.chatMessages && result.pageUrl === window.location.href) {
      chatMessages = result.chatMessages;
    }
  });

  // Setup draggable functionality
  function setupDraggable(panel, dragHandle) {
    dragHandle.addEventListener('mousedown', startDragging);
    dragHandle.addEventListener('touchstart', startDragging, { passive: false });
    
    function startDragging(e) {
      // Prevent default to avoid text selection during drag
      e.preventDefault();
      
      // Get event position (works for both mouse and touch)
      const clientX = e.clientX || e.touches[0].clientX;
      const clientY = e.clientY || e.touches[0].clientY;
      
      // Get current panel position
      const rect = panel.getBoundingClientRect();
      
      // Store initial positions
      isDragging = true;
      dragStartX = clientX;
      dragStartY = clientY;
      initialPanelX = rect.left;
      initialPanelY = rect.top;
      
      // Add dragging class
      panel.classList.add('dragging');
      
      // Add event listeners for drag and end
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('touchmove', onDrag, { passive: false });
      document.addEventListener('mouseup', stopDragging);
      document.addEventListener('touchend', stopDragging);
    }
    
    function onDrag(e) {
      if (!isDragging) return;
      
      // Get event position (works for both mouse and touch)
      const clientX = e.clientX || e.touches[0].clientX;
      const clientY = e.clientY || e.touches[0].clientY;
      
      // Calculate new position
      const deltaX = clientX - dragStartX;
      const deltaY = clientY - dragStartY;
      
      // Apply new position
      const newLeft = initialPanelX + deltaX;
      const newTop = initialPanelY + deltaY;
      
      // Update panel position
      panel.style.left = `${newLeft}px`;
      panel.style.top = `${newTop}px`;
      
      // Remove bottom/right positioning when manually positioned
      panel.style.bottom = 'auto';
      panel.style.right = 'auto';
      
      // Prevent default to avoid scrolling while dragging on mobile
      e.preventDefault();
    }
    
    function stopDragging() {
      if (!isDragging) return;
      
      // Reset dragging state
      isDragging = false;
      panel.classList.remove('dragging');
      
      // Remove event listeners
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('touchmove', onDrag);
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('touchend', stopDragging);
      
      // Save panel position to storage
      savePanelPosition(panel);
    }
  }
  
  // Setup resizable functionality
  function setupResizable(panel, resizeHandle) {
    resizeHandle.addEventListener('mousedown', startResizing);
    resizeHandle.addEventListener('touchstart', startResizing, { passive: false });
    
    function startResizing(e) {
      // Prevent default to avoid text selection during resize
      e.preventDefault();
      
      // Get event position (works for both mouse and touch)
      const clientX = e.clientX || e.touches[0].clientX;
      const clientY = e.clientY || e.touches[0].clientY;
      
      // Get current panel dimensions
      const rect = panel.getBoundingClientRect();
      
      // Store initial values
      isResizing = true;
      dragStartX = clientX;
      dragStartY = clientY;
      initialPanelWidth = rect.width;
      initialPanelHeight = rect.height;
      
      // Add event listeners for resize and end
      document.addEventListener('mousemove', onResize);
      document.addEventListener('touchmove', onResize, { passive: false });
      document.addEventListener('mouseup', stopResizing);
      document.addEventListener('touchend', stopResizing);
    }
    
    function onResize(e) {
      if (!isResizing) return;
      
      // Get event position (works for both mouse and touch)
      const clientX = e.clientX || e.touches[0].clientX;
      const clientY = e.clientY || e.touches[0].clientY;
      
      // Calculate new dimensions
      const deltaX = clientX - dragStartX;
      const deltaY = clientY - dragStartY;
      
      // Apply new dimensions with min/max constraints
      const newWidth = Math.max(300, Math.min(800, initialPanelWidth + deltaX));
      const newHeight = Math.max(300, Math.min(800, initialPanelHeight + deltaY));
      
      // Update panel dimensions
      panel.style.width = `${newWidth}px`;
      panel.style.height = `${newHeight}px`;
      
      // Prevent default to avoid scrolling while resizing on mobile
      e.preventDefault();
    }
    
    function stopResizing() {
      if (!isResizing) return;
      
      // Reset resizing state
      isResizing = false;
      
      // Remove event listeners
      document.removeEventListener('mousemove', onResize);
      document.removeEventListener('touchmove', onResize);
      document.removeEventListener('mouseup', stopResizing);
      document.removeEventListener('touchend', stopResizing);
      
      // Save panel dimensions to storage
      savePanelDimensions(panel);
    }
  }
  
  // Save panel position to storage
  function savePanelPosition(panel) {
    const rect = panel.getBoundingClientRect();
    chrome.storage.local.set({
      panelPosition: {
        left: rect.left,
        top: rect.top
      }
    });
  }
  
  // Save panel dimensions to storage
  function savePanelDimensions(panel) {
    const rect = panel.getBoundingClientRect();
    chrome.storage.local.set({
      panelDimensions: {
        width: rect.width,
        height: rect.height
      }
    });
  }
  
  // Initialize: create panel but keep it hidden
  createChatPanel();
})();
