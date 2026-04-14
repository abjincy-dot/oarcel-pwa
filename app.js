// ==================== INDEXEDDB CORE ====================
const DB_NAME = 'OarcelDB';
const DB_VERSION = 3;
let db = null;
let allFiles = {};
let fileSystem = {};
let currentPath = [];
let isSearchMode = false;

// ==================== PDF.JS VIRTUAL SCROLLING VIEWER ====================
// Load PDF.js library dynamically
function loadPDFJS() {
    return new Promise((resolve, reject) => {
        if (window.pdfjsLib) {
            resolve(window.pdfjsLib);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            resolve(window.pdfjsLib);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function openPDFEmbedded(dataUrl, fileName) {
    // Load PDF.js
    const pdfjsLib = await loadPDFJS();
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'pdfModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #1a1a2e;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        animation: fadeIn 0.3s ease;
    `;
    
    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 20px;
        background: #0f0f1a;
        color: white;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        flex-wrap: wrap;
        gap: 10px;
        flex-shrink: 0;
        z-index: 10;
    `;
    
    // File name
    const fileNameSpan = document.createElement('span');
    fileNameSpan.style.cssText = `
        font-size: 0.9rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 250px;
    `;
    fileNameSpan.innerHTML = `<i class="fas fa-file-pdf" style="color: #ef4444; margin-right: 8px;"></i>${escapeHtml(fileName)}`;
    
    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.style.cssText = `
        font-size: 0.8rem;
        background: rgba(255,255,255,0.1);
        padding: 4px 12px;
        border-radius: 20px;
    `;
    pageInfo.innerHTML = 'Loading...';
    
    // Zoom controls
    const zoomControls = document.createElement('div');
    zoomControls.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: center;
    `;
    
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '<i class="fas fa-search-minus"></i>';
    zoomOutBtn.style.cssText = `
        padding: 6px 10px;
        background: rgba(255,255,255,0.1);
        border: none;
        border-radius: 20px;
        color: white;
        cursor: pointer;
        font-size: 0.8rem;
        transition: all 0.2s;
    `;
    
    const zoomLevel = document.createElement('span');
    zoomLevel.style.cssText = `
        font-size: 0.8rem;
        min-width: 45px;
        text-align: center;
    `;
    zoomLevel.innerHTML = '100%';
    
    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '<i class="fas fa-search-plus"></i>';
    zoomInBtn.style.cssText = `
        padding: 6px 10px;
        background: rgba(255,255,255,0.1);
        border: none;
        border-radius: 20px;
        color: white;
        cursor: pointer;
        font-size: 0.8rem;
        transition: all 0.2s;
    `;
    
    const resetZoomBtn = document.createElement('button');
    resetZoomBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
    resetZoomBtn.style.cssText = `
        padding: 6px 10px;
        background: rgba(255,255,255,0.1);
        border: none;
        border-radius: 20px;
        color: white;
        cursor: pointer;
        font-size: 0.8rem;
        transition: all 0.2s;
    `;
    resetZoomBtn.title = 'Reset Zoom';
    
    zoomControls.appendChild(zoomOutBtn);
    zoomControls.appendChild(zoomLevel);
    zoomControls.appendChild(zoomInBtn);
    zoomControls.appendChild(resetZoomBtn);
    
    // Right section buttons
    const rightSection = document.createElement('div');
    rightSection.style.cssText = `
        display: flex;
        gap: 8px;
    `;
    
    const downloadBtn = document.createElement('button');
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
    downloadBtn.style.cssText = `
        padding: 6px 14px;
        background: rgba(59, 130, 246, 0.8);
        border: none;
        border-radius: 20px;
        color: white;
        cursor: pointer;
        font-size: 0.8rem;
        transition: all 0.2s;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i> Close';
    closeBtn.style.cssText = `
        padding: 6px 14px;
        background: rgba(239, 68, 68, 0.8);
        border: none;
        border-radius: 20px;
        color: white;
        cursor: pointer;
        font-size: 0.8rem;
        transition: all 0.2s;
    `;
    
    rightSection.appendChild(downloadBtn);
    rightSection.appendChild(closeBtn);
    
    toolbar.appendChild(fileNameSpan);
    toolbar.appendChild(pageInfo);
    toolbar.appendChild(zoomControls);
    toolbar.appendChild(rightSection);
    
    // Scrollable container
    const scrollContainer = document.createElement('div');
    scrollContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        overflow-x: auto;
        background: #1a1a2e;
        -webkit-overflow-scrolling: touch;
        position: relative;
    `;
    
    // Container for pages
    const pagesContainer = document.createElement('div');
    pagesContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        padding: 20px;
    `;
    scrollContainer.appendChild(pagesContainer);
    
    modal.appendChild(toolbar);
    modal.appendChild(scrollContainer);
    document.body.appendChild(modal);
    
    // PDF rendering variables
    let pdfDoc = null;
    let pageCanvases = new Map(); // Store rendered canvases
    let pageHeight = 0;
    let currentScale = 1.0;
    let totalPages = 0;
    let isRendering = false;
    let renderQueue = [];
    
    // Get page dimensions
    async function getPageHeight(pageNum) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        return viewport.height;
    }
    
    // Render a single page
    async function renderPage(pageNum, scale, force = false) {
        if (pageCanvases.has(pageNum) && !force) return pageCanvases.get(pageNum);
        
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: scale });
            
            // Create or get existing wrapper
            let wrapper = pagesContainer.children[pageNum - 1];
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                `;
                
                const pageLabel = document.createElement('div');
                pageLabel.style.cssText = `
                    font-size: 0.7rem;
                    color: #888;
                `;
                pageLabel.innerHTML = `Page ${pageNum} of ${totalPages}`;
                wrapper.appendChild(pageLabel);
                
                const canvas = document.createElement('canvas');
                canvas.style.cssText = `
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    background: white;
                    display: block;
                `;
                wrapper.appendChild(canvas);
                pagesContainer.appendChild(wrapper);
                
                pageCanvases.set(pageNum, { canvas, wrapper, pageNum });
            }
            
            const { canvas } = pageCanvases.get(pageNum);
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = viewport.width + 'px';
            canvas.style.height = viewport.height + 'px';
            
            const renderContext = {
                canvasContext: canvas.getContext('2d'),
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            return { canvas, wrapper };
        } catch (err) {
            console.error(`Error rendering page ${pageNum}:`, err);
            return null;
        }
    }
    
    // Render visible pages only
    async function renderVisiblePages() {
        if (!scrollContainer || !pagesContainer) return;
        
        const scrollTop = scrollContainer.scrollTop;
        const containerHeight = scrollContainer.clientHeight;
        const viewportTop = scrollTop;
        const viewportBottom = scrollTop + containerHeight;
        
        // Calculate which pages are visible
        let visiblePages = [];
        let currentTop = 0;
        
        for (let i = 1; i <= totalPages; i++) {
            const pageBottom = currentTop + (pageHeight * currentScale) + 40; // +40 for gap and label
            
            if (pageBottom >= viewportTop && currentTop <= viewportBottom) {
                visiblePages.push(i);
            }
            
            currentTop = pageBottom;
            if (currentTop > viewportBottom + 1000) break; // Stop if we're far beyond viewport
        }
        
        // Add buffer pages (one above, one below)
        const pagesToRender = new Set();
        visiblePages.forEach(p => {
            pagesToRender.add(p);
            if (p > 1) pagesToRender.add(p - 1);
            if (p < totalPages) pagesToRender.add(p + 1);
        });
        
        // Render visible pages
        for (const pageNum of pagesToRender) {
            if (!pageCanvases.has(pageNum)) {
                await renderPage(pageNum, currentScale);
            } else if (pageCanvases.get(pageNum).canvas.width !== pageCanvases.get(pageNum).canvas.clientWidth * (window.devicePixelRatio || 1)) {
                // Re-render if scale changed
                await renderPage(pageNum, currentScale, true);
            }
        }
    }
    
    // Re-render all visible pages on zoom
    async function reRenderWithNewScale() {
        pageCanvases.clear();
        pagesContainer.innerHTML = '';
        
        // Recreate page wrappers
        for (let i = 1; i <= totalPages; i++) {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            `;
            
            const pageLabel = document.createElement('div');
            pageLabel.style.cssText = `
                font-size: 0.7rem;
                color: #888;
            `;
            pageLabel.innerHTML = `Page ${i} of ${totalPages}`;
            wrapper.appendChild(pageLabel);
            
            const canvas = document.createElement('canvas');
            canvas.style.cssText = `
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                background: white;
                display: block;
            `;
            wrapper.appendChild(canvas);
            pagesContainer.appendChild(wrapper);
            
            pageCanvases.set(i, { canvas, wrapper, pageNum: i });
        }
        
        // Render visible pages
        await renderVisiblePages();
        zoomLevel.innerHTML = Math.round(currentScale * 100) + '%';
    }
    
    // Zoom functions
    async function zoomIn() {
        currentScale = Math.min(currentScale + 0.25, 2.5);
        await reRenderWithNewScale();
    }
    
    async function zoomOut() {
        currentScale = Math.max(currentScale - 0.25, 0.5);
        await reRenderWithNewScale();
    }
    
    async function resetZoom() {
        currentScale = 1.0;
        await reRenderWithNewScale();
        scrollContainer.scrollTop = 0;
    }
    
    // Scroll event handler with debounce
    let scrollTimeout;
    scrollContainer.addEventListener('scroll', () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            renderVisiblePages();
        }, 100);
    });
    
    // Attach event listeners
    zoomInBtn.onclick = zoomIn;
    zoomOutBtn.onclick = zoomOut;
    resetZoomBtn.onclick = resetZoom;
    
    downloadBtn.onclick = () => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        link.click();
        showToast(`Downloading ${fileName}`);
    };
    
    closeBtn.onclick = () => {
        document.body.removeChild(modal);
        if (modal.blobUrl) URL.revokeObjectURL(modal.blobUrl);
        pageCanvases.clear();
    };
    
    // Touch pinch zoom support
    let initialDistance = 0;
    let initialScale = 1;
    
    scrollContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialDistance = Math.hypot(dx, dy);
            initialScale = currentScale;
        }
    });
    
    scrollContainer.addEventListener('touchmove', async (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.hypot(dx, dy);
            
            if (initialDistance > 0) {
                const scaleFactor = distance / initialDistance;
                let newScale = initialScale * scaleFactor;
                newScale = Math.min(Math.max(newScale, 0.5), 2.5);
                
                if (Math.abs(newScale - currentScale) > 0.05) {
                    currentScale = newScale;
                    await reRenderWithNewScale();
                }
            }
        }
    });
    
    // Mouse wheel zoom with Ctrl key
    scrollContainer.addEventListener('wheel', async (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                await zoomIn();
            } else {
                await zoomOut();
            }
        }
    });
    
    // ESC key handler
    const escHandler = (e) => {
        if (e.key === 'Escape' && document.body.contains(modal)) {
            document.body.removeChild(modal);
            if (modal.blobUrl) URL.revokeObjectURL(modal.blobUrl);
            document.removeEventListener('keydown', escHandler);
            pageCanvases.clear();
        }
    };
    document.addEventListener('keydown', escHandler);
    
    // Load PDF
    showToast(`Loading ${fileName}...`);
    
    try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        modal.blobUrl = URL.createObjectURL(blob);
        
        const loadingTask = pdfjsLib.getDocument(modal.blobUrl);
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;
        
        // Get page height for calculations
        const firstPage = await pdfDoc.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        pageHeight = viewport.height;
        
        pageInfo.innerHTML = `${totalPages} page${totalPages > 1 ? 's' : ''}`;
        
        // Create empty page placeholders
        for (let i = 1; i <= totalPages; i++) {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                min-height: ${pageHeight * currentScale + 40}px;
            `;
            
            const pageLabel = document.createElement('div');
            pageLabel.style.cssText = `
                font-size: 0.7rem;
                color: #888;
            `;
            pageLabel.innerHTML = `Page ${i} of ${totalPages}`;
            wrapper.appendChild(pageLabel);
            
            const loadingSpinner = document.createElement('div');
            loadingSpinner.style.cssText = `
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255,255,255,0.2);
                border-top-color: #60a5fa;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 20px;
            `;
            wrapper.appendChild(loadingSpinner);
            pagesContainer.appendChild(wrapper);
            
            pageCanvases.set(i, { wrapper, pageNum: i, loading: true });
        }
        
        // Add spinner animation
        if (!document.querySelector('#spinnerStyle')) {
            const style = document.createElement('style');
            style.id = 'spinnerStyle';
            style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }
        
        // Render initial visible pages
        await renderVisiblePages();
        
        showToast(`Loaded ${fileName} (${totalPages} pages)`);
    } catch (err) {
        console.error('PDF loading error:', err);
        showToast(`Failed to load PDF: ${err.message}`, true);
        document.body.removeChild(modal);
    }
}

// Replace the old openPDF function
function openPDF(dataUrl, fileName) {
    openPDFEmbedded(dataUrl, fileName);
}

// ==================== INDEXEDDB FUNCTIONS ====================
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { db = request.result; resolve(); };
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('folderStructure')) db.createObjectStore('folderStructure', { keyPath: 'key' });
        };
    });
}

function saveFolderStructure() {
    const tx = db.transaction('folderStructure', 'readwrite');
    tx.objectStore('folderStructure').put({ key: 'structure', value: fileSystem });
    tx.commit();
}
function saveAllFilesToDB() {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    store.clear();
    for (const folderPath in allFiles) store.put({ id: folderPath, folderPath, files: allFiles[folderPath] });
    tx.commit();
}

async function loadFromIndexedDB() {
    const folderReq = db.transaction('folderStructure', 'readonly').objectStore('folderStructure').get('structure');
    folderReq.onsuccess = () => {
        if (folderReq.result) fileSystem = folderReq.result.value;
        else {
            fileSystem = {
                "REMELT":{"A":{},"B":{},"C":{},"D":{},"E":{},"F":{},"G":{},"H":{},"I":{},"J":{},"K":{},"L":{},"M":{},"N":{},"O":{},"P":{},"Q":{},"R":{},"S":{},"T":{},"U":{},"V":{},"W":{},"X":{},"Y":{},"Z":{}},
                "CASTER":{"Quality Reports":{},"Mechanical":{},"Maintenance":{},"Production Data":{},"Testing":{},"Checklists":{},"Safety":{},"Training":{}},
                "HRM":{"Employee Records":{},"Attendance":{},"Performance":{},"Training Logs":{},"Safety Compliance":{},"Policies":{},"Reports":{},"Certifications":{}},
                "CRM":{"PLC Programs":{},"CAD Drawings":{},"Electrical":{},"SCADA":{},"Automation":{},"Reports":{},"Configurations":{},"Manuals":{}},
                "ANNEALING":{"Temperature Control":{},"Process Parameters":{},"Quality Assurance":{},"Maintenance":{},"Safety":{},"Production Logs":{},"Testing":{},"SOP Documents":{}},
                "TLL":{"PLC Programs":{},"CAD Drawings":{},"Maintenance":{},"Production Logs":{},"Process Optimization":{},"Quality Reports":{},"Manuals":{},"Safety":{}},
                "SLITTER":{"Blade Maintenance":{},"Quality Control":{},"Production Reports":{},"Mechanical":{},"Safety":{},"Checklists":{},"Training":{},"Testing":{}},
                "UTILITY":{"Power Supply":{},"Water System":{},"Compressed Air":{},"HVAC":{},"Reports":{},"Safety":{},"Manuals":{},"Testing":{}}
            };
            saveFolderStructure();
        }
        const fileReq = db.transaction('files', 'readonly').objectStore('files').getAll();
        fileReq.onsuccess = () => {
            allFiles = {};
            for (let item of fileReq.result) allFiles[item.folderPath] = item.files;
            render();
        };
    };
}

function getCurrentFolderObject() { return currentPath.reduce((o,p) => o?.[p], fileSystem); }
function getFilesForCurrentFolder() { return allFiles[currentPath.join('/')] || []; }

async function addFileToCurrentFolder(file) {
    const folderPath = currentPath.join('/');
    if (!allFiles[folderPath]) allFiles[folderPath] = [];
    const base64 = await new Promise(r => { const rd = new FileReader(); rd.onload = e => r(e.target.result); rd.readAsDataURL(file); });
    allFiles[folderPath].push({ name: file.name, dataUrl: base64 });
    await saveAllFilesToDB();
}

function deleteFileFromFolder(folderPath, fileName) {
    if (allFiles[folderPath]) {
        allFiles[folderPath] = allFiles[folderPath].filter(f => f.name !== fileName);
        if (allFiles[folderPath].length === 0) delete allFiles[folderPath];
        saveAllFilesToDB();
        render();
        showToast(`✅ Deleted "${fileName}"`);
    }
}

function renameFileInFolder(folderPath, oldName, newName) {
    if (allFiles[folderPath]) {
        const idx = allFiles[folderPath].findIndex(f => f.name === oldName);
        if (idx !== -1) {
            if (!newName.toLowerCase().endsWith('.pdf')) newName += '.pdf';
            allFiles[folderPath][idx].name = newName;
            saveAllFilesToDB();
            render();
            showToast(`✅ Renamed to "${newName}"`);
        }
    }
}

function selectDepartment(d) { currentPath = [d]; render(); }
function goBack() { if(currentPath.length && !isSearchMode) { currentPath.pop(); render(); } else if(isSearchMode) clearSearch(); }
function triggerUpload() { document.getElementById('fileInput').click(); }
function clearSearch() { document.getElementById('searchInput').value = ''; isSearchMode = false; document.getElementById('searchInfo').classList.add('hidden'); document.getElementById('clearSearchBtn').classList.add('hidden'); render(); }

function searchFiles(q) {
    if(!q.trim()) return [];
    const all = [];
    for(const path in allFiles) allFiles[path].forEach(f => all.push({...f, folder:path}));
    return all.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
}

function createCard(title, onClick, isFolder=false, showDel=false, delPath=null, delName=null, showRename=false) {
    const div = document.createElement('div'); div.className = 'card';
    div.innerHTML = `
        <div class="card-icon"><i class="fas ${isFolder ? 'fa-folder' : 'fa-file-pdf'}" style="color:${isFolder ? '#fbbf24' : '#60a5fa'}"></i></div>
        <div class="card-filename">${escapeHtml(title)}</div>
        <div class="card-buttons">
            ${showRename ? `<button class="rename-file-btn" onclick="event.stopPropagation(); window.renameFile('${delPath}','${escapeHtml(delName)}')"><i class="fas fa-edit"></i> Rename</button>` : ''}
            ${showDel ? `<button class="delete-btn" onclick="event.stopPropagation(); window.deleteFile('${delPath}','${escapeHtml(delName)}')"><i class="fas fa-trash"></i> Delete</button>` : ''}
        </div>
    `;
    div.onclick = onClick; return div;
}

function render() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    if(query) {
        isSearchMode = true;
        document.getElementById('clearSearchBtn').classList.remove('hidden');
        const results = searchFiles(query);
        document.getElementById('searchInfo').classList.remove('hidden');
        document.getElementById('searchInfo').innerHTML = `<i class="fas fa-search"></i> Found ${results.length} result(s) for "${escapeHtml(query)}" <button onclick="clearSearch()" style="background:none;border:none;color:#60a5fa;cursor:pointer;margin-left:10px;">Clear</button>`;
        const contentDiv = document.getElementById('content'); contentDiv.innerHTML = '';
        document.getElementById('backBtn').classList.remove('hidden');
        document.getElementById('uploadBtn').classList.add('hidden');
        document.getElementById('departmentsSection').innerHTML = '';
        document.getElementById('breadcrumb').innerHTML = '';
        if(!results.length) contentDiv.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No PDFs found.</p></div>';
        else results.forEach(f => contentDiv.appendChild(createCard(f.name, () => openPDF(f.dataUrl, f.name), false)));
        updateStats(); return;
    }
    isSearchMode = false;
    document.getElementById('clearSearchBtn').classList.add('hidden');
    document.getElementById('searchInfo').classList.add('hidden');
    document.getElementById('content').innerHTML = '';
    const folder = getCurrentFolderObject();
    if(!folder) { currentPath = []; render(); return; }
    document.getElementById('backBtn').classList.toggle('hidden', currentPath.length === 0);
    
    const bcDiv = document.getElementById('breadcrumb');
    bcDiv.innerHTML = `<div class="breadcrumb-item" onclick="navigateToBreadcrumb(-1)"><i class="fas fa-home"></i> Home</div>`;
    currentPath.forEach((f,i) => { bcDiv.innerHTML += `<span class="breadcrumb-separator">/</span><div class="breadcrumb-item" onclick="navigateToBreadcrumb(${i})">${escapeHtml(f)}</div>`; });
    
    if(currentPath.length === 0){
        let html = '<div class="section-title"><i class="fas fa-building"></i> Departments</div><div class="departments-grid">';
        for(let dept in fileSystem){
            const sub = Object.keys(fileSystem[dept]).length;
            const fcount = allFiles[dept] ? allFiles[dept].length : 0;
            html += `<div class="dept-card" data-dept="${dept}" onclick="selectDepartment('${dept}')"><div class="dept-oval"><span>${dept}</span></div><div class="dept-arrow"><i class="fas fa-chevron-right"></i></div><div class="dept-info">${sub+fcount} items</div></div>`;
        }
        html += '</div>';
        document.getElementById('departmentsSection').innerHTML = html;
    } else document.getElementById('departmentsSection').innerHTML = '';
    
    const isLeaf = Object.keys(folder).length === 0;
    const isRoot = currentPath.length === 0;
    document.getElementById('uploadBtn').classList.toggle('hidden', !(isLeaf && !isRoot));
    
    const actionDiv = document.createElement('div');
    actionDiv.className = 'action-bar';
    if(!isRoot) actionDiv.innerHTML = `<button class="action-btn" onclick="renameCurrentFolder()"><i class="fas fa-edit"></i> Rename Folder</button><button class="action-btn" onclick="deleteCurrentFolder()"><i class="fas fa-trash-alt"></i> Delete Folder</button><button class="action-btn" onclick="addNewFolder()"><i class="fas fa-plus"></i> Add Subfolder</button>`;
    else actionDiv.innerHTML = `<button class="action-btn" onclick="addNewDepartment()"><i class="fas fa-building"></i> Add Department</button>`;
    document.getElementById('content').appendChild(actionDiv);
    
    if(!isRoot && !isLeaf) for(let key in folder) document.getElementById('content').appendChild(createCard(key, () => { currentPath.push(key); render(); }, true));
    if(isLeaf && !isRoot){
        const files = getFilesForCurrentFolder();
        const path = currentPath.join('/');
        if(!files.length) document.getElementById('content').innerHTML += '<div class="empty-state"><i class="fas fa-cloud-upload-alt"></i><p>No PDFs yet. Click Upload to add files.</p></div>';
        else files.forEach(f => document.getElementById('content').appendChild(createCard(f.name, () => openPDF(f.dataUrl, f.name), false, true, path, f.name, true)));
    }
    updateStats();
}

function navigateToBreadcrumb(idx) { if(idx === -1) currentPath = []; else currentPath = currentPath.slice(0, idx+1); render(); }
function renameCurrentFolder() { 
    if(!currentPath.length) return;
    const old = currentPath[currentPath.length-1], newName = prompt("New folder name:", old);
    if(newName && newName !== old && newName.trim()){
        const parent = currentPath.slice(0,-1).reduce((o,p)=>o[p], fileSystem);
        parent[newName] = parent[old]; delete parent[old];
        const oldPath = currentPath.join('/'), newPath = [...currentPath.slice(0,-1), newName].join('/');
        if(allFiles[oldPath]){ allFiles[newPath] = allFiles[oldPath]; delete allFiles[oldPath]; }
        currentPath[currentPath.length-1] = newName;
        saveFolderStructure(); saveAllFilesToDB(); render(); showToast(`✅ Renamed to "${newName}"`);
    }
}
function deleteCurrentFolder() {
    if(!currentPath.length) return;
    const name = currentPath[currentPath.length-1];
    if(confirm(`Delete "${name}" and all contents?`)){
        const path = currentPath.join('/');
        delete allFiles[path];
        const parent = currentPath.slice(0,-1).reduce((o,p)=>o[p], fileSystem);
        delete parent[name];
        currentPath.pop();
        saveFolderStructure(); saveAllFilesToDB(); render(); showToast(`🗑️ Folder "${name}" deleted`);
    }
}
function addNewFolder() {
    const name = prompt("Folder name:");
    if(name && name.trim()){
        const cur = getCurrentFolderObject();
        if(cur && !cur[name]){ cur[name] = {}; saveFolderStructure(); render(); showToast(`✅ Folder "${name}" created`); }
        else showToast("Exists", true);
    }
}
function addNewDepartment() {
    const name = prompt("Department name:");
    if(name && name.trim() && !fileSystem[name]){ fileSystem[name] = {}; saveFolderStructure(); render(); showToast(`✅ Department "${name}" created`); }
    else if(fileSystem[name]) showToast("Department exists", true);
}
function updateStats() {
    let folderCount = 0, fileCount = 0;
    function countFolders(obj) { for(let k in obj) { if(typeof obj[k] === 'object') { folderCount++; countFolders(obj[k]); } } }
    countFolders(fileSystem);
    for(let k in allFiles) fileCount += allFiles[k].length;
    document.getElementById('folderCount').textContent = folderCount;
    document.getElementById('fileCount').textContent = fileCount;
}
function showToast(msg, isErr = false) {
    const toast = document.getElementById('toast');
    toast.querySelector('span').textContent = msg;
    toast.style.background = isErr ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#10b981,#059669)";
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

function toggleTheme() { document.body.classList.toggle('light-mode'); localStorage.setItem('oarcel_theme', document.body.classList.contains('light-mode') ? 'light-mode' : ''); updateThemeIcon(); }
function updateThemeIcon() { const isDark = !document.body.classList.contains('light-mode'); document.getElementById('themeToggle').innerHTML = isDark ? '<i class="fas fa-sun"></i><span>Light</span>' : '<i class="fas fa-moon"></i><span>Dark</span>'; }

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('themeToggle').onclick = toggleTheme;
    if(localStorage.getItem('oarcel_theme') === 'light-mode') document.body.classList.add('light-mode');
    updateThemeIcon();
    document.getElementById('fileInput').addEventListener('change', async(e) => {
        const files = Array.from(e.target.files);
        for(let f of files) if(f.type === 'application/pdf') await addFileToCurrentFolder(f);
        showToast(`${files.length} PDF(s) saved!`); render(); e.target.value = '';
    });
    document.getElementById('searchInput').addEventListener('input', () => render());
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);
    window.deleteFile = (p,n) => { if(confirm(`Delete "${n}"?`)) deleteFileFromFolder(p,n); };
    window.renameFile = (p,old) => { const nu = prompt("New name:", old.replace('.pdf','')); if(nu?.trim()) renameFileInFolder(p, old, nu.trim()); };
    
    try {
        await initDB();
        await loadFromIndexedDB();
    } catch(e) {
        console.error(e);
        showToast('Database error', true);
    }
});

window.goBack = goBack; 
window.triggerUpload = triggerUpload; 
window.selectDepartment = selectDepartment; 
window.navigateToBreadcrumb = navigateToBreadcrumb;
window.renameCurrentFolder = renameCurrentFolder; 
window.deleteCurrentFolder = deleteCurrentFolder; 
window.addNewFolder = addNewFolder; 
window.addNewDepartment = addNewDepartment;
window.openPDF = openPDF;
window.clearSearch = clearSearch;