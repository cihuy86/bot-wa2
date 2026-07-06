const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '..', 'settings.json');

function getSettings() {
    try {
        const data = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Gagal membaca settings.json:', err);
        return { owner: '', ownerName: '', botName: 'BOT WANGZ' };
    }
}

function updateSettings(newSettings) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Gagal menyimpan settings.json:', err);
        return false;
    }
}

module.exports = { getSettings, updateSettings };
