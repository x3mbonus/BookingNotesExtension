// Booking.com property data extractor — structural selectors only (no dynamic CSS classes)

window.BookingExtractor = {
    PROPERTY_TYPE_KEYWORDS: [
        'апартамент', 'apartment', 'будинок', 'house', 'вілла', 'villa',
        'готель', 'hotel', 'студія', 'studio', 'котедж', 'cottage',
        'хостел', 'hostel', 'номер', 'room', 'таунхаус', 'townhouse'
    ],

    extract() {
        return {
            name:          this._extractName(),
            price_booking: this._extractPrice(),
            location:      this._extractLocation(),
            site_rating:   this._extractRating(),
            photo_url:     this._extractPhoto(),
            property_type: this._extractPropertyType(),
            amenities:     this._extractAmenities(),
            url:           window.location.href,
            platform:      'booking'
        };
    },

    _extractName() {
        return document.querySelector('h2[data-testid="title"]')?.textContent?.trim() ||
               document.querySelector('[data-testid="property-header-title"]')?.textContent?.trim() ||
               document.querySelector('h1')?.textContent?.trim() || '';
    },

    _extractPrice() {
        // Prefer total-stay price over per-night price
        const selectors = [
            '[data-testid="price-for-x-nights"]',
            '[data-testid="price-and-discounted-price"]',
            '[data-testid="deal-box-price"]',
            '.prco-valign-middle-helper',
        ];
        for (const sel of selectors) {
            const text = document.querySelector(sel)?.textContent?.trim();
            if (text) return this._cleanPrice(text);
        }
        return '';
    },

    _cleanPrice(raw) {
        return raw
            .replace(/for\s+\d+\s+nights?/gi, '')
            .replace(/за\s+\d+\s+ноч\S*/gi, '')
            .replace(/\d+\s+ноч\S*/gi, '')
            .replace(/per\s+night/gi, '')
            .replace(/\/\s*night/gi, '')
            .replace(/за\s*ніч/gi, '')
            .replace(/taxes?\s+and\s+fees?\s+included/gi, '')
            .replace(/,?\s*включно\s+з\s+\S+/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
    },

    _extractLocation() {
        return (
            document.querySelector('[data-testid="PropertyHeaderAddressDesktop-wrapper"]') ||
            document.querySelector('[data-testid="PropertyHeaderAddress"]')
        )?.textContent?.trim() || '';
    },

    _extractRating() {
        const block = document.querySelector('[data-testid="review-score-right-component"]') ||
                      document.querySelector('[data-testid="review-score-component"]');
        if (!block) return '';

        const text = block.textContent.replace(/\s+/g, ' ').trim();
        const scoreMatch  = text.match(/(\d[,\.]\d)/);
        const reviewMatch = text.match(/(\d+\s*відгук\S*)/i);
        if (scoreMatch) {
            let rating = scoreMatch[1].replace(',', '.');
            if (reviewMatch) rating += ` · ${reviewMatch[1].trim()}`;
            return rating;
        }
        return text.substring(0, 40);
    },

    _extractPhoto() {
        return document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
               document.querySelector('[data-testid="property-main-image"]')?.src || '';
    },

    // First highlights item — if it names a property type, return it
    _extractPropertyType() {
        const first = document.querySelector(
            '[data-testid="property-highlights"] li > div:last-of-type'
        );
        if (!first) return '';
        const text = first.textContent?.trim() || '';
        return this.PROPERTY_TYPE_KEYWORDS.some(kw => text.toLowerCase().includes(kw)) ? text : '';
    },

    _extractAmenities() {
        const seen = new Set();
        const amenities = [];
        const add = (el) => {
            const text = el?.textContent?.trim();
            if (text && !seen.has(text)) { seen.add(text); amenities.push(text); }
        };

        // Highlights bar — skip first item if it was claimed as property_type
        const highlightDivs = document.querySelectorAll(
            '[data-testid="property-highlights"] li > div:last-of-type'
        );
        highlightDivs.forEach((el, i) => {
            if (i === 0) {
                const text = el?.textContent?.trim() || '';
                if (this.PROPERTY_TYPE_KEYWORDS.some(kw => text.toLowerCase().includes(kw))) return;
            }
            add(el);
        });

        // Full facility sections: icon sibling div holds the facility label
        document.querySelectorAll(
            '[data-testid="property-section--content"] [data-testid="facility-icon"] ~ div'
        ).forEach(add);

        // Most-popular facilities widget
        document.querySelectorAll(
            '[data-testid="property-most-popular-facilities-wrapper"] [data-testid="facility-icon"] ~ div'
        ).forEach(add);

        return amenities;
    }
};
