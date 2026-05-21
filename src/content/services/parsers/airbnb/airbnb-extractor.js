// Airbnb property data extractor

window.AirbnbExtractor = {
    extract() {
        return {
            name:         this._extractName(),
            price_airbnb: this._extractPrice(),
            location:     this._extractLocation(),
            site_rating:  this._extractRating(),
            photo_url:    this._extractPhoto(),
            amenities:    this._extractAmenities(),
            url:          window.location.href,
            platform:     'airbnb'
        };
    },

    _extractName() {
        return document.querySelector('h1')?.textContent?.trim() ||
               document.querySelector('[data-testid="listing-name"]')?.textContent?.trim() || '';
    },

    _extractPrice() {
        return (
            document.querySelector('[data-testid="price-summary"]') ||
            document.querySelector('[data-testid="book-it-default"] [data-testid="price-item"]')
        )?.textContent?.trim() || '';
    },

    _extractLocation() {
        return (
            document.querySelector('[data-testid="pdp-host-details"]') ||
            document.querySelector('[data-testid="listing-location"]')
        )?.textContent?.trim() || '';
    },

    _extractRating() {
        return (
            document.querySelector('[data-testid="pdp-host-badge-rating"]') ||
            document.querySelector('[data-testid="reviews-count"]')
        )?.textContent?.trim() || '';
    },

    _extractPhoto() {
        return document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
               document.querySelector('[data-testid="main-photo"]')?.src ||
               document.querySelector('picture img')?.src || '';
    },

    _extractAmenities() {
        const seen = new Set();
        const amenities = [];
        const add = (text) => {
            if (text && text.length > 1 && !seen.has(text)) { seen.add(text); amenities.push(text); }
        };

        // Amenity rows shown on the listing page
        document.querySelectorAll('[data-testid="amenity-row"] span')
            .forEach(el => add(el.textContent?.trim()));

        // Expanded amenities modal / section lists
        document.querySelectorAll('[data-testid^="amenity"] span')
            .forEach(el => add(el.textContent?.trim()));

        return amenities;
    }
};
