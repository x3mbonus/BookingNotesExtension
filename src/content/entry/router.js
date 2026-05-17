// Site Router - Detects platform and routes to appropriate adapter

window.SiteRouter = {
    PLATFORMS: {
        BOOKING: 'booking.com',
        AIRBNB: 'airbnb',
        UNKNOWN: 'unknown'
    },

    detectPlatform(hostname) {
        if (hostname.includes('booking.com')) return this.PLATFORMS.BOOKING;
        if (hostname.includes('airbnb.'))     return this.PLATFORMS.AIRBNB;
        return this.PLATFORMS.UNKNOWN;
    },

    isDetailPage(hostname, pathname) {
        if (hostname.includes('booking.com')) {
            // e.g. /hotel/de/hotel-name.en-gb.html  or  /hotel/de/hotel-name.html
            return /^\/hotel\/[a-z]{2}\//.test(pathname);
        }
        if (hostname.includes('airbnb.')) {
            // e.g. /rooms/12345678
            return /^\/rooms\/\d+/.test(pathname);
        }
        return false;
    },

    getAdapter(platform) {
        if (platform === this.PLATFORMS.BOOKING && typeof window.BookingAdapter !== 'undefined') {
            return window.BookingAdapter;
        }
        if (platform === this.PLATFORMS.AIRBNB && typeof window.AirbnbAdapter !== 'undefined') {
            return window.AirbnbAdapter;
        }
        return null;
    },

    async route(hostname, pathname, search) {
        if (window._panelClearing) {
            console.log('[STAY-NOTES] Skipping route - panel is clearing');
            return;
        }

        const platform = this.detectPlatform(hostname);
        const isDetail = this.isDetailPage(hostname, pathname);
        const adapter  = this.getAdapter(platform);

        if (!adapter) {
            console.log('[STAY-NOTES] No adapter for platform:', platform);
            return;
        }

        if (isDetail) {
            await adapter.handleDetailPage(pathname, search);
        } else {
            await adapter.handleListingPage();
        }
    },

    async getPropertyId() {
        const { hostname, pathname, search } = window.location;
        const platform = this.detectPlatform(hostname);
        const adapter  = this.getAdapter(platform);
        if (!adapter) return null;
        return adapter.extractDetailId ? adapter.extractDetailId(pathname, search) : null;
    }
};
