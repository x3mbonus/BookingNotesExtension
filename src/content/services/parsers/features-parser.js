// Features Parser - Extracts and categorizes vehicle features

window.FeaturesParser = {
    /**
     * Categorized feature groups
     */
    FEATURE_CATEGORIES: {
        'Security': [
            'ACC',
            'Blind spot',
            'Lane assist',
            'Signs',
            'Rear traffic alert',
            'Traffic Jam Assist'
        ],
        'Comfort': [
            'Keyless',
            'Digital cockpit',
            'Heated seats',
            'Heated windshield',
            'Heated steering wheel',
            'Massage seats',
            'Memory seats'
        ],
        'Technology': [
            'Android Auto / CarPlay',
            'HUD',
            'DCC',
            'Matrix headlights'
        ],
        'Cameras & Parking': [
            'Camera',
            'Parking sensors',
            '360 camera',
            'Auto parking'
        ],
        'Exterior': [
            'Panoramic roof',
            'Electric tailgate',
            'Auto tailgate',
            'Tow hitch'
        ],
        'Climate': [
            'Webasto'
        ]
    },

    /**
     * Words that indicate feature presence in text (English & Ukrainian & Polish)
     */
    FEATURE_KEYWORDS: {
        'ACC': ['adaptive cruise', 'acc', 'tempomat adaptacyjny', 'асистент адаптивный'],
        'Blind spot': ['blind spot', 'martwego pola', 'мертвая зона'],
        'Lane assist': ['lane assist', 'lane change', 'kontrola zmiany pasa', 'контроль смены полосы', 'line assit', 'line assist'],
        'Signs': ['speed limit', 'traffic sign', 'sign recognition', 'розпізнаван', 'ограничник', 'знаки'],
        'Rear traffic alert': ['rear traffic', 'rear cross', 'pojazdu z tyłu', 'асистент'],
        'Traffic Jam Assist': ['traffic jam', 'jam assist', 'asystent jazdy w korku'],
        'Keyless': ['keyless', 'keyless go', 'keyless entry', 'без ключа'],
        'Digital cockpit': ['digital cockpit', 'active info display', 'wirtualne zegary', 'цифровой'],
        'Heated seats': ['heated seats', 'podgrzewany fotel', 'sitzheizung', 'підігрів сидінь', 'подогрев сидений'],
        'Heated windshield': ['heated windshield', 'podgrzewana szyba', 'підігрів', 'лобовик'],
        'Heated steering wheel': ['steering wheel heating', 'heated steering', 'kierownica ogrzewana', 'lenkradheizung', 'підігрів керма'],
        'Massage seats': ['massage', 'masażu', 'funkcje masażu', 'массаж'],
        'Memory seats': ['seat memory', 'siedzenie z pamięcią', 'pamięcią ustawienia', 'пам\'ять'],
        'Android Auto / CarPlay': ['android auto', 'apple carplay', 'app-connect', 'android', 'carplay', 'apple'],
        'HUD': ['head-up', 'hud', 'проекц'],
        'DCC': ['dynamic chassis', 'dcc'],
        'Matrix headlights': ['matrix headlight', 'iq.light', 'матриц', 'matrix led', 'adaptive led'],
        'Camera': ['камера', 'фронтальна', 'camera', 'kamera'],
        'Panoramic roof': ['panoramic roof', 'panorama', 'dach panoramiczny', 'панорам'],
        'Electric tailgate': ['electric tailgate', 'power tailgate', 'klapę bagażnika', 'klapa bagażnika', 'elektrycznie otwierana', 'клапа', 'електро'],
        'Auto tailgate': ['automatic tailgate', 'автоматичний'],
        '360 camera': ['360', 'surround', 'кругова'],
        'Parking sensors': ['parking sensors', 'kontrola odległości', 'czujnik parkowania', 'парктроніки', 'паркинг'],
        'Auto parking': ['automatic parking', 'park assist', 'automatyczne parkowanie', 'asystent parkowania', 'автопаркування'],
        'Tow hitch': ['tow hitch', 'towing', 'hak holowniczy', 'hak', 'trailer', 'фаркоп', 'тяговой'],
        'Webasto': ['webasto', 'предпусковой', 'предпусковой обогреватель']
    },

    /**
     * Parse extracted vehicle data and return organized features
     */
    parseFeatures(data) {
        const fullContent = JSON.stringify(data).toLowerCase();
        const features = {};
        const PREFIX = '[CAR-NOTES]';

        console.log(PREFIX, 'Starting feature parsing');
        console.log(PREFIX, 'Content length:', fullContent.length);
        console.log(PREFIX, 'First 500 chars:', fullContent.substring(0, 500));

        // Initialize all features as not present
        Object.values(this.FEATURE_CATEGORIES).forEach(categoryFeatures => {
            categoryFeatures.forEach(feature => {
                features[feature] = false;
            });
        });

        // Check each feature
        Object.entries(this.FEATURE_KEYWORDS).forEach(([feature, keywords]) => {
            console.log(`${PREFIX} Checking feature: "${feature}"`);
            keywords.forEach(keyword => {
                const found = fullContent.includes(keyword.toLowerCase());
                if (found) {
                    console.log(`${PREFIX}   ✓ MATCHED: "${keyword}"`);
                    features[feature] = true;
                } else {
                    console.log(`${PREFIX}   ✗ NOT FOUND: "${keyword}"`);
                }
            });
            console.log(`${PREFIX} → Result: ${features[feature] ? '✅ TRUE' : '❌ FALSE'}`);
        });

        console.log(PREFIX, 'Final parsed features:', features);
        return features;
    },

    /**
     * Get features grouped by category
     */
    getFeaturesGrouped(data) {
        const allFeatures = this.parseFeatures(data);
        const grouped = {};

        Object.entries(this.FEATURE_CATEGORIES).forEach(([category, features]) => {
            grouped[category] = {};
            features.forEach(feature => {
                grouped[category][feature] = allFeatures[feature] || false;
            });
        });

        return grouped;
    },

    /**
     * Get statistics about features (handles both flat and grouped)
     */
    getStatistics(features) {
        if (!features || typeof features !== 'object') {
            return { total: 0, present: 0, unknown: 0, missing: 0, percentage: 0 };
        }

        let total = 0;
        let present = 0;
        let unknown = 0;
        let missing = 0;

        // Check if flat object (feature name -> true/false/null)
        const isFlat = Object.values(features).some(v => v === true || v === false || v === null);

        if (isFlat) {
            // Flat features object
            Object.values(features).forEach(state => {
                total++;
                if (state === true) present++;
                else if (state === null) unknown++;
                else missing++;
            });
        } else {
            // Grouped by category
            Object.values(features).forEach(categoryFeatures => {
                if (categoryFeatures && typeof categoryFeatures === 'object') {
                    Object.values(categoryFeatures).forEach(state => {
                        total++;
                        if (state === true) present++;
                        else if (state === null) unknown++;
                        else missing++;
                    });
                }
            });
        }

        return {
            total,
            present,
            unknown,
            missing,
            percentage: total > 0 ? Math.round((present / total) * 100) : 0
        };
    }
};
