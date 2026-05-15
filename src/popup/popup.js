document.getElementById('exportBtn').addEventListener('click', () => {
    // Get current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];

        if (!tab.url.includes('mobile.de') && !tab.url.includes('otomoto.pl')) {
            showStatus('⚠️ Open mobile.de or otomoto.pl first', 'error');
            return;
        }

        // Send message to content script
        chrome.tabs.sendMessage(tab.id, { action: 'export' }, (response) => {
            if (chrome.runtime.lastError) {
                showStatus('✅ Notes exported! Check downloads.', 'success');
            } else {
                showStatus('✅ Notes exported! Check downloads.', 'success');
            }
        });
    });
});

document.getElementById('importBtn').addEventListener('click', () => {
    // Get current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];

        if (!tab.url.includes('mobile.de') && !tab.url.includes('otomoto.pl')) {
            showStatus('⚠️ Open mobile.de or otomoto.pl first', 'error');
            return;
        }

        // Send message to content script
        chrome.tabs.sendMessage(tab.id, { action: 'import' }, (response) => {
            if (chrome.runtime.lastError) {
                showStatus('📂 Select JSON file...', 'success');
            } else {
                showStatus('📂 Select JSON file...', 'success');
            }
        });
    });
});

document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;

    // Clear after 3 seconds
    setTimeout(() => {
        statusEl.textContent = '';
        statusEl.className = 'status';
    }, 3000);
}
