// main.js - Main JavaScript functionality

// DOM element references
const chatBody = document.getElementById('chatBody');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const translateButton = document.getElementById('translateButton');
const translationContainer = document.getElementById('translationContainer');
const translationResult = document.getElementById('translationResult');
const combineButton = document.getElementById('combineButton');

// Translation related variables and functions
let translations = {}; // For storing loaded translations
let currentLanguage = 'en-US'; // Default language

// Load a specific language translation
async function loadTranslation(lang) {
    try {
        const response = await fetch(`/static/lang/${lang}.json`);
        if (!response.ok) {
            throw new Error(`Unable to load language ${lang}: ${response.status}`);
        }
        const data = await response.json();
        translations[lang] = data;
        return data;
    } catch (error) {
        console.error(`Error loading language resource ${lang}:`, error);
        return null;
    }
}

// Language switching function
async function changeLanguage(lang) {
    // Check if this language is already loaded
    if (!translations[lang]) {
        // Try to load the language file
        const loaded = await loadTranslation(lang);
        if (!loaded) {
            alert(`Unable to load language: ${lang}`);
            return;
        }
    }
    
    currentLanguage = lang;
    updateAllTexts();
    // Remember user's language preference
    localStorage.setItem('preferredLanguage', lang);
}

// Helper function to get translated text
function t(key) {
    if (!translations[currentLanguage]) return key;
    
    // Handle nested objects, like "languages.English"
    if (key.includes('.')) {
        const parts = key.split('.');
        let result = translations[currentLanguage];
        
        for (const part of parts) {
            if (result && result[part]) {
                result = result[part];
            } else {
                return key;
            }
        }
        
        return result;
    }
    
    // For regular keys
    return translations[currentLanguage][key] || key;
}

// Update all text on the page
function updateAllTexts() {
    // Update title
    document.getElementById('appTitle').textContent = t('appTitle');
    document.title = t('appTitle');
    
    // Update input placeholder
    messageInput.placeholder = t('inputPlaceholder');
    
    // Update button text
    sendButton.textContent = t('sendButton');
    translateButton.textContent = t('translateButton');
    combineButton.textContent = t('combineButton');
    
    // Update labels
    document.getElementById('targetLanguageLabel').textContent = t('targetLanguageLabel');
    
    // Update target language options
    const targetLanguageSelect = document.getElementById('targetLanguage');
    const options = targetLanguageSelect.querySelectorAll('option');
    
    options.forEach(option => {
        const langKey = option.getAttribute('data-lang-key');
        if (langKey && translations[currentLanguage] && 
            translations[currentLanguage].languages && 
            translations[currentLanguage].languages[langKey]) {
            option.textContent = translations[currentLanguage].languages[langKey];
        }
    });
    
    // Update translation result placeholder
    if (translationResult.value === '') {
        translationResult.placeholder = t('translationPlaceholder');
    }
    
    // Update character count
    updateCharCount();
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
translateButton.addEventListener('click', translateMessage);
combineButton.addEventListener('click', combineAndSend);
messageInput.addEventListener('keydown', handleKeyPress);

// Handle Enter key press event
function handleKeyPress(event) {
    if (event.keyCode === 13) { // Enter key detected
        sendMessage(); // Call the message sending function
    }
}

// Send message function
function sendMessage() {
    const message = messageInput.value;
    if (!message.trim()) return;  // Don't send empty messages
    
    addMessage(message, 'user');
    
    // Send message to backend
    const params = new URLSearchParams();
    params.append('message', message);
    params.append('typing', "0");
    fetch('/', {
        method: 'POST',
        body: params
    });
    
    var charCountElement = document.getElementById("charCount");
    charCountElement.textContent = "0" + t('charCount');
    
    // Temporarily disable input
    setTimeout(function(){
        sendButton.disabled = true; // Disable send button
        messageInput.disabled = true; // Disable text box
    }, 10); // Delay 0.1 seconds

    // Re-enable input after 1 second
    setTimeout(function() {
        messageInput.value = ""; // Clear text box content
        sendButton.disabled = false; // Enable send button
        messageInput.disabled = false; // Enable text box
    }, 1000);
}

// Typing status variables and functions
let canSendRequest = true; // Declare a flag variable, initial state is able to send requests

function updateCharCount() {
    var messageInput = document.getElementById("messageInput");           
    var charCountElement = document.getElementById("charCount");
    
    charCountElement.textContent = messageInput.value.length + t('charCount');

    if (canSendRequest) {
        // Send request
        const params = new URLSearchParams();
        params.append('typing', "1");
        fetch('/', {
            method: 'POST',
            body: params
        });
        canSendRequest = false; // Set flag variable to false, indicating waiting for 1 second interval
        setTimeout(() => {
            canSendRequest = true; // After 1 second, set flag variable to true, indicating can send request again
        }, 1000); // Set delay to 1 second (1000 milliseconds)
    }
}

// Translate message function
function translateMessage() {
    const message = messageInput.value.trim();
    if (!message) {
        alert(t('emptyMessage'));
        return;
    }
    
    translationResult.value = t('translating');
    
    // Get selected target language
    const targetLanguage = document.getElementById('targetLanguage').value;
    
    // Send translation request to backend, including target language
    const params = new URLSearchParams();
    params.append('translate', message);
    params.append('target_language', targetLanguage);
    
    fetch('/', {
        method: 'POST',
        body: params
    })
    .then(response => response.text())
    .then(result => {
        translationResult.value = result;
    })
    .catch(error => {
        translationResult.value = t('translationFailed');
        console.error('Translation error:', error);
    });
}

// Combine and send function
function combineAndSend() {
    const originalMessage = messageInput.value.trim();
    const translatedMessage = translationResult.value.trim();
    
    if (!originalMessage || !translatedMessage) {
        alert(t('emptyTranslation'));
        return;
    }
    
    // Combined message format: original message (translated message)
    const combinedMessage = `${originalMessage} (${translatedMessage})`;
    
    // Put combined message in input box
    messageInput.value = combinedMessage;
    
    // Send combined message
    sendMessage();
    
    // Only clear translation result
    translationResult.value = '';
}

// Improved scroll to bottom function
function scrollToBottom() {
    const chatBody = document.getElementById('chatBody');
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Use in add message function
function addMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(sender + '-message');
    const messageText = document.createElement('span');
    messageText.classList.add('message-text');
    messageText.innerHTML = message;
    messageDiv.appendChild(messageText);
    chatBody.appendChild(messageDiv);
    
    // Ensure scrolling to bottom
    setTimeout(scrollToBottom, 50); // Brief delay to ensure DOM update
}

// Get the user's system language
function getUserSystemLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    console.log('Detected browser language:', browserLang);
    return browserLang;
}

// Language code mapping for primary language codes
const languageCodeMapping = {
    'ja': 'ja-JP',
    'zh': 'zh-CN',
    'en': 'en-US'
};

// Load language on page initialization
async function initializeLanguage() {
    // First try to load saved language preference from localStorage
    let preferredLanguage = localStorage.getItem('preferredLanguage');
    
    // If no saved preference, use system language
    if (!preferredLanguage) {
        const systemLanguage = getUserSystemLanguage();
        
        // Check if we have a translation for this language
        try {
            const response = await fetch(`/static/lang/${systemLanguage}.json`);
            if (response.ok) {
                preferredLanguage = systemLanguage;
                console.log(`Using system language: ${systemLanguage}`);
            } else {
                // If exact match fails, try the primary language code (e.g., 'en' from 'en-US')
                const primaryLang = systemLanguage.split('-')[0];
                
                // Check if we have a mapping for this primary language
                const mappedLang = languageCodeMapping[primaryLang] || primaryLang;
                console.log(`Mapping primary language: ${primaryLang} to ${mappedLang}`);
                
                const mappedResponse = await fetch(`/static/lang/${mappedLang}.json`);
                
                if (mappedResponse.ok) {
                    preferredLanguage = mappedLang;
                    console.log(`Using mapped language: ${mappedLang}`);
                } else {
                    preferredLanguage = 'zh-CN'; // Default fallback
                    console.log(`No translation available for ${systemLanguage}, using default: zh-CN`);
                }
            }
        } catch (error) {
            console.error('Error detecting language:', error);
            preferredLanguage = 'zh-CN'; // Default fallback
        }
    }
    
    // Load the selected language
    await loadTranslation(preferredLanguage);
    
    // Set current language
    currentLanguage = preferredLanguage;
    if (document.getElementById('interfaceLanguage')) {
        document.getElementById('interfaceLanguage').value = preferredLanguage;
    }
    
    // Apply current language
    updateAllTexts();
}

// Initialize app after DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements may not be loaded yet, get references again in DOMContentLoaded event
    const elementsToLoad = [
        'chatBody', 'messageInput', 'sendButton', 'translateButton',
        'translationContainer', 'translationResult', 'combineButton'
    ];
    
    elementsToLoad.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            window[id] = element;
        } else {
            console.error(`Element with ID "${id}" not found`);
        }
    });
    
    // Initialize language
    initializeLanguage();
});

// Add window resize listener to ensure scrollbar displays correctly
window.addEventListener('resize', function() {
    scrollToBottom();
});

// Add to main.js
function adjustChatBodyHeight() {
    const chatBody = document.getElementById('chatBody');
    const chatHeader = document.querySelector('.chat-header');
    const chatFooter = document.querySelector('.chat-footer');
    
    // Calculate chat area's height
    const headerHeight = chatHeader.offsetHeight;
    const footerHeight = chatFooter.offsetHeight;
    const windowHeight = window.innerHeight;
    
    // Set chat area height
    chatBody.style.top = headerHeight + 'px';
    chatBody.style.bottom = footerHeight + 'px';
    
    // Ensure scroll to bottom
    scrollToBottom();
}

// Adjust height on page load and window resize
document.addEventListener('DOMContentLoaded', adjustChatBodyHeight);
window.addEventListener('resize', adjustChatBodyHeight);

// Also adjust height whenever translation area is shown/hidden
// This logic can be added to relevant functions
