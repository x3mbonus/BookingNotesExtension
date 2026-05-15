// Otomoto.pl site adapter

window.OtomotoAdapter = {
    /**
     * Extract car ID from otomoto article element
     */
    extractId(element) {
        // PRIORITY 1: Try from href in article - this matches detail page IDs
        // The URL-based ID (e.g., ID6HVVQR) is what's used when saving notes on detail pages

        let link = element.querySelector('a[href*="/oferta/"]');

        if (!link) {
            link = element.querySelector('a[href*="oferta"]');
        }

        if (!link) {
            const allLinks = element.querySelectorAll('a[href]');
            for (const l of allLinks) {
                if (l.href && l.href.includes('oferta')) {
                    link = l;
                    break;
                }
            }
        }

        if (link && link.href) {
            const idMatch = link.href.match(/(ID[A-Za-z0-9]+)\.html/);
            if (idMatch && idMatch[1]) {
                return idMatch[1].trim();
            }

            // Fallback: try old /ad/ pattern
            const oldMatch = link.href.match(/\/ad\/(\d+)/);
            if (oldMatch && oldMatch[1]) {
                return oldMatch[1].trim();
            }
        }

        // Try data-ad-id attribute (legacy)
        const adId = element.getAttribute('data-ad-id');
        if (adId && adId.trim()) {
            return adId.trim();
        }

        return null;
    },

    /**
     * Extract car ID from detail page URL
     */
    extractDetailId(pathname) {
        const match = pathname.match(/\/oferta\/.+-(\w+)\.html/);
        return match ? match[1] : null;
    },

    /**
     * Check if article should be skipped (widget/dialog/etc)
     */
    shouldSkipArticle(article) {
        return article.closest('#car-valuation-slot') ||
               article.closest('[role="dialog"]') ||
               article.closest('.car-valuation') ||
               article.closest('aside');
    },

    /**
     * Handle otomoto listing page
     */
    async handleListingPage() {
        observer.disconnect();

        const articles = document.querySelectorAll('article');
        const currentArticleIds = new Set();
        const isCacheEmpty = Object.keys(notesCache).length === 0;
        const carIds = [];

        // Collect car IDs (with widget filtering)
        articles.forEach(article => {
            if (this.shouldSkipArticle(article)) {
                return;
            }

            const id = this.extractId(article);
            if (id) {
                currentArticleIds.add(id);
                if (!queriedCarIds.has(id) || isCacheEmpty) {
                    carIds.push(id);
                    if (!queriedCarIds.has(id)) {
                        queriedCarIds.add(id);
                    }
                }
            }
        });

        // Clean up orphaned displays from pagination
        window.ListingHandler.cleanupOrphanedDisplays(currentArticleIds);

        // Fetch notes from DB
        let dbNotes = {};
        if (carIds.length > 0 && typeof window.SupabaseApi !== 'undefined') {
            dbNotes = await window.SupabaseApi.getDataByIds(carIds) || {};
            Object.assign(notesCache, dbNotes);
        }

        // Add buttons to listings
        for (const article of articles) {
            if (this.shouldSkipArticle(article)) {
                processedArticles.add(article);
                continue;
            }

            const existingDisplay = article.nextElementSibling;
            const hasNoteDisplay = existingDisplay && existingDisplay.classList.contains('car-note-display');

            if (!hasNoteDisplay) {
                const carId = this.extractId(article);
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

        // Resume observer
        if (!observer.observerStarted) {
            observer.observe(document.body, { childList: true, subtree: true });
            observer.observerStarted = true;
        } else {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    },

    /**
     * Handle otomoto detail page
     */
    async handleDetailPage(pathname, search) {
        const carId = this.extractDetailId(pathname);
        if (carId && window.CarDetailPanel) {
            window.CarDetailPanel.showPanel(carId);
        }
    }
};
