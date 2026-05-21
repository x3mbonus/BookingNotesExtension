// Property extractor — thin dispatcher; site-specific logic lives in the extractor modules

window.extractPropertyData = function () {
    const hostname = window.location.hostname;
    if (hostname.includes('booking.com')) return window.BookingExtractor?.extract?.() || null;
    if (hostname.includes('airbnb.'))    return window.AirbnbExtractor?.extract?.()  || null;
    return null;
};
