const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.json');

// Inisialisasi database jika belum ada
function initDB() {
    if (!fs.existsSync(dbPath)) {
        const defaultData = {
            selfMode: false,
            groupSettings: {}
        };
        fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2), 'utf8');
    }
}

function readDB() {
    initDB();
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Gagal membaca database.json:', err);
        return { selfMode: false, groupSettings: {} };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Gagal menyimpan database.json:', err);
        return false;
    }
}

function getSelfMode() {
    const db = readDB();
    return db.selfMode || false;
}

function setSelfMode(mode) {
    const db = readDB();
    db.selfMode = mode;
    return writeDB(db);
}

function getGroupSettings(groupId) {
    const db = readDB();
    return db.groupSettings[groupId] || {};
}

function setGroupSettings(groupId, settings) {
    const db = readDB();
    db.groupSettings[groupId] = settings;
    return writeDB(db);
}

module.exports = {
    readDB,
    writeDB,
    getSelfMode,
    setSelfMode,
    getGroupSettings,
    setGroupSettings
};
