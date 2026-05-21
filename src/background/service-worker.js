/**
 * Background Service Worker
 * Handles cross-origin requests on behalf of content scripts.
 * Background scripts have host_permissions and are not subject to CORS.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Only accept messages from this extension's own scripts
    if (sender.id !== chrome.runtime.id) return;

    if (message.type === 'FETCH_OG_IMAGE') {
        fetchOgImage(message.url).then(sendResponse);
        return true; // keep message channel open for async response
    }
});

/**
 * Fetch og:image from a URL by streaming the response and aborting early.
 * @param {string} url
 * @returns {Promise<string|null>}
 */
async function fetchOgImage(url) {
    console.log('[SW.fetchOgImage] Fetching:', url);
    const controller = new AbortController();
    let imageUrl = null;
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let chunk = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunk += decoder.decode(value, { stream: true });

            const match =
                chunk.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                chunk.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

            if (match) {
                imageUrl = match[1];
                controller.abort();
                break;
            }

            if (chunk.length > 100_000) {
                controller.abort();
                break;
            }
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.warn('[SW.fetchOgImage] Error:', err.message, url);
        }
    }
    console.log('[SW.fetchOgImage] Result:', imageUrl ? imageUrl.slice(0, 60) : 'null', '←', url.slice(0, 60));
    return imageUrl;
}
