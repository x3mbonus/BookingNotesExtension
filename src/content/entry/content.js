// Stay Notes - Content Script
// Adds pencil icons and notes to accommodation listings on booking.com and airbnb.com

const processedArticles = new Set();
const queriedPropertyIds = new Set(); // Track which property IDs we've already fetched from DB
const notesCache = {}; // Cache fetched notes to avoid re-querying on reinit
let initializeTimer = null; // Debounce timer

// Initialize Supabase client immediately
(async () => {
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

async function addNoteButton(article, carId, dbNote = null) {
    if (!article || !carId || !carId.trim()) {
        return;
    }

    let note = dbNote;
    if (note === null && !queriedPropertyIds.has(carId)) {
        note = await getNote(carId);
    }

    const noteDisplay = document.createElement('div');
    noteDisplay.className = 'property-note-display';
    noteDisplay.setAttribute('data-car-id', carId);

    if (note) {
        const textColor = getTextColorForBackground(note.color);
        const starsHtml = sortToStarDisplay(note.sort);

        noteDisplay.innerHTML = `
            <div class="car-note-content" style="background-color: ${note.color}; color: ${textColor};">
                <div>
                    ${starsHtml}
                    <div class="car-note-text">${escapeHtml(note.text)}</div>
                </div>
                <button type="button" class="car-note-edit-btn" data-car-id="${carId}" title="Edit note">✏️</button>
            </div>
        `;
    } else {
        noteDisplay.innerHTML = `
            <button type="button" class="car-note-add-btn" data-car-id="${carId}" title="Add note">✏️</button>
        `;
    }

    article.parentNode.insertBefore(noteDisplay, article.nextSibling);

    const editBtn = noteDisplay.querySelector('.car-note-edit-btn');
    const addBtn = noteDisplay.querySelector('.car-note-add-btn');

    if (editBtn) {
        editBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            await showNoteModal(carId, note, article);
        });
    }

    if (addBtn) {
        addBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            await showNoteModal(carId, null, article);
        });
    }
}

async function addNoteButtonDetail(carId) {
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

async function showNoteModal(carId, existingNote, article) {
    // Remove existing modal if any
    if (currentModal) {
        currentModal.remove();
    }

    // Use unified NotesEditor component
    const modalElement = await window.NotesEditor.create({
        carId: carId,
        existingNote: existingNote,
        article: article,
        displayMode: 'modal',
        onClose: async () => {
            currentModal = null;

            const noteDisplay = document.querySelector(`[data-car-id="${carId}"].property-note-display`);
            if (noteDisplay) {
                noteDisplay.remove();
            }

            if (article) {
                queriedPropertyIds.delete(carId);
                const freshNote = await getNote(carId);
                await addNoteButton(article, carId, freshNote);
            }

            // Re-initialize to update any other note displays
            initializeContentScript();
        }
    });

    if (modalElement) {
        currentModal = modalElement;
    }
}
