// ==================== INDEXEDDB CORE ====================
const DB_NAME = 'OarcelDB';
const DB_VERSION = 4;
let db = null;
let allFiles = {};
let fileSystem = {};
let currentPath = [];
let isSearchMode = false;

// ==================== SAME-WINDOW PDF VIEWER ====================
function openPDF(dataUrl, fileName) {
    // Create full-screen modal
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
    
    // Header toolbar
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 20px;
        background: #0f0f1a;
        color: white;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        flex-shrink: 0;
        flex-wrap: wrap;
        gap: 10px;
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
    
    // Zoom controls
    const zoomControls = document.createElement('div');
    zoomControls.style.cssText = `display: flex; gap: 8px; align-items: center;`;
    
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '<i class="fas fa-search-minus"></i>';
    zoomOutBtn.style.cssText = `padding: 6px 10px; background: rgba(255,255,255,0.1); border: none; border-radius: 20px; color: white; cursor: pointer; font-size: 0.8rem;`;
    
    const zoomLevel = document.createElement('span');
    zoomLevel.style.cssText = `font-size: 0.8rem; min-width: 45px; text-align: center;`;
    zoomLevel.innerHTML = 'Fit';
    
    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '<i class="fas fa-search-plus"></i>';
    zoomInBtn.style.cssText = `padding: 6px 10px; background: rgba(255,255,255,0.1); border: none; border-radius: 20px; color: white; cursor: pointer; font-size: 0.8rem;`;
    
    const fitWidthBtn = document.createElement('button');
    fitWidthBtn.innerHTML = '<i class="fas fa-arrows-alt-h"></i>';
    fitWidthBtn.style.cssText = `padding: 6px 10px; background: rgba(255,255,255,0.1); border: none; border-radius: 20px; color: white; cursor: pointer; font-size: 0.8rem;`;
    fitWidthBtn.title = 'Fit to Width';
    
    zoomControls.appendChild(zoomOutBtn);
    zoomControls.appendChild(zoomLevel);
    zoomControls.appendChild(zoomInBtn);
    zoomControls.appendChild(fitWidthBtn);
    
    // Action buttons
    const actionButtons = document.createElement('div');
    actionButtons.style.cssText = `display: flex; gap: 8px;`;
    
    const downloadBtn = document.createElement('button');
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
    downloadBtn.style.cssText = `padding: 6px 14px; background: rgba(59, 130, 246, 0.8); border: none; border-radius: 20px; color: white; cursor: pointer; font-size: 0.8rem;`;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i> Close';
    closeBtn.style.cssText = `padding: 6px 14px; background: rgba(239, 68, 68, 0.8); border: none; border-radius: 20px; color: white; cursor: pointer; font-size: 0.8rem;`;
    
    actionButtons.appendChild(downloadBtn);
    actionButtons.appendChild(closeBtn);
    
    header.appendChild(fileNameSpan);
    header.appendChild(zoomControls);
    header.appendChild(actionButtons);
    
    // PDF container with Mobile Scroll Fix
    const pdfContainer = document.createElement('div');
    pdfContainer.style.cssText = `
        flex: 1;
        width: 100%;
        background: #525659;
        position: relative;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
    `;
    
    // Use <object> instead of <iframe> for better mobile support
    const pdfObject = document.createElement('object');
    pdfObject.type = "application/pdf";
    pdfObject.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        display: block;
    `;
    
    // Loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        text-align: center;
        z-index: 10001;
    `;
    loadingDiv.innerHTML = '<i class="fas fa-spinner fa-pulse fa-2x"></i><p style="margin-top: 10px;">Loading PDF...</p>';
    
    pdfContainer.appendChild(pdfObject);
    pdfContainer.appendChild(loadingDiv);
    modal.appendChild(header);
    modal.appendChild(pdfContainer);
    document.body.appendChild(modal);
    
    if (!document.querySelector('#pdfViewerStyles')) {
        const style = document.createElement('style');
        style.id = 'pdfViewerStyles';
        style.textContent = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;
        document.head.appendChild(style);
    }

    let currentZoom = 1;
    function applyZoom() {
        // Disable scale zoom on mobile to prevent scrolling issues
        if (window.innerWidth < 768) {
            pdfObject.style.transform = 'none';
            pdfObject.style.width = '100%';
            pdfObject.style.height = '100%';
            zoomLevel.innerHTML = 'Mobile';
            return;
        }
        pdfObject.style.transform = `scale(${currentZoom})`;
        pdfObject.style.transformOrigin = 'top left';
        pdfObject.style.width = `${100 / currentZoom}%`;
        pdfObject.style.height = `${100 / currentZoom}%`;
        zoomLevel.innerHTML = Math.round(currentZoom * 100) + '%';
    }
    
    function fitToWidth() {
        if (window.innerWidth < 768) return;
        const containerWidth = pdfContainer.clientWidth;
        const objectWidth = pdfObject.offsetWidth;
        currentZoom = containerWidth / (objectWidth / currentZoom);
        currentZoom = Math.min(Math.max(currentZoom, 0.5), 3);
        applyZoom();
    }

    zoomInBtn.onclick = () => { if (currentZoom < 3) { currentZoom += 0.25; applyZoom(); } };
    zoomOutBtn.onclick = () => { if (currentZoom > 0.5) { currentZoom -= 0.25; applyZoom(); } };
    fitWidthBtn.onclick = fitToWidth;
    
    downloadBtn.onclick = () => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        link.click();
    };

    closeBtn.onclick = () => {
        document.body.removeChild(modal);
        if (modal.blobUrl) URL.revokeObjectURL(modal.blobUrl);
    };

    fetch(dataUrl)
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            modal.blobUrl = blobUrl;
            // Append #view=FitH to force the PDF to fit width and allow vertical scrolling
            pdfObject.data = `${blobUrl}#view=FitH`;
            
            // Native <object> does not always trigger onload like iframe
            setTimeout(() => {
                loadingDiv.style.display = 'none';
                fitToWidth();
            }, 1000);
        })
        .catch(err => {
            showToast(`Failed to open PDF`, true);
            document.body.removeChild(modal);
        });
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
}

async function loadFromIndexedDB() {
    const tx = db.transaction(['folderStructure', 'files'], 'readonly');
    const folderReq = tx.objectStore('folderStructure').get('structure');
    
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
        
        const fileReq = tx.objectStore('files').getAll();
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
    const base64 = await new Promise(r => { 
        const rd = new FileReader(); 
        rd.onload = e => r(e.target.result); 
        rd.readAsDataURL(file); 
    });
    allFiles[folderPath].push({ name: file.name, dataUrl: base64 });
    saveAllFilesToDB();
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

// ==================== NAVIGATION & UI ====================
function selectDepartment(d) { currentPath = [d]; render(); }
function goBack() { if(currentPath.length && !isSearchMode) { currentPath.pop(); render(); } else if(isSearchMode) { clearSearch(); } }
function triggerUpload() { document.getElementById('fileInput').click(); }
function clearSearch() { document.getElementById('searchInput').value = ''; isSearchMode = false; document.getElementById('searchInfo').classList.add('hidden'); render(); }

function searchFiles(q) {
    if(!q.trim()) return [];
    const all = [];
    for(const path in allFiles) {
        if(allFiles[path]) allFiles[path].forEach(f => all.push({...f, folder:path}));
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
    const contentDiv = document.getElementById('content');
    const deptSection = document.getElementById('departmentsSection');
    const bcDiv = document.getElementById('breadcrumb');

    if(query) {
        isSearchMode = true;
        const results = searchFiles(query);
        document.getElementById('searchInfo').classList.remove('hidden');
        document.getElementById('searchInfo').innerHTML = `<i class="fas fa-search"></i> Found ${results.length} results.`;
        contentDiv.innerHTML = '';
        deptSection.innerHTML = '';
        bcDiv.innerHTML = '';
        if(!results.length) contentDiv.innerHTML = '<div class="empty-state">No PDFs found.</div>';
        else results.forEach(f => contentDiv.appendChild(createCard(f.name, () => openPDF(f.dataUrl, f.name), false)));
        updateStats();
        return;
    }

    contentDiv.innerHTML = '';
    const folder = getCurrentFolderObject();
    if(!folder) { currentPath = []; render(); return; }

    document.getElementById('backBtn').classList.toggle('hidden', currentPath.length === 0);
    bcDiv.innerHTML = `<div class="breadcrumb-item" onclick="navigateToBreadcrumb(-1)"><i class="fas fa-home"></i> Home</div>`;
    currentPath.forEach((f,i) => { bcDiv.innerHTML += `<span class="breadcrumb-separator">/</span><div class="breadcrumb-item" onclick="navigateToBreadcrumb(${i})">${escapeHtml(f)}</div>`; });

    if(currentPath.length === 0){
        let html = '<div class="section-title">Departments</div><div class="departments-grid">';
        for(let dept in fileSystem){
            const fcount = allFiles[dept] ? allFiles[dept].length : 0;
            html += `<div class="dept-card" onclick="selectDepartment('${dept}')"><div class="dept-oval"><span>${dept}</span></div><div class="dept-info">${fcount} files</div></div>`;
        }
        deptSection.innerHTML = html + '</div>';
    } else {
        deptSection.innerHTML = '';
    }

    const isLeaf = Object.keys(folder).length === 0;
    const isRoot = currentPath.length === 0;
    document.getElementById('uploadBtn').classList.toggle('hidden', !(isLeaf && !isRoot));

    if(!isRoot && !isLeaf) {
        for(let key in folder) contentDiv.appendChild(createCard(key, () => { currentPath.push(key); render(); }, true));
    }
    
    if(isLeaf && !isRoot){
        const files = getFilesForCurrentFolder();
        if(!files.length) contentDiv.innerHTML += '<div class="empty-state">No PDFs here.</div>';
        else files.forEach(f => contentDiv.appendChild(createCard(f.name, () => openPDF(f.dataUrl, f.name), false, true, currentPath.join('/'), f.name, true)));
    }
    updateStats();
}

function navigateToBreadcrumb(idx) { currentPath = idx === -1 ? [] : currentPath.slice(0, idx+1); render(); }

function updateStats() {
    let folderCount = 0, fileCount = 0;
    const count = (obj) => { for(let k in obj) { folderCount++; count(obj[k]); } };
    count(fileSystem);
    for(let k in allFiles) if(allFiles[k]) fileCount += allFiles[k].length;
    document.getElementById('folderCount').textContent = folderCount;
    document.getElementById('fileCount').textContent = fileCount;
}

function showToast(msg, isErr = false) {
    const toast = document.getElementById('toast');
    toast.querySelector('span').textContent = msg;
    toast.style.background = isErr ? "red" : "green";
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

// Global mappings for HTML onclicks
window.selectDepartment = selectDepartment;
window.goBack = goBack;
window.triggerUpload = triggerUpload;
window.clearSearch = clearSearch;
window.navigateToBreadcrumb = navigateToBreadcrumb;
window.openPDF = openPDF;
window.renameFile = (p, old) => { 
    const nu = prompt("New name:", old.replace('.pdf', '')); 
    if(nu) renameFileInFolder(p, old, nu.trim()); 
};
window.deleteFile = (p, n) => { if(confirm(`Delete "${n}"?`)) deleteFileFromFolder(p, n); };

// Init
document.addEventListener('DOMContentLoaded', async () => {
    const fileInput = document.getElementById('fileInput');
    if(fileInput) fileInput.addEventListener('change', async(e) => {
        for(let f of e.target.files) if(f.type === 'application/pdf') await addFileToCurrentFolder(f);
        render();
        e.target.value = '';
    });
    
    document.getElementById('searchInput')?.addEventListener('input', () => render());
    document.getElementById('backBtn')?.addEventListener('click', goBack);
    document.getElementById('uploadBtn')?.addEventListener('click', triggerUpload);

    try { await initDB(); await loadFromIndexedDB(); } catch(e) { console.error(e); }
});
