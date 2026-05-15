// ==================== INDEXEDDB CORE ====================
const DB_NAME = 'OarcelDB';
const DB_VERSION = 8;
let db = null;
let allFiles = {};
let allNotes = {};
let fileSystem = {};
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

// ========== EACH FURNACE GETS INDEPENDENT FOLDER NAMES ==========
function createFurnaceDataLogs(furnaceNumber) {
    const logs = {};
    // Define different names for each furnace - EDIT THESE ARRAYS AS YOU WANT
    const furnaceNames = {
        1: [
            "F1 Temp Log", "F1 Pressure Log", "F1 Quality Log", "F1 Maintenance",
            "F1 Production", "F1 Safety", "F1 Shift A", "F1 Shift B",
            "F1 Raw Material", "F1 Finished", "F1 Defects", "F1 Efficiency",
            "F1 Downtime", "F1 Operator", "F1 Supervisor", "F1 Weekly",
            "F1 Monthly", "F1 Annual", "F1 Inspection", "F1 Calibration"
        ],
        2: [
            "F2 Temp Log", "F2 Pressure Log", "F2 Quality Log", "F2 Maintenance",
            "F2 Production", "F2 Safety", "F2 Shift A", "F2 Shift B",
            "F2 Raw Material", "F2 Finished", "F2 Defects", "F2 Efficiency",
            "F2 Downtime", "F2 Operator", "F2 Supervisor", "F2 Weekly",
            "F2 Monthly", "F2 Annual", "F2 Inspection", "F2 Calibration"
        ],
        3: [
            "F3 Temp Log", "F3 Pressure Log", "F3 Quality Log", "F3 Maintenance",
            "F3 Production", "F3 Safety", "F3 Shift A", "F3 Shift B",
            "F3 Raw Material", "F3 Finished", "F3 Defects", "F3 Efficiency",
            "F3 Downtime", "F3 Operator", "F3 Supervisor", "F3 Weekly",
            "F3 Monthly", "F3 Annual", "F3 Inspection", "F3 Calibration"
        ],
        4: [
            "F4 Temp Log", "F4 Pressure Log", "F4 Quality Log", "F4 Maintenance",
            "F4 Production", "F4 Safety", "F4 Shift A", "F4 Shift B",
            "F4 Raw Material", "F4 Finished", "F4 Defects", "F4 Efficiency",
            "F4 Downtime", "F4 Operator", "F4 Supervisor", "F4 Weekly",
            "F4 Monthly", "F4 Annual", "F4 Inspection", "F4 Calibration"
        ]
    };
    
    const names = furnaceNames[furnaceNumber] || furnaceNames[1];
    for(let i = 0; i < names.length; i++) {
        logs[names[i]] = {};
    }
    return logs;
}

async function loadFromIndexedDB() {
    const folderReq = db.transaction('folderStructure','readonly').objectStore('folderStructure').get('structure');
    folderReq.onsuccess = ()=>{
        if(folderReq.result) fileSystem = folderReq.result.value;
        else {
            fileSystem = {
                "REMELT": {
                    "FURNACE 1": createFurnaceDataLogs(1), 
                    "FURNACE 2": createFurnaceDataLogs(2), 
                    "FURNACE 3": createFurnaceDataLogs(3),
                    "FURNACE 4": createFurnaceDataLogs(4), 
                    "FURNACE 5": {}, 
                    "ACD": {}, 
                    "DBF": {}, 
                    "ROD FEEDER": {}, 
                    "LAUNDER HEATERS": {},
                    "LAUNDER PANEL ": {}, 
                    "HPU 1": {}, 
                    "HPU 2": {}, 
                    "M":{}, 
                    "N":{}, 
                    "O":{}, 
                    "P":{}, 
                    "Q":{}, 
                    "R":{}, 
                    "S":{}, 
                    "T":{}, 
                    "U":{}, 
                    "V":{}, 
                    "W":{}, 
                    "X":{}, 
                    "Y":{}, 
                    "Z":{}
                },
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
        const fileReq = db.transaction('files','readonly').objectStore('files').getAll();
        fileReq.onsuccess = ()=>{
            allFiles = {};
            for(let item of fileReq.result) allFiles[item.folderPath] = item.files;
            const notesReq = db.transaction('notes','readonly').objectStore('notes').getAll();
            notesReq.onsuccess = ()=>{
                allNotes = {};
                for(let item of notesReq.result) allNotes[item.folderPath] = item.notes;
                render();
            };
        };
    };
}

// Rest of the functions (getCurrentFolderObject, addFile, delete, rename, notes, card creation, render, etc.) 
// remain exactly the same as your original code. Only the createFurnaceDataLogs and loadFromIndexedDB are changed.
// To keep the answer concise, I'm not repeating all unchanged functions. 
// You can copy your existing code from the original app.js from line 150 onwards.