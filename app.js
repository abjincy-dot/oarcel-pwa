// ==================== INDEXEDDB CORE ====================
const DB_NAME = 'OarcelDB';
const DB_VERSION = 9; // version increased for deptColors
let db = null;
let allFiles = {};
let allNotes = {};
let fileSystem = {};
let deptColors = {}; // store random gradients for departments
let currentPath = [];
let isSearchMode = false;
let currentActiveTab = 'pdfs';
let editingNoteId = null;

function showToast(msg, isErr = false) {
    const toast = document.getElementById('toast');
    toast.querySelector('span').textContent = msg;
    toast.style.background = isErr ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#10b981,#059669)";
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); toast.classList.add('hidden'); }, 3000);
}

function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

function getRandomGradient() {
    const hue1 = Math.floor(Math.random() * 360);
    const hue2 = (hue1 + 30 + Math.random() * 60) % 360;
    const sat1 = 55 + Math.random() * 30;
    const sat2 = 55 + Math.random() * 30;
    const light1 = 45 + Math.random() * 20;
    const light2 = 40 + Math.random() * 20;
    return `linear-gradient(145deg, hsl(${hue1}, ${sat1}%, ${light1}%), hsl(${hue2}, ${sat2}%, ${light2}%))`;
}

async function saveDeptColors() {
    const tx = db.transaction('folderStructure', 'readwrite');
    const store = tx.objectStore('folderStructure');
    store.put({ key: 'deptColors', value: deptColors });
    tx.commit();
}

// ========== PAGE TURN NAVIGATION ==========
function navigateWithPageTurn(navigationFn, direction = 'forward') {
    const contentDiv = document.getElementById('content');
    const deptSection = document.getElementById('departmentsSection');
    const elementsToAnimate = [contentDiv, deptSection];
    
    elementsToAnimate.forEach(el => {
        if (el && !el.classList.contains('hidden')) {
            el.classList.add(direction === 'forward' ? 'page-flip-out-right' : 'page-flip-out-left');
        }
    });
    
    setTimeout(() => {
        navigationFn();
        
        setTimeout(() => {
            elementsToAnimate.forEach(el => {
                if (el) {
                    el.classList.remove('page-flip-out-right', 'page-flip-out-left');
                    el.classList.add(direction === 'forward' ? 'page-slide-in-right' : 'page-slide-in-left');
                }
            });
            
            setTimeout(() => {
                elementsToAnimate.forEach(el => {
                    if (el) el.classList.remove('page-slide-in-right', 'page-slide-in-left');
                });
            }, 450);
        }, 30);
    }, 330);
}

function selectDepartment(d){ 
    navigateWithPageTurn(() => {
        currentPath = [d]; 
        render();
    }, 'forward');
}

function goBack(){ 
    if(currentPath.length && !isSearchMode){ 
        navigateWithPageTurn(() => {
            currentPath.pop(); 
            render();
        }, 'back');
    } else if(isSearchMode) { 
        clearSearch(); 
    }
}

function navigateToBreadcrumb(idx){
    const isGoingBack = idx < currentPath.length - 1;
    navigateWithPageTurn(() => {
        if(idx===-1) currentPath=[];
        else currentPath = currentPath.slice(0,idx+1);
        render();
    }, isGoingBack ? 'back' : 'forward');
}

function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': 'fa-file-pdf',
        'jpg': 'fa-file-image', 'jpeg': 'fa-file-image', 'png': 'fa-file-image', 'gif': 'fa-file-image', 'webp': 'fa-file-image', 'svg': 'fa-file-image'
    };
    return iconMap[ext] || 'fa-file';
}

function getFileType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'image';
    if (['pdf'].includes(ext)) return 'pdf';
    return 'other';
}

function openImageViewer(imageUrl, fileName) {
    const viewer = document.getElementById('imageViewer');
    const viewerImage = document.getElementById('viewerImage');
    viewerImage.src = imageUrl;
    viewerImage.alt = fileName;
    viewer.classList.remove('hidden');
    showToast(`Viewing: ${fileName}`);
}

function closeImageViewer() {
    const viewer = document.getElementById('imageViewer');
    const viewerImage = document.getElementById('viewerImage');
    viewer.classList.add('hidden');
    viewerImage.src = '';
}

function openFile(dataUrl, fileName) {
    const fileType = getFileType(fileName);
    if (fileType === 'image') {
        openImageViewer(dataUrl, fileName);
    } 
    else if (fileType === 'pdf') {
        fetch(dataUrl).then(r=>r.blob()).then(blob=>{
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            showToast(`Opening PDF: ${fileName}`);
            setTimeout(()=>URL.revokeObjectURL(url),60000);
        }).catch(err=>showToast(`Failed: ${err.message}`,true));
    }
    else {
        if (confirm(`This file type may not be supported. Do you want to download "${fileName}"?`)) {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            link.click();
            showToast(`Downloading: ${fileName}`);
        }
    }
}

async function saveAllNotesToDB() {
    const tx = db.transaction('notes','readwrite');
    const store = tx.objectStore('notes');
    store.clear();
    for(const folderPath in allNotes) if(allNotes[folderPath]?.length) store.put({id:folderPath, folderPath, notes:allNotes[folderPath]});
    tx.commit();
}
async function saveAllFilesToDB() {
    const tx = db.transaction('files','readwrite');
    const store = tx.objectStore('files');
    store.clear();
    for(const folderPath in allFiles) if(allFiles[folderPath]?.length) store.put({id:folderPath, folderPath, files:allFiles[folderPath]});
    tx.commit();
}
function saveFolderStructure() {
    db.transaction('folderStructure','readwrite').objectStore('folderStructure').put({key:'structure', value:fileSystem});
}

function initDB() {
    return new Promise((resolve,reject)=>{
        const req = indexedDB.open(DB_NAME,DB_VERSION);
        req.onerror = ()=>reject(req.error);
        req.onsuccess = ()=>{ db=req.result; resolve(); };
        req.onupgradeneeded = e=>{
            const db2 = e.target.result;
            if(!db2.objectStoreNames.contains('files')) db2.createObjectStore('files',{keyPath:'id'});
            if(!db2.objectStoreNames.contains('folderStructure')) db2.createObjectStore('folderStructure',{keyPath:'key'});
            if(!db2.objectStoreNames.contains('notes')) db2.createObjectStore('notes',{keyPath:'id'});
        };
    });
}

function createFurnace1Logs() {
    return {
        "Temperature Records F1": {},
        "Pressure Data F1": {},
        "Quality Check F1": {},
        "Maintenance Log F1": {},
        "Production Report F1": {},
        "Safety Checklist F1": {},
        "Morning Shift F1": {},
        "Evening Shift F1": {},
        "Night Shift F1": {},
        "Raw Material F1": {},
        "Finished Goods F1": {},