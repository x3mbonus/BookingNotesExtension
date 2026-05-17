// Supabase client for content scripts
// Uses REST API directly - no background worker routing

// ========================================
// ENVIRONMENT CONFIGURATION
// ========================================
// Change ENV_SUFFIX to switch between environments:
//   '_local'  = Development (use _local suffix on tables)
//   ''        = Production
// ========================================
// const ENV_SUFFIX = '_local';
const ENV_SUFFIX = '';

const TABLE_PROPERTY_DATA     = `stay_property_data${ENV_SUFFIX}`;
const TABLE_FEATURES_CONFIG   = `stay_features_config${ENV_SUFFIX}`;
const TABLE_PROPERTY_FEATURES = `stay_property_features${ENV_SUFFIX}`;

window.SupabaseClient = {
    url: null,
    key: null,
    isConfigured: false,
    lastError: null,

    async init() {
        return new Promise((resolve) => {
            console.log('[STAY-NOTES] Loading credentials from storage...');
            chrome.storage.sync.get(['supabaseUrl', 'supabaseKey'], (result) => {
                if (!result.supabaseUrl || !result.supabaseKey) {
                    console.warn('[STAY-NOTES] Credentials not found');
                    this.isConfigured = false;
                    resolve(false);
                    return;
                }

                try {
                    this.url = result.supabaseUrl.replace(/\/$/, '');
                    this.key = result.supabaseKey;
                    this.isConfigured = true;
                    console.log('[STAY-NOTES] ✅ Ready:', this.url);
                } catch (error) {
                    console.error('[STAY-NOTES] ❌ Error:', error);
                    this.isConfigured = false;
                }

                resolve(this.isConfigured);
            });
        });
    },

    async isReady() {
        if (this.isConfigured && this.url && this.key) return true;
        return await this.init();
    },

    async getCredentials() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['supabaseUrl', 'supabaseKey'], (result) => {
                resolve({
                    url: result.supabaseUrl || '',
                    key: result.supabaseKey || ''
                });
            });
        });
    },

    async setCredentials(url, key) {
        return new Promise(async (resolve) => {
            try {
                const testUrl = url.replace(/\/$/, '');
                const response = await fetch(`${testUrl}/rest/v1/${TABLE_PROPERTY_DATA}?limit=1`, {
                    method: 'GET',
                    headers: {
                        'apikey': key,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                chrome.storage.sync.set({
                    supabaseUrl: url,
                    supabaseKey: key
                }, () => {
                    this.url = testUrl;
                    this.key = key;
                    this.isConfigured = true;
                    this.lastError = null;
                    resolve(true);
                });
            } catch (error) {
                console.error('[STAY-NOTES] Connection test failed:', error);
                this.isConfigured = false;
                resolve(false);
            }
        });
    },

    async clearCredentials() {
        return new Promise((resolve) => {
            chrome.storage.sync.remove(['supabaseUrl', 'supabaseKey'], () => {
                this.url = null;
                this.key = null;
                this.isConfigured = false;
                resolve();
            });
        });
    }
};

// Supabase REST API methods
window.SupabaseApi = {
    ENV_SUFFIX,
    TABLE_PROPERTY_DATA,
    TABLE_FEATURES_CONFIG,
    TABLE_PROPERTY_FEATURES,

    // Get single property data (with features)
    async getPropertyData(propertyId) {
        if (!await window.SupabaseClient.isReady()) {
            console.log('[STAY-NOTES] Not configured');
            return null;
        }

        try {
            const url = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=eq.${encodeURIComponent(propertyId)}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                const row = data[0];
                const features = await this.getPropertyFeatures(propertyId) || {};
                return {
                    text: row.text,
                    color: row.color,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                    features,
                    sort: row.sort,
                    confirmed: row.confirmed || false,
                    unavailable: row.unavailable || false,
                    name: row.name || null,
                    price_per_night: row.price_per_night || null,
                    location: row.location || null,
                    site_rating: row.site_rating || null,
                    platform: row.platform || null,
                    bedrooms: row.bedrooms || null,
                    beds: row.beds || null,
                    distance_beach: row.distance_beach || null,
                    distance_airport: row.distance_airport || null,
                    url: row.url || null,
                    photo_url: row.photo_url || null
                };
            }

            return null;
        } catch (error) {
            console.error('[STAY-NOTES] Error:', error);
            return null;
        }
    },

    // Get property metadata only (no features re-fetch)
    async getPropertyDataMetadataOnly(propertyId) {
        if (!await window.SupabaseClient.isReady()) return null;

        try {
            const url = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=eq.${encodeURIComponent(propertyId)}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                const row = data[0];
                return {
                    text: row.text,
                    color: row.color,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                    sort: row.sort,
                    confirmed: row.confirmed || false,
                    unavailable: row.unavailable || false,
                    name: row.name || null,
                    price_per_night: row.price_per_night || null,
                    location: row.location || null,
                    site_rating: row.site_rating || null,
                    platform: row.platform || null,
                    bedrooms: row.bedrooms || null,
                    beds: row.beds || null,
                    distance_beach: row.distance_beach || null,
                    distance_airport: row.distance_airport || null,
                    url: row.url || null,
                    photo_url: row.photo_url || null
                };
            }

            return null;
        } catch (error) {
            console.error('[STAY-NOTES] Error:', error);
            return null;
        }
    },

    // Get multiple properties by IDs (for listing page batch load)
    async getDataByIds(propertyIds) {
        if (!await window.SupabaseClient.isReady()) return {};

        try {
            if (!Array.isArray(propertyIds) || propertyIds.length === 0) return {};

            const idList = propertyIds.map(id => encodeURIComponent(id)).join(',');
            const url = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=in.(${idList})`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const result = {};

            if (Array.isArray(data)) {
                for (const row of data) {
                    const features = await this.getPropertyFeatures(row.property_id) || {};
                    result[row.property_id] = {
                        text: row.text,
                        color: row.color,
                        createdAt: row.created_at,
                        updatedAt: row.updated_at,
                        features,
                        sort: row.sort,
                        confirmed: row.confirmed || false,
                        unavailable: row.unavailable || false,
                        name: row.name || null,
                        price_per_night: row.price_per_night || null,
                        location: row.location || null,
                        site_rating: row.site_rating || null,
                        platform: row.platform || null,
                        bedrooms: row.bedrooms || null,
                        beds: row.beds || null,
                        distance_beach: row.distance_beach || null,
                        distance_airport: row.distance_airport || null,
                        url: row.url || null
                    };
                }
            }

            return result;
        } catch (error) {
            console.error('[STAY-NOTES] Error:', error);
            return {};
        }
    },

    // Save property data (upsert via PATCH → POST fallback)
    async savePropertyData(propertyId, noteData, featuresData, metadata = {}) {
        if (!await window.SupabaseClient.isReady()) {
            return { success: false, reason: 'not_configured' };
        }

        try {
            const now = new Date().toISOString();

            const updatePayload = {
                ...(noteData && {
                    text: noteData.text,
                    color: noteData.color || '#e0e0e0'
                }),
                ...(featuresData && {
                    sort: featuresData.sort || 0,
                    confirmed: featuresData.confirmed || false
                }),
                ...(metadata.name              && { name: metadata.name }),
                ...(metadata.price_per_night   && { price_per_night: metadata.price_per_night }),
                ...(metadata.location          && { location: metadata.location }),
                ...(metadata.site_rating       && { site_rating: metadata.site_rating }),
                ...(metadata.platform          && { platform: metadata.platform }),
                ...(metadata.bedrooms          && { bedrooms: metadata.bedrooms }),
                ...(metadata.beds              && { beds: metadata.beds }),
                ...(metadata.distance_beach    && { distance_beach: metadata.distance_beach }),
                ...(metadata.distance_airport  && { distance_airport: metadata.distance_airport }),
                ...(metadata.url               && { url: metadata.url }),
                ...(metadata.unavailable !== undefined && { unavailable: metadata.unavailable }),
                updated_at: now
            };

            const updateUrl = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=eq.${encodeURIComponent(propertyId)}`;
            const updateResponse = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'apikey': window.SupabaseClient.key,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updatePayload)
            });

            if (!updateResponse.ok) throw new Error(`PATCH failed: ${updateResponse.status}`);

            const responseData = await updateResponse.json();
            if (Array.isArray(responseData) && responseData.length > 0) {
                return { success: true };
            }

            // No rows updated — INSERT
            const insertPayload = {
                property_id: propertyId,
                text: noteData?.text || '',
                color: noteData?.color || '#e0e0e0',
                sort: featuresData?.sort || 0,
                confirmed: featuresData?.confirmed || false,
                name: metadata.name || null,
                price_per_night: metadata.price_per_night || null,
                location: metadata.location || null,
                site_rating: metadata.site_rating || null,
                platform: metadata.platform || null,
                bedrooms: metadata.bedrooms || null,
                beds: metadata.beds || null,
                distance_beach: metadata.distance_beach || null,
                distance_airport: metadata.distance_airport || null,
                url: metadata.url || null,
                unavailable: metadata.unavailable || false,
                created_at: now,
                updated_at: now
            };

            const insertUrl = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}`;
            const insertResponse = await fetch(insertUrl, {
                method: 'POST',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' },
                body: JSON.stringify([insertPayload])
            });

            if (!insertResponse.ok) throw new Error(`INSERT failed: ${insertResponse.status}`);

            return { success: true };
        } catch (error) {
            console.error('[STAY-NOTES] Error:', error);
            return { success: false, error: error.message };
        }
    },

    // Update note text + color
    async updateNoteText(propertyId, text, color) {
        if (!await window.SupabaseClient.isReady()) return { success: false };

        try {
            const url = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=eq.${encodeURIComponent(propertyId)}`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, color: color || '#e0e0e0', updated_at: new Date().toISOString() })
            });
            return { success: response.ok };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Upsert note text + color
    async upsertNoteText(propertyId, text, color) {
        if (!await window.SupabaseClient.isReady()) return { success: false };

        try {
            const updateUrl = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=eq.${encodeURIComponent(propertyId)}`;
            const patchResponse = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'apikey': window.SupabaseClient.key,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ text, color: color || '#e0e0e0', updated_at: new Date().toISOString() })
            });

            if (patchResponse.ok) {
                const updated = await patchResponse.json();
                if (Array.isArray(updated) && updated.length > 0) return { success: true };
            }

            // Insert new record
            const insertUrl = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}`;
            const insertResponse = await fetch(insertUrl, {
                method: 'POST',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    property_id: propertyId,
                    text,
                    color: color || '#e0e0e0',
                    sort: null,
                    confirmed: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
            });
            return { success: insertResponse.ok };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Upsert note text + color + sort in one request
    async upsertNoteTextWithSort(propertyId, text, color, sort) {
        if (!await window.SupabaseClient.isReady()) return { success: false };

        try {
            const payload = {
                text,
                color: color || '#e0e0e0',
                sort: sort === undefined ? null : sort,
                updated_at: new Date().toISOString()
            };

            const updateUrl = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=eq.${encodeURIComponent(propertyId)}`;
            const patchResponse = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'apikey': window.SupabaseClient.key,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(payload)
            });

            if (patchResponse.ok) {
                const updated = await patchResponse.json();
                if (Array.isArray(updated) && updated.length > 0) return { success: true };
            }

            const insertUrl = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}`;
            const insertResponse = await fetch(insertUrl, {
                method: 'POST',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    property_id: propertyId,
                    text,
                    color: color || '#e0e0e0',
                    sort: sort === undefined ? null : sort,
                    confirmed: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
            });
            return { success: insertResponse.ok };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async updateSort(propertyId, sort) {
        if (!await window.SupabaseClient.isReady()) return { success: false };
        try {
            const url = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=eq.${encodeURIComponent(propertyId)}`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' },
                body: JSON.stringify({ sort, updated_at: new Date().toISOString() })
            });
            return { success: response.ok };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async updateUnavailable(propertyId, unavailable) {
        if (!await window.SupabaseClient.isReady()) return { success: false };
        try {
            const url = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=eq.${encodeURIComponent(propertyId)}`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' },
                body: JSON.stringify({ unavailable, updated_at: new Date().toISOString() })
            });
            return { success: response.ok };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async updateConfirmed(propertyId, confirmed) {
        if (!await window.SupabaseClient.isReady()) return { success: false };
        try {
            const url = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=eq.${encodeURIComponent(propertyId)}`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmed, updated_at: new Date().toISOString() })
            });
            return { success: response.ok };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async updateMetadataField(propertyId, fieldName, fieldValue) {
        if (!await window.SupabaseClient.isReady()) return { success: false };
        try {
            const url = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=eq.${encodeURIComponent(propertyId)}`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' },
                body: JSON.stringify({ [fieldName]: fieldValue, updated_at: new Date().toISOString() })
            });
            return { success: response.ok };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async updateMetadataFields(propertyId, fields) {
        if (!await window.SupabaseClient.isReady()) return { success: false };
        try {
            const url = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=eq.${encodeURIComponent(propertyId)}`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() })
            });
            return { success: response.ok };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async deletePropertyData(propertyId) {
        if (!await window.SupabaseClient.isReady()) return { success: false };

        try {
            // Delete features first (foreign key)
            const featureUrl = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_FEATURES}?property_id=eq.${encodeURIComponent(propertyId)}`;
            await fetch(featureUrl, {
                method: 'DELETE',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' }
            });

            const dataUrl = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=eq.${encodeURIComponent(propertyId)}`;
            const response = await fetch(dataUrl, {
                method: 'DELETE',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return { success: true };
        } catch (error) {
            console.error('[STAY-NOTES] Error:', error);
            return { success: false, error: error.message };
        }
    },

    // ==================== Features Table Methods ====================

    async getFeatureConfig() {
        if (!await window.SupabaseClient.isReady()) return [];

        try {
            const url = `${window.SupabaseClient.url}/rest/v1/${TABLE_FEATURES_CONFIG}?select=*&order=sort`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' }
            });

            if (!response.ok) return [];
            return await response.json() || [];
        } catch (error) {
            console.error('[STAY-NOTES] Error:', error);
            return [];
        }
    },

    async getPropertyFeatures(propertyId) {
        if (!await window.SupabaseClient.isReady()) return {};

        try {
            const url = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_FEATURES}?property_id=eq.${encodeURIComponent(propertyId)}&select=feature_id,state`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' }
            });

            if (!response.ok) return {};

            const data = await response.json();
            const featureConfig = await window.FeaturesManager?.getFeatureConfig?.() || await this.getFeatureConfig();
            const idToKey = {};
            featureConfig.forEach(fc => { idToKey[fc.id] = fc.key; });

            const features = {};
            data.forEach(row => {
                const key = idToKey[row.feature_id];
                if (key) features[key] = row.state;
            });

            return features;
        } catch (error) {
            console.error('[STAY-NOTES] Error:', error);
            return {};
        }
    },

    async savePropertyFeaturesNew(propertyId, features, sort = null, confirmed = false) {
        if (!await window.SupabaseClient.isReady()) return { success: false };

        try {
            // Ensure property record exists
            const checkUrl = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=eq.${encodeURIComponent(propertyId)}&select=property_id`;
            const checkResponse = await fetch(checkUrl, {
                method: 'GET',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' }
            });
            const existing = await checkResponse.json();

            if (!existing || existing.length === 0) {
                const createUrl = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}`;
                await fetch(createUrl, {
                    method: 'POST',
                    headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        property_id: propertyId,
                        text: '',
                        color: '#e0e0e0',
                        sort: null,
                        confirmed: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                });
            }

            const featureConfig = await window.FeaturesManager?.getFeatureConfig?.() || await this.getFeatureConfig();
            const keyToId = {};
            featureConfig.forEach(fc => { keyToId[fc.key] = fc.id; });

            const payload = [];
            Object.entries(features).forEach(([key, state]) => {
                const featureId = keyToId[key];
                if (featureId) {
                    payload.push({
                        property_id: propertyId,
                        feature_id: featureId,
                        state: state === true ? true : (state === false ? false : null)
                    });
                }
            });

            if (payload.length === 0) return { success: true };

            const url = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_FEATURES}?on_conflict=property_id,feature_id`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': window.SupabaseClient.key,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            // Update sort and confirmed on property_data
            if (sort !== null || confirmed !== null) {
                const updatePayload = {};
                if (sort !== null && sort !== undefined) updatePayload.sort = sort;
                if (confirmed !== undefined) updatePayload.confirmed = confirmed;

                const updateUrl = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}?property_id=eq.${encodeURIComponent(propertyId)}`;
                await fetch(updateUrl, {
                    method: 'PATCH',
                    headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatePayload)
                });
            }

            return { success: true };
        } catch (error) {
            console.error('[STAY-NOTES] Error:', error);
            return { success: false, error: error.message };
        }
    },

    async updatePropertyFeature(propertyId, featureKey, state) {
        if (!await window.SupabaseClient.isReady()) return { success: false };

        try {
            const featureConfig = await window.FeaturesManager?.getFeatureConfig?.(true) || await this.getFeatureConfig();
            const trimmedConfig = featureConfig.map(f => ({ ...f, key: f.key.trim() }));
            const feature = trimmedConfig.find(f => f.key === featureKey.trim());

            if (!feature) {
                console.error('[STAY-NOTES] Feature not found:', featureKey);
                return { success: false, error: 'Feature not found' };
            }

            const checkUrl = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_FEATURES}?property_id=eq.${encodeURIComponent(propertyId)}&feature_id=eq.${feature.id}`;
            const checkResponse = await fetch(checkUrl, {
                method: 'GET',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' }
            });
            const existing = await checkResponse.json();

            const normalizedState = state === true ? true : (state === false ? false : null);

            if (existing.length > 0) {
                const updateUrl = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_FEATURES}?property_id=eq.${encodeURIComponent(propertyId)}&feature_id=eq.${feature.id}`;
                const updateResponse = await fetch(updateUrl, {
                    method: 'PATCH',
                    headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ state: normalizedState, updated_at: new Date().toISOString() })
                });
                if (!updateResponse.ok) throw new Error(`PATCH failed: ${updateResponse.status}`);
            } else {
                const insertUrl = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_FEATURES}`;
                const insertResponse = await fetch(insertUrl, {
                    method: 'POST',
                    headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' },
                    body: JSON.stringify([{ property_id: propertyId, feature_id: feature.id, state: normalizedState }])
                });
                if (!insertResponse.ok) throw new Error(`POST failed: ${insertResponse.status}`);
            }

            return { success: true };
        } catch (error) {
            console.error('[STAY-NOTES] Error:', error);
            return { success: false, error: error.message };
        }
    },

    // Get all properties (for comparison)
    async getAllProperties() {
        if (!await window.SupabaseClient.isReady()) return [];

        try {
            const url = `${window.SupabaseClient.url}/rest/v1/${TABLE_PROPERTY_DATA}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'apikey': window.SupabaseClient.key, 'Content-Type': 'application/json' }
            });

            if (!response.ok) return [];
            return await response.json() || [];
        } catch (error) {
            console.error('[STAY-NOTES] Error:', error);
            return [];
        }
    }
};

console.log('[STAY-NOTES] ✅ Initialized. updatePropertyFeature exists:', typeof window.SupabaseApi.updatePropertyFeature === 'function');
