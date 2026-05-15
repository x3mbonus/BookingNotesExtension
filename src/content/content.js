// Car Notes - Content Script
// Adds pencil icons and notes to car listings on mobile.de and otomoto.pl

const processedArticles = new Set();
const queriedCarIds = new Set(); // Track which car IDs we've already fetched from DB
const notesCache = {}; // Cache fetched notes to avoid re-querying on reinit
let initializeTimer = null; // Debounce timer

// Initialize Supabase client immediately
(async () => {
    if (window.SupabaseClient) {
        await window.SupabaseClient.init();
    }
    // Cache features config globally on startup
    if (window.FeaturesManager) {
        await window.FeaturesManager.getFullFeaturesConfig();
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

    // Use provided note from batch query
    // Only fallback to individual fetch if this car wasn't in a batch query
    let note = dbNote;
    if (note === null && !queriedCarIds.has(carId)) {
        // Car wasn't batch-queried yet, fetch individually
        note = await getNote(carId);
    }
    // If note is still null but carId IS in queriedCarIds, it means no note exists (don't fetch again)

    // Create the note display container
    const noteDisplay = document.createElement('div');
    noteDisplay.className = 'car-note-display';
    noteDisplay.setAttribute('data-car-id', carId);

    if (note) {
        // Display the note
        const textColor = getTextColorForBackground(note.color);
        // Add 'no-background' class if note has no text AND color is gray (default no-rating)
        const isDefaultColor = note.color === '#e0e0e0' || !note.color;
        const noBackground = (!note.text || note.text.trim() === '') && isDefaultColor;

        `;
        // Add class to container for styling
        if (noBackground) {
            noteDisplay.classList.add('no-background-container');
            noteDisplay.style.borderBottom = 'none';
            noteDisplay.style.paddingBottom = '0';
        }
    } else {
        // Display empty state with pencil button only if carId is valid
        noteDisplay.innerHTML = `
            <button type="button" class="car-note-add-btn" data-car-id="${carId}" title="Add note">✏️</button>
        `;
    }

    // Insert note display as sibling after article
    article.parentNode.insertBefore(noteDisplay, article.nextSibling);

    // Attach event listeners
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

async function showNoteModal(carId, existingNote, article) {
    // Remove existing modal if any
    if (currentModal) {
        currentModal.remove();
    }

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'car-note-modal-backdrop';
    backdrop.style.zIndex = '9999';  // Ensure backdrop is on top
    backdrop.style.pointerEvents = 'auto';  // Enable clicks
    backdrop.addEventListener('click', (e) => {
        // Only close if clicking on the backdrop itself, not on modal content
        if (e.target === backdrop) {
            closeModal();
        }
    });

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'car-note-modal';
    modal.style.zIndex = '10000';  // Ensure modal is above backdrop and carousel

    // Initialize state from existing note or defaults
    let features = existingNote?.features || {};
    let metadata = {
        seat_type: existingNote?.seat_type || '',
        climate: existingNote?.climate || '',
        owners: existingNote?.owners || '',
        tow_hitch_type: existingNote?.tow_hitch_type || ''
    };

    // Load features from DB if not in existingNote
    try {
        const featureState = await window.FeaturesManager?.initializeFeatures?.(carId, article ? { frameText: article } : null);
        if (featureState?.features) {
            features = featureState.features;
            console.log('[CAR-NOTES] Loaded', Object.keys(features).length, 'features from DB');
        }
    } catch (error) {
        console.warn('[CAR-NOTES] Error loading features from DB:', error);
    }

    const state = {
        color: existingNote?.color || '#e0e0e0',  // Default to gray (no rating) for new notes
        text: existingNote?.text || '',
        sort: existingNote?.sort ?? null,  // Default to "no rating" for new notes
        confirmed: existingNote?.confirmed || false,
        features: features,
        ...metadata
    };

    // Build modal HTML with header and content area (will fill with components)
    modal.innerHTML = `
        <div class="car-note-modal-header">
            <h3>Car Details - ID: ${escapeHtml(carId)}</h3>
            <button class="car-note-modal-close" title="Close">✕</button>
        </div>
        <div class="car-note-modal-content"></div>
        <div class="car-note-modal-actions">
            <button class="car-note-modal-delete-btn">🗑️ Delete</button>
            <div>
                <button class="car-note-modal-cancel-btn">Cancel</button>
                <button class="car-note-modal-save-btn">Save</button>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    currentModal = { element: modal, backdrop: backdrop, carId: carId };

    const contentArea = modal.querySelector('.car-note-modal-content');

    // ===== NOTES SECTION =====
    const noteSection = document.createElement('div');
    noteSection.className = 'modal-section';
    noteSection.style.position = 'relative';
    noteSection.style.zIndex = '10001';  // Ensure notes stay above modal
    noteSection.appendChild(window.UIComponents.createSectionLabel('NOTES'));
    noteSection.appendChild(window.UIComponents.createColorGrid(
        window.UIComponents.getColors(),
        state.color,
        (color, colorIndex) => {
            // Color selection mapping to sort values
            const colorToSortMap = {
                0: null,     // No rating (gray)
                1: 0,        // 5 stars (dark green)
                2: 1,        // 4 stars (green)
                3: 2,        // 3 stars (yellow)
                4: 3,        // 2 stars (orange)
                5: -1        // Excluded (red)
            };

            state.color = color;
            state.sort = colorToSortMap[colorIndex] !== undefined ? colorToSortMap[colorIndex] : null;
            updateNoteTextarea();
        }
    ));

    const textarea = window.UIComponents.createNoteTextarea(
        state.text,
        state.color,
        (e) => {
            state.text = e.target.value;
        }
    );
    noteSection.appendChild(textarea);
    contentArea.appendChild(noteSection);

    function updateNoteTextarea() {
        textarea.style.backgroundColor = state.color;
        textarea.style.color = window.getTextColorForBackground(state.color);
    }

    // ===== VERIFICATION SECTION =====
    const verifySection = document.createElement('div');
    verifySection.className = 'modal-section';
    verifySection.appendChild(window.UIComponents.createSectionLabel('VERIFICATION STATUS'));
    verifySection.appendChild(window.UIComponents.createVerificationButton(
        state.confirmed,
        () => {
            state.confirmed = !state.confirmed;
        }
    ));
    contentArea.appendChild(verifySection);

    // ===== METADATA SECTION =====
    const metadataSection = document.createElement('div');
    metadataSection.className = 'modal-section';
    metadataSection.appendChild(window.UIComponents.createMetadataSection(
        state,
        (updatedMeta) => {
            Object.assign(state, updatedMeta);
        }
    ));
    contentArea.appendChild(metadataSection);

    // ===== FEATURES SECTION =====
    const featuresSection = document.createElement('div');
    featuresSection.className = 'modal-section';

    const featuresLabel = window.UIComponents.createSectionLabel('FEATURES');
    featuresSection.appendChild(featuresLabel);

    featuresSection.appendChild(window.UIComponents.createFeaturesGrid(
        window.UIComponents.getFeaturesList(),
        state.features,
        (featureKey) => {
            // Toggle through 3 states: unknown (?) → present (✓) → missing (✗) → unknown (?)
            const currentState = state.features[featureKey];
            const nextState = window.FeaturesManager?.toggleFeatureState?.(currentState);
            state.features[featureKey] = nextState;
        }
    ));
    contentArea.appendChild(featuresSection);

    // ===== EVENT HANDLERS =====
    modal.querySelector('.car-note-modal-close').addEventListener('click', closeModal);
    modal.querySelector('.car-note-modal-cancel-btn').addEventListener('click', closeModal);

    modal.querySelector('.car-note-modal-save-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Note text is now optional - user can just select rating/features
        // if (!state.text.trim()) {
        //     alert('Please enter a note');
        //     return;
        // }

        const noteResult = await saveNote(carId, {
            text: state.text,
            color: state.color,
            createdAt: existingNote?.createdAt || new Date().toISOString(),
            sort: state.sort,
            confirmed: state.confirmed,
            features: state.features,
            seat_type: state.seat_type,
            climate: state.climate,
            owners: state.owners,
            tow_hitch_type: state.tow_hitch_type
        });

        if (noteResult.success) {
            closeModal();

            // Refresh the specific note display for this car
            const noteDisplay = document.querySelector(`[data-car-id="${carId}"].car-note-display`);
            if (noteDisplay) {
                noteDisplay.remove();
            }

            // Re-add the note button with updated data to show the saved note
            if (article) {
                const savedNote = {
                    text: state.text,
                    color: state.color,
                    createdAt: noteResult.createdAt || existingNote?.createdAt || new Date().toISOString(),
                    sort: state.sort,
                    confirmed: state.confirmed,
                    features: state.features,
                    seat_type: state.seat_type,
                    climate: state.climate,
                    owners: state.owners,
                    tow_hitch_type: state.tow_hitch_type
                };
                await addNoteButton(article, carId, savedNote);
            }
        } else {
            alert('Failed to save note: ' + (noteResult.error || 'Unknown error'));
        }
    });

    const deleteBtn = modal.querySelector('.car-note-modal-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (confirm('Delete this note?')) {
                if (typeof window.SupabaseApi !== 'undefined') {
                    await window.SupabaseApi.deleteCarData(carId);
                }

                delete notesCache[carId];
                document.querySelector(`[data-car-id="${carId}"].car-note-display`)?.remove();
                document.querySelector(`[data-car-id="${carId}"].car-note-display-detail`)?.remove();
                window.CarDetailPanel?.clearPanel?.();

                closeModal();
                // Don't reinitialize - panel stays cleared until page refresh
            }
        });
    }
}
