/**
 * Metadata Parsing Utilities
 * Handles extraction and conversion of metadata from parsed property data
 */

window.MetadataParser = {
    /**
     * Convert PLN price to EUR
     * Rate: 100 PLN = 23.50 EUR (0.235 EUR per PLN)
     */
    convertPLNtoEUR(plnPrice) {
        if (!plnPrice) return null;
        const plnNum = parseFloat(plnPrice.toString().replace(/[^0-9.]/g, ''));
        if (isNaN(plnNum)) return null;
        return (plnNum * 23.50 / 100).toFixed(2);
    },

    /**
     * Extract metadata from parsed property data
     * Returns object with make, model, price, price_eur, mileage, year, address, url
     */
    extractMetadata(extractedData) {
        const metadata = {
            make: null,
            model: null,
            price: null,
            price_eur: null,
            mileage: null,
            year: null,
            address: null,
            url: null,
            photo_url: null
        };

        if (!extractedData) return metadata;

        // Extract URL
        if (extractedData.url) {
            metadata.url = extractedData.url;
        }

        // Extract photo URL (og:image captured at page-visit time — no fetch needed)
        if (extractedData.photo_url) {
            metadata.photo_url = extractedData.photo_url;
        }

        // Extract address from dealer info (mobile.de, otomoto.pl, etc.)
        if (extractedData.dealer) {
            const addressParts = [];
            if (extractedData.dealer.address1) {
                addressParts.push(extractedData.dealer.address1);
            }
            if (extractedData.dealer.address2) {
                addressParts.push(extractedData.dealer.address2);
            }
            if (addressParts.length > 0) {
                metadata.address = addressParts.join(', ');
            }
        }

        // Extract make and model from basics
        if (extractedData.basics?.make) {
            metadata.make = extractedData.basics.make.trim();
        }
        if (extractedData.basics?.model) {
            metadata.model = extractedData.basics.model.trim();
        }

        // Extract price
        if (extractedData.price?.amount) {
            // Remove currency symbol and whitespace, keep only numbers and spaces
            const priceStr = extractedData.price.amount.replace(/[^0-9\s.,]/g, '').trim();

            // Check if price is in EUR (mobile.de) or PLN (otomoto.pl)
            if (extractedData.url && extractedData.url.includes('mobile.de')) {
                // mobile.de uses EUR
                metadata.price_eur = priceStr;
                console.log('[MetadataParser] mobile.de price (EUR):', priceStr);
            } else if (extractedData.url && extractedData.url.includes('otomoto.pl')) {
                // otomoto.pl uses PLN, convert to EUR
                metadata.price = priceStr;
                metadata.price_eur = this.convertPLNtoEUR(priceStr);
                console.log('[MetadataParser] Converted PLN price to EUR:', priceStr, '→', metadata.price_eur);
            } else {
                // Unknown source, assume PLN if extractedData.price.currency is not EUR
                if (extractedData.price?.currency === 'EUR') {
                    metadata.price_eur = priceStr;
                } else {
                    metadata.price = priceStr;
                    metadata.price_eur = this.convertPLNtoEUR(priceStr);
                }
            }
        }

        // Extract mileage from specs
        if (extractedData.specs) {
            // Look for mileage in specs (different site layouts may use different keys)
            for (const [key, value] of Object.entries(extractedData.specs)) {
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes('mileage') || lowerKey.includes('km') || lowerKey.includes('пробіг') || lowerKey.includes('mileage')) {
                    // Extract only numbers
                    const mileageNum = value.toString().replace(/[^0-9]/g, '');
                    if (mileageNum) {
                        metadata.mileage = mileageNum + ' km';
                        break;
                    }
                }
            }
        }

        // Extract year from specs or basics
        if (extractedData.specs) {
            for (const [key, value] of Object.entries(extractedData.specs)) {
                const lowerKey = key.toLowerCase();
                // Check for various year-related keys (handles "First Registration", "год", "year", etc.)
                if (lowerKey.includes('year') || lowerKey.includes('рік') || lowerKey.includes('eerste') ||
                    lowerKey.includes('registration') || lowerKey.includes('first') || lowerKey.includes('model year')) {
                    // Extract year - handle both YYYY and MM/YYYY formats
                    const yearMatch = value.toString().match(/\b(20\d{2})\b/);
                    if (yearMatch) {
                        metadata.year = yearMatch[1];
                        break;
                    }
                }
            }
        }

        // Fallback: try to extract year from title (often first thing)
        if (!metadata.year && extractedData.basics?.name) {
            const yearMatch = extractedData.basics.name.match(/\b(20\d{2})\b/);
            if (yearMatch) {
                metadata.year = yearMatch[1];
            }
        }

        console.log('[MetadataParser] Extracted metadata:', metadata);
        return metadata;
    }
};
