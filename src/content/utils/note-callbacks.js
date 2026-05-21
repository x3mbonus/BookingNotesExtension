/**
 * Shared callbacks for modal and panel
 * Provides consistent behavior across both UI contexts
 */

async function _getCurrentTrip() {
    return new Promise(resolve =>
        chrome.storage.local.get(['currentTrip'], r => resolve(r.currentTrip || null))
    );
}

window.NoteCallbacks = {
    /**
     * Toggle feature state: ? → ✓ → ✗ → ?
     */
    toggleFeatureState(currentState) {
        if (currentState === null) return true;    // ? → ✓
        if (currentState === true) return false;   // ✓ → ✗
        return null;                               // ✗ → ?
    },

    /**
     * Save features immediately to database
     */
    async saveFeatures(propertyId, features, sort = null, confirmed = false) {
        console.log('[NoteCallbacks.saveFeatures] Saving', Object.keys(features).length, 'features for', propertyId, 'confirmed:', confirmed);
        return await window.FeaturesManager?.confirmAllFeatures?.(propertyId, features, sort, confirmed);
    },

    /**
     * Toggle and save verify status
     */
    async toggleVerified(propertyId, features, sort, currentVerified) {
        const newVerified = !currentVerified;
        console.log('[NoteCallbacks.toggleVerified] Toggling to:', newVerified);
        return await this.saveFeatures(propertyId, features, sort, newVerified);
    },

    /**
     * Save note text and color only (independent operation)
     */
    async saveNote(propertyId, noteData) {
        console.log('[NoteCallbacks.saveNote] Saving note text/color for', propertyId);
        return await window.SupabaseApi?.updateNoteText?.(propertyId, noteData.text, noteData.color) || { success: true };
    },

    /**
     * Upsert note text and color - INSERT if not exists, UPDATE if exists
     * Use this when creating a new note from listing or when updating
     */
    async upsertNote(propertyId, noteData) {
        console.log('[NoteCallbacks.upsertNote] Upserting note text/color for', propertyId);
        const trip = await _getCurrentTrip();
        return await window.SupabaseApi?.upsertNoteText?.(propertyId, noteData.text, noteData.color, trip) || { success: true };
    },

    /**
     * Upsert note with color AND sort in single request
     * Use this when color selection should update both fields at once
     */
    async upsertNoteWithSort(propertyId, noteData) {
        console.log('[NoteCallbacks.upsertNoteWithSort] Upserting note with text/color/sort for', propertyId);
        const trip = await _getCurrentTrip();
        return await window.SupabaseApi?.upsertNoteTextWithSort?.(propertyId, noteData.text, noteData.color, noteData.sort, trip) || { success: true };
    },

    /**
     * Update only the sort/rating (independent operation)
     */
    async updateSort(propertyId, sort) {
        console.log('[NoteCallbacks.updateSort] Updating sort to', sort, 'for', propertyId);
        return await window.SupabaseApi?.updateSort?.(propertyId, sort) || { success: true };
    },

    /**
     * Update only the verified status (independent operation)
     */
    async updateVerified(propertyId, confirmed) {
        console.log('[NoteCallbacks.updateVerified] Updating verified to', confirmed, 'for', propertyId);
        return await window.SupabaseApi?.updateConfirmed?.(propertyId, confirmed) || { success: true };
    },

    /**
     * Update unavailable status (independent operation)
     */
    async updateUnavailable(propertyId, unavailable) {
        console.log('[NoteCallbacks.updateUnavailable] Updating unavailable to', unavailable, 'for', propertyId);
        return await window.SupabaseApi?.updateUnavailable?.(propertyId, unavailable) || { success: true };
    },

    /**
     * Update single metadata field (independent operation)
     */
    async updateMetadataField(propertyId, fieldName, fieldValue) {
        return await window.SupabaseApi?.updateMetadataField?.(propertyId, fieldName, fieldValue) || { success: true };
    },

    /**
     * Update multiple metadata fields in one PATCH request
     */
    async updateMetadataFields(propertyId, fields) {
        return await window.SupabaseApi?.updateMetadataFields?.(propertyId, fields) || { success: true };
    },

    /**
     * Update single feature (independent operation)
     */
    async updateFeature(propertyId, featureKey, state) {
        if (!window.SupabaseApi) {
            console.error('[NoteCallbacks.updateFeature] ❌ window.SupabaseApi is NOT initialized!');
            return { success: false, error: 'SupabaseApi not initialized' };
        }

        if (typeof window.SupabaseApi.updatePropertyFeature !== 'function') {
            console.error('[NoteCallbacks.updateFeature] ❌ updatePropertyFeature is not a function!');
            return { success: false, error: 'updatePropertyFeature not found' };
        }

        try {
            return await window.SupabaseApi.updatePropertyFeature(propertyId, featureKey, state);
        } catch (error) {
            console.error('[NoteCallbacks.updateFeature] ❌ Exception:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete property record and all related data
     */
    async deletePropertyData(propertyId) {
        console.log('[NoteCallbacks.deletePropertyData] Deleting property', propertyId);
        return await window.SupabaseApi?.deletePropertyData?.(propertyId) || { success: true };
    },

    /**
     * Map sort ID to color
     */
    sortToColor(sortId) {
        const colorMap = {
            'null': '#e0e0e0',   // No rating (gray)
            '0': '#2E7D32',      // Best (dark green)
            '1': '#9CCC65',      // Good (bright lime)
            '2': '#FDD835',      // Fair (orange-yellow)
            '3': '#FF7043',      // Poor (orange)
            '-1': '#F44336'      // Excluded (red)
        };
        const key = sortId === null ? 'null' : sortId.toString();
        return colorMap[key] || '#e0e0e0';
    }
};
