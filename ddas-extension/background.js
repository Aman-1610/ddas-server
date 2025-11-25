async function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get({
            downloaderId: 'default-user',
            desktopId: 'default-desktop',
            networkSharePath: 'D:\\Downloads' // Default, change in options
        }, (items) => {
            resolve(items);
        });
    });
}

/**
 * This is the new "brain" function.
 * Both L1 and L2 will call this.
 * It will only run if it has all the information it needs.
 */
async function runDuplicateCheck(downloadId) {
    const downloadInfo = inProgressDownloads.get(downloadId);

    // --- THIS IS THE FIX ---
    // We only run the check if:
    // 1. We are tracking the download
    // 2. We have the filename (from L1)
    // 3. We have the URL (from L2)
    // 4. We have not already run this check
    if (downloadInfo && downloadInfo.filename && downloadInfo.url && !downloadInfo.checked) {

        console.log(`(RUN_CHECK) All info ready for ${downloadId}. Pausing and running check...`);

        // Mark as checked to prevent this from running multiple times
        downloadInfo.checked = true;

        // Pause the download NOW, not in L2
        try {
            await chrome.downloads.pause(downloadId);
        } catch (e) {
            console.warn(`(RUN_CHECK) Could not pause download ${downloadId}.`, e.message);
            inProgressDownloads.delete(downloadId); // Clean up
            return;
        }

        try {
            let etag = null;
            let contentLength = null;
            try {
                // Skip metadata check for blob: and data: URLs as they are local/generated
                if (downloadInfo.url && !downloadInfo.url.startsWith('blob:') && !downloadInfo.url.startsWith('data:')) {
                    const metaResponse = await fetch(downloadInfo.url, { method: 'HEAD' });
                    etag = metaResponse.headers.get('etag');
                    contentLength = metaResponse.headers.get('content-length');
                } else {
                    console.log("(RUN_CHECK) Skipping metadata fetch for local/blob URL.");
                }
            } catch (metaError) {
                console.warn("(RUN_CHECK) Could not fetch metadata.", metaError.message);
            }

            downloadInfo.etag = etag;
            downloadInfo.contentLength = contentLength ? parseInt(contentLength, 10) : null;
            inProgressDownloads.set(downloadId, downloadInfo);

            const checkRequest = {
                originalUrl: downloadInfo.url,
                etag: etag,
                contentLength: contentLength ? parseInt(contentLength, 10) : null,
                fileName: downloadInfo.filename
            };

            const serverResponse = await fetch(CHECK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(checkRequest)
            });

            if (!serverResponse.ok) throw new Error(`Server responded with status: ${serverResponse.status}`);

            const responseData = await serverResponse.json();
            console.log("(RUN_CHECK) Server response (raw):", JSON.stringify(responseData));

            if (responseData.duplicate) {
                // --- DUPLICATE FOUND ---
                console.log("(RUN_CHECK) DUPLICATE found. Cancelling download.");
                const { fileInfo } = responseData;
                const notificationId = `ddas-alert-${Date.now()}`;
                const filePath = fileInfo.localStoragePath || "Unknown Path";
                const desktopId = fileInfo.desktopId || "an unknown computer";

                notificationLinks.set(notificationId, { path: filePath, url: downloadInfo.url });

                chrome.notifications.create(notificationId, {
                    type: 'basic', iconUrl: 'icon48.png',
                    title: 'Duplicate Download Cancelled',
                    message: `This file already exists on: ${desktopId}.`,
                    contextMessage: `Click to copy path: ${filePath}`,
                    buttons: [{ title: "Download Anyway" }],
                    requireInteraction: true
                });

                chrome.downloads.cancel(downloadId);
                inProgressDownloads.delete(downloadId); // Clean up

            } else {
                // --- NO DUPLICATE ---
                console.log("(RUN_CHECK) No duplicate found. Resuming download.");
                await chrome.downloads.resume(downloadId);
            }

        } catch (error) {
            console.error("(RUN_CHECK) Error during duplicate check.", error);

            // Notify user about server connection failure
            chrome.notifications.create(`ddas-error-${Date.now()}`, {
                type: 'basic',
                iconUrl: 'icon48.png',
                title: 'DDAS Server Offline',
                message: 'Could not connect to duplicate check server. Download allowed.',
                priority: 2
            });

            try {
                await chrome.downloads.resume(downloadId); // Resume on error
            } catch (resumeError) {
                console.error("(RUN_CHECK) Failed to resume download after error:", resumeError.message);
                inProgressDownloads.delete(downloadId);
            }
        }
    } else {
        // Not ready to check yet. One of the listeners is still missing.
        if (downloadInfo) {
            console.log(`(RUN_CHECK) Check for ${downloadId} not ready. Missing: ${downloadInfo.filename ? '' : 'filename'} ${downloadInfo.url ? '' : 'url'}`);
        }
    }
}


console.log("DDAS Extension loaded. Awaiting downloads...");

// Set to track URLs that the user has explicitly allowed to be downloaded despite duplicates
const allowedUrls = new Set();

// Listener 1: Get the filename.
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    if (downloadItem.state === 'in_progress') {
        // Check if this URL is in the allowed list
        if (allowedUrls.has(downloadItem.url)) {
            console.log(`(L1) URL ${downloadItem.url} is allowed. Skipping duplicate check.`);
            // We don't track it in inProgressDownloads so runDuplicateCheck won't fire
            return;
        }

        console.log(`(L1) Filename determined: ${downloadItem.filename}`);
        let downloadInfo = inProgressDownloads.get(downloadItem.id) || {};
        downloadInfo.filename = downloadItem.filename;
        inProgressDownloads.set(downloadItem.id, downloadInfo);

        // Try to run the check, in case L2 already ran
        runDuplicateCheck(downloadItem.id);
    }
});

// Listener 2: The download is created.
chrome.downloads.onCreated.addListener(async (downloadItem) => {
    if (downloadItem.state === 'in_progress') {
        // Check if this URL is in the allowed list
        if (allowedUrls.has(downloadItem.url)) {
            console.log(`(L2) URL ${downloadItem.url} is allowed. Skipping duplicate check.`);
            // Remove from set so future downloads are checked again (optional, depending on desired behavior)
            allowedUrls.delete(downloadItem.url);
            return;
        }

        console.log(`(L2) Download created: ${downloadItem.id}.`);
        let downloadInfo = inProgressDownloads.get(downloadItem.id) || {};
        downloadInfo.url = downloadItem.url;
        inProgressDownloads.set(downloadItem.id, downloadInfo);

        // Try to run the check, in case L1 already ran
        runDuplicateCheck(downloadItem.id);
    }
});

// Listener 3: This listener is now ONLY for logging completed downloads.
chrome.downloads.onChanged.addListener(async (delta) => {

    // A. A download was COMPLETED (after we resumed it)
    if (delta.state && delta.state.current === 'complete') {
        const downloadInfo = inProgressDownloads.get(delta.id);

        // Note: If we allowed the download via "Force Download", downloadInfo will be undefined here
        // because we didn't track it. That means we WON'T log forced downloads to the server.
        // This is actually good behavior - we don't want to log duplicates.

        if (downloadInfo) {
            console.log(`(L3-COMPLETE) Download ${delta.id} completed. Logging to server.`);

            const settings = await getSettings();
            let finalPath = `${settings.networkSharePath}\\${downloadInfo.filename}`;

            const logRequest = {
                originalUrl: downloadInfo.url,
                fileName: downloadInfo.filename,
                fileHash: null,
                etag: downloadInfo.etag,
                contentLength: downloadInfo.contentLength,
                localStoragePath: finalPath,
                downloaderId: settings.downloaderId,
                desktopId: settings.desktopId
            };

            try {
                const logResponse = await fetch(LOG_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(logRequest)
                });
                if (!logResponse.ok) throw new Error(`Server responded with status: ${logResponse.status}`);
                console.log("(L3-COMPLETE) Successfully logged new file to the server.");

            } catch (error) {
                console.error("(L3-COMPLETE) Error logging file:", error);
            } finally {
                inProgressDownloads.delete(delta.id);
            }
        }
    }

    // B. A download was INTERRUPTED (by user or system)
    else if (delta.state && (delta.state.current === 'interrupted' || delta.state.current === 'user_canceled')) {
        if (inProgressDownloads.has(delta.id)) {
            console.log(`(L3-INTERRUPTED) Download ${delta.id} was interrupted/cancelled. Removing from tracking.`);
            inProgressDownloads.delete(delta.id);
        }
    }
});

// Listener 4: The user clicks on one of our notifications.
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationLinks.has(notificationId)) {
        const data = notificationLinks.get(notificationId);
        const path = data.path || data; // Handle legacy string format if any

        navigator.clipboard.writeText(path).then(() => {
            console.log('Path copied to clipboard:', path);
        }).catch(err => {
            console.error('Failed to copy path:', err);
        });

        chrome.notifications.clear(notificationId);
        notificationLinks.delete(notificationId);
    }
});

// Listener 5: Handle button clicks (e.g., "Download Anyway")
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationLinks.has(notificationId)) {
        const data = notificationLinks.get(notificationId);

        if (buttonIndex === 0) { // "Download Anyway" button
            console.log(`(USER_ACTION) User chose to force download: ${data.url}`);

            // Add to allowed list
            allowedUrls.add(data.url);

            // Re-initiate download
            chrome.downloads.download({ url: data.url }, (downloadId) => {
                console.log(`(USER_ACTION) Restarted download as ID: ${downloadId}`);
            });
        }

        chrome.notifications.clear(notificationId);
        notificationLinks.delete(notificationId);
    }
});