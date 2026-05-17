// Common listing handler logic shared between platforms

window.ListingHandler = {
    /**
     * Common logic for processing listings (shared between all platforms)
     */
    async processListingsCommon(articles, extractIdFn, isSkippedFn = null) {
        const isCacheEmpty = Object.keys(notesCache).length === 0;
        const carIds = [];

        // Collect car IDs
        articles.forEach(article => {
            // Skip if needed (for platform-specific filtering)
            if (isSkippedFn && isSkippedFn(article)) {
                return;
            }

            const carId = extractIdFn(article);
            if (carId && carId.trim() && (!queriedPropertyIds.has(carId) || (isCacheEmpty && queriedPropertyIds.size > 0))) {
                carIds.push(carId);
                if (!queriedPropertyIds.has(carId)) {
                    queriedPropertyIds.add(carId);
                }
            }
        });

        // Fetch notes from DB in one query
        let dbNotes = {};
        if (carIds.length > 0 && typeof window.SupabaseApi !== 'undefined') {
            dbNotes = await window.SupabaseApi.getDataByIds(carIds) || {};
            Object.assign(notesCache, dbNotes);
        }

        return { articles, carIds, dbNotes, extractIdFn, isSkippedFn };
    },

    /**
     * Common logic for adding note buttons to articles
     */
    async addButtonsToListings(processedData) {
        const { articles, dbNotes, extractIdFn, isSkippedFn } = processedData;

        for (const article of articles) {
            // Skip if needed
            if (isSkippedFn && isSkippedFn(article)) {
                processedArticles.add(article);
                continue;
            }

            // Check if button already exists
            const existingDisplay = article.nextElementSibling;
            const hasNoteDisplay = existingDisplay && existingDisplay.classList.contains('property-note-display');

            if (!hasNoteDisplay) {
                const carId = extractIdFn(article);
                if (carId && carId.trim()) {
                    processedArticles.add(article);
                    const note = notesCache[carId] !== undefined ? notesCache[carId] : (dbNotes[carId] || null);
                    addNoteButton(article, carId, note);
                } else {
                    processedArticles.add(article);
                }
            } else {
                processedArticles.add(article);
            }
        }
    },

    /**
     * Clean up orphaned displays
     */
    cleanupOrphanedDisplays(currentArticleIds) {
        document.querySelectorAll('.property-note-display').forEach(noteDisplay => {
            const carId = noteDisplay.getAttribute('data-car-id');
            if (!currentArticleIds.has(carId)) {
                noteDisplay.remove();
            }
        });
    }
};
