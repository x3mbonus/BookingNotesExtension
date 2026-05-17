/**
 * Compare Table Component
 * Displays multiple properties side-by-side with their specs and features
 */

window.CompareTable = {
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

        const table = document.createElement('table');
        table.className = 'compare-table';
        table.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            background: white;
            color: #111;
        `;

        // Header row
        const headerRow = table.createTHead().insertRow();
        headerRow.style.cssText = 'background: #f5f5f5; font-weight: bold; overflow: visible;';

        let headerCell = headerRow.insertCell();
        headerCell.textContent = 'Property';
        headerCell.style.cssText = 'padding: 4px 6px; border: 1px solid #ddd; min-width: 120px; text-align: left;';

        carList.forEach((car) => {
            const cell = headerRow.insertCell();
            const name = car.metadata?.name || car.carId || 'Unknown';
            const url  = car.metadata?.url || '';
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
                link.textContent = `${name}${isCurrent}`;
                cell.appendChild(link);
            } else {
                cell.textContent = `${name}${isCurrent}`;
            }
        });

        const tbody = table.createTBody();

        this._addPhotoRow(tbody, carList);
        this._addNoteRow(tbody, carList);

        // Rating
        this._addCompareRow(tbody, 'Рейтинг', carList, (car) => {
            const sortId = car.metadata?.sort;
            return {
                0: 'Best 🟢', 1: 'Good 🟢', 2: 'Fair 🟡',
                3: 'Poor 🟠', '-1': 'Excluded 🔴', 'null': '—'
            }[sortId === null ? 'null' : sortId?.toString()] || '—';
        }, 0, false);

        // Accommodation metadata rows
        this._addCompareRow(tbody, 'Ціна/ніч', carList,
            (car) => car.metadata?.price_per_night || '—', 0, false,
            (car) => window.UIComponents?.getMetadataColor?.('price_per_night', car.metadata?.price_per_night));
        this._addCompareRow(tbody, 'Рейтинг сайту', carList,
            (car) => car.metadata?.site_rating || '—', 0, false,
            (car) => window.UIComponents?.getMetadataColor?.('site_rating', car.metadata?.site_rating));
        this._addCompareRow(tbody, 'Спалень', carList,
            (car) => car.metadata?.bedrooms || '—', 0, false,
            (car) => window.UIComponents?.getMetadataColor?.('bedrooms', car.metadata?.bedrooms));
        this._addCompareRow(tbody, 'Ліжок', carList,
            (car) => car.metadata?.beds || '—', 0, false,
            (car) => window.UIComponents?.getMetadataColor?.('beds', car.metadata?.beds));
        this._addCompareRow(tbody, 'До пляжу (км)', carList,
            (car) => car.metadata?.distance_beach || '—', 0, false,
            (car) => window.UIComponents?.getMetadataColor?.('distance_beach', car.metadata?.distance_beach));
        this._addCompareRow(tbody, 'До аеропорту (км)', carList,
            (car) => car.metadata?.distance_airport || '—', 0, false,
            (car) => window.UIComponents?.getMetadataColor?.('distance_airport', car.metadata?.distance_airport));
        this._addCompareRow(tbody, 'Локація', carList,
            (car) => car.metadata?.location || '—', 0, false);

        // Features section
        const featuresHeaderRow = tbody.insertRow();
        featuresHeaderRow.style.cssText = 'background: #e8f5e9; font-weight: bold;';
        const featuresHeader = featuresHeaderRow.insertCell();
        featuresHeader.textContent = 'AMENITIES';
        featuresHeader.colSpan = carList.length + 1;
        featuresHeader.style.cssText = 'padding: 3px 6px; border: 1px solid #ddd; text-align: left; color: #2e7d32;';

        allFeatures.forEach(feature => {
            this._addCompareRow(tbody, feature.label, carList, (car) => {
                const state = car.features?.[feature.key];
                if (state === true)  return '✓';
                if (state === false) return '✗';
                return '?';
            }, feature.priority, false, null, feature.cool_priority ?? null);
        });

        // Row + column highlight on click
        let activeRow = null, activeCol = -1;
        table.addEventListener('click', (e) => {
            const cell = e.target.closest('td, th');
            if (!cell) return;
            const rowEl  = cell.parentElement;
            const colIdx = cell.cellIndex;
            const isSame = activeRow === rowEl && activeCol === colIdx;
            activeRow = isSame ? null : rowEl;
            activeCol = isSame ? -1  : colIdx;
            table.querySelectorAll('td, th').forEach(c => {
                const inRow = c.parentElement === activeRow;
                const inCol = activeCol !== -1 && c.cellIndex === activeCol;
                c.style.filter = (inRow || inCol) ? 'brightness(0.88)' : '';
            });
        });

        container.appendChild(table);
        return container;
    },

    _addPhotoRow(tbody, carList) {
        const row = tbody.insertRow();

        const labelCell = row.insertCell();
        labelCell.textContent = 'Фото';
        labelCell.style.cssText = `
            padding: 3px 6px; border: 1px solid #ddd; font-weight: 500;
            background: #fafafa; min-width: 120px; text-align: left; vertical-align: middle;
        `;

        carList.forEach(car => {
            const cell = row.insertCell();
            const url      = car.metadata?.url || '';
            const photoUrl = car.metadata?.photo_url || '';

            cell.style.cssText = `
                padding: 3px 6px;
                border: ${car.isCurrentCar ? '3px solid #667eea' : '1px solid #ddd'};
                background: ${this._getRatingColor(car.metadata?.sort)};
                text-align: center; vertical-align: middle;
            `;

            if (photoUrl) {
                const img = document.createElement('img');
                img.alt = car.metadata?.name || '';
                img.style.cssText = `
                    width: 100%; height: 100px; object-fit: cover;
                    border-radius: 4px; display: block; background: #eee;
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

    _addNoteRow(tbody, carList) {
        const row = tbody.insertRow();
        row.style.cssText = 'border-bottom: 1px solid #ddd;';

        const labelCell = row.insertCell();
        labelCell.textContent = 'Нотатка';
        labelCell.style.cssText = `
            padding: 3px 6px; border: 1px solid #ddd; font-weight: 500;
            background: #fafafa; min-width: 120px; text-align: left; vertical-align: top;
        `;

        carList.forEach(car => {
            const cell = row.insertCell();
            cell.style.cssText = `
                padding: 3px 6px; border: 1px solid #ddd; text-align: left;
                font-size: 11px; background: ${this._getRatingColor(car.metadata?.sort)};
                vertical-align: top; white-space: pre-wrap;
                max-width: 160px; word-break: break-word;
            `;
            cell.textContent = car.note || '—';
        });
    },

    _addCompareRow(tbody, label, carList, getValue, priority = 0, isHtml = false, getColor = null, coolPriority = null) {
        const row = tbody.insertRow();
        row.style.cssText = 'border-bottom: 1px solid #ddd;';

        const labelCell = row.insertCell();
        labelCell.textContent = label;
        labelCell.style.cssText = `
            padding: 3px 6px; border: 1px solid #ddd; font-weight: 500;
            background: #fafafa; min-width: 120px; text-align: left;
        `;

        carList.forEach((car) => {
            const cell  = row.insertCell();
            const value = getValue(car);
            const ratingBgColor = this._getRatingColor(car.metadata?.sort);

            if (value === '✓') {
                const isCool = coolPriority > 0;
                cell.textContent = '✓';
                cell.style.cssText = `
                    padding: 3px 6px; border: 1px solid ${isCool ? '#388E3C' : '#ddd'};
                    text-align: center;
                    background: ${isCool ? '#A5D6A7' : '#E8F5E9'};
                    color: ${isCool ? '#1B5E20' : '#2e7d32'}; font-weight: bold;
                `;
            } else if (value === '✗') {
                const missingBg    = priority === 2 ? '#FFCDD2' : priority === 1 ? '#FFF9C4' : '#FFFFFF';
                const missingColor = priority === 2 ? '#c62828' : priority === 1 ? '#F57F17' : '#999';
                cell.textContent = '✗';
                cell.style.cssText = `
                    padding: 3px 6px; border: 1px solid #ddd; text-align: center;
                    background: ${missingBg}; color: ${missingColor}; font-weight: bold;
                `;
            } else if (value === '?') {
                const unknownBg    = priority === 2 ? '#FFCDD2' : '#FAFAFA';
                const unknownColor = priority === 2 ? '#c62828' : '#bbb';
                cell.textContent = '?';
                cell.style.cssText = `
                    padding: 3px 6px; border: 1px solid #ddd; text-align: center;
                    background: ${unknownBg}; color: ${unknownColor}; font-weight: bold;
                `;
            } else {
                if (isHtml) cell.innerHTML = value;
                else        cell.textContent = value;
                const color = getColor ? getColor(car) : null;
                cell.style.cssText = `
                    padding: 3px 6px; border: 1px solid #ddd; text-align: center;
                    font-size: 11px; font-weight: 500;
                    background: ${color?.bg || ratingBgColor};
                    ${color?.text ? `color: ${color.text};` : ''}
                `;
            }
        });
    },

    _getRatingColor(sortId) {
        return {
            0: '#e8f5e9', 1: '#f1f8e9', 2: '#fff3e0',
            3: '#ffe0b2', '-1': '#ffebee'
        }[sortId?.toString()] || '#ffffff';
    }
};
