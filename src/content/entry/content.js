// Stay Notes - Content Script
// Adds pencil icons and notes to accommodation listings on booking.com and airbnb.com

const processedArticles = new Set();
const queriedPropertyIds = new Set(); // Track which property IDs we've already fetched from DB
const notesCache = {}; // Cache fetched notes to avoid re-querying on reinit
let initializeTimer = null; // Debounce timer

// Initialize Supabase client immediately (skip if extension is disabled)
(async () => {
    const enabled = await new Promise(resolve =>
        chrome.storage.local.get(['extensionEnabled'], r => resolve(r.extensionEnabled !== false))
    );
    if (!enabled) return;
    if (window.SupabaseClient) {
        await window.SupabaseClient.init();
    }
})();

// Initialize
document.addEventListener('DOMContentLoaded', initializeContentScript);
window.addEventListener('load', initializeContentScript);
setTimeout(initializeContentScript, 500);

// Watch for dynamically added listings
const observer = new MutationObserver(() => {
    // Debounce: only call initializeContentScript after mutations stop for 300ms
    clearTimeout(initializeTimer);
    initializeTimer = setTimeout(initializeContentScript, 300);
});

// Global modal reference
let currentModal = null;

async function initializeContentScript() {
    const enabled = await new Promise(resolve =>
        chrome.storage.local.get(['extensionEnabled'], r => resolve(r.extensionEnabled !== false))
    );
    if (!enabled) return;

    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const search = window.location.search;

    // Route to appropriate adapter
    await window.SiteRouter.route(hostname, pathname, search);

    // Start observing for dynamically added listings
    if (!observer.observerStarted) {
        observer.observe(document.body, { childList: true, subtree: true });
        observer.observerStarted = true;
    }
}

async function addNoteButton(article, propertyId, dbNote = null) {
    if (!article || !propertyId || !propertyId.trim()) {
        return;
    }

    let note = dbNote;
    if (note === null && !queriedPropertyIds.has(propertyId)) {
        note = await getNote(propertyId);
    }

    const noteDisplay = document.createElement('div');
    noteDisplay.className = 'property-note-display';
    noteDisplay.setAttribute('data-property-id', propertyId);

    if (note) {
        const textColor = getTextColorForBackground(note.color);
        const starsHtml = sortToStarDisplay(note.sort);

        noteDisplay.innerHTML = `
            <div class="property-note-content" style="background-color: ${note.color}; color: ${textColor};">
                <div>
                    ${starsHtml}
                    <div class="property-note-text">${escapeHtml(note.text)}</div>
                </div>
                <button type="button" class="property-note-edit-btn" data-property-id="${propertyId}" title="Edit note">✏️</button>
            </div>
        `;
    } else {
        noteDisplay.innerHTML = `
            <button type="button" class="property-note-add-btn" data-property-id="${propertyId}" title="Add note">✏️</button>
        `;
    }

    article.parentNode.insertBefore(noteDisplay, article.nextSibling);

    const editBtn = noteDisplay.querySelector('.property-note-edit-btn');
    const addBtn = noteDisplay.querySelector('.property-note-add-btn');

    if (editBtn) {
        editBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            await showNoteModal(propertyId, note, article);
        });
    }

    if (addBtn) {
        addBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            await showNoteModal(propertyId, null, article);
        });
    }
}

async function addNoteButtonDetail(propertyId) {
    // DISABLED: No longer needed on detail pages, unified panel handles all note editing
    console.log('ℹ️ Detail page note button disabled (using unified panel instead)');
    return;
}

function closeModal() {
    if (currentModal) {
        currentModal.element.remove();
        currentModal.backdrop.remove();
        currentModal = null;
    }
}

/**
 * Convert sort rating to star display
 */
function sortToStarDisplay(sort) {
    if (sort === null || sort === undefined) {
        return '';
    }
    if (sort === -1) {
        return `<div style="font-size: 12px; color: #f44336;">🚫 Excluded</div>`;
    }
    const starCount = 5 - sort;  // 0→5⭐, 1→4⭐, 2→3⭐, 3→2⭐
    if (starCount > 0) {
        return `<div style="font-size: 12px; margin-bottom: 4px; letter-spacing: 1px;">` +
            ('⭐'.repeat(starCount)) +
            `</div>`;
    }
    return '';
}

async function showNoteModal(propertyId, existingNote, article) {
    // Remove existing modal if any
    if (currentModal) {
        currentModal.remove();
    }

    // Use unified NotesEditor component
    const modalElement = await window.NotesEditor.create({
        propertyId: propertyId,
        existingNote: existingNote,
        article: article,
        displayMode: 'modal',
        onClose: async () => {
            currentModal = null;

            const noteDisplay = document.querySelector(`[data-property-id="${propertyId}"].property-note-display`);
            if (noteDisplay) {
                noteDisplay.remove();
            }

            if (article) {
                queriedPropertyIds.delete(propertyId);
                const freshNote = await getNote(propertyId);
                await addNoteButton(article, propertyId, freshNote);
            }

            // Re-initialize to update any other note displays
            initializeContentScript();
        }
    });

    if (modalElement) {
        currentModal = modalElement;
    }
}
