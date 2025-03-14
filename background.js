// Listen for clicks on the extension icon
chrome.action.onClicked.addListener(() => {
    // Open popup instead of creating a tab
    chrome.action.openPopup();
});