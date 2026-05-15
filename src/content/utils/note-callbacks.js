/**
 * Shared callbacks for modal and panel
 * Provides consistent behavior across both UI contexts
 */

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
    async saveFeatures(carId, features, sort = null, confirmed = false) {
        console.log('[NoteCallbacks.saveFeatures] Saving', Object.keys(features).length, 'features for', carId, 'confirmed:', confirmed);
        return await window.FeaturesManager?.confirmAllFeatures?.(carId, features, sort, confirmed);
    },

    /**
     * Toggle and save verify status
     */
    async toggleVerified(carId, features, sort, currentVerified) {
        const newVerified = !currentVerified;
        console.log('[NoteCallbacks.toggleVerified] Toggling to:', newVerified);
        return await this.saveFeatures(carId, features, sort, newVerified);
    },

    /**
     * Save note text and color only (independent operation)
     */
    async saveNote(carId, noteData) {
        console.log('[NoteCallbacks.saveNote] Saving note text/color for', carId);
        return await window.SupabaseApi?.updateNoteText?.(carId, noteData.text, noteData.color) || { success: true };
    },

    /**
     * Upsert note text and color - INSERT if not exists, UPDATE if exists
     * Use this when creating a new note from listing or when updating
     */
    async upsertNote(carId, noteData) {
        console.log('[NoteCallbacks.upsertNote] Upserting note text/color for', carId);
        return await window.SupabaseApi?.upsertNoteText?.(carId, noteData.text, noteData.color) || { success: true };
    },

    /**
     * Upsert note with color AND sort in single request
     * Use this when color selection should update both fields at once
     */
    async upsertNoteWithSort(carId, noteData) {
        console.log('[NoteCallbacks.upsertNoteWithSort] Upserting note with text/color/sort for', carId);
        return await window.SupabaseApi?.upsertNoteTextWithSort?.(carId, noteData.text, noteData.color, noteData.sort) || { success: true };
    },

    /**
     * Update only the sort/rating (independent operation)
     */
    async updateSort(carId, sort) {
        console.log('[NoteCallbacks.updateSort] Updating sort to', sort, 'for', carId);
        return await window.SupabaseApi?.updateSort?.(carId, sort) || { success: true };
    },

    /**
     * Update only the verified status (independent operation)
     */
    async updateVerified(carId, confirmed) {
        console.log('[NoteCallbacks.updateVerified] Updating verified to', confirmed, 'for', carId);
        return await window.SupabaseApi?.updateConfirmed?.(carId, confirmed) || { success: true };
    },

    /**
     * Update sold status (independent operation)
     */
    async updateSold(carId, sold) {
        console.log('[NoteCallbacks.updateSold] Updating sold to', sold, 'for', carId);
        return await window.SupabaseApi?.updateSold?.(carId, sold) || { success: true };
    },

    /**
     * Update single metadata field (independent operation)
     */
    async updateMetadataField(carId, fieldName, fieldValue) {
        return await window.SupabaseApi?.updateMetadataField?.(carId, fieldName, fieldValue) || { success: true };
    },

    /**
     * Update multiple metadata fields in one PATCH request
     */
    async updateMetadataFields(carId, fields) {
        return await window.SupabaseApi?.updateMetadataFields?.(carId, fields) || { success: true };
    },

    /**
     * Update single feature (independent operation)
     */
    async updateFeature(carId, featureKey, state) {
        if (!window.SupabaseApi) {
            console.error('[NoteCallbacks.updateFeature] ❌ window.SupabaseApi is NOT initialized!');
            return { success: false, error: 'SupabaseApi not initialized' };
        }

        if (typeof window.SupabaseApi.updateCarFeature !== 'function') {
            console.error('[NoteCallbacks.updateFeature] ❌ updateCarFeature is not a function!', typeof window.SupabaseApi.updateCarFeature);
            return { success: false, error: 'updateCarFeature not found' };
        }

        try {
            const result = await window.SupabaseApi.updateCarFeature(carId, featureKey, state);
            return result;
        } catch (error) {
            console.error('[NoteCallbacks.updateFeature] ❌ Exception:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete car record and all related data
     */
    async deleteCarData(carId) {
        console.log('[NoteCallbacks.deleteCarData] Deleting car', carId);
        return await window.SupabaseApi?.deleteCarData?.(carId) || { success: true };
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
