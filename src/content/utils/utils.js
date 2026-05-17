// Utility functions for Stay Notes extension

function getTextColorForBackground(bgColor) {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const lum = (
        0.299 * (r > 0.03928 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92) +
        0.587 * (g > 0.03928 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92) +
        0.114 * (b > 0.03928 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92)
    );

    return lum > 0.5 ? '#1a1a1a' : '#ffffff';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function getNote(propertyId) {
    const data = await window.SupabaseApi.getPropertyData(propertyId);
    if (data) {
        return {
            text: data.text,
            color: data.color,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            sort: data.sort,
            confirmed: data.confirmed || false,
            unavailable: data.unavailable || false,
            features: data.features || {},
            name: data.name || '',
            price_per_night: data.price_per_night || '',
            location: data.location || '',
            site_rating: data.site_rating || '',
            bedrooms: data.bedrooms || '',
            beds: data.beds || '',
            distance_beach: data.distance_beach || '',
            distance_airport: data.distance_airport || '',
            url: data.url || '',
            photo_url: data.photo_url || ''
        };
    }
    return null;
}

async function saveNote(propertyId, noteData) {
    const result = await window.SupabaseApi.savePropertyData(propertyId,
        { text: noteData.text, color: noteData.color || '#e0e0e0' },
        { sort: noteData.sort !== undefined ? noteData.sort : null, confirmed: noteData.confirmed || false },
        {
            name: noteData.name,
            price_per_night: noteData.price_per_night,
            location: noteData.location,
            site_rating: noteData.site_rating,
            bedrooms: noteData.bedrooms,
            beds: noteData.beds,
            distance_beach: noteData.distance_beach,
            distance_airport: noteData.distance_airport,
            url: noteData.url
        }
    );

    if (result.success && noteData.features && Object.keys(noteData.features).length > 0) {
        await window.SupabaseApi.savePropertyFeaturesNew(propertyId, noteData.features);
    }

    if (result.success) {
        notesCache[propertyId] = {
            text: noteData.text,
            color: noteData.color,
            createdAt: noteData.createdAt,
            updatedAt: new Date().toISOString(),
            sort: noteData.sort !== undefined ? noteData.sort : null,
            confirmed: noteData.confirmed || false,
            features: noteData.features || {}
        };
    }

    return result;
}
