// Airbnb site adapter

window.AirbnbAdapter = {
    /**
     * Extract property ID from an airbnb listing card.
     * Listing cards contain a link to /rooms/[id].
     */
    extractId(element) {
        // Direct or descendant link to /rooms/
        const link = element.querySelector('a[href*="/rooms/"]') ||
                     (element.matches('a[href*="/rooms/"]') ? element : null);

        if (link && link.href) {
            const match = link.href.match(/\/rooms\/(\d+)/);
            if (match) return `airbnb_${match[1]}`;
        }

        // Fallback: search all anchors
        const allLinks = element.querySelectorAll('a[href]');
        for (const a of allLinks) {
            if (a.href) {
                const match = a.href.match(/\/rooms\/(\d+)/);
                if (match) return `airbnb_${match[1]}`;
            }
        }

        return null;
    },

    /**
     * Extract property ID from /rooms/[id] or /rooms/[id]?... URL
     */
    extractDetailId(pathname) {
        const match = pathname.match(/^\/rooms\/(\d+)/);
        return match ? `airbnb_${match[1]}` : null;
    },

    /**
     * Handle airbnb search/listing page.
     * Airbnb renders listing cards as itemprop="itemListElement" or div[data-testid] elements.
     */
    async handleListingPage() {
        observer.disconnect();

        // Airbnb listing cards — multiple selectors for robustness
        const cards = [
            ...document.querySelectorAll('[itemprop="itemListElement"]'),
            ...document.querySelectorAll('[data-testid="card-container"]'),
            ...document.querySelectorAll('div[aria-label] a[href*="/rooms/"]'),
        ].map(el => {
            // Normalise: find closest ancestor that is an article-level container
            // For anchor elements, use the parent container
            if (el.tagName === 'A') {
                return el.closest('[itemprop="itemListElement"]') || el.parentElement;
            }
            return el;
        });

        const uniqueCards = [...new Set(cards)].filter(Boolean);
        const currentIds = new Set();
        const propertyIds = [];

        uniqueCards.forEach(card => {
            const id = this.extractId(card);
            if (id) {
                currentIds.add(id);
                if (!queriedPropertyIds.has(id) || Object.keys(notesCache).length === 0) {
                    propertyIds.push(id);
                    queriedPropertyIds.add(id);
                }
            }
        });

        window.ListingHandler.cleanupOrphanedDisplays(currentIds);

        let dbNotes = {};
        if (propertyIds.length > 0 && typeof window.SupabaseApi !== 'undefined') {
            dbNotes = await window.SupabaseApi.getDataByIds(propertyIds) || {};
            Object.assign(notesCache, dbNotes);
        }

        for (const card of uniqueCards) {
            const existing = card.nextElementSibling;
            const hasDisplay = existing && existing.classList.contains('property-note-display');
            if (!hasDisplay) {
                const id = this.extractId(card);
                if (id) {
                    processedArticles.add(card);
                    const note = notesCache[id] !== undefined ? notesCache[id] : (dbNotes[id] || null);
                    addNoteButton(card, id, note);
                } else {
                    processedArticles.add(card);
                }
            } else {
                processedArticles.add(card);
            }
        }

        if (!observer.observerStarted) {
            observer.observe(document.body, { childList: true, subtree: true });
            observer.observerStarted = true;
        } else {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    },

    async handleDetailPage(pathname) {
        const propertyId = this.extractDetailId(pathname);
        if (propertyId && window.PropertyPanel) {
            window.PropertyPanel.showPanel(propertyId);
        }
    }
};
