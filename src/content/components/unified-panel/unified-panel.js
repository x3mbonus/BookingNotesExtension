// Car Detail Panel - Combines notes + features + export in one panel

window.CarDetailPanel = {
    currentCarId: null,
    currentFeatures: null,
    isVerified: false,
    isSold: false,
    currentSort: -1,  // -1 = excluded, 0-3 = sort levels
    currentNote: '',
    currentColor: '#e0e0e0',  // Default to gray (no rating) for new notes
    // Metadata fields
    currentMake: '',
    currentModel: '',
    currentPrice: '',
    currentPriceEur: '',
    currentMileage: '',
    currentYear: '',
    currentSeatType: '',
    currentClimate: '',
    currentOwners: '',
    currentTowHitchType: '',
    panelElement: null,
    isExpanded: true,
    isInitializing: false,  // Prevent duplicate initialization
    noteSaveTimeout: null,  // Persistent timeout for note debouncing

    /**
     * Show unified panel with all car data
     */
    async showPanel(carId, data) {
        console.log('[CAR-NOTES] showPanel called with carId:', carId);

        // Prevent duplicate initialization of same car
        if (this.currentCarId === carId && this.panelElement) {
            console.log('[CAR-NOTES] Panel already shown for this car, skipping duplicate initialization');
            // Make sure wrapper is visible
            if (this.wrapperElement) {
                this.wrapperElement.style.display = '';
            }
            return;
        }

        // Make sure wrapper is visible when showing a new car
        if (this.wrapperElement) {
            this.wrapperElement.style.display = '';
        }

        // Prevent concurrent initialization
        if (this.isInitializing) {
            console.log('[CAR-NOTES] Panel initialization already in progress, skipping duplicate call');
            return;
        }

        this.isInitializing = true;

        this.currentCarId = carId;

        if (!this.panelElement) {
            this.createPanel();
            console.log('[CAR-NOTES] Panel created');
        }

        // Load or initialize features
        console.log('[CAR-NOTES] FeaturesManager exists?', !!window.FeaturesManager);
        try {
            console.log('[CAR-NOTES] Calling initializeFeatures...');
            const featureState = await window.FeaturesManager?.initializeFeatures?.(carId, data);
            console.log('[CAR-NOTES] initializeFeatures returned:', featureState);
            this.currentFeatures = featureState?.features || {};
            console.log('[CAR-NOTES] currentFeatures set to:', this.currentFeatures);
            this.isVerified = featureState?.confirmed || false;
            this.currentSort = featureState?.sort ?? null;  // null = no rating, not -1

            // If features were not loaded from DB, save them automatically on first visit
            if (!featureState?.isFromDb) {
                console.log('[CAR-NOTES] Auto-saving features on first visit (source:', featureState?.featuresSource, ', count:', Object.keys(this.currentFeatures).length, ')');
                console.log('[CAR-NOTES] Features to save:', this.currentFeatures);
                await window.FeaturesManager?.confirmAllFeatures?.(carId, this.currentFeatures, this.currentSort, false);
                console.log('[CAR-NOTES] Features auto-saved to DB');
            }

            console.log('✅ Features loaded:', Object.keys(this.currentFeatures).length, 'features');
        } catch (error) {
            console.error('❌ Error loading features:', error);
            this.currentFeatures = {};
        }

        // Load note metadata (WITHOUT re-fetching features - we already have them from initializeFeatures)
        console.log('[CAR-NOTES] Calling getCarDataMetadata via FeaturesManager...');
        try {
            const noteDataPromise = window.FeaturesManager?.getCarDataMetdata?.(carId);
            const timeoutPromise = new Promise((resolve) =>
                setTimeout(() => resolve(null), 2000) // 2 second timeout
            );
            const noteData = noteDataPromise ? await Promise.race([noteDataPromise, timeoutPromise]) : null;
            console.log('[CAR-NOTES] getCarDataMetadata returned:', noteData);
            if (noteData) {
                this.currentNote = noteData.text || '';
                this.currentColor = noteData.color || '#e0e0e0';
                this.isSold = noteData.sold || false;
                // Load metadata from note data
                this.currentMake = noteData.make || '';
                this.currentModel = noteData.model || '';
                this.currentPrice = noteData.price || '';
                this.currentPriceEur = noteData.price_eur || '';
                this.currentMileage = noteData.mileage || '';
                this.currentYear = noteData.year || '';
                this.currentSeatType = noteData.seat_type || '';
                this.currentClimate = noteData.climate || '';
                this.currentOwners = noteData.owners || '';
                this.currentTowHitchType = noteData.tow_hitch_type || '';
                console.log('✅ Note metadata loaded:', {
                    make: this.currentMake,
                    model: this.currentModel,
                    price: this.currentPrice,
                    seat_type: this.currentSeatType,
                    climate: this.currentClimate,
                    owners: this.currentOwners,
                    tow_hitch_type: this.currentTowHitchType
                });
            }
        } catch (error) {
            console.error('❌ Error loading note metadata:', error);
        }

        console.log('📝 Updating panel content...');
        await this.updatePanelContent();

        this.isInitializing = false;
    },

    /**
     * Create the unified panel structure
     */
    createPanel() {
        // Container wrapper
        const wrapper = document.createElement('div');
        wrapper.id = 'car-notes-unified-panel-wrapper';
        wrapper.style.cssText = `
            position: fixed;
            top: 80px;
            right: 0;
            height: calc(100vh - 80px);
            z-index: 2147483647;
            max-width: 500px;
            width: 100%;
            transition: transform 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            pointer-events: auto;
        `;

        // Main panel
        const panel = document.createElement('div');
        panel.id = 'car-notes-unified-panel';
        panel.style.cssText = `
            position: absolute;
            top: 0;
            right: 0;
            width: 100%;
            height: 100%;
            background: white;
            box-shadow: -2px 0 10px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            border-left: 3px solid #667eea;
            overflow: hidden;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        `;

        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 14px;
            font-weight: bold;
            flex: 1;
        `;
        title.textContent = '📋 Car Details';
        header.appendChild(title);

        // Refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'unified-panel-refresh';
        refreshBtn.textContent = '🔄';
        refreshBtn.title = 'Refresh data';
        refreshBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            font-size: 16px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s;
            pointer-events: auto;
            position: relative;
            z-index: 10001;
        `;
        refreshBtn.onmouseover = () => refreshBtn.style.background = 'rgba(255,255,255,0.3)';
        refreshBtn.onmouseout = () => refreshBtn.style.background = 'rgba(255,255,255,0.2)';
        refreshBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[CAR-NOTES] Refreshing data from database...');
            try {
                // Reload all car data including features and confirmed status
                const carData = await window.SupabaseApi?.getCarData?.(this.currentCarId);
                if (carData) {
                    this.currentFeatures = carData.features || {};
                    this.isVerified = carData.confirmed || false;
                    this.isSold = carData.sold || false;
                    this.currentSort = carData.sort ?? null;
                    this.currentNote = carData.text || '';
                    this.currentColor = carData.color || '#e0e0e0';
                    this.currentSeatType = carData.seat_type || '';
                    this.currentClimate = carData.climate || '';
                    this.currentOwners = carData.owners || '';
                    this.currentTowHitchType = carData.tow_hitch_type || '';
                    console.log('[CAR-NOTES] Data refreshed: features=', Object.keys(this.currentFeatures).length, 'confirmed=', this.isVerified);
                    await this.updatePanelContent();
                }
            } catch (error) {
                console.error('[CAR-NOTES] Error refreshing data:', error);
            }
        });
        header.appendChild(refreshBtn);

        // Compare button
        const compareBtn = document.createElement('button');
        compareBtn.id = 'unified-panel-compare';
        compareBtn.textContent = '📊';
        compareBtn.title = 'Compare with other cars';
        compareBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            font-size: 16px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s;
            pointer-events: auto;
            position: relative;
            z-index: 10001;
        `;
        compareBtn.onmouseover = () => compareBtn.style.background = 'rgba(255,255,255,0.3)';
        compareBtn.onmouseout = () => compareBtn.style.background = 'rgba(255,255,255,0.2)';
        compareBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[CAR-NOTES] Opening compare modal');
            try {
                // Pass current car ID and sort for smart filtering
                await window.ComparePanel?.showCompareModal?.(this.currentSort, this.currentCarId);
            } catch (error) {
                console.error('[CAR-NOTES] Error opening compare modal:', error);
            }
        });
        header.appendChild(compareBtn);

        // Collapse button
        const collapseBtn = document.createElement('button');
        collapseBtn.id = 'unified-panel-collapse';
        collapseBtn.textContent = '→';
        collapseBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s;
            z-index: 10001;
            position: relative;
            pointer-events: auto;
        `;
        collapseBtn.onmouseover = () => collapseBtn.style.background = 'rgba(255,255,255,0.3)';
        collapseBtn.onmouseout = () => collapseBtn.style.background = 'rgba(255,255,255,0.2)';
        collapseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[CAR-NOTES] Collapse button clicked');
            this.togglePanel();
        });
        header.appendChild(collapseBtn);

        panel.appendChild(header);

        // Create expand button (hidden by default, shown when panel collapsed)
        const expandBtn = document.createElement('button');
        expandBtn.id = 'unified-panel-expand';
        expandBtn.textContent = '←';
        expandBtn.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 2147483647;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 4px;
            transition: all 0.2s;
            display: none;  // Hidden until panel is collapsed
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            pointer-events: auto;
        `;
        expandBtn.onmouseover = () => expandBtn.style.transform = 'scale(1.1)';
        expandBtn.onmouseout = () => expandBtn.style.transform = 'scale(1)';
        expandBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[CAR-NOTES] Expand button clicked');
            this.togglePanel();
        });
        document.body.appendChild(expandBtn);
        this.expandBtn = expandBtn;

        // Scrollable content
        const content = document.createElement('div');
        content.id = 'unified-panel-content';
        content.style.cssText = `
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            min-height: 0;
        `;

        // Editor content container (will be populated by NotesEditor)
        const editorContent = document.createElement('div');
        editorContent.id = 'unified-panel-editor-content';
        editorContent.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 12px;
        `;
        content.appendChild(editorContent);

        // Section: Export Buttons
        const exportSection = document.createElement('div');
        exportSection.id = 'unified-export-section';
        exportSection.innerHTML = '<div style="color: #ccc; font-size: 12px;">Loading...</div>';
        content.appendChild(exportSection);

        panel.appendChild(content);
        wrapper.appendChild(panel);
        document.body.appendChild(wrapper);

        this.panelElement = panel;
        this.wrapperElement = wrapper;
        console.log('✅ Panel structure created and appended to DOM');

    },

    /**
     * Update panel content using unified NotesEditor
     */
    async updatePanelContent() {
        console.log('[CAR-NOTES] updatePanelContent called, panelElement exists?', !!this.panelElement);
        if (!this.panelElement) {
            console.warn('[CAR-NOTES] ⚠️ panelElement is null/undefined, cannot update content');
            return;
        }

        try {
            // Get current page article data for reparse functionality
            const pageData = window.extractCarData?.();

            // Prepare existing note object
            const existingNote = {
                text: this.currentNote,
                color: this.currentColor,
                sort: this.currentSort,
                confirmed: this.isVerified,
                sold: this.isSold,
                features: this.currentFeatures || {},
                make: this.currentMake,
                model: this.currentModel,
                price: this.currentPrice,
                price_eur: this.currentPriceEur,
                mileage: this.currentMileage,
                year: this.currentYear,
                seat_type: this.currentSeatType,
                climate: this.currentClimate,
                owners: this.currentOwners,
                tow_hitch_type: this.currentTowHitchType
            };

            // Get editor content container
            const editorContainer = document.getElementById('unified-panel-editor-content');
            if (!editorContainer) {
                console.error('[CAR-NOTES] Editor container not found');
                return;
            }

            // Use unified NotesEditor component
            await window.NotesEditor.create({
                carId: this.currentCarId,
                existingNote: existingNote,
                article: pageData || null,
                displayMode: 'panel',
                targetContainer: editorContainer,
                onClose: null  // Panel doesn't close, so no onClose callback
            });

            // Update export section
            this.updateExportSection();

        } catch (error) {
            console.error('❌ Error updating panel content:', error);
        }
    },





    /**
     * Update export section
     */
    updateExportSection() {
        const section = document.getElementById('unified-export-section');
        if (!section) {
            console.warn('[CAR-NOTES] Export section not found in DOM');
            return;
        }

        console.log('[CAR-NOTES] Updating export section');
        section.innerHTML = '';

        const label = document.createElement('div');
        label.style.cssText = 'font-size: 12px; font-weight: 600; color: #666; margin-bottom: 6px;';
        label.textContent = 'EXPORT';
        section.appendChild(label);

        const container = document.createElement('div');
        container.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 6px;';

        const exports = [
            { name: 'JSON', action: 'json', icon: '{}' },
            { name: 'Text', action: 'text', icon: '📝' },
            { name: 'Excel', action: 'excel', icon: '📊' },
            { name: 'Download', action: 'download', icon: '⬇️' }
        ];

        exports.forEach(exp => {
            const btn = document.createElement('button');
            btn.textContent = `${exp.icon} ${exp.name}`;
            btn.style.cssText = `
                padding: 8px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                font-size: 11px;
                transition: all 0.2s;
            `;

            btn.onmouseover = () => btn.style.background = '#5568d3';
            btn.onmouseout = () => btn.style.background = '#667eea';

            btn.onclick = async () => {
                if (exp.action === 'json') {
                    await window.copyCarDataToClipboard?.('json');
                    this.showNotification('✅ Copied as JSON');
                } else if (exp.action === 'text') {
                    await window.copyCarDataToClipboard?.('text');
                    this.showNotification('✅ Copied as Text');
                } else if (exp.action === 'excel') {
                    this.exportAsExcel();
                } else if (exp.action === 'download') {
                    await window.downloadCarDataAsJson?.();
                    this.showNotification('✅ Downloading...');
                }
            };

            container.appendChild(btn);
        });

        section.appendChild(container);
        console.log('[CAR-NOTES] Export section updated successfully');
    },

    /**
     * Export data as Excel format (TSV for easy paste)
     */
    exportAsExcel() {
        const data = window.extractCarData?.();
        if (!data) return;

        const rows = [
            ['Field', 'Value'],
            ['Car ID', data.carId || ''],
            ['Title', data.title || ''],
            ['Price', data.price || ''],
            ['Mileage', data.mileage || ''],
            ['Year', data.year || ''],
            ['Engine', data.engine || ''],
            ['Transmission', data.transmission || ''],
            ['Fuel', data.fuel || ''],
            ['Note', this.currentNote || ''],
            ['Verified', this.isVerified ? 'Yes' : 'No'],
            ['Sort', this.currentSort === -1 ? 'Excluded' : `Level ${this.currentSort}`],
            ...Object.entries(this.currentFeatures).map(([name, state]) => [
                `Feature: ${name}`,
                state === true ? 'Yes' : (state === null ? 'Unknown' : 'No')
            ])
        ];

        const tsv = rows.map(row => row.join('\t')).join('\n');

        const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `car_${this.currentCarId}_data.tsv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('✅ Exported as Excel');
    },

    /**
     * Show temporary notification
     */
    showNotification(message) {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #333;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 13px;
            z-index: 99999;
            animation: slideIn 0.3s ease;
        `;
        notif.textContent = message;
        document.body.appendChild(notif);

        setTimeout(() => {
            notif.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 2000);
    },

    /**
     * Clear panel data (called when note is deleted)
     */
    clearPanel() {
        console.log('[CAR-NOTES] clearPanel called for carId:', this.currentCarId);

        // Set flag to prevent MutationObserver from reinitializing
        // This flag will prevent route() from calling showPanel() while we're clearing
        window._panelClearing = true;

        // Reset all data
        this.currentCarId = null;
        this.currentFeatures = null;
        this.isVerified = false;
        this.isSold = false;
        this.currentSort = -1;
        this.currentNote = '';
        this.currentColor = '#e0e0e0';
        this.currentMake = '';
        this.currentModel = '';
        this.currentPrice = '';
        this.currentPriceEur = '';
        this.currentMileage = '';
        this.currentYear = '';
        this.currentSeatType = '';
        this.currentClimate = '';
        this.currentOwners = '';
        this.currentTowHitchType = '';

        // Hide panel instead of clearing content - avoids triggering MutationObserver
        const wrapper = this.wrapperElement;
        if (wrapper) {
            wrapper.style.display = 'none';
        }

        // Reset flag after 2 seconds (gives plenty of time for any pending operations)
        // This allows the router to re-initialize only AFTER page refresh
        setTimeout(() => {
            window._panelClearing = false;
            console.log('[CAR-NOTES] ✅ Panel cleared and reinit flag reset');
        }, 2000);
    },

    /**
     * Toggle panel collapse
     */
    togglePanel() {
        if (!this.wrapperElement) return;

        this.isExpanded = !this.isExpanded;
        this.wrapperElement.style.transform = this.isExpanded ? 'translateX(0)' : 'translateX(100%)';

        // Show/hide expand button
        if (this.expandBtn) {
            this.expandBtn.style.display = this.isExpanded ? 'none' : 'block';
        }
    }
};
