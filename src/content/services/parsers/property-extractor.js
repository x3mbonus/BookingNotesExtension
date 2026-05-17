// Property extractor — extracts accommodation metadata from detail pages

window.extractPropertyData = function () {
    const hostname = window.location.hostname;

    if (hostname.includes('booking.com')) {
        return extractBookingData();
    }
    if (hostname.includes('airbnb.')) {
        return extractAirbnbData();
    }
    return null;
};

function extractBookingData() {
    const name = document.querySelector('h2[data-testid="title"]')?.textContent?.trim() ||
                 document.querySelector('.pp-header__title')?.textContent?.trim() ||
                 document.querySelector('h1')?.textContent?.trim() || '';

    const priceEl = document.querySelector('[data-testid="price-and-discounted-price"]') ||
                    document.querySelector('.prco-valign-middle-helper') ||
                    document.querySelector('.bui-price-display__value');
    const price_per_night = priceEl?.textContent?.trim() || '';

    const addressEl = document.querySelector('[data-testid="PropertyHeaderAddressDesktop-wrapper"]') ||
                      document.querySelector('.hp_address_subtitle') ||
                      document.querySelector('.bui-breadcrumb');
    const location = addressEl?.textContent?.trim() || '';

    const ratingEl = document.querySelector('[data-testid="review-score-right-component"] .ac4a7896c7') ||
                     document.querySelector('.bui-review-score__badge') ||
                     document.querySelector('[data-testid="rating-stars"]');
    const site_rating = ratingEl?.textContent?.trim() || '';

    const photoEl = document.querySelector('[data-testid="property-main-image"]') ||
                    document.querySelector('.bh-photo-grid__image img') ||
                    document.querySelector('img[data-testid]');
    const photo_url = photoEl?.src || photoEl?.getAttribute('data-src') || '';

    return {
        name,
        price_per_night,
        location,
        site_rating,
        photo_url,
        url: window.location.href,
        platform: 'booking'
    };
}

function extractAirbnbData() {
    const name = document.querySelector('h1')?.textContent?.trim() ||
                 document.querySelector('[data-testid="listing-name"]')?.textContent?.trim() || '';

    const priceEl = document.querySelector('[data-testid="price-summary"]') ||
                    document.querySelector('._tyxjp1');
    const price_per_night = priceEl?.textContent?.trim() || '';

    const locationEl = document.querySelector('[data-testid="pdp-host-details"]') ||
                       document.querySelector('.f19g2zq2');
    const location = locationEl?.textContent?.trim() || '';

    const ratingEl = document.querySelector('[data-testid="pdp-host-badge-rating"]') ||
                     document.querySelector('._12si43g');
    const site_rating = ratingEl?.textContent?.trim() || '';

    const photoEl = document.querySelector('[data-testid="main-photo"]') ||
                    document.querySelector('picture img');
    const photo_url = photoEl?.src || '';

    return {
        name,
        price_per_night,
        location,
        site_rating,
        photo_url,
        url: window.location.href,
        platform: 'airbnb'
    };
}
