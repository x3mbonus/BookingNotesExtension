// Utility functions for Car Notes extension

function getTextColorForBackground(bgColor) {
    // WCAG 2.0 algorithm for better contrast detection
    // Extract RGB values
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Calculate relative luminance
    const lum = (
        0.299 * (r > 0.03928 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92) +
        0.587 * (g > 0.03928 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92) +
        0.114 * (b > 0.03928 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92)
    );

    // Return dark text for bright backgrounds, light text for dark backgrounds
    return lum > 0.5 ? '#1a1a1a' : '#ffffff';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function getNote(carId) {
    // Fetch note from database
    const data = await window.SupabaseApi.getCarData(carId);
    if (data) {
        return {
            text: data.text,
            color: data.color,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            sort: data.sort,
            confirmed: data.confirmed || false,
            features: data.features || {},
            // Metadata fields - all stored in database
            make: data.make || '',
            model: data.model || '',
            price: data.price || '',
            price_eur: data.price_eur || '',
            mileage: data.mileage || '',
            year: data.year || '',
            address: data.address || '',
            seat_type: data.seat_type || '',
            climate: data.climate || '',
            owners: data.owners || '',
            tow_hitch_type: data.tow_hitch_type || '',
            url: data.url || ''
        };
    }
    return null;
}

async function saveNote(carId, noteData) {
    // Save note to database with features and metadata
    const result = await window.SupabaseApi.saveCarData(carId,
        {
            text: noteData.text,
            color: noteData.color || '#e0e0e0'  // Default to gray (no rating) if not provided
        },
        {
            features: noteData.features || {},
            sort: noteData.sort !== undefined ? noteData.sort : null,
            confirmed: noteData.confirmed || false,
            featuresSource: 'manual'
        },
        {
            make: noteData.make,
            model: noteData.model,
            price: noteData.price,
            price_eur: noteData.price_eur,
            mileage: noteData.mileage,
            year: noteData.year,
            address: noteData.address,
            seat_type: noteData.seat_type,
            climate: noteData.climate,
            owners: noteData.owners,
            tow_hitch_type: noteData.tow_hitch_type,
            url: noteData.url
        }
    );

    // If note save succeeded and we have features, save them to car_features table
    if (result.success && noteData.features && Object.keys(noteData.features).length > 0) {
        await window.SupabaseApi.saveCarFeaturesNew(carId, noteData.features);
    }

    // Update local cache with the saved note
    if (result.success) {
        notesCache[carId] = {
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
