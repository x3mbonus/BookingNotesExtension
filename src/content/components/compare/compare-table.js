/**
 * Compare Table Component
 * Displays multiple cars side-by-side with their specs and features
 */

window.CompareTable = {
    /**
     * Create a comparison table for multiple cars
     * @param {Array} carList - Array of car objects with carId, metadata, features, and sort
     * @param {Array} allFeatures - Full feature list from FeaturesManager
     * @returns {HTMLElement} Table element
     */
    createCompareTable(carList, allFeatures = []) {
        const container = document.createElement('div');
        container.className = 'compare-table-container';
        container.style.cssText = `
            overflow-x: auto;
            padding: 12px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            color-scheme: light;
            color: #111;
        `;

        // Build table
        const table = document.createElement('table');
        table.className = 'compare-table';
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            background: white;
            color: #111;
        `;

        // Table header with car models
        const headerRow = table.createTHead().insertRow();
        headerRow.style.cssText = 'background: #f5f5f5; font-weight: bold; overflow: visible;';

        // First cell: empty or "Vehicle"
        let headerCell = headerRow.insertCell();
        headerCell.textContent = 'Vehicle';
        headerCell.style.cssText = 'padding: 4px 6px; border: 1px solid #ddd; min-width: 120px; text-align: left;';

        // Add car name columns to header (name + ID only, no photo)
        carList.forEach((car) => {
            const cell = headerRow.insertCell();
            const make = car.metadata?.make || 'Unknown';
            const model = car.metadata?.model || '';
            const url = car.metadata?.url || '';
            const id = car.carId || '';
            const isCurrent = car.isCurrentCar ? ' (← Current)' : '';

            cell.style.cssText = `
                padding: 4px 6px;
                border: ${car.isCurrentCar ? '3px solid #667eea' : '1px solid #ddd'};
                min-width: 140px;
                text-align: center;
                vertical-align: middle;
                background: ${this._getRatingColor(car.metadata?.sort)};
                font-weight: ${car.isCurrentCar ? 'bold' : 'normal'};
                font-size: 12px;
            `;

            if (url) {
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.style.cssText = 'color: #667eea; text-decoration: underline; font-weight: bold;';
                link.textContent = `${make} ${model}${isCurrent} ${id}`;
                cell.appendChild(link);
            } else {
                cell.textContent = `${make} ${model}${isCurrent} ${id}`;
            }
        });

        // Table body with specs and features
        const tbody = table.createTBody();

        // Photo row — first body row, full width per column
        this._addPhotoRow(tbody, carList);

        // Row: Note
        this._addNoteRow(tbody, carList);

        // Row: Rating
        this._addCompareRow(tbody, 'Рейтинг', carList, (car) => {
            const sortId = car.metadata?.sort;
            const sortLabel = {
                0: 'Best 🟢',
                1: 'Good 🟢',
                2: 'Fair 🟡',
                3: 'Poor 🟠',
                '-1': 'Excluded 🔴',
                'null': 'None'
            }[sortId === null ? 'null' : sortId?.toString()] || '—';
            return sortLabel;
        }, 0, false);

        // Metadata rows (matching Excel order)
        this._addCompareRow(tbody, 'Рік', carList,
            (car) => car.metadata?.year || '—', 0, false,
            (car) => window.UIComponents.getMetadataColor('year', car.metadata?.year));
        this._addCompareRow(tbody, 'Пробіг', carList,
            (car) => car.metadata?.mileage || '—', 0, false,
            (car) => window.UIComponents.getMetadataColor('mileage', car.metadata?.mileage));
        this._addCompareRow(tbody, 'Ціна (EUR)', carList, (car) => {
            const eur = car.metadata?.price_eur || '—';
            const pln = car.metadata?.price || '—';
            const title = pln !== '—' ? `PLN: ${pln}` : '';
            return `<span title="${title}">${eur}</span>`;
        }, 0, true,
            (car) => window.UIComponents.getMetadataColor('price_eur', car.metadata?.price_eur));
        this._addCompareRow(tbody, 'Тип сидінь', carList,
            (car) => car.metadata?.seat_type || '—', 0, false,
            (car) => window.UIComponents.getMetadataColor('seat_type', car.metadata?.seat_type));
        this._addCompareRow(tbody, 'Власників', carList,
            (car) => car.metadata?.owners || '—', 0, false,
            (car) => window.UIComponents.getMetadataColor('owners', car.metadata?.owners));
        this._addCompareRow(tbody, 'Фаркоп тип', carList,
            (car) => car.metadata?.tow_hitch_type || '—', 0, false,
            (car) => window.UIComponents.getMetadataColor('tow_hitch_type', car.metadata?.tow_hitch_type));

        // Features section header
        const featuresHeaderRow = tbody.insertRow();
        featuresHeaderRow.style.cssText = 'background: #e8f5e9; font-weight: bold;';
        const featuresHeader = featuresHeaderRow.insertCell();
        featuresHeader.textContent = 'FEATURES';
        featuresHeader.colSpan = carList.length + 1;
        featuresHeader.style.cssText = 'padding: 3px 6px; border: 1px solid #ddd; text-align: left; color: #2e7d32;';

        // Feature rows
        allFeatures.forEach(feature => {
            this._addCompareRow(tbody, feature.label, carList, (car) => {
                const state = car.features?.[feature.key];
                if (state === true) return '✓';
                if (state === false) return '✗';
                return '?';
            }, feature.priority, false, null, feature.cool_priority ?? null);
        });

        // Row + column highlight on click
        let activeRow = null, activeCol = -1;
        table.addEventListener('click', (e) => {
            const cell = e.target.closest('td, th');
            if (!cell) return;

            const rowEl = cell.parentElement;
            const colIdx = cell.cellIndex;
            const isSame = activeRow === rowEl && activeCol === colIdx;

            activeRow = isSame ? null : rowEl;
            activeCol = isSame ? -1 : colIdx;

            table.querySelectorAll('td, th').forEach(c => {
                const inRow = c.parentElement === activeRow;
                const inCol = activeCol !== -1 && c.cellIndex === activeCol;
                c.style.filter = (inRow || inCol) ? 'brightness(0.88)' : '';
            });
        });

        container.appendChild(table);
        return container;
    },

    /**
     * Photo row — first tbody row, clickable, uses stored photo_url
     */
    _addPhotoRow(tbody, carList) {
        const row = tbody.insertRow();

        const labelCell = row.insertCell();
        labelCell.textContent = 'Фото';
        labelCell.style.cssText = `
            padding: 3px 6px;
            border: 1px solid #ddd;
            font-weight: 500;
            background: #fafafa;
            min-width: 120px;
            text-align: left;
            vertical-align: middle;
        `;

        carList.forEach(car => {
            const cell = row.insertCell();
            const make = car.metadata?.make || '';
            const model = car.metadata?.model || '';
            const url = car.metadata?.url || '';
            const photoUrl = car.metadata?.photo_url || '';

            cell.style.cssText = `
                padding: 3px 6px;
                border: ${car.isCurrentCar ? '3px solid #667eea' : '1px solid #ddd'};
                background: ${this._getRatingColor(car.metadata?.sort)};
                text-align: center;
                vertical-align: middle;
            `;

            if (photoUrl) {
                const img = document.createElement('img');
                img.alt = `${make} ${model}`;
                img.style.cssText = `
                    width: 100%;
                    height: 100px;
                    object-fit: cover;
                    border-radius: 4px;
                    display: block;
                    background: #eee;
                    ${url ? 'cursor: pointer;' : ''}
                `;
                img.src = photoUrl;
                img.onerror = () => { img.style.display = 'none'; };
                if (url) img.onclick = () => window.open(url, '_blank');
                cell.appendChild(img);
            } else {
                cell.textContent = '—';
                cell.style.color = '#bbb';
            }
        });
    },

    /**
     * Add a note text row — each cell shows the car's note with its rating background color
     */
    _addNoteRow(tbody, carList) {
        const row = tbody.insertRow();
        row.style.cssText = 'border-bottom: 1px solid #ddd;';

        const labelCell = row.insertCell();
        labelCell.textContent = 'Нотатка';
        labelCell.style.cssText = `
            padding: 3px 6px;
            border: 1px solid #ddd;
            font-weight: 500;
            background: #fafafa;
            min-width: 120px;
            text-align: left;
            vertical-align: top;
        `;

        carList.forEach(car => {
            const cell = row.insertCell();
            const note = car.note || '';
            const ratingBg = this._getRatingColor(car.metadata?.sort);

            cell.style.cssText = `
                padding: 3px 6px;
                border: 1px solid #ddd;
                text-align: left;
                font-size: 11px;
                background: ${ratingBg};
                vertical-align: top;
                white-space: pre-wrap;
                max-width: 160px;
                word-break: break-word;
            `;
            cell.textContent = note || '—';
        });
    },

    /**
     * Add a row to the comparison table
     * @param {HTMLTableSectionElement} tbody - Table body
     * @param {string} label - Row label
     * @param {Array} carList - List of cars
     * @param {Function} getValue - Function to get display value for each car
     * @param {number} priority - Feature priority (0=low, 1=medium, 2=high) — affects feature cell color
     * @param {boolean} isHtml - If true, value is treated as HTML content
     * @param {Function} [getColor] - Optional fn(car) → { bg, text } to override cell color
     * @param {number|null} [coolPriority] - null = not cool; 1+ = cool level, gets super-green highlight when present
     */
    _addCompareRow(tbody, label, carList, getValue, priority = 0, isHtml = false, getColor = null, coolPriority = null) {
        const row = tbody.insertRow();
        row.style.cssText = 'border-bottom: 1px solid #ddd;';

        // Label cell
        const labelCell = row.insertCell();
        labelCell.textContent = label;
        labelCell.style.cssText = `
            padding: 3px 6px;
            border: 1px solid #ddd;
            font-weight: 500;
            background: #fafafa;
            min-width: 120px;
            text-align: left;
        `;

        // Value cells for each car
        carList.forEach((car, idx) => {
            const cell = row.insertCell();
            const value = getValue(car);

            // Get rating color for this car (apply to all cells in the column)
            const ratingBgColor = this._getRatingColor(car.metadata?.sort);

            // Style based on feature state (for features with ✓, ✗, ?)
            // Colors match side panel (UIComponents.createFeaturesGrid) — priority-aware
            if (value === '✓') {
                cell.textContent = '✓';
                const isCool = coolPriority > 0;
                cell.style.cssText = `
                    padding: 3px 6px;
                    border: 1px solid ${isCool ? '#388E3C' : '#ddd'};
                    text-align: center;
                    background: ${isCool ? '#A5D6A7' : '#E8F5E9'};
                    color: ${isCool ? '#1B5E20' : '#2e7d32'};
                    font-weight: bold;
                `;
            } else if (value === '✗') {
                // Missing: high priority → red, medium → yellow, low → white
                const missingBg = priority === 2 ? '#FFCDD2' : priority === 1 ? '#FFF9C4' : '#FFFFFF';
                const missingColor = priority === 2 ? '#c62828' : priority === 1 ? '#F57F17' : '#999';
                cell.textContent = '✗';
                cell.style.cssText = `
                    padding: 3px 6px;
                    border: 1px solid #ddd;
                    text-align: center;
                    background: ${missingBg};
                    color: ${missingColor};
                    font-weight: bold;
                `;
            } else if (value === '?') {
                // Unknown: high priority → red, medium/low → near-white
                const unknownBg = priority === 2 ? '#FFCDD2' : '#FAFAFA';
                const unknownColor = priority === 2 ? '#c62828' : '#bbb';
                cell.textContent = '?';
                cell.style.cssText = `
                    padding: 3px 6px;
                    border: 1px solid #ddd;
                    text-align: center;
                    background: ${unknownBg};
                    color: ${unknownColor};
                    font-weight: bold;
                `;
            } else {
                // Regular fields — use getColor if provided, otherwise fall back to rating color
                if (isHtml) {
                    cell.innerHTML = value;
                } else {
                    cell.textContent = value;
                }
                const color = getColor ? getColor(car) : null;
                const bg   = color?.bg   || ratingBgColor;
                const textColor = color?.text || '';
                cell.style.cssText = `
                    padding: 3px 6px;
                    border: 1px solid #ddd;
                    text-align: center;
                    font-size: 11px;
                    font-weight: 500;
                    background: ${bg};
                    ${textColor ? `color: ${textColor};` : ''}
                `;
            }
        });
    },

    /**
     * Get color for rating
     */
    _getRatingColor(sortId) {
        const colorMap = {
            0: '#e8f5e9',      // Best - light green
            1: '#f1f8e9',      // Good - very light green
            2: '#fff3e0',      // Fair - light orange
            3: '#ffe0b2',      // Poor - darker orange
            '-1': '#ffebee',   // Excluded - light red
        };
        return colorMap[sortId?.toString()] || '#ffffff';
    }
};
