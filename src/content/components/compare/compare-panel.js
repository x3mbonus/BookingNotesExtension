/**
 * Compare Panel - Full UI for comparing selected properties
 * Shows properties filtered by rating with sorting and limits
 */

window.ComparePanel = {
    /**
     * Show comparison modal with filtering options
     */
    async showCompareModal(currentPropertySort = null, currentPropertyId = null) {
        // Default filter: show sort 0 and 1, exclude sold
        let selectedRatings = [0, 1];
        let maxProperties = 15;
        let includeSold = false;

        const activeTrip = await new Promise(resolve =>
            chrome.storage.local.get(['currentTrip'], r => resolve(r.currentTrip || null))
        );
        // Default: filter to current trip if one is set, otherwise show all
        let tripFilter = activeTrip;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'compare-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2147483647;
        `;

        // Modal content
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            max-width: 95%;
            max-height: 95vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            color-scheme: light;
            color: #111;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 16px;
            border-bottom: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f5f5f5;
            flex-shrink: 0;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Compare Properties';
        title.style.cssText = 'margin: 0; font-size: 18px;';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeBtn.onclick = () => modal.remove();

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Filter section
        const filterSection = document.createElement('div');
        filterSection.style.cssText = `
            padding: 16px;
            background: #fafafa;
            border-bottom: 1px solid #ddd;
            display: flex;
            gap: 20px;
            align-items: center;
            flex-wrap: wrap;
            flex-shrink: 0;
        `;

        // Rating checkboxes
        const ratingLabel = document.createElement('div');
        ratingLabel.textContent = 'Ratings:';
        ratingLabel.style.cssText = 'font-weight: bold; font-size: 12px;';
        filterSection.appendChild(ratingLabel);

        const ratings = [
            { value: 0, label: '🟢 Best', color: '#e8f5e9' },
            { value: 1, label: '🟢 Good', color: '#f1f8e9' },
            { value: 2, label: '🟡 Fair', color: '#fff3e0' },
            { value: 3, label: '🟠 Poor', color: '#ffe0b2' },
            { value: -1, label: '🔴 Excluded', color: '#ffebee' },
            { value: 'null', label: '⚪ Unrated', color: '#f0f0f0' }
        ];

        ratings.forEach(rating => {
            const checkboxContainer = document.createElement('label');
            checkboxContainer.style.cssText = `
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 4px;
                background: ${rating.color};
            `;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = rating.value;
            checkbox.checked = selectedRatings.includes(rating.value);
            checkbox.onchange = () => {
                if (checkbox.checked) {
                    if (!selectedRatings.includes(rating.value)) {
                        selectedRatings.push(rating.value);
                    }
                } else {
                    selectedRatings = selectedRatings.filter(r => r !== rating.value);
                }
                updateTable();
            };
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(document.createTextNode(rating.label));
            filterSection.appendChild(checkboxContainer);
        });

        // Max properties input
        const maxLabel = document.createElement('label');
        maxLabel.style.cssText = 'font-weight: bold; font-size: 12px; margin-left: auto;';
        maxLabel.textContent = 'Limit: ';

        const maxInput = document.createElement('input');
        maxInput.type = 'number';
        maxInput.value = maxProperties;
        maxInput.min = 1;
        maxInput.max = 200;
        maxInput.style.cssText = `
            width: 50px;
            padding: 4px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 12px;
        `;
        maxInput.onchange = () => {
            maxProperties = parseInt(maxInput.value) || 10;
            updateTable();
        };

        maxLabel.appendChild(maxInput);
        filterSection.appendChild(maxLabel);

        // Unavailable checkbox
        const soldLabel = document.createElement('label');
        soldLabel.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            background: #ffebee;
            color: #c62828;
            font-weight: 600;
        `;
        const soldCheckbox = document.createElement('input');
        soldCheckbox.type = 'checkbox';
        soldCheckbox.checked = includeSold;
        soldCheckbox.onchange = () => {
            includeSold = soldCheckbox.checked;
            updateTable();
        };
        soldLabel.appendChild(soldCheckbox);
        soldLabel.appendChild(document.createTextNode('🚫 Include Unavailable'));
        filterSection.appendChild(soldLabel);

        // Trip filter row
        if (activeTrip) {
            const tripRow = document.createElement('div');
            tripRow.style.cssText = `
                width: 100%;
                display: flex;
                align-items: center;
                gap: 8px;
                padding-top: 8px;
                border-top: 1px solid #e8e8e8;
                flex-wrap: wrap;
            `;

            const tripRowLabel = document.createElement('span');
            tripRowLabel.textContent = 'Trip:';
            tripRowLabel.style.cssText = 'font-weight: bold; font-size: 12px;';
            tripRow.appendChild(tripRowLabel);

            const makeTrip = (label, value, checked) => {
                const lbl = document.createElement('label');
                lbl.style.cssText = `
                    display: flex; align-items: center; gap: 4px;
                    cursor: pointer; font-size: 12px;
                    padding: 4px 8px; border-radius: 4px;
                    background: ${value === null ? '#f0f0f0' : '#e8eaf6'};
                `;
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'tripFilter';
                radio.value = value === null ? '__all__' : value;
                radio.checked = checked;
                radio.onchange = () => {
                    tripFilter = value;
                    updateTable();
                };
                lbl.appendChild(radio);
                lbl.appendChild(document.createTextNode(label));
                return lbl;
            };

            tripRow.appendChild(makeTrip('All trips', null, tripFilter === null));
            tripRow.appendChild(makeTrip(`✈ ${activeTrip}`, activeTrip, tripFilter === activeTrip));
            filterSection.appendChild(tripRow);
        }

        // Body
        const body = document.createElement('div');
        body.style.cssText = `
            padding: 16px;
            overflow-y: auto;
            overflow-x: auto;
            flex: 1;
        `;

        // Update table function
        const updateTable = async () => {
            body.innerHTML = '<p style="text-align: center; color: #999;">Loading...</p>';
            try {
                const props = await this._fetchAndSortProps(
                    selectedRatings,
                    maxProperties,
                    currentPropertyId,
                    currentPropertySort,
                    includeSold,
                    tripFilter
                );

                if (props.length === 0) {
                    body.innerHTML = '<p style="text-align: center; color: #999;">No properties to compare</p>';
                } else {
                    body.innerHTML = ''; // Clear loading message
                    const allFeatures = await window.FeaturesManager?.getFullFeaturesConfig?.() || [];
                    const table = window.CompareTable.createCompareTable(props, allFeatures);
                    body.appendChild(table);

                    // Info footer
                    const footer = document.createElement('div');
                    footer.style.cssText = `
                        margin-top: 16px;
                        padding: 12px;
                        background: #f5f5f5;
                        border-radius: 4px;
                        font-size: 12px;
                        color: #666;
                    `;
                    footer.innerHTML = `
                        <strong>Legend:</strong><br>
                        ✓ = Feature confirmed | ✗ = Feature not present | ? = Feature unknown<br>
                        <strong>Sorted by:</strong> Rating (Best → Good → Fair → Poor → Excluded)
                    `;
                    body.appendChild(footer);
                }
            } catch (error) {
                console.error('[STAY-NOTES] Error loading comparison:', error);
                body.innerHTML = '<p style="color: red;">Error loading properties. Please try again.</p>';
            }
        };

        content.appendChild(header);
        content.appendChild(filterSection);
        content.appendChild(body);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        // Load initial table
        await updateTable();

        return modal;
    },

    /**
     * Fetch and sort properties by rating (0, 1, 2, 3, -1) then by price
     * Current property without rating appears first
     * Features are fetched ONLY for the properties that will be displayed (after filter + limit).
     */
    async _fetchAndSortProps(selectedRatings, maxProperties, currentPropertyId, currentPropertySort, includeSold = false, tripFilter = null) {
        try {
            // STEP 1: Get all properties (metadata only — no features yet)
            const props = await window.SupabaseApi?.getAllProperties?.() || [];
            if (props.length === 0) return [];

            // STEP 2: Map to lightweight objects (no features)
            const toPropObj = (prop) => ({
                propertyId: prop.property_id,
                isCurrentProperty: prop.property_id === currentPropertyId,
                sold: prop.unavailable || false,
                trip: prop.trip || null,
                note: prop.text || '',
                features: {},
                metadata: {
                    name: prop.name,
                    url: prop.url || '',
                    location: prop.location || '',
                    price: parseFloat(((prop.price_booking || prop.price_airbnb || '0')).toString().replace(/[^\d.]/g, '')) || 0,
                    price_booking: prop.price_booking,
                    price_airbnb: prop.price_airbnb,
                    site_rating: prop.site_rating,
                    property_type: prop.property_type,
                    bedrooms_count: prop.bedrooms_count,
                    sleeping_places: prop.sleeping_places,
                    bathrooms_count: prop.bathrooms_count,
                    toilets_count: prop.toilets_count,
                    toilet_inside: prop.toilet_inside,
                    heating_type: prop.heating_type,
                    last_review_date: prop.last_review_date,
                    cancellation_policy: prop.cancellation_policy,
                    sort: prop.sort,
                    photo_url: prop.photo_url || ''
                }
            });

            const currentProp = props.find(p => p.property_id === currentPropertyId);
            const otherProps  = props.filter(p => p.property_id !== currentPropertyId);

            // STEP 3: Filter by rating + unavailable + trip, sort, then limit
            const ratingOrder = [0, 1, 2, 3, -1];
            const filteredProps = otherProps
                .filter(p => {
                    if (!includeSold && p.unavailable) return false;
                    const rating = p.sort === null ? 'null' : p.sort;
                    if (!selectedRatings.includes(rating)) return false;
                    if (tripFilter !== null && (p.trip || null) !== tripFilter) return false;
                    return true;
                })
                .sort((a, b) => {
                    const aSort = a.sort, bSort = b.sort;
                    if (aSort === null && bSort === null) return 0;
                    if (aSort === null) return 1;
                    if (bSort === null) return -1;
                    return ratingOrder.indexOf(aSort) - ratingOrder.indexOf(bSort);
                });

            // STEP 4: Apply limit BEFORE fetching features
            const limitedOthers = filteredProps.slice(0, currentProp ? maxProperties - 1 : maxProperties);
            const visibleProps  = [...(currentProp ? [currentProp] : []), ...limitedOthers];

            // STEP 5: Fetch features only for the properties we will display
            const featuresMap = await this._fetchAllFeatures(visibleProps.map(p => p.property_id));

            // STEP 6: Assemble final list with features
            const result = visibleProps.map(prop => {
                const obj = toPropObj(prop);
                obj.features = featuresMap[prop.property_id] || {};
                return obj;
            });

            return result;
        } catch (error) {
            console.error('[STAY-NOTES] Error fetching properties:', error);
            return [];
        }
    },

    /**
     * Fetch features for all given property IDs in parallel.
     * @param {Array} propertyIds - Array of property IDs to fetch features for
     * @returns {Object} Map of { propertyId: { featureKey: state } }
     */
    async _fetchAllFeatures(propertyIds) {
        if (!propertyIds || propertyIds.length === 0) return {};

        const results = await Promise.all(
            propertyIds.map(async propertyId => {
                try {
                    const features = await window.SupabaseApi.getPropertyFeatures(propertyId);
                    return { propertyId, features: features || {} };
                } catch (err) {
                    console.warn('[ComparePanel._fetchAllFeatures] Error for property', propertyId, err);
                    return { propertyId, features: {} };
                }
            })
        );

        const featuresMap = {};
        results.forEach(({ propertyId, features }) => {
            featuresMap[propertyId] = features;
        });

        console.log('[ComparePanel._fetchAllFeatures] Loaded features for', Object.keys(featuresMap).length, 'properties');
        return featuresMap;
    }
};
