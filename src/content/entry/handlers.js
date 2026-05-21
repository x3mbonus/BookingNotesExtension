// Common listing handler logic shared between platforms

window.ListingHandler = {
    /**
     * Common logic for processing listings (shared between all platforms)
     */
    async processListingsCommon(articles, extractIdFn, isSkippedFn = null) {
        const isCacheEmpty = Object.keys(notesCache).length === 0;
        const propertyIds = [];

        // Collect property IDs
        articles.forEach(article => {
            // Skip if needed (for platform-specific filtering)
            if (isSkippedFn && isSkippedFn(article)) {
                return;
            }

            const propertyId = extractIdFn(article);
            if (propertyId && propertyId.trim() && (!queriedPropertyIds.has(propertyId) || (isCacheEmpty && queriedPropertyIds.size > 0))) {
                propertyIds.push(propertyId);
                if (!queriedPropertyIds.has(propertyId)) {
                    queriedPropertyIds.add(propertyId);
                }
            }
        });

        // Fetch notes from DB in one query
        let dbNotes = {};
        if (propertyIds.length > 0 && typeof window.SupabaseApi !== 'undefined') {
            dbNotes = await window.SupabaseApi.getDataByIds(propertyIds) || {};
            Object.assign(notesCache, dbNotes);
        }

        return { articles, propertyIds, dbNotes, extractIdFn, isSkippedFn };
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
                const propertyId = extractIdFn(article);
                if (propertyId && propertyId.trim()) {
                    processedArticles.add(article);
                    const note = notesCache[propertyId] !== undefined ? notesCache[propertyId] : (dbNotes[propertyId] || null);
                    addNoteButton(article, propertyId, note);
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
            const propertyId = noteDisplay.getAttribute('data-property-id');
            if (!currentArticleIds.has(propertyId)) {
                noteDisplay.remove();
            }
        });
    }
};
