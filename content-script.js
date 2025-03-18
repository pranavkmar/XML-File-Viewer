// Content script to handle communication between extension components
// This script runs in the context of the xml-viewer.html page

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
 
    console.log('Content script received message:', message);
    return true; // Indicates async response
});