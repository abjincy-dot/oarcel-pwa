// ==================== INDEXEDDB CORE ====================
const DB_NAME = 'OarcelDB';
const DB_VERSION = 4;
let db = null;
let allFiles = {};
let fileSystem = {};
let currentPath = [];
let isSearchMode = false;

// ==================== PDF.JS VERTICAL SCROLLING VIEWER (WORKS ON MOBILE) ====================
let pdfjsLib = null;

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

async function openPDF(dataUrl, fileName) {
    // Load PDF.js
    const pdfLib = await loadPDFJS();
    
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
        overflow: hidden;
    `;
    
    // Header toolbar
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #0f0f1a;
        color: white;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        flex-shrink: 0;
        flex-wrap: wrap;
        gap: 8px;
    `;
    
    // File name
    const fileNameSpan = document.createElement('span');
    fileNameSpan.style.cssText = `
        font-size: 0.85rem;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 180px;
    `;
    fileNameSpan.innerHTML = `<i class="fas fa-file-pdf" style="color: #ef4444; margin-right: 6px;"></i>${escapeHtml(fileName)}`;
    
    // Page info and controls
    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = `
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
    `;
    
    // Page indicator
    const pageIndicator = document.createElement('span);
    pageIndicator.style.cssText = `
        font-size: 0.75rem;
        background: rgba(255,255,255,0.1);
        padding: 4px 10px;
        border-radius: 20px;
    `;
    pageIndicator.innerHTML = 'Loading...';
    
    // Zoom controls
    const zoomControls = document.createElement('div');
    zoomControls.style.cssText = `display: flex; gap: 6px; align-items: center;`;
    
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '<i class="fas fa-search-minus"></i>';
    zoomOutBtn.style.cssText = `padding: 5px 8px; background: rgba(255,255,255,0.1); border: none; border-radius: 20px; color: white; cursor: pointer; font-size: 0.75rem;`;
    
    const zoomLevel = document.createElement('span');
    zoomLevel.style.cssText = `font-size: 0.75rem; min-width: 40px; text-align: center;`;
    zoomLevel.innerHTML = '100%';
    
    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '<i class="fas fa-search-plus"></i>';
    zoomInBtn.style.cssText = `padding: 5px 8px; background: rgba(255,255,255,0.1); border: none; border-radius: 20px; color: white; cursor: pointer; font-size: 0.75rem;`;
    
    zoomControls.appendChild(zoomOutBtn);
    zoomControls.appendChild(zoomLevel);
    zoomControls.appendChild(zoomInBtn);
    
    controlsDiv.appendChild(pageIndicator);
    controlsDiv.appendChild(zoomControls);
    
    // Action buttons
    const actionButtons = document.createElement('div');
    actionButtons.style.cssText = `display: flex; gap: 8px;`;
    
    const downloadBtn = document.createElement('button');
    downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
    downloadBtn.style.cssText = `padding: 5px 10px; background: rgba(59, 130, 246, 0.8); border: none; border-radius: 20px; color: white; cursor: pointer; font-size: 0.75rem;`;
    downloadBtn.title = 'Download';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.style.cssText = `padding: 5px 10px; background: rgba(239, 68, 68, 0.8); border: none; border-radius: 20px; color: white; cursor: pointer; font-size: 0.75rem;`;
    closeBtn.title = 'Close';
    
    actionButtons.appendChild(downloadBtn);
    actionButtons.appendChild(closeBtn);
    
    header.appendChild(fileNameSpan);
    header.appendChild(controlsDiv);
    header.appendChild(actionButtons);
    
    // Scroll container for pages
    const scrollContainer = document.createElement('div');
    scrollContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 16px;
        background: #1a1a2e;
        -webkit-overflow-scrolling: touch;
    `;
    
    // Pages container
    const pagesContainer = document.createElement('div');
    pagesContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
    `;
    scrollContainer.appendChild(pagesContainer);
    
    modal.appendChild(header);
    modal.appendChild(scrollContainer);
    document.body.appendChild(modal);
    
    // Add animation styles
    if (!document.querySelector('#pdfViewerStyles')) {
        const style = document.createElement('style');
        style.id = 'pdfViewerStyles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // PDF variables
    let pdfDoc = null;
    let pages = [];
    let currentScale = 1.0;
    let totalPages = 0;
    
    // Render a single page
    async function renderPage(pageNum, scale) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });
        
        let pageWrapper = pages[pageNum - 1];
        if (!pageWrapper) {
            pageWrapper = document.createElement('div');
            pageWrapper.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                width: 100%;
            `;
            
            const canvas = document.createElement('canvas');
            canvas.style.cssText = `
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                background: white;
                display: block;
                max-width: 100%;
                height: auto;
            `;
            pageWrapper.appendChild(canvas);
            pagesContainer.appendChild(pageWrapper);
            pages[pageNum - 1] = { wrapper: pageWrapper, canvas, pageNum };
        }
        
        const { canvas } = pages[pageNum - 1];
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        
        const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        return canvas;
    }
    
    // Render all pages progressively
    async function renderAllPages(scale) {
        if (!pdfDoc) return;
        
        currentScale = scale;
        zoomLevel.innerHTML = Math.round(scale * 100) + '%';
        
        // Clear container but keep references
        pagesContainer.innerHTML = '';
        pages = [];
        
        // Show loading indicator on first page
        const loadingMsg = document.createElement('div');
        loadingMsg.style.cssText = 'color: white; text-align: center; padding: 20px;';
        loadingMsg.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Loading pages...';
        pagesContainer.appendChild(loadingMsg);
        
        // Render pages one by one (progressively)
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1) {
                pagesContainer.innerHTML = '';
            }
            await renderPage(i, scale);
            
            // Update page indicator
            pageIndicator.innerHTML = `Page ${i} of ${totalPages}`;
            
            // Small delay to allow UI to update
            await new Promise(r => setTimeout(r, 10));
        }
        
        pageIndicator.innerHTML = `${totalPages} pages`;
    }
    
    // Zoom functions
    async function zoomIn() {
        if (currentScale < 2.5) {
            await renderAllPages(currentScale + 0.25);
        }
    }
    
    async function zoomOut() {
        if (currentScale > 0.5) {
            await renderAllPages(currentScale - 0.25);
        }
    }
    
    // Event listeners
    zoomInBtn.onclick = zoomIn;
    zoomOutBtn.onclick = zoomOut;
    
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
        // Clear page references to free memory
        pages = [];
    };
    
    // Touch pinch zoom support for mobile
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
                    await renderAllPages(currentScale);
                }
            }
        }
    });
    
    // Mouse wheel zoom with Ctrl key (desktop)
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
            pages = [];
        }
    };
    document.addEventListener('keydown', escHandler);
    
    // Load and render PDF
    showToast(`Loading ${fileName}...`);
    
    try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        modal.blobUrl = URL.createObjectURL(blob);
        
        const loadingTask = pdfLib.getDocument(modal.blobUrl);
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;
        
        pageIndicator.innerHTML = `0/${totalPages}`;
        
        // Render all pages
        await renderAllPages(1.0);
        
        showToast(`Loaded ${fileName} (${totalPages} pages)`);
    } catch (err) {
        console.error('PDF error:', err);
        showToast(`Failed to load PDF: ${err.message}`, true);
        document.body.removeChild(modal);
    }
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
    for (const folderPath in allFiles) {
        if (allFiles[folderPath] && allFiles[folderPath].length > 0) {
            store.put({ id: folderPath, folderPath, files: allFiles[folderPath] });
        }
    }
    tx.commit();
}

async function loadFromIndexedDB() {
    const folderReq = db.transaction('folderStructure', 'readonly').objectStore('folderStructure').get('structure');
    folderReq.onsuccess = () => {
        if (folderReq.result) {
            fileSystem = folderReq.result.value;
        } else {
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
            for (let item of fileReq.result) {
                allFiles[item.folderPath] = item.files;
            }
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

function selectDepartment(d) { 
    currentPath = [d]; 
    render(); 
}

function goBack() { 
    if(currentPath.length && !isSearchMode) { 
        currentPath.pop(); 
        render(); 
    } else if(isSearchMode) { 
        clearSearch(); 
    } 
}

function triggerUpload() { 
    document.getElementById('fileInput').click(); 
}

function clearSearch() { 
    document.getElementById('searchInput').value = ''; 
    isSearchMode = false; 
    document.getElementById('searchInfo').classList.add('hidden'); 
    document.getElementById('clearSearchBtn').classList.add('hidden'); 
    render(); 
}

function searchFiles(q) {
    if(!q.trim()) return [];
    const all = [];
    for(const path in allFiles) {
        if(allFiles[path]) {
            allFiles[path].forEach(f => all.push({...f, folder:path}));
        }
    }
    return all.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
}

function createCard(title, onClick, isFolder=false, showDel=false, delPath=null, delName=null, showRename=false) {
    const div = document.createElement('div'); 
    div.className = 'card';
    div.innerHTML = `
        <div class="card-icon"><i class="fas ${isFolder ? 'fa-folder' : 'fa-file-pdf'}" style="color:${isFolder ? '#fbbf24' : '#60a5fa'}"></i></div>
        <div class="card-filename">${escapeHtml(title)}</div>
        <div class="card-buttons">
            ${showRename ? `<button class="rename-file-btn" onclick="event.stopPropagation(); window.renameFile('${delPath}','${escapeHtml(delName)}')"><i class="fas fa-edit"></i> Rename</button>` : ''}
            ${showDel ? `<button class="delete-btn" onclick="event.stopPropagation(); window.deleteFile('${delPath}','${escapeHtml(delName)}')"><i class="fas fa-trash"></i> Delete</button>` : ''}
        </div>
    `;
    div.onclick = onClick; 
    return div;
}

function render() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    if(query) {
        isSearchMode = true;
        document.getElementById('clearSearchBtn').classList.remove('hidden');
        const results = searchFiles(query);
        document.getElementById('searchInfo').classList.remove('hidden');
        document.getElementById('searchInfo').innerHTML = `<i class="fas fa-search"></i> Found ${results.length} result(s) for "${escapeHtml(query)}" <button onclick="clearSearch()" style="background:none;border:none;color:#60a5fa;cursor:pointer;margin-left:10px;">Clear</button>`;
        const contentDiv = document.getElementById('content'); 
        contentDiv.innerHTML = '';
        document.getElementById('backBtn').classList.remove('hidden');
        document.getElementById('uploadBtn').classList.add('hidden');
        document.getElementById('departmentsSection').innerHTML = '';
        document.getElementById('breadcrumb').innerHTML = '';
        if(!results.length) {
            contentDiv.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No PDFs found.</p></div>';
        } else {
            results.forEach(f => contentDiv.appendChild(createCard(f.name, () => openPDF(f.dataUrl, f.name), false)));
        }
        updateStats(); 
        return;
    }
    isSearchMode = false;
    document.getElementById('clearSearchBtn').classList.add('hidden');
    document.getElementById('searchInfo').classList.add('hidden');
    document.getElementById('content').innerHTML = '';
    const folder = getCurrentFolderObject();
    if(!folder) { 
        currentPath = []; 
        render(); 
        return; 
    }
    document.getElementById('backBtn').classList.toggle('hidden', currentPath.length === 0);
    
    const bcDiv = document.getElementById('breadcrumb');
    bcDiv.innerHTML = `<div class="breadcrumb-item" onclick="navigateToBreadcrumb(-1)"><i class="fas fa-home"></i> Home</div>`;
    currentPath.forEach((f,i) => { 
        bcDiv.innerHTML += `<span class="breadcrumb-separator">/</span><div class="breadcrumb-item" onclick="navigateToBreadcrumb(${i})">${escapeHtml(f)}</div>`; 
    });
    
    if(currentPath.length === 0){
        let html = '<div class="section-title"><i class="fas fa-building"></i> Departments</div><div class="departments-grid">';
        for(let dept in fileSystem){
            const sub = Object.keys(fileSystem[dept]).length;
            const fcount = allFiles[dept] ? allFiles[dept].length : 0;
            html += `<div class="dept-card" data-dept="${dept}" onclick="selectDepartment('${dept}')"><div class="dept-oval"><span>${dept}</span></div><div class="dept-arrow"><i class="fas fa-chevron-right"></i></div><div class="dept-info">${sub+fcount} items</div></div>`;
        }
        html += '</div>';
        document.getElementById('departmentsSection').innerHTML = html;
    } else {
        document.getElementById('departmentsSection').innerHTML = '';
    }
    
    const isLeaf = Object.keys(folder).length === 0;
    const isRoot = currentPath.length === 0;
    document.getElementById('uploadBtn').classList.toggle('hidden', !(isLeaf && !isRoot));
    
    const actionDiv = document.createElement('div');
    actionDiv.className = 'action-bar';
    if(!isRoot) {
        actionDiv.innerHTML = `<button class="action-btn" onclick="renameCurrentFolder()"><i class="fas fa-edit"></i> Rename Folder</button><button class="action-btn" onclick="deleteCurrentFolder()"><i class="fas fa-trash-alt"></i> Delete Folder</button><button class="action-btn" onclick="addNewFolder()"><i class="fas fa-plus"></i> Add Subfolder</button>`;
    } else {
        actionDiv.innerHTML = `<button class="action-btn" onclick="addNewDepartment()"><i class="fas fa-building"></i> Add Department</button>`;
    }
    document.getElementById('content').appendChild(actionDiv);
    
    if(!isRoot && !isLeaf) {
        for(let key in folder) {
            document.getElementById('content').appendChild(createCard(key, () => { currentPath.push(key); render(); }, true));
        }
    }
    if(isLeaf && !isRoot){
        const files = getFilesForCurrentFolder();
        const path = currentPath.join('/');
        if(!files.length) {
            document.getElementById('content').innerHTML += '<div class="empty-state"><i class="fas fa-cloud-upload-alt"></i><p>No PDFs yet. Click Upload to add files.</p></div>';
        } else {
            files.forEach(f => document.getElementById('content').appendChild(createCard(f.name, () => openPDF(f.dataUrl, f.name), false, true, path, f.name, true)));
        }
    }
    updateStats();
}

function navigateToBreadcrumb(idx) { 
    if(idx === -1) {
        currentPath = []; 
    } else {
        currentPath = currentPath.slice(0, idx+1); 
    }
    render(); 
}

function renameCurrentFolder() { 
    if(!currentPath.length) return;
    const old = currentPath[currentPath.length-1];
    const newName = prompt("New folder name:", old);
    if(newName && newName !== old && newName.trim()){
        const parent = currentPath.slice(0,-1).reduce((o,p)=>o[p], fileSystem);
        parent[newName] = parent[old];
        delete parent[old];
        const oldPath = currentPath.join('/');
        const newPath = [...currentPath.slice(0,-1), newName].join('/');
        if(allFiles[oldPath]){ 
            allFiles[newPath] = allFiles[oldPath]; 
            delete allFiles[oldPath]; 
        }
        currentPath[currentPath.length-1] = newName;
        saveFolderStructure(); 
        saveAllFilesToDB(); 
        render(); 
        showToast(`✅ Renamed to "${newName}"`);
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
        saveFolderStructure(); 
        saveAllFilesToDB(); 
        render(); 
        showToast(`🗑️ Folder "${name}" deleted`);
    }
}

function addNewFolder() {
    const name = prompt("Folder name:");
    if(name && name.trim()){
        const cur = getCurrentFolderObject();
        if(cur && !cur[name]){ 
            cur[name] = {}; 
            saveFolderStructure(); 
            render(); 
            showToast(`✅ Folder "${name}" created`); 
        } else {
            showToast("Exists", true);
        }
    }
}

function addNewDepartment() {
    const name = prompt("Department name:");
    if(name && name.trim() && !fileSystem[name]){ 
        fileSystem[name] = {}; 
        saveFolderStructure(); 
        render(); 
        showToast(`✅ Department "${name}" created`); 
    } else if(fileSystem[name]) {
        showToast("Department exists", true);
    }
}

function updateStats() {
    let folderCount = 0, fileCount = 0;
    function countFolders(obj) { 
        for(let k in obj) { 
            if(typeof obj[k] === 'object') { 
                folderCount++; 
                countFolders(obj[k]); 
            } 
        } 
    }
    countFolders(fileSystem);
    for(let k in allFiles) {
        if(allFiles[k]) {
            fileCount += allFiles[k].length;
        }
    }
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

function escapeHtml(str) { 
    const div = document.createElement('div'); 
    div.textContent = str; 
    return div.innerHTML; 
}

function toggleTheme() { 
    document.body.classList.toggle('light-mode'); 
    localStorage.setItem('oarcel_theme', document.body.classList.contains('light-mode') ? 'light-mode' : ''); 
    updateThemeIcon(); 
}

function updateThemeIcon() { 
    const isDark = !document.body.classList.contains('light-mode'); 
    const themeBtn = document.getElementById('themeToggle');
    if(themeBtn) {
        themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i><span>Light</span>' : '<i class="fas fa-moon"></i><span>Dark</span>';
    }
}

// Make all functions global
window.selectDepartment = selectDepartment;
window.goBack = goBack;
window.triggerUpload = triggerUpload;
window.clearSearch = clearSearch;
window.navigateToBreadcrumb = navigateToBreadcrumb;
window.renameCurrentFolder = renameCurrentFolder;
window.deleteCurrentFolder = deleteCurrentFolder;
window.addNewFolder = addNewFolder;
window.addNewDepartment = addNewDepartment;
window.openPDF = openPDF;
window.renameFile = (p, old) => { 
    const nu = prompt("New name:", old.replace('.pdf', '')); 
    if(nu && nu.trim()) renameFileInFolder(p, old, nu.trim()); 
};
window.deleteFile = (p, n) => { 
    if(confirm(`Delete "${n}"?`)) deleteFileFromFolder(p, n); 
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const themeBtn = document.getElementById('themeToggle');
    if(themeBtn) themeBtn.onclick = toggleTheme;
    
    if(localStorage.getItem('oarcel_theme') === 'light-mode') {
        document.body.classList.add('light-mode');
    }
    updateThemeIcon();
    
    const fileInput = document.getElementById('fileInput');
    if(fileInput) {
        fileInput.addEventListener('change', async(e) => {
            const files = Array.from(e.target.files);
            for(let f of files) {
                if(f.type === 'application/pdf') {
                    await addFileToCurrentFolder(f);
                }
            }
            showToast(`${files.length} PDF(s) saved!`);
            render();
            e.target.value = '';
        });
    }
    
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', () => render());
    }
    
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if(clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }
    
    const backBtn = document.getElementById('backBtn');
    if(backBtn) {
        backBtn.addEventListener('click', goBack);
    }
    
    const uploadBtn = document.getElementById('uploadBtn');
    if(uploadBtn) {
        uploadBtn.addEventListener('click', triggerUpload);
    }
    
    try {
        await initDB();
        await loadFromIndexedDB();
    } catch(e) {
        console.error(e);
        showToast('Database error', true);
    }
});