// Content script to handle communication between extension components
// This script runs in the context of the newtab.html page

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // We've moved the functionality to use localStorage instead of messaging
    // This script is kept minimal to avoid any remote code loading issues
    console.log('Content script received message:', message);
    return true; // Indicates async response
});