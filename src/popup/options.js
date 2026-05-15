// Attach event listeners
document.getElementById('saveBtn').addEventListener('click', testAndSaveConfig);
document.getElementById('syncBtn').addEventListener('click', syncNow);
document.getElementById('clearBtn').addEventListener('click', clearConfig);

// Load current settings
async function loadSettings() {
    const creds = await SupabaseClient.getCredentials();
    document.getElementById('supabaseUrl').value = creds.url;
    document.getElementById('supabaseKey').value = creds.key;

    // Check if configured
    const isReady = await SupabaseClient.isReady();
    updateStatus(isReady);

    chrome.storage.local.get(['autoSync'], (result) => {
        document.getElementById('autoSync').checked = result.autoSync !== false;
    });
}

function updateStatus(isConnected) {
    const statusTitle = document.getElementById('statusTitle');
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');

    // Guard against null elements
    if (!statusTitle || !indicator || !statusText) {
        console.warn('Status elements not found in DOM');
        return;
    }

    if (isConnected) {
        statusTitle.classList.add('success');
        statusTitle.textContent = '✅ Connected to Supabase';
        indicator.classList.add('connected');
        statusText.textContent = 'Your notes will sync to the cloud automatically';
    } else {
        statusTitle.classList.remove('success');
        statusTitle.innerHTML = '<span class="status-indicator"></span>Not Connected';
        indicator.classList.remove('connected');
        statusText.textContent = 'Configure Supabase to enable cloud sync across devices';
    }
}

async function testAndSaveConfig() {
    const url = document.getElementById('supabaseUrl').value.trim();
    const key = document.getElementById('supabaseKey').value.trim();

    if (!url || !key) {
        showMessage('❌ Please enter both URL and API key', 'error');
        return;
    }

    if (!url.includes('supabase.co')) {
        showMessage('❌ Invalid URL format (should contain supabase.co)', 'error');
        return;
    }

    showMessage('Testing connection...', 'info');

    await SupabaseClient.setCredentials(url, key);
    const isReady = await SupabaseClient.isReady();

    if (isReady) {
        showMessage('✅ Configuration saved and verified!', 'success');
        updateStatus(true);

        // Save auto-sync preference
        chrome.storage.local.set({
            autoSync: document.getElementById('autoSync').checked
        });
    } else {
        const errorMsg = SupabaseClient.lastError
            ? `❌ Connection failed: ${SupabaseClient.lastError}`
            : '❌ Failed to connect. Check your credentials.';
        showMessage(errorMsg, 'error');
        updateStatus(false);
    }
}

async function syncNow() {
    showMessage('Syncing...', 'info');

    const result = await SupabaseSync.syncBidirectional();

    if (result) {
        const count = Object.keys(result).length;
        showMessage(`✅ Synced ${count} notes successfully!`, 'success');
    } else {
        showMessage('❌ Sync failed. Check your connection.', 'error');
    }
}

async function clearConfig() {
    if (confirm('Are you sure? This will remove Supabase settings but keep your local notes.')) {
        await SupabaseClient.clearCredentials();
        document.getElementById('supabaseUrl').value = '';
        document.getElementById('supabaseKey').value = '';
        updateStatus(false);
        showMessage('Configuration cleared', 'success');
    }
}

function showMessage(text, type) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = `message ${type}`;

    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            msg.className = 'message';
        }, 3000);
    }
}

// Load on startup
loadSettings();
