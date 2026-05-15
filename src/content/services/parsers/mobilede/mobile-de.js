// Mobile.de site adapter

window.MobileDeAdapter = {
    /**
     * Extract car ID from article element
     */
    extractId(article) {
        // Try new format: /auto-inserat/.../{id}.html
        const newFormatLink = article.querySelector('a[href*="/auto-inserat/"][href*=".html"]');
        if (newFormatLink && newFormatLink.href) {
            const match = newFormatLink.href.match(/\/auto-inserat\/[^/]+\/(\d+)\.html/);
            if (match && match[1]) {
                console.log('[CAR-NOTES] Found mobile.de ID from new format:', match[1]);
                return match[1];
            }
        }

        // Try old format: details.html?id={id}
        const link = article.querySelector('a[href*="details.html"]');
        if (link && link.href) {
            // Extract ID from URL parameter: ?id=451756414
            const match = link.href.match(/[?&]id=(\d+)/);
            if (match && match[1]) {
                console.log('[CAR-NOTES] Found mobile.de ID from details.html:', match[1]);
                return match[1];
            }
        }

        // Fallback: try any link with id parameter
        const anyLink = article.querySelector('a[href*="id="]');
        if (anyLink) {
            const match = anyLink.href.match(/id=(\d+)/);
            if (match && match[1]) {
                console.log('[CAR-NOTES] Found mobile.de ID from fallback:', match[1]);
                return match[1];
            }
        }

        console.log('[CAR-NOTES] No mobile.de ID found for article');
        return null;
    },

    /**
     * Extract car ID from detail page URL (supports both old and new formats)
     */
    extractDetailId(pathname, search) {
        // Try new format: /auto-inserat/.../{id}.html
        const newMatch = pathname.match(/\/auto-inserat\/[^/]+\/(\d+)\.html/);
        if (newMatch && newMatch[1]) {
            console.log('[CAR-NOTES] Found detail ID from new pathname format:', newMatch[1]);
            return newMatch[1];
        }

        // Try old format: search params ?id={id}
        const oldMatch = search.match(/[?&]id=(\d+)/);
        if (oldMatch && oldMatch[1]) {
            console.log('[CAR-NOTES] Found detail ID from query params:', oldMatch[1]);
            return oldMatch[1];
        }

        return null;
    },

    /**
     * Handle mobile.de listing page
     */
    async handleListingPage() {
        observer.disconnect();

        const articles = document.querySelectorAll('article');
        const processedData = await window.ListingHandler.processListingsCommon(
            articles,
            this.extractId.bind(this)
        );

        await window.ListingHandler.addButtonsToListings(processedData);

        // Resume observer
        if (!observer.observerStarted) {
            observer.observe(document.body, { childList: true, subtree: true });
            observer.observerStarted = true;
        } else {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    },

    /**
     * Handle mobile.de detail page
     */
    async handleDetailPage(pathname, search) {
        const carId = this.extractDetailId(pathname, search);
        if (carId && window.CarDetailPanel) {
            console.log('[CAR-NOTES] Mobile.de detail page detected, car ID:', carId);
            window.CarDetailPanel.showPanel(carId);
        }
    }
};
