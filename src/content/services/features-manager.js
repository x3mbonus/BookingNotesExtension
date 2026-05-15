// Features Manager - Manages feature state, persistence, and manual corrections
// NEW: Works with features_config table and car_features junction table

window.FeaturesManager = {
    featureConfigCache: null,
    fullFeaturesListCache: null,  // Cache for the full features list with config and metadata
    carFeaturesCache: {},  // Cache for features by carId: { carId: { features, sort, confirmed } }
    carDataCache: {},  // Cache for car metadata by carId: { carId: { text, color, sort, confirmed, ... } }

    /**
     * Get full features list with config and metadata
     * Derived from DB via getFeatureConfig() - single source of truth
     */
    async getFullFeaturesConfig() {
        if (this.fullFeaturesListCache?.length) {
            return this.fullFeaturesListCache;
        }

        const config = await this.getFeatureConfig();
        this.fullFeaturesListCache = config.map(f => ({
            label: f.label,
            key: f.key,
            priority: f.priority,
            cool_priority: f.cool_priority ?? null
        }));

        console.log('[FeaturesManager] Cached full features list:', this.fullFeaturesListCache.length, 'features');
        return this.fullFeaturesListCache;
    },

    /**
     * Get feature config - load once and cache globally (with localStorage backup)
     */
    async getFeatureConfig(forceRefresh = false) {
        // Check in-memory cache first (unless forcing refresh)
        if (!forceRefresh && this.featureConfigCache?.length) {
            console.log('[FeaturesManager.getFeatureConfig] ✅ In-memory cache HIT');
            return this.featureConfigCache;
        }

        // If forcing refresh, skip cache and go straight to API
        if (forceRefresh) {
            console.log('[FeaturesManager.getFeatureConfig] 🔄 FORCED REFRESH - skipping cache');
            try {
                this.featureConfigCache = await window.SupabaseApi.getFeatureConfig();
                this.fullFeaturesListCache = this.featureConfigCache.map(f => ({
                    label: f.label, key: f.key, priority: f.priority, cool_priority: f.cool_priority ?? null
                }));
                this.saveFeatureConfigToStorage(this.featureConfigCache);
                console.log('[FeaturesManager.getFeatureConfig] ✅ Refreshed from API:', this.featureConfigCache.length, 'features');
                return this.featureConfigCache;
            } catch (error) {
                console.error('[FeaturesManager.getFeatureConfig] Refresh failed:', error);
                return [];
            }
        }

        // Check localStorage with expiration
        const cached = this.getFeatureConfigFromStorage();
        if (cached) {
            console.log('[FeaturesManager.getFeatureConfig] ✅ localStorage cache HIT');
            this.featureConfigCache = cached;
            return cached;
        }

        // Fetch from API if not cached
        try {
            console.log('[FeaturesManager.getFeatureConfig] 📡 Fetching from API...');
            this.featureConfigCache = await window.SupabaseApi.getFeatureConfig();
            // Save to localStorage with timestamp
            this.saveFeatureConfigToStorage(this.featureConfigCache);
            console.log('[FeaturesManager.getFeatureConfig] ✅ Loaded from API & cached:', this.featureConfigCache.length, 'features');
            return this.featureConfigCache;
        } catch (error) {
            console.error('[FeaturesManager] Error loading feature config:', error);
            return [];
        }
    },

    /**
     * Get feature config from localStorage if still valid (1 hour expiration)
     */
    getFeatureConfigFromStorage() {
        try {
            const stored = localStorage.getItem('featureConfigCache');
            if (!stored) return null;

            const data = JSON.parse(stored);
            const now = Date.now();
            const expirationTime = 60 * 60 * 1000; // 1 hour in milliseconds

            if (now - data.timestamp > expirationTime) {
                console.log('[FeaturesManager] Feature config cache expired');
                localStorage.removeItem('featureConfigCache');
                return null;
            }

            return data.config;
        } catch (error) {
            console.warn('[FeaturesManager] Error reading feature config from storage:', error);
            return null;
        }
    },

    /**
     * Save feature config to localStorage with timestamp
     */
    saveFeatureConfigToStorage(config) {
        try {
            const data = {
                config: config,
                timestamp: Date.now()
            };
            localStorage.setItem('featureConfigCache', JSON.stringify(data));
        } catch (error) {
            console.warn('[FeaturesManager] Error saving feature config to storage:', error);
        }
    },

    /**
     * Initialize features for a car listing
     * Load from DB or parse from content
     * NOTE: Always checks DB first - don't cache parsed features per-car as rules may change
     */
    async initializeFeatures(carId, data) {
        console.log('[CAR-NOTES] initializeFeatures called for carId:', carId);

        // If data not provided, extract it from the page
        if (!data) {
            data = window.extractCarData?.();
            console.log('[CAR-NOTES] Data not provided, extracted from page:', !!data);
        }

        // Try to load from database first
        let dbFeatures = null;
        try {
            dbFeatures = await window.SupabaseApi.getCarFeatures(carId);
            console.log('[CAR-NOTES] Loaded from DB:', Object.keys(dbFeatures || {}).length, 'features');
        } catch (error) {
            console.warn('[CAR-NOTES] Error fetching from DB:', error);
        }

        // If we got data from DB, return it (it's already in the right format: { key: state })
        if (dbFeatures && Object.keys(dbFeatures).length > 0) {
            console.log('[CAR-NOTES] Using DB features');
            // Get car metadata WITHOUT re-fetching features (uses cache to prevent duplicates)
            const carData = await this.getCarDataMetdata(carId);
            const result = {
                features: dbFeatures,
                confirmed: carData?.confirmed || false,
                sort: carData?.sort || null,
                isFromDb: true,
                featuresSource: carData?.featuresSource || 'manual'
            };
            console.log('[CAR-NOTES] Returning DB result:', result);
            return result;
        }

        // Parse from content if not in DB
        console.log('[FeaturesManager] Parsing features from page content');
        if (!data) {
            console.warn('[FeaturesManager] No data available to parse features from');
            const result = {
                features: {},
                confirmed: false,
                sort: null,
                isFromDb: false,
                featuresSource: null
            };
            return result;
        }

        // Get feature config to map feature names to keys
        const featureConfig = await this.getFeatureConfig();
        const nameToKey = {};
        featureConfig.forEach(fc => {
            nameToKey[fc.name_uk] = fc.key;
        });

        // Parse features
        const parsed = window.FeaturesParser.parseFeatures(data);
        console.log('[CAR-NOTES] Parsed features raw:', parsed);
        const features = {};

        // Convert feature names to keys
        Object.entries(parsed).forEach(([featureName, isPresent]) => {
            // Try to find key from config, fallback to column name conversion
            let key = nameToKey[featureName];
            if (!key) {
                key = window.FeatureColumnMapper ?
                    window.FeatureColumnMapper.featureToColumnName(featureName) :
                    'feature_' + featureName.toLowerCase().replace(/[^\w]/g, '_').replace(/_+/g, '_');
            }
            const state = isPresent ? true : null; // null = unknown
            console.log(`[CAR-NOTES] "${featureName}" (${isPresent}) → "${key}" = ${state}`);
            features[key] = state;
        });

        console.log('[CAR-NOTES] Final features object:', features);
        const result = {
            features,
            confirmed: false,
            sort: null,
            isFromDb: false,
            featuresSource: 'parsed'
        };
        console.log('[CAR-NOTES] Returning parsed result:', result);
        return result;
    },

    /**
     * Save features to database using new car_features table
     */
    async saveFeatures(carId, features, sort = null, confirmed = false) {
        console.log('[FeaturesManager.saveFeatures] Saving', Object.keys(features).length, 'features for car:', carId, 'sort:', sort, 'confirmed:', confirmed);
        return await window.SupabaseApi.saveCarFeaturesNew(carId, features, sort, confirmed);
    },

    /**
     * Update single feature state
     */
    async updateFeature(carId, featureKey, state) {
        console.log(`[FeaturesManager.updateFeature] Updating ${featureKey} to ${state} for car ${carId}`);
        return await window.SupabaseApi.updateCarFeature(carId, featureKey, state);
    },

    /**
     * Toggle feature state: null → true → false → null (3-state cycle)
     * Cycling order: Unknown (?) → Present (✓) → Missing (✗) → Unknown (?)
     */
    toggleFeatureState(currentState) {
        if (currentState === null) {
            return true;  // ? → ✓
        } else if (currentState === true) {
            return false; // ✓ → ✗
        } else {
            return null;  // ✗ → ?
        }
    },

    async toggleFeature(carId, featureKey, currentState) {
        const nextState = this.toggleFeatureState(currentState);
        return await this.updateFeature(carId, featureKey, nextState);
    },

    /**
     * Mark all features as confirmed
     */
    async confirmAllFeatures(carId, features, sort = null, confirmed = true) {
        return await this.saveFeatures(carId, features, sort, confirmed);
    },

    /**
     * Get statistics about features
     */
    getStatistics(features) {
        let total = 0;
        let present = 0;
        let unknown = 0;
        let missing = 0;

        Object.values(features).forEach(state => {
            total++;
            if (state === true) {
                present++;
            } else if (state === null) {
                unknown++;
            } else if (state === false) {
                missing++;
            }
        });

        return {
            total,
            present,
            unknown,
            missing,
            percentage: total > 0 ? Math.round((present / total) * 100) : 0
        };
    },

    /**
     * Get car data metadata with caching to prevent duplicate requests
     */
    async getCarDataMetdata(carId) {
        // Check cache first
        if (this.carDataCache[carId]) {
            console.log('[FeaturesManager.getCarDataMetadata] ✅ CACHE HIT for car:', carId);
            return this.carDataCache[carId];
        }

        // Fetch from API
        const data = await window.SupabaseApi?.getCarDataMetadataOnly?.(carId);
        if (data) {
            // Cache the result
            this.carDataCache[carId] = data;
            console.log('[FeaturesManager.getCarDataMetadata] 💾 CACHED car data for car:', carId);
        }
        return data;
    },

    /**
     * Get color for feature state based on priority
     * Returns: { present, unknown, missing } colors
     */
    getFeatureStateColors(priority) {
        const colors = {
            true: '#E8F5E9',   // Present = light green
            null: '#FAFAFA',   // Unknown = light gray
            false: {
                // Missing display color depends on priority
                0: '#FFFFFF',   // Low priority = white
                1: '#FFF8E1',   // Normal priority = light yellow
                2: '#FFEBEE'    // High priority = light red
            }
        };
        return colors;
    }
};

