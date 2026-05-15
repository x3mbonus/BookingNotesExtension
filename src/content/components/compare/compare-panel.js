/**
 * Compare Panel - Full UI for comparing selected cars
 * Shows cars filtered by rating with sorting and limits
 */

window.ComparePanel = {
    /**
     * Show comparison modal with filtering options
     */
    async showCompareModal(currentCarSort = null, currentCarId = null) {
        // Default filter: show sort 0 and 1, exclude sold
        let selectedRatings = [0, 1];
        let maxCars = 15;
        let includeSold = false;

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
        title.textContent = 'Compare Cars';
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

        // Max cars input
        const maxLabel = document.createElement('label');
        maxLabel.style.cssText = 'font-weight: bold; font-size: 12px; margin-left: auto;';
        maxLabel.textContent = 'Max cars: ';

        const maxInput = document.createElement('input');
        maxInput.type = 'number';
        maxInput.value = maxCars;
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
            maxCars = parseInt(maxInput.value) || 10;
            updateTable();
        };

        maxLabel.appendChild(maxInput);
        filterSection.appendChild(maxLabel);

        // Sold checkbox (default: unchecked = exclude sold)
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
        soldLabel.appendChild(document.createTextNode('🏷️ Include Sold'));
        filterSection.appendChild(soldLabel);

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
                const cars = await this._fetchAndSortCars(
                    selectedRatings,
                    maxCars,
                    currentCarId,
                    currentCarSort,
                    includeSold
                );

                if (cars.length === 0) {
                    body.innerHTML = '<p style="text-align: center; color: #999;">No cars to compare</p>';
                } else {
                    body.innerHTML = ''; // Clear loading message
                    const allFeatures = await window.FeaturesManager?.getFullFeaturesConfig?.() || [];
                    const table = window.CompareTable.createCompareTable(cars, allFeatures);
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
                        <strong>Sorted by:</strong> Rating (Best → Good → Fair → Poor → Excluded), then by Price
                    `;
                    body.appendChild(footer);
                }
            } catch (error) {
                console.error('[CAR-NOTES] Error loading comparison:', error);
                body.innerHTML = '<p style="color: red;">Error loading cars. Please try again.</p>';
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
     * Fetch and sort cars by rating (0, 1, 2, 3, -1) then by price
     * Current car without rating appears first
     * Features are fetched ONLY for the cars that will be displayed (after filter + limit).
     */
    async _fetchAndSortCars(selectedRatings, maxCars, currentCarId, currentCarSort, includeSold = false) {
        try {
            // STEP 1: Get all cars (metadata only — no features yet)
            const cars = await window.SupabaseApi?.getAllCars?.() || [];
            if (cars.length === 0) return [];

            // STEP 2: Map to lightweight objects (no features)
            const toCarObj = (car) => ({
                carId: car.car_id,
                isCurrentCar: car.car_id === currentCarId,
                sold: car.sold || false,
                note: car.text || '',
                features: {},
                metadata: {
                    make: car.make,
                    model: car.model,
                    url: car.url || '',
                    address: car.address || '',
                    price: parseFloat(car.price_eur || car.price || 0),
                    price_eur: car.price_eur,
                    price_pln: car.price,
                    mileage: car.mileage,
                    year: car.year,
                    seat_type: car.seat_type,
                    climate: car.climate,
                    owners: car.owners,
                    tow_hitch_type: car.tow_hitch_type,
                    sort: car.sort,
                    photo_url: car.photo_url || ''
                }
            });

            const currentCar = cars.find(c => c.car_id === currentCarId);
            const otherCars  = cars.filter(c => c.car_id !== currentCarId);

            // STEP 3: Filter by rating + sold, sort, then limit
            const ratingOrder = [0, 1, 2, 3, -1];
            const filteredCars = otherCars
                .filter(c => {
                    if (!includeSold && c.sold) return false;
                    const rating = c.sort === null ? 'null' : c.sort;
                    return selectedRatings.includes(rating);
                })
                .sort((a, b) => {
                    const aSort = a.sort, bSort = b.sort;
                    if (aSort === null && bSort === null) return (a.price_eur || 999999) - (b.price_eur || 999999);
                    if (aSort === null) return 1;
                    if (bSort === null) return -1;
                    const idxDiff = ratingOrder.indexOf(aSort) - ratingOrder.indexOf(bSort);
                    if (idxDiff !== 0) return idxDiff;
                    return (parseFloat(a.price_eur || 0) || 999999) - (parseFloat(b.price_eur || 0) || 999999);
                });

            // STEP 4: Apply maxCars limit BEFORE fetching features
            const limitedOthers = filteredCars.slice(0, currentCar ? maxCars - 1 : maxCars);
            const visibleCars   = [...(currentCar ? [currentCar] : []), ...limitedOthers];

            // STEP 5: Fetch features only for the cars we will display
            const featuresMap = await this._fetchAllCarFeatures(visibleCars.map(c => c.car_id));

            // STEP 6: Assemble final list with features
            const result = visibleCars.map(car => {
                const obj = toCarObj(car);
                obj.features = featuresMap[car.car_id] || {};
                return obj;
            });

            return result;
        } catch (error) {
            console.error('[CAR-NOTES] Error fetching cars:', error);
            return [];
        }
    },

    /**
     * Fetch features for all given car IDs in parallel using the proven SupabaseApi.getCarFeatures path.
     * @param {Array} carIds - Array of car IDs to fetch features for
     * @returns {Object} Map of { carId: { featureKey: state } }
     */
    async _fetchAllCarFeatures(carIds) {
        if (!carIds || carIds.length === 0) return {};

        const results = await Promise.all(
            carIds.map(async carId => {
                try {
                    const features = await window.SupabaseApi.getCarFeatures(carId);
                    return { carId, features: features || {} };
                } catch (err) {
                    console.warn('[ComparePanel._fetchAllCarFeatures] Error for car', carId, err);
                    return { carId, features: {} };
                }
            })
        );

        const carFeaturesMap = {};
        results.forEach(({ carId, features }) => {
            carFeaturesMap[carId] = features;
        });

        console.log('[ComparePanel._fetchAllCarFeatures] Loaded features for', Object.keys(carFeaturesMap).length, 'cars');
        return carFeaturesMap;
    }
};
