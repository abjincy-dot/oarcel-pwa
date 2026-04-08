function openPDF(dataUrl, fileName) {
    try {
        // Fetch the blob from data URL properly
        fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                const folderPath = currentPath.join("/");
                addToRecent(fileName, folderPath, dataUrl);
                window.open(blobUrl, '_blank');
                setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
                showToast(`Opening ${fileName}...`);
            })
            .catch(err => {
                console.error('Fetch error:', err);
                showToast('Failed to open PDF', true);
            });
    } catch (err) {
        console.error('Error opening PDF:', err);
        showToast('Failed to open PDF', true);
    }
}