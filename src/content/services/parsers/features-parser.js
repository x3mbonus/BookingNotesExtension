// Features Parser — accommodation amenity keywords (for optional auto-detection)

window.FeaturesParser = {
    FEATURE_KEYWORDS: {
        'Басейн':          ['pool', 'swimming pool', 'piscina', 'басейн', 'pool area'],
        'Джакузі':         ['jacuzzi', 'hot tub', 'whirlpool', 'джакузі'],
        'Своя територія':  ['own territory', 'private territory', 'enclosed garden', 'private garden', 'своя територія', 'власна територія', 'своя ділянка'],
        'Перша лінія':     ['beachfront', 'beach front', 'on the beach', 'перша лінія'],
        'Вид на море':     ['sea view', 'ocean view', 'seaview', 'вид на море', 'вид на океан'],
        'Паркінг':         ['parking', 'car park', 'free parking', 'паркінг', 'парковка', 'автостоянка'],
        'Кондиціонер':     ['air conditioning', 'air-conditioning', 'ac', 'кондиціонер', 'klimatyzacja'],
        'WiFi':            ['wifi', 'wi-fi', 'wireless internet', 'free wifi'],
        'Кухня':           ['kitchen', 'kitchenette', 'кухня', 'aneks kuchenny'],
        'Пральна машина':  ['washing machine', 'washer', 'laundry', 'пральна машина', 'pralka'],
        'Посудомийна':     ['dishwasher', 'посудомийна', 'zmywarka'],
        'Балкон/Тераса':   ['balcony', 'terrace', 'patio', 'балкон', 'тераса', 'taras'],
        'Сніданок':        ['breakfast', 'breakfast included', 'сніданок', 'śniadanie']
    },

    parseFeatures(data) {
        const fullContent = JSON.stringify(data).toLowerCase();
        const features = {};
        Object.entries(this.FEATURE_KEYWORDS).forEach(([featureName, keywords]) => {
            features[featureName] = keywords.some(kw => fullContent.includes(kw.toLowerCase()));
        });
        return features;
    },

    // More precise: match against an explicit list of amenity strings from the page
    parseFeaturesFromList(amenityList) {
        if (!amenityList || amenityList.length === 0) return {};
        const joined = amenityList.join('\n').toLowerCase();
        const features = {};
        Object.entries(this.FEATURE_KEYWORDS).forEach(([featureName, keywords]) => {
            features[featureName] = keywords.some(kw => joined.includes(kw.toLowerCase()));
        });
        return features;
    }
};
