/**
 * Unified Notes Editor Component
 * Handles both modal dialog and side panel display modes
 * Single source of truth for note editing logic
 */

window.NotesEditor = {
    // Track pending saves to flush before closing
    pendingSaves: {},

    /**
     * Show temporary save notification
     */
    showSaveNotification(message, type = 'info', duration = 2000) {
        const notif = document.createElement('div');
        const bgColor = type === 'success' ? '#4CAF50' :
                       type === 'error' ? '#f44336' :
                       '#2196F3';
        const icon = type === 'success' ? '✓' :
                    type === 'error' ? '✕' :
                    '💾';

        notif.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: ${bgColor};
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            z-index: 100000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        notif.textContent = `${icon} ${message}`;
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, duration);
    },

    /**
     * Create and show notes editor (modal or panel)
     * @param {Object} config - Configuration
     * @param {string} config.carId - Car ID to edit
     * @param {Object} config.existingNote - Existing note data (null for new)
     * @param {HTMLElement} config.article - Article element (for parsing context)
     * @param {string} config.displayMode - 'modal' or 'panel'
     * @param {HTMLElement} config.targetContainer - Container to populate (for panel mode)
     * @param {Function} config.onClose - Callback when closed
     */
    async create(config) {
        const { carId, existingNote, article, displayMode = 'modal', targetContainer, onClose } = config;

        console.log(`[CAR-NOTES] Creating ${displayMode} for car:`, carId);

        // Initialize pending saves tracking for this editor instance
        const editorKey = `editor_${carId}_${Date.now()}`;
        console.log('[CAR-NOTES] Generated editorKey:', editorKey);
        this.pendingSaves[editorKey] = {
            textSave: null,
            colorSave: null,
            saveCallbacks: []
        };

        // ===== INITIALIZE STATE =====
        let state = {
            carId: carId,
            text: existingNote?.text || '',
            color: existingNote?.color || '#e0e0e0',
            sort: existingNote?.sort ?? null,
            confirmed: existingNote?.confirmed || false,
            sold: existingNote?.sold || false,
            features: existingNote?.features || {},
            // Metadata fields
            make: existingNote?.make || '',
            model: existingNote?.model || '',
            price: existingNote?.price || '',
            price_eur: existingNote?.price_eur || '',
            mileage: existingNote?.mileage || '',
            year: existingNote?.year || '',
            seat_type: existingNote?.seat_type || '',
            climate: existingNote?.climate || '',
            owners: existingNote?.owners || '',
            tow_hitch_type: existingNote?.tow_hitch_type || '',
            url: existingNote?.url || '',
            address: existingNote?.address || '',
            photo_url: existingNote?.photo_url || ''
        };

        // Auto-populate metadata from extracted data for fields not yet saved.
        // Guard: skip entirely if core fields are already populated.
        const needsAutoPopulate = article && (!state.make || !state.price_eur || !state.mileage || !state.url);
        if (needsAutoPopulate) {
            try {
                const extractedData = window.extractCarData?.();
                if (extractedData && window.MetadataParser) {
                    const parsedMetadata = window.MetadataParser.extractMetadata(extractedData);

                    // Collect only the fields that are actually missing
                    const newFields = {};
                    const pick = (stateKey, metaKey, dbKey) => {
                        if (!state[stateKey] && parsedMetadata[metaKey]) {
                            state[stateKey] = parsedMetadata[metaKey];
                            newFields[dbKey || stateKey] = parsedMetadata[metaKey];
                        }
                    };
                    pick('make',      'make');
                    pick('model',     'model');
                    pick('price',     'price');
                    pick('price_eur', 'price_eur');
                    pick('mileage',   'mileage');
                    pick('year',      'year');
                    pick('url',       'url');
                    pick('address',   'address');
                    pick('photo_url', 'photo_url');

                    // One PATCH for all newly extracted fields
                    if (Object.keys(newFields).length > 0) {
                        console.log('[CAR-NOTES] Auto-saving missing fields in one request:', newFields);
                        window.NoteCallbacks.updateMetadataFields(carId, newFields)
                            .then(() => window.NotesEditor.showSaveNotification('Auto-extracted data saved', 'success', 2000))
                            .catch(err => console.error('[CAR-NOTES] ❌ Error auto-saving:', err));
                    }
                }
            } catch (error) {
                console.warn('[CAR-NOTES] Error auto-populating metadata:', error);
            }
        }

        // ✅ Skip re-fetching features if they're already in existingNote (avoid duplicate requests)
        const hasExistingFeatures = existingNote && Object.keys(existingNote.features || {}).length > 0;
        console.log(`[CAR-NOTES] hasExistingFeatures=${hasExistingFeatures}, existingNote=${!!existingNote}, features.length=${Object.keys(existingNote?.features || {}).length}`);

        if (!hasExistingFeatures) {
            // Only call initializeFeatures if we don't have features already
            try {
                console.log('[CAR-NOTES] Features not in existingNote, calling initializeFeatures...');
                const featureState = await window.FeaturesManager?.initializeFeatures?.(carId, article ? { frameText: article } : null);
                if (featureState?.features) {
                    state.features = featureState.features;
                    console.log(`[CAR-NOTES] Loaded ${Object.keys(state.features).length} features from DB`);
                }
            } catch (error) {
                console.error('[CAR-NOTES] Error loading features:', error);
            }
        } else {
            console.log(`[CAR-NOTES] Using existing features (${Object.keys(state.features).length} features)`);
        }

        // Ensure features config is cached before building the UI (getFeaturesList is sync)
        await window.FeaturesManager?.getFullFeaturesConfig?.();

        // ===== CREATE UI =====
        const container = this.createUI(state, displayMode, article, targetContainer, onClose, editorKey);

        // ===== ATTACH HANDLERS =====
        this.attachHandlers(container, state, displayMode, article, onClose, editorKey);

        return container;
    },

    /**
     * Create UI structure (same for both modes)
     */
    createUI(state, displayMode, article, targetContainer, onClose, editorKey) {
        let backdrop, container, content, sections;

        if (displayMode === 'modal') {
            backdrop = document.createElement('div');
            backdrop.className = 'car-note-modal-backdrop';
            backdrop.id = 'notes-editor-backdrop';
            backdrop.dataset.editorKey = editorKey;  // Store editor key for flush on close

            container = document.createElement('div');
            container.className = 'car-note-modal';
            container.id = 'notes-editor-modal';

            backdrop.appendChild(container);
            document.body.appendChild(backdrop);

            const header = this.createHeader(state.carId, displayMode, article, onClose, editorKey);
            content = document.createElement('div');
            content.className = 'car-note-modal-content';
            container.appendChild(header);
            container.appendChild(content);

            sections = content;
        } else {
            // Panel mode - use provided target container
            if (!targetContainer) {
                console.error('[CAR-NOTES] Panel mode requires targetContainer');
                return null;
            }
            targetContainer.innerHTML = '';  // Clear existing content
            sections = targetContainer;
            container = targetContainer;
        }

        // ===== POPULATE SECTIONS (same for both) =====

        // NOTES section
        const noteSection = document.createElement('div');
        noteSection.className = 'modal-section';
        noteSection.style.zIndex = '10000';  // Ensure notes section stays above carousel
        noteSection.appendChild(window.UIComponents.createSectionLabel('NOTES'));

        // Add stars display that updates with rating
        const starsDisplay = document.createElement('div');
        starsDisplay.id = 'stars-display-' + Date.now();
        starsDisplay.style.cssText = 'font-size: 14px; margin-bottom: 8px; letter-spacing: 1px; min-height: 20px; font-weight: 500;';
        starsDisplay.textContent = state.sort === null || state.sort === undefined ? '' :
                                   state.sort === -1 ? '🚫 Excluded' :
                                   '⭐'.repeat(5 - state.sort);
        noteSection.appendChild(starsDisplay);

        // Store reference to update stars when rating changes
        const updateStarsDisplay = (newSort) => {
            starsDisplay.textContent = newSort === null || newSort === undefined ? '' :
                                      newSort === -1 ? '🚫 Excluded' :
                                      '⭐'.repeat(5 - newSort);
        };

        // Debounced save for color changes
        let colorSaveTimeout;
        const colorGridContainer = document.createElement('div');
        const createColorGridUI = () => {
            colorGridContainer.innerHTML = '';
            colorGridContainer.appendChild(window.UIComponents.createColorGrid(
                window.UIComponents.getColors(),
                state.color,
                async (color, colorIndex) => {
                    // Color selection mapping to sort values:
                    // Index 0 (gray) → sort null (no rating)
                    // Index 1-5 (colors) → sort 0-3 and -1 (excluded) for rating
                    // Index 6+ (optional) → sort null (no rating)
                    const colorToSortMap = {
                        0: null,     // No rating (gray)
                        1: 0,        // 5 stars (dark green)
                        2: 1,        // 4 stars (green)
                        3: 2,        // 3 stars (yellow)
                        4: 3,        // 2 stars (orange)
                        5: -1        // Excluded (red)
                    };

                    const newSort = colorToSortMap[colorIndex] !== undefined ? colorToSortMap[colorIndex] : null;

                    state.color = color;
                    state.sort = newSort;

                    // Update display
                    updateNoteTextarea();
                    updateStarsDisplay(newSort);

                    // Re-render color grid to show new selection
                    createColorGridUI();

                    // Save BOTH color and sort in SINGLE request (synchronized)
                    clearTimeout(colorSaveTimeout);
                    window.NotesEditor.showSaveNotification('Saving rating...', 'info', 3000);
                    colorSaveTimeout = setTimeout(async () => {
                        try {
                            const savePromise = window.NoteCallbacks.upsertNoteWithSort(state.carId, {
                                text: state.text,
                                color: state.color,
                                sort: state.sort
                            });
                            // Track this save so it can be flushed if modal closes quickly
                            if (window.NotesEditor.pendingSaves[editorKey]) {
                                console.log('[CAR-NOTES] Registering color save promise for editor:', editorKey);
                                window.NotesEditor.pendingSaves[editorKey].colorSave = savePromise;
                            }
                            await savePromise;
                            window.NotesEditor.showSaveNotification('Rating saved', 'success', 2000);
                        } catch (error) {
                            console.error('[CAR-NOTES] Error saving rating:', error);
                            window.NotesEditor.showSaveNotification('Failed to save rating', 'error', 3000);
                        }
                    }, 800);
                }
            ));
        };
        createColorGridUI();
        noteSection.appendChild(colorGridContainer);

        // Debounced save for textarea
        let textSaveTimeout;
        const textarea = window.UIComponents.createNoteTextarea(
            state.text,
            state.color,
            (e) => {
                state.text = e.target.value;
                // Debounced auto-save (800ms delay)
                clearTimeout(textSaveTimeout);
                window.NotesEditor.showSaveNotification('Saving note...', 'info', 3000);
                textSaveTimeout = setTimeout(async () => {
                    try {
                        const savePromise = window.NoteCallbacks.upsertNote(state.carId, { text: state.text, color: state.color });
                        // Track this save so it can be flushed if modal closes quickly
                        if (window.NotesEditor.pendingSaves[editorKey]) {
                            console.log('[CAR-NOTES] Registering text save promise for editor:', editorKey);
                            window.NotesEditor.pendingSaves[editorKey].textSave = savePromise;
                        }
                        await savePromise;
                        window.NotesEditor.showSaveNotification('Note saved', 'success', 2000);
                    } catch (error) {
                        console.error('[CAR-NOTES] Error saving note:', error);
                        window.NotesEditor.showSaveNotification('Failed to save note', 'error', 3000);
                    }
                }, 800);
            }
        );
        noteSection.appendChild(textarea);

        function updateNoteTextarea() {
            textarea.style.backgroundColor = state.color;
            textarea.style.color = window.getTextColorForBackground(state.color);
        }

        sections.appendChild(noteSection);

        // VERIFICATION + AVAILABILITY — compact single row
        const statusSection = document.createElement('div');
        statusSection.className = 'modal-section';

        const statusRow = document.createElement('div');
        statusRow.style.cssText = 'display: flex; gap: 8px; align-items: center;';

        let verifyBtn = window.UIComponents.createVerificationButton(
            state.confirmed,
            async () => {
                state.confirmed = !state.confirmed;
                window.NotesEditor.showSaveNotification('Saving...', 'info', 3000);
                try {
                    await window.NoteCallbacks.updateVerified(state.carId, state.confirmed);
                    verifyBtn.textContent = state.confirmed ? '✓ Перевірено' : '○ Не перевірено';
                    if (state.confirmed) verifyBtn.setAttribute('data-verified', 'true');
                    else verifyBtn.removeAttribute('data-verified');
                    window.NotesEditor.showSaveNotification('Збережено', 'success', 2000);
                } catch (error) {
                    console.error('[CAR-NOTES] Error updating verified:', error);
                    window.NotesEditor.showSaveNotification('Помилка', 'error', 3000);
                }
            }
        );
        // Override text to Ukrainian
        verifyBtn.textContent = state.confirmed ? '✓ Перевірено' : '○ Не перевірено';

        let soldBtn = window.UIComponents.createSoldToggle(
            state.sold,
            async () => {
                state.sold = !state.sold;
                window.NotesEditor.showSaveNotification('Saving...', 'info', 3000);
                try {
                    await window.NoteCallbacks.updateSold(state.carId, state.sold);
                    soldBtn.textContent = state.sold ? '🏷️ Продано' : '○ Доступний';
                    soldBtn.style.border = `2px solid ${state.sold ? '#e53935' : '#9e9e9e'}`;
                    soldBtn.style.background = state.sold ? '#ffebee' : 'white';
                    soldBtn.style.color = state.sold ? '#c62828' : '#666';
                    if (state.sold) soldBtn.setAttribute('data-sold', 'true');
                    else soldBtn.removeAttribute('data-sold');
                    window.NotesEditor.showSaveNotification('Збережено', 'success', 2000);
                } catch (error) {
                    console.error('[CAR-NOTES] Error updating sold:', error);
                    window.NotesEditor.showSaveNotification('Помилка', 'error', 3000);
                }
            }
        );
        soldBtn.textContent = state.sold ? '🏷️ Продано' : '○ Доступний';

        statusRow.appendChild(verifyBtn);
        statusRow.appendChild(soldBtn);
        statusSection.appendChild(statusRow);
        sections.appendChild(statusSection);

        // METADATA section
        const metadataSection = document.createElement('div');
        metadataSection.className = 'modal-section';
        metadataSection.appendChild(window.UIComponents.createMetadataSection(
            state,
            (updatedMeta) => {
                Object.assign(state, updatedMeta);
                window.NotesEditor.showSaveNotification('Saving metadata...', 'info', 3000);
                // Save each metadata field independently
                Object.entries(updatedMeta).forEach(async ([fieldName, fieldValue]) => {
                    try {
                        await window.NoteCallbacks.updateMetadataField(state.carId, fieldName, fieldValue);
                        // Show success for the first field updated
                        window.NotesEditor.showSaveNotification('Metadata saved', 'success', 2000);
                    } catch (error) {
                        console.error('[CAR-NOTES] Error updating metadata:', error);
                        window.NotesEditor.showSaveNotification('Failed to save metadata', 'error', 3000);
                    }
                });
            }
        ));
        sections.appendChild(metadataSection);

        const featuresSection = document.createElement('div');
        featuresSection.className = 'modal-section';
        const featuresLabel = window.UIComponents.createSectionLabel('FEATURES');
        featuresSection.appendChild(featuresLabel);

        // Add single "Refresh All" button (only in panel mode, not modal)
        if (displayMode === 'panel' && article) {
            const clearReparseBtn = document.createElement('button');
            clearReparseBtn.textContent = '🔄 Refresh All (Clear & Re-parse)';
            clearReparseBtn.title = 'Clear all metadata (price, mileage, year) and features, then re-parse fresh from page';
            clearReparseBtn.style.cssText = `
                margin-left: 8px;
                padding: 2px 6px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 10px;
                pointer-events: auto;
                position: relative;
                z-index: 10002;
            `;
            clearReparseBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Ask for confirmation before clearing and re-parsing
                const confirmMessage = 'CLEAR & RE-PARSE ALL\n\nThis will:\n• Clear all metadata (price, mileage, year, etc.)\n• Clear all feature selections\n• Re-extract everything fresh from the page\n\nAll manual edits will be LOST!\n\nContinue?';
                if (!confirm(confirmMessage)) {
                    return;
                }

                try {
                    // Reset all metadata to empty
                    state.make = '';
                    state.model = '';
                    state.price = '';
                    state.price_eur = '';
                    state.mileage = '';
                    state.year = '';
                    state.seat_type = '';
                    state.climate = '';
                    state.owners = '';
                    state.tow_hitch_type = '';

                    // Reset all features to unknown
                    const configList = window.UIComponents?.getFeaturesList?.() || [];
                    state.features = {};
                    configList.forEach(feature => {
                        state.features[feature.key] = null;
                    });

                    // Extract fresh data from page
                    const extracted = window.extractCarData?.();

                    if (extracted) {
                        // Parse metadata
                        if (window.MetadataParser) {
                            const parsedMetadata = window.MetadataParser.extractMetadata(extracted);
                            state.make = parsedMetadata.make || '';
                            state.model = parsedMetadata.model || '';
                            state.price = parsedMetadata.price || '';
                            state.price_eur = parsedMetadata.price_eur || '';
                            state.mileage = parsedMetadata.mileage || '';
                            state.year = parsedMetadata.year || '';
                        }

                        // Parse features using the same logic as normal extraction
                        // Search through ENTIRE extracted data (as JSON string), not just features array
                        if (extracted && window.FeaturesParser?.FEATURE_KEYWORDS) {
                            const fullContent = JSON.stringify(extracted).toLowerCase();
                            const keywords = window.FeaturesParser.FEATURE_KEYWORDS;

                            // Check each feature keyword across all extracted data
                            for (const [featureName, keywordList] of Object.entries(keywords)) {
                                for (const keyword of keywordList) {
                                    if (fullContent.includes(keyword.toLowerCase())) {
                                        // Find the corresponding database key from fullFeaturesListCache
                                        const configFeature = configList.find(f =>
                                            f.label === featureName ||
                                            f.label.toLowerCase() === featureName.toLowerCase()
                                        );
                                        if (configFeature) {
                                            state.features[configFeature.key] = true;
                                        }
                                        break; // Feature found, move to next feature
                                    }
                                }
                            }
                        }
                    }

                    // Save all metadata to database
                    const metadataFields = ['make', 'model', 'price', 'price_eur', 'mileage', 'year', 'address', 'seat_type', 'climate', 'owners', 'tow_hitch_type', 'url'];
                    const savePromises = metadataFields.map(field =>
                        window.NoteCallbacks.updateMetadataField(state.carId, field, state[field])
                            .catch(err => console.error('[CAR-NOTES] Error saving', field, ':', err))
                    );

                    // Save all features to database
                    Object.entries(state.features).forEach(([featureKey, featureState]) => {
                        savePromises.push(
                            window.NoteCallbacks.updateFeature(state.carId, featureKey, featureState)
                                .catch(err => console.error('[CAR-NOTES] Error saving feature', featureKey, ':', err))
                        );
                    });

                    // Wait for all saves
                    await Promise.all(savePromises);

                    // Update UI
                    updateFeaturesGrid();

                    // Reconstruct metadata section to reflect cleared/refreshed data
                    metadataSection.innerHTML = '';
                    metadataSection.appendChild(window.UIComponents.createMetadataSection(
                        state,
                        (updatedMeta) => {
                            Object.assign(state, updatedMeta);
                            window.NotesEditor.showSaveNotification('Saving metadata...', 'info', 3000);
                            Object.entries(updatedMeta).forEach(async ([fieldName, fieldValue]) => {
                                try {
                                    await window.NoteCallbacks.updateMetadataField(state.carId, fieldName, fieldValue);
                                    window.NotesEditor.showSaveNotification('Metadata saved', 'success', 2000);
                                } catch (error) {
                                    console.error('[CAR-NOTES] Error updating metadata:', error);
                                    window.NotesEditor.showSaveNotification('Failed to save metadata', 'error', 3000);
                                }
                            });
                        }
                    ));

                    window.NotesEditor.showSaveNotification('Data cleared and re-parsed from page!', 'success', 3000);
                } catch (error) {
                    console.error('[CAR-NOTES] Error during refresh:', error);
                    window.NotesEditor.showSaveNotification('Error clearing and re-parsing data', 'error', 3000);
                }
            };
            featuresLabel.appendChild(clearReparseBtn);
        }

        featuresSection.appendChild(window.UIComponents.createFeaturesGrid(
            window.UIComponents.getFeaturesList(),
            state.features,
            async (featureKey) => {
                console.log('[CAR-NOTES] Feature button clicked:', featureKey);
                const nextState = window.NoteCallbacks.toggleFeatureState(state.features[featureKey]);
                console.log('[CAR-NOTES] Next state:', nextState, 'for carId:', state.carId);
                state.features[featureKey] = nextState;
                // Save ONLY this single feature to database (independent operation)
                const result = await window.NoteCallbacks.updateFeature(state.carId, featureKey, nextState);
                console.log('[CAR-NOTES] updateFeature returned:', result);
                // Refresh the grid to show the new state
                updateFeaturesGrid();
            }
        ));
        sections.appendChild(featuresSection);

        // PHOTO section - at the bottom, only if photo_url is available
        if (state.photo_url) {
            const photoSection = document.createElement('div');
            photoSection.className = 'modal-section';
            photoSection.appendChild(window.UIComponents.createSectionLabel('PHOTO'));

            const img = document.createElement('img');
            img.src = state.photo_url;
            img.alt = `${state.make || ''} ${state.model || ''}`.trim() || 'Car photo';
            img.style.cssText = `
                width: 100%;
                max-height: 220px;
                object-fit: cover;
                border-radius: 6px;
                display: block;
                background: #eee;
                ${state.url ? 'cursor: pointer;' : ''}
            `;
            img.onerror = () => { photoSection.style.display = 'none'; };
            if (state.url) img.onclick = () => window.open(state.url, '_blank');
            photoSection.appendChild(img);
            sections.appendChild(photoSection);
        }

        // DELETE BUTTON - at the very bottom (hidden by default, visible on hover)
        const deleteSection = document.createElement('div');
        deleteSection.className = 'modal-section';
        deleteSection.style.cssText = 'margin-top: auto; padding-top: 8px; border-top: 1px solid #eee; display: flex; justify-content: flex-end;';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'car-note-modal-delete-btn visible';
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = 'Delete this note';
        deleteBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Delete this note?')) {
                await window.NoteCallbacks.deleteCarData(state.carId);
                window.CarDetailPanel?.clearPanel?.();
                this.close(displayMode);
                // Don't call onClose after deletion - panel should stay cleared until page refresh
            }
        };
        deleteSection.appendChild(deleteBtn);
        sections.appendChild(deleteSection);

        function updateFeaturesGrid() {
            // Rebuild features grid with new state
            const gridContainer = featuresSection.querySelector('.ui-features-grid');
            if (gridContainer) {
                gridContainer.remove();
            }
            featuresSection.appendChild(window.UIComponents.createFeaturesGrid(
                window.UIComponents.getFeaturesList(),
                state.features,
                async (featureKey) => {
                    const nextState = window.NoteCallbacks.toggleFeatureState(state.features[featureKey]);
                    state.features[featureKey] = nextState;
                    // Save ONLY this single feature to database (independent operation)
                    await window.NoteCallbacks.updateFeature(state.carId, featureKey, nextState);
                    // Refresh the grid to show the new state
                    updateFeaturesGrid();
                }
            ));
        }

        return displayMode === 'modal' ? document.getElementById('notes-editor-backdrop') : container;
    },

    /**
     * Create header for modal (close button only, delete moved to footer)
     */
    createHeader(carId, displayMode, article, onClose, editorKey) {
        const header = document.createElement('div');
        header.className = 'car-note-modal-header';
        header.innerHTML = `<h3>Car Details - ID: ${window.escapeHtml(carId)}</h3>`;

        // Close button (top right)
        const closeBtn = document.createElement('button');
        closeBtn.className = 'car-note-modal-close';
        closeBtn.textContent = '✕';
        closeBtn.title = 'Close';
        closeBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this.close(displayMode, editorKey);
            // Trigger refresh callback
            if (typeof onClose === 'function') {
                await onClose();
            }
        };
        header.appendChild(closeBtn);

        return header;
    },

    /**
     * Attach event handlers
     */
    attachHandlers(container, state, displayMode, article, onClose, editorKey) {
        if (displayMode === 'modal') {
            const backdrop = container;
            backdrop.addEventListener('click', async (e) => {
                console.log('[CAR-NOTES] Backdrop click detected, e.target===backdrop?', e.target === backdrop);
                if (e.target === backdrop) {
                    console.log('[CAR-NOTES] Backdrop click confirmed - closing with flush');
                    await this.close(displayMode, editorKey);
                    onClose?.();
                }
            });
        }
    },

    /**
     * Flush any pending saves before closing
     */
    async flushPendingSaves(editorKey) {
        console.log('[NotesEditor.flushPendingSaves] Called for editorKey:', editorKey);
        if (!editorKey || !this.pendingSaves[editorKey]) {
            console.log('[NotesEditor.flushPendingSaves] No pending saves data found');
            return;
        }

        const pending = this.pendingSaves[editorKey];
        console.log('[NotesEditor.flushPendingSaves] Pending saves:', {
            hasTextSave: !!pending.textSave,
            hasColorSave: !!pending.colorSave
        });

        const promises = [];

        if (pending.textSave) {
            console.log('[CAR-NOTES] Flushing pending text save...');
            promises.push(Promise.resolve(pending.textSave));
        }

        if (pending.colorSave) {
            console.log('[CAR-NOTES] Flushing pending color save...');
            promises.push(Promise.resolve(pending.colorSave));
        }

        if (promises.length > 0) {
            try {
                this.showSaveNotification('Saving pending changes...', 'info', 3000);
                await Promise.all(promises);
                console.log('[CAR-NOTES] ✅ All pending saves flushed before close');
                this.showSaveNotification('All changes saved', 'success', 2000);
            } catch (error) {
                console.error('[CAR-NOTES] Error flushing saves:', error);
                this.showSaveNotification('Error saving changes', 'error', 3000);
            }
        } else {
            console.log('[CAR-NOTES] No promises to flush');
        }

        // Clean up
        delete this.pendingSaves[editorKey];
    },

    /**
     * Close editor
     */
    async close(displayMode, editorKey) {
        console.log('[NotesEditor.close] Called with displayMode:', displayMode, 'editorKey:', editorKey);

        // Flush any pending saves before closing (up to 2 seconds max)
        if (editorKey) {
            const flushPromise = this.flushPendingSaves(editorKey);
            const timeoutPromise = new Promise((resolve) =>
                setTimeout(() => {
                    console.warn('[CAR-NOTES] Save flush timeout - closing anyway');
                    resolve();
                }, 2000)
            );
            await Promise.race([flushPromise, timeoutPromise]);
        } else {
            console.warn('[NotesEditor.close] No editorKey provided, skipping flush');
        }

        if (displayMode === 'modal') {
            const backdrop = document.getElementById('notes-editor-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
        }
        // Panel: just hide or leave persistent
    }
};
