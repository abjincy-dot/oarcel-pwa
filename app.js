/* Action Bar - Rename, Delete, Add Folder buttons */
.action-bar {
    grid-column: 1 / -1;
    display: flex;
    gap: 12px;
    padding: 10px;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 10px;
}

.action-btn {
    background: rgba(30, 30, 50, 0.8);
    border: 1px solid rgba(59, 130, 246, 0.3);
    padding: 8px 16px;
    border-radius: 30px;
    color: white;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
}

.action-btn:hover {
    transform: translateY(-2px);
}

.rename-btn:hover {
    background: #3b82f6;
    border-color: #3b82f6;
}

.delete-folder-btn:hover {
    background: #ef4444;
    border-color: #ef4444;
}

.add-folder-btn:hover {
    background: #10b981;
    border-color: #10b981;
}
