// OARCEL Document Manager - Full Functional Script with Persistence

// ----- Storage Keys -----
const STORAGE_KEY = 'oarcel_document_manager';

// Default structure (8 departments with sample subfolders)
const defaultData = {
    "REMELT": { folders: ["FURNACE 1", "FURNACE 2", "FURNACE 3"], files: { "FURNACE 1": [], "FURNACE 2": [], "FURNACE 3": [] } },
    "CASTER": { folders: ["MOLD A", "MOLD B"], files: { "MOLD A": [], "MOLD B": [] } },
    "HRM": { folders: ["POLICIES", "EMPLOYEES"], files: { "POLICIES": [], "EMPLOYEES": [] } },
    "CRM": { folders: ["CUSTOMERS", "LEADS"], files: { "CUSTOMERS": [], "LEADS": [] } },
    "ANNEALING": { folders: ["OVEN 1", "OVEN 2"], files: { "OVEN 1": [], "OVEN 2": [] } },
    "TLL": { folders: ["LOGISTICS"], files: { "LOGISTICS": [] } },
    "SLITTER": { folders: ["BLADE SETUP"], files: { "BLADE SETUP": [] } },
    "UTILITY": { folders: ["POWER", "WATER"], files: { "POWER": [], "WATER": [] } }
};

// Load or initialize data
let documentData = { ...defaultData };
let currentDept = null;
let currentFolder = null;
let searchQuery = '';

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // merge with default structure to ensure new depts/folders exist
            for (let dept in defaultData) {
                if (!parsed[dept]) parsed[dept] = JSON.parse(JSON.stringify(defaultData[dept]));
                else {
                    if (!parsed[dept].folders) parsed[dept].folders = defaultData[dept].folders;
                    if (!parsed[dept].files) parsed[dept].files = {};
                    defaultData[dept].folders.forEach(f => {
                        if (!parsed[dept].files[f]) parsed[dept].files[f] = [];
                    });
                }
            }
            documentData = parsed;
        } catch(e) { console.warn(e); }
    } else {
        documentData = JSON.parse(JSON.stringify(defaultData));
    }
    saveData();
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documentData));
}

// ----- Helper Functions -----
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.querySelector('span').innerText = msg;
    toast.classList.add('show');
    if (isError) toast.classList.add('error');
    else toast.classList.remove('error');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function showLoading(show) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.classList.toggle('hidden', !show);
}

function updateStats() {
    let folderCount = 0;
    let fileCount = 0;
    for (let dept in documentData) {
        folderCount += documentData[dept].folders.length;
        for (let f in documentData[dept].files) {
            fileCount += documentData[dept].files[f].length;
        }
    }
    document.getElementById('folderCount').innerText = folderCount;
    document.getElementById('fileCount').innerText = fileCount;
}

// ----- Rendering -----
function renderDepartments() {
    const container = document.getElementById('departmentsSection');
    if (!container) return;
    const depts = Object.keys(documentData);
    container.innerHTML = `<div class="departments-grid">` +
        depts.map(dept => `
            <div class="dept-card" data-dept="${dept}">
                <div class="dept-oval"><i class="fas fa-building"></i><span>${dept}</span></div>
                <div class="dept-arrow"><i class="fas fa-chevron-right"></i></div>
                <div class="dept-info">${documentData[dept].folders.length} folders</div>
            </div>
        `).join('') +
        `</div>`;
    document.querySelectorAll('.dept-card').forEach(card => {
        card.addEventListener('click', () => {
            currentDept = card.getAttribute('data-dept');
            currentFolder = null;
            searchQuery = '';
            document.getElementById('searchInput').value = '';
            updateSearchInfo();
            updateBreadcrumb();
            renderCurrentView();
            updateBackButton();
        });
    });
}

function renderCurrentView() {
    const contentDiv = document.getElementById('content');
    if (!contentDiv) return;
    if (searchQuery) {
        renderSearchResults();
        return;
    }
    if (!currentDept) {
        contentDiv.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>Select a department from above</p></div>';
        return;
    }
    const dept = documentData[currentDept];
    if (!dept) return;
    if (!currentFolder) {
        // Show folders
        contentDiv.innerHTML = `
            <div class="action-bar">
                <button class="action-btn" id="addFolderBtn"><i class="fas fa-plus"></i> Add Subfolder</button>
            </div>
            <div class="departments-grid">
                ${dept.folders.map(folder => `
                    <div class="dept-card" data-folder="${folder}">
                        <div class="dept-oval"><i class="fas fa-folder"></i><span>${folder}</span></div>
                        <div class="dept-arrow"><i class="fas fa-chevron-right"></i></div>
                        <div class="dept-info">${dept.files[folder]?.length || 0} files</div>
                    </div>
                `).join('')}
            </div>
        `;
        document.querySelectorAll('[data-folder]').forEach(el => {
            el.addEventListener('click', () => {
                currentFolder = el.getAttribute('data-folder');
                updateBreadcrumb();
                renderCurrentView();
                updateBackButton();
            });
        });
        const addBtn = document.getElementById('addFolderBtn');
        if (addBtn) addBtn.onclick = () => {
            const newName = prompt('Enter subfolder name:');
            if (newName && !dept.folders.includes(newName)) {
                dept.folders.push(newName);
                dept.files[newName] = [];
                saveData();
                renderCurrentView();
                updateStats();
                updateBreadcrumb();
                showToast(`Folder "${newName}" created`);
            } else if (newName) showToast('Folder already exists', true);
        };
    } else {
        // Show files in folder
        const files = dept.files[currentFolder] || [];
        if (files.length === 0) {
            contentDiv.innerHTML = `
                <div class="action-bar">
                    <button class="action-btn" id="uploadFileBtn"><i class="fas fa-upload"></i> Upload Document</button>
                    <button class="action-btn" id="renameFolderBtn"><i class="fas fa-edit"></i> Rename Folder</button>
                    <button class="action-btn" id="deleteFolderBtn"><i class="fas fa-trash"></i> Delete Folder</button>
                </div>
                <div class="empty-state"><i class="fas fa-file-pdf"></i><p>No documents in this folder</p></div>
            `;
        } else {
            contentDiv.innerHTML = `
                <div class="action-bar">
                    <button class="action-btn" id="uploadFileBtn"><i class="fas fa-upload"></i> Upload Document</button>
                    <button class="action-btn" id="renameFolderBtn"><i class="fas fa-edit"></i> Rename Folder</button>
                    <button class="action-btn" id="deleteFolderBtn"><i class="fas fa-trash"></i> Delete Folder</button>
                </div>
                ${files.map((file, idx) => `
                    <div class="card" data-file-index="${idx}">
                        <div class="card-icon"><i class="fas fa-file-pdf"></i></div>
                        <div class="card-filename">${escapeHtml(file.name)}</div>
                        <div class="card-buttons">
                            <button class="rename-file-btn"><i class="fas fa-pen"></i> Rename</button>
                            <button class="delete-btn"><i class="fas fa-trash"></i> Delete</button>
                        </div>
                    </div>
                `).join('')}
            `;
        }
        // attach event handlers
        document.getElementById('uploadFileBtn')?.addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('renameFolderBtn')?.addEventListener('click', () => {
            const newName = prompt('New folder name:', currentFolder);
            if (newName && newName !== currentFolder && !dept.folders.includes(newName)) {
                const index = dept.folders.indexOf(currentFolder);
                if (index !== -1) dept.folders[index] = newName;
                dept.files[newName] = dept.files[currentFolder];
                delete dept.files[currentFolder];
                currentFolder = newName;
                saveData();
                renderCurrentView();
                updateBreadcrumb();
                updateStats();
                showToast(`Folder renamed to "${newName}"`);
            } else if (newName === currentFolder) { /* no change */ }
            else if (newName) showToast('Folder name already exists', true);
        });
        document.getElementById('deleteFolderBtn')?.addEventListener('click', () => {
            if (confirm(`Delete folder "${currentFolder}" and all its documents?`)) {
                const idx = dept.folders.indexOf(currentFolder);
                if (idx !== -1) dept.folders.splice(idx,1);
                delete dept.files[currentFolder];
                currentFolder = null;
                saveData();
                renderCurrentView();
                updateBreadcrumb();
                updateStats();
                showToast('Folder deleted');
            }
        });
        // file rename/delete
        document.querySelectorAll('.rename-file-btn').forEach((btn, i) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileObj = files[i];
                const newName = prompt('New file name (without .pdf):', fileObj.name.replace('.pdf',''));
                if (newName && newName.trim()) {
                    fileObj.name = newName.trim() + '.pdf';
                    saveData();
                    renderCurrentView();
                    showToast('File renamed');
                }
            });
        });
        document.querySelectorAll('.delete-btn').forEach((btn, i) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete "${files[i].name}"?`)) {
                    files.splice(i,1);
                    saveData();
                    renderCurrentView();
                    updateStats();
                    showToast('File deleted');
                }
            });
        });
    }
}

function renderSearchResults() {
    const contentDiv = document.getElementById('content');
    const query = searchQuery.toLowerCase();
    let results = [];
    for (let dept in documentData) {
        for (let folder in documentData[dept].files) {
            const files = documentData[dept].files[folder];
            files.forEach(file => {
                if (file.name.toLowerCase().includes(query)) {
                    results.push({ dept, folder, file });
                }
            });
        }
    }
    if (results.length === 0) {
        contentDiv.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><p>No documents match "${escapeHtml(searchQuery)}"</p></div>`;
        return;
    }
    contentDiv.innerHTML = results.map(res => `
        <div class="card" data-dept="${res.dept}" data-folder="${res.folder}" data-file="${res.file.name}">
            <div class="card-icon"><i class="fas fa-file-pdf"></i></div>
            <div class="card-filename">${escapeHtml(res.file.name)} <span style="font-size:0.7rem; opacity:0.7;">in ${res.dept} / ${res.folder}</span></div>
            <div class="card-buttons">
                <button class="open-file-btn"><i class="fas fa-eye"></i> Open</button>
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.open-file-btn')) {
                const dept = card.getAttribute('data-dept');
                const folder = card.getAttribute('data-folder');
                const fileName = card.getAttribute('data-file');
                const fileObj = documentData[dept]?.files[folder]?.find(f => f.name === fileName);
                if (fileObj && fileObj.data) {
                    const byteCharacters = atob(fileObj.data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    URL.revokeObjectURL(url);
                } else {
                    showToast('File data not found', true);
                }
            }
        });
    });
}

function updateBreadcrumb() {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    let html = `<div class="breadcrumb-item" data-breadcrumb="home"><i class="fas fa-home"></i> Home</div>`;
    if (currentDept) {
        html += `<span class="breadcrumb-separator"><i class="fas fa-chevron-right"></i></span><div class="breadcrumb-item" data-breadcrumb="dept">${escapeHtml(currentDept)}</div>`;
    }
    if (currentFolder) {
        html += `<span class="breadcrumb-separator"><i class="fas fa-chevron-right"></i></span><div class="breadcrumb-item" data-breadcrumb="folder">${escapeHtml(currentFolder)}</div>`;
    }
    bc.innerHTML = html;
    bc.querySelectorAll('.breadcrumb-item').forEach(el => {
        el.addEventListener('click', () => {
            const type = el.getAttribute('data-breadcrumb');
            if (type === 'home') {
                currentDept = null;
                currentFolder = null;
                searchQuery = '';
                document.getElementById('searchInput').value = '';
                updateSearchInfo();
                renderDepartments();
                renderCurrentView();
                updateBreadcrumb();
                updateBackButton();
            } else if (type === 'dept') {
                currentFolder = null;
                renderCurrentView();
                updateBreadcrumb();
                updateBackButton();
            } else if (type === 'folder') {
                // already there
            }
        });
    });
}

function updateBackButton() {
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        if (currentDept || currentFolder || searchQuery) backBtn.classList.remove('hidden');
        else backBtn.classList.add('hidden');
    }
}

function updateSearchInfo() {
    const infoDiv = document.getElementById('searchInfo');
    if (searchQuery) {
        infoDiv.innerHTML = `<i class="fas fa-search"></i> Showing results for "${escapeHtml(searchQuery)}" <button id="clearSearch">Clear</button>`;
        infoDiv.classList.remove('hidden');
        document.getElementById('clearSearch')?.addEventListener('click', () => {
            searchQuery = '';
            document.getElementById('searchInput').value = '';
            updateSearchInfo();
            renderCurrentView();
            updateBreadcrumb();
            updateBackButton();
        });
    } else {
        infoDiv.classList.add('hidden');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ----- File Upload Handling (store as base64 in localStorage) -----
function handleFileUpload(files) {
    if (!currentDept || !currentFolder) {
        showToast('Please select a folder first', true);
        return;
    }
    for (let file of files) {
        if (file.type !== 'application/pdf') {
            showToast(`${file.name} is not a PDF`, true);
            continue;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result.split(',')[1];
            const fileObj = { name: file.name, data: base64 };
            documentData[currentDept].files[currentFolder].push(fileObj);
            saveData();
            updateStats();
            renderCurrentView();
            showToast(`Uploaded ${file.name}`);
        };
        reader.readAsDataURL(file);
    }
}

// ----- Initialization -----
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateStats();
    renderDepartments();
    renderCurrentView();
    updateBreadcrumb();
    updateBackButton();

    // Theme toggle
    const savedTheme = localStorage.getItem('oarcel-theme');
    if (savedTheme === 'light') document.body.classList.add('light-mode');
    document.getElementById('themeToggle')?.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        localStorage.setItem('oarcel-theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
    });

    // Search
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val.length > 0) {
            searchQuery = val;
            updateSearchInfo();
            renderCurrentView();
            updateBackButton();
            clearSearchBtn.classList.remove('hidden');
        } else {
            searchQuery = '';
            updateSearchInfo();
            renderCurrentView();
            updateBackButton();
            clearSearchBtn.classList.add('hidden');
        }
    });
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        updateSearchInfo();
        renderCurrentView();
        updateBackButton();
        clearSearchBtn.classList.add('hidden');
    });

    // Back button
    document.getElementById('backBtn')?.addEventListener('click', () => {
        if (searchQuery) {
            searchQuery = '';
            searchInput.value = '';
            updateSearchInfo();
            renderCurrentView();
            updateBackButton();
        } else if (currentFolder) {
            currentFolder = null;
            renderCurrentView();
            updateBreadcrumb();
            updateBackButton();
        } else if (currentDept) {
            currentDept = null;
            renderDepartments();
            renderCurrentView();
            updateBreadcrumb();
            updateBackButton();
        }
    });

    // Upload button
    const fileInput = document.getElementById('fileInput');
    document.getElementById('uploadBtn')?.addEventListener('click', () => {
        if (!currentDept || !currentFolder) {
            showToast('Please open a folder first', true);
            return;
        }
        fileInput.click();
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFileUpload(Array.from(e.target.files));
        fileInput.value = '';
    });
});