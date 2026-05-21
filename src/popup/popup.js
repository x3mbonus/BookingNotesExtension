// ---- Extension enable/disable ----

const enabledToggle = document.getElementById('enabledToggle');
const toggleStatus  = document.getElementById('toggleStatus');

chrome.storage.local.get(['extensionEnabled'], (result) => {
    const enabled = result.extensionEnabled !== false; // default true
    enabledToggle.checked = enabled;
    renderToggleStatus(enabled);
});

enabledToggle.addEventListener('change', () => {
    const enabled = enabledToggle.checked;
    chrome.storage.local.set({ extensionEnabled: enabled });
    renderToggleStatus(enabled);
});

function renderToggleStatus(enabled) {
    if (enabled) {
        toggleStatus.textContent = 'Active — displaying and syncing notes';
        toggleStatus.className = 'toggle-status on';
    } else {
        toggleStatus.textContent = 'Disabled — extension is paused';
        toggleStatus.className = 'toggle-status off';
    }
}

// ---- Trip ----

const tripInput    = document.getElementById('tripInput');
const tripSaveBtn  = document.getElementById('tripSaveBtn');
const tripCurrent  = document.getElementById('tripCurrent');
const tripList     = document.getElementById('tripList');

chrome.storage.local.get(['currentTrip', 'knownTrips'], (result) => {
    renderTripUI(result.currentTrip || null, result.knownTrips || []);
});

tripSaveBtn.addEventListener('click', () => {
    const value = tripInput.value.trim();
    chrome.storage.local.get(['knownTrips'], (result) => {
        const known = result.knownTrips || [];
        const updated = value && !known.includes(value) ? [...known, value] : known;
        chrome.storage.local.set({ currentTrip: value || null, knownTrips: updated }, () => {
            renderTripUI(value || null, updated);
            showStatus(value ? `Trip set: ${value}` : 'Trip cleared', 'success');
        });
    });
});

function renderTripUI(currentTrip, knownTrips) {
    tripInput.value = currentTrip || '';

    // Rebuild datalist
    tripList.innerHTML = '';
    knownTrips.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        tripList.appendChild(opt);
    });

    if (currentTrip) {
        tripCurrent.innerHTML = `Active trip: <span>${currentTrip}</span>`;
    } else {
        tripCurrent.textContent = 'No trip set — notes will be untagged';
    }
}

// ---- Export / Import / Settings ----

document.getElementById('exportBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab.url.includes('mobile.de') && !tab.url.includes('otomoto.pl')) {
            showStatus('⚠️ Open mobile.de or otomoto.pl first', 'error');
            return;
        }
        chrome.tabs.sendMessage(tab.id, { action: 'export' }, () => {
            showStatus('✅ Notes exported! Check downloads.', 'success');
        });
    });
});

document.getElementById('importBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab.url.includes('mobile.de') && !tab.url.includes('otomoto.pl')) {
            showStatus('⚠️ Open mobile.de or otomoto.pl first', 'error');
            return;
        }
        chrome.tabs.sendMessage(tab.id, { action: 'import' }, () => {
            showStatus('📂 Select JSON file...', 'success');
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
    setTimeout(() => {
        statusEl.textContent = '';
        statusEl.className = 'status';
    }, 3000);
}
