// Property Data Extraction UI - Shows overlay with export/copy options on detail pages

window.ExtractionUI = {
    /**
     * Show extraction panel on detail pages
     */
    showExtractionPanel() {
        // Check if panel already exists
        if (document.getElementById('property-notes-extractor-panel')) {
            return;
        }

        // Only show on detail pages
        if (!this.isDetailPage()) {
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'property-notes-extractor-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border: 2px solid #667eea;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            min-width: 200px;
        `;

        const title = document.createElement('div');
        title.style.cssText = 'font-weight: bold; margin-bottom: 8px; color: #333; font-size: 12px;';
        title.textContent = 'Extract Property Data';
        panel.appendChild(title);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

        // Copy as JSON button
        const copyJsonBtn = document.createElement('button');
        copyJsonBtn.textContent = '📋 Copy JSON';
        copyJsonBtn.style.cssText = `
            padding: 6px 10px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: background 0.2s;
        `;
        copyJsonBtn.onmouseover = () => copyJsonBtn.style.background = '#5568d3';
        copyJsonBtn.onmouseout = () => copyJsonBtn.style.background = '#667eea';
        copyJsonBtn.onclick = async () => {
            const result = await window.copyPropertyDataToClipboard?.('json');
            if (result?.success) {
                copyJsonBtn.textContent = '✅ Copied!';
                setTimeout(() => copyJsonBtn.textContent = '📋 Copy JSON', 2000);
            }
        };
        buttonContainer.appendChild(copyJsonBtn);

        // Copy as Text button
        const copyTextBtn = document.createElement('button');
        copyTextBtn.textContent = '📝 Copy Text';
        copyTextBtn.style.cssText = `
            padding: 6px 10px;
            background: #764ba2;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: background 0.2s;
        `;
        copyTextBtn.onmouseover = () => copyTextBtn.style.background = '#65408a;';
        copyTextBtn.onmouseout = () => copyTextBtn.style.background = '#764ba2';
        copyTextBtn.onclick = async () => {
            const result = await window.copyPropertyDataToClipboard?.('text');
            if (result?.success) {
                copyTextBtn.textContent = '✅ Copied!';
                setTimeout(() => copyTextBtn.textContent = '📝 Copy Text', 2000);
            }
        };
        buttonContainer.appendChild(copyTextBtn);

        // Download JSON button
        const downloadJsonBtn = document.createElement('button');
        downloadJsonBtn.textContent = '⬇️ JSON File';
        downloadJsonBtn.style.cssText = `
            padding: 6px 10px;
            background: #4caf50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: background 0.2s;
        `;
        downloadJsonBtn.onmouseover = () => downloadJsonBtn.style.background = '#45a049';
        downloadJsonBtn.onmouseout = () => downloadJsonBtn.style.background = '#4caf50';
        downloadJsonBtn.onclick = () => window.downloadPropertyData?.('json');
        buttonContainer.appendChild(downloadJsonBtn);

        // Download Text button
        const downloadTextBtn = document.createElement('button');
        downloadTextBtn.textContent = '⬇️ Text File';
        downloadTextBtn.style.cssText = `
            padding: 6px 10px;
            background: #ff9800;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: background 0.2s;
        `;
        downloadTextBtn.onmouseover = () => downloadTextBtn.style.background = '#e68900';
        downloadTextBtn.onmouseout = () => downloadTextBtn.style.background = '#ff9800';
        downloadTextBtn.onclick = () => window.downloadPropertyData?.('text');
        buttonContainer.appendChild(downloadTextBtn);

        panel.appendChild(buttonContainer);

        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            top: 4px;
            right: 4px;
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999;
        `;
        closeBtn.onclick = () => panel.remove();
        panel.appendChild(closeBtn);

        document.body.appendChild(panel);
    },

    /**
     * Check if current page is a detail page
     */
    isDetailPage() {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        const search = window.location.search;

        if (hostname.includes('mobile.de')) {
            return pathname.includes('/auto-inserat/') ||
                   pathname.includes('/details.html') ||
                   (pathname.endsWith('.html') && search.includes('id=') && !pathname.includes('/search'));
        } else if (hostname.includes('otomoto.pl')) {
            return pathname.includes('/oferta/') && pathname.endsWith('.html');
        }

        return false;
    }
};

// ℹ️ DISABLED: Unified panel is now shown directly by site adapters (mobile-de.js, otomoto.js)
// This was causing duplicate panel calls with undefined propertyId
// The panel is initialized via router.handleDetailPage() instead
