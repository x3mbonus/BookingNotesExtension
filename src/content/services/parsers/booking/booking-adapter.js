// Booking.com site adapter

window.BookingAdapter = {
    /**
     * Extract property ID from a booking.com search result card.
     * Search result cards have data-testid="property-card" or similar wrappers.
     * Most reliable source is the link href which contains the hotel URL slug.
     */
    extractId(element) {
        // Try data-hotelid attribute on the element or any descendant
        const hotelIdAttr = element.getAttribute('data-hotelid') ||
                            element.querySelector('[data-hotelid]')?.getAttribute('data-hotelid');
        if (hotelIdAttr) return `booking_${hotelIdAttr}`;

        // Try href pointing to /hotel/cc/slug.html
        const link = element.querySelector('a[href*="/hotel/"]');
        if (link && link.href) {
            const id = this._slugFromHotelUrl(link.href);
            if (id) return id;
        }

        // Fallback: any anchor whose href contains /hotel/
        const allLinks = element.querySelectorAll('a[href]');
        for (const a of allLinks) {
            if (a.href && a.href.includes('/hotel/')) {
                const id = this._slugFromHotelUrl(a.href);
                if (id) return id;
            }
        }

        return null;
    },

    /**
     * Extract property ID from hotel detail page URL.
     * URL: /hotel/[country]/[slug].html  or  /hotel/[country]/[slug].[lang].html
     */
    extractDetailId(pathname) {
        // Strip language suffix and .html: /hotel/de/hotel-name.en-gb.html → hotel-name
        const match = pathname.match(/^\/hotel\/[a-z]{2}\/([^.]+)/);
        return match ? `booking_${match[1]}` : null;
    },

    _slugFromHotelUrl(href) {
        try {
            const url = new URL(href);
            const match = url.pathname.match(/^\/hotel\/[a-z]{2}\/([^.]+)/);
            return match ? `booking_${match[1]}` : null;
        } catch {
            return null;
        }
    },

    /**
     * Handle booking.com search results page.
     * Property cards are in [data-testid="property-card"] or similar structures.
     */
    async handleListingPage() {
        observer.disconnect();

        // Booking.com uses various selectors for property cards
        const cards = [
            ...document.querySelectorAll('[data-testid="property-card"]'),
            ...document.querySelectorAll('[data-hotelid]'),
        ];

        // Deduplicate (same element may match multiple selectors)
        const uniqueCards = [...new Set(cards)];
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
        if (propertyId && window.CarDetailPanel) {
            window.CarDetailPanel.showPanel(propertyId);
        }
    }
};
