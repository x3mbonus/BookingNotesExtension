// Features Parser — accommodation amenity keywords (for optional auto-detection)

window.FeaturesParser = {
    FEATURE_KEYWORDS: {
        'Басейн':          ['pool', 'swimming pool', 'piscina', 'басейн', 'pool area'],
        'Перша лінія':     ['beachfront', 'beach front', 'on the beach', 'перша лінія'],
        'Вид на море':     ['sea view', 'ocean view', 'seaview', 'вид на море', 'вид на океан'],
        'Паркінг':         ['parking', 'car park', 'free parking', 'паркінг', 'парковка'],
        'Кондиціонер':     ['air conditioning', 'air-conditioning', 'ac', 'кондиціонер', 'klimatyzacja'],
        'WiFi':            ['wifi', 'wi-fi', 'wireless internet', 'free wifi'],
        'Кухня':           ['kitchen', 'kitchenette', 'кухня', 'aneks kuchenny'],
        'Пральна машина':  ['washing machine', 'washer', 'laundry', 'пральна машина', 'pralka'],
        'Посудомийна':     ['dishwasher', 'посудомийна', 'zmywarka'],
        'Балкон/Тераса':   ['balcony', 'terrace', 'patio', 'балкон', 'тераса', 'taras'],
        'Джакузі':         ['jacuzzi', 'hot tub', 'whirlpool', 'джакузі'],
        'Спортзал':        ['gym', 'fitness', 'спортзал', 'fitness center', 'siłownia'],
        'Сніданок':        ['breakfast', 'breakfast included', 'сніданок', 'śniadanie'],
        'Ліфт':            ['elevator', 'lift', 'ліфт', 'winda'],
        'Тварини OK':      ['pets allowed', 'pets ok', 'pet-friendly', 'тварини']
    },

    parseFeatures(data) {
        const fullContent = JSON.stringify(data).toLowerCase();
        const features = {};

        Object.entries(this.FEATURE_KEYWORDS).forEach(([featureName, keywords]) => {
            features[featureName] = keywords.some(kw => fullContent.includes(kw.toLowerCase()));
        });

        return features;
    }
};
