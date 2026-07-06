const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const Jimp = require('jimp');
const axios = require('axios');
const Pino = require('pino');
const readline = require('readline');

const { getSettings } = require('./lib/settings');
const { getSelfMode, setSelfMode, getGroupSettings, setGroupSettings } = require('./lib/database');
const { generateMenuText, generateCategoryText } = require('./lib/functions');

const config = getSettings();
let selfMode = getSelfMode();

// ==================== UTILITY ====================
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// ==================== COMMAND HANDLER ====================
async function handleMessage(sock, m) {
    try {
        const msg = m.messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const isOwner = sender === config.owner || sender === botNumber;

        // ------ SELF MODE ------
        if (selfMode && !isOwner) return;

        // ------ CEK PESAN TEKS / MEDIA ------
        let content = '';
        let mediaType = null;
        let mediaBuffer = null;

        if (msg.message.conversation) {
            content = msg.message.conversation;
        } else if (msg.message.extendedTextMessage) {
            content = msg.message.extendedTextMessage.text || '';
        } else if (msg.message.imageMessage) {
            content = msg.message.imageMessage.caption || '';
            mediaType = 'image';
            mediaBuffer = await sock.downloadMediaMessage(msg);
        } else if (msg.message.videoMessage) {
            content = msg.message.videoMessage.caption || '';
            mediaType = 'video';
            mediaBuffer = await sock.downloadMediaMessage(msg);
        } else if (msg.message.stickerMessage) {
            // untuk antisticker
            content = '';
            mediaType = 'sticker';
        }

        if (!content && !mediaType) return;

        // ------ COMMAND PARSING ------
        const parts = content.trim().split(/\s+/);
        const cmd = parts[0] ? parts[0].toLowerCase() : '';
        const params = parts.slice(1);

        // ------ COMMANDS ------
        if (cmd === '.self' || cmd === '.self') {
            if (!isOwner) return;
            selfMode = true;
            setSelfMode(true);
            await sock.sendMessage(from, { text: '✅ Mode SELF aktif. Hanya owner yang bisa menggunakan bot.' });
        }
        else if (cmd === '.public') {
            if (!isOwner) return;
            selfMode = false;
            setSelfMode(false);
            await sock.sendMessage(from, { text: '✅ Mode PUBLIC aktif. Semua orang bisa menggunakan bot.' });
        }
        else if (cmd === '.ping') {
            await sock.sendMessage(from, { text: 'Pong! 🏓' });
        }
        else if (cmd === '.owner') {
            await sock.sendMessage(from, { text: `👤 Owner: ${config.ownerName}\n📱 Nomor: ${config.owner.split('@')[0]}` });
        }
        else if (cmd === '.info') {
            await sock.sendMessage(from, { text: `🤖 *BOT WANGZ*\n📌 Version: 1.0.0\n👨‍💻 Creator: ${config.ownerName}\n📅 Uptime: ${require('./lib/functions').getUptime()}\n🔧 Mode: ${selfMode ? 'Self' : 'Public'}` });
        }
        else if (cmd === '.menu' || cmd === '.help') {
            if (params.length === 0) {
                const buttons = [
                    { buttonId: '.menu all', buttonText: { displayText: 'ALL' }, type: 1 },
                    { buttonId: '.menu owner', buttonText: { displayText: 'OWNER' }, type: 1 },
                    { buttonId: '.menu grub', buttonText: { displayText: 'GRUB' }, type: 1 },
                    { buttonId: '.menu tools', buttonText: { displayText: 'TOOLS' }, type: 1 }
                ];
                const text = generateMenuText(sock, selfMode);
                await sock.sendMessage(from, { text, buttons });
            } else {
                const category = params[0].toLowerCase();
                if (['all', 'owner', 'grub', 'tools'].includes(category)) {
                    const text = generateCategoryText(category);
                    await sock.sendMessage(from, { text });
                } else {
                    await sock.sendMessage(from, { text: '❌ Kategori tidak valid. Pilih: all, owner, grub, tools' });
                }
            }
        }
        else if (cmd === '.sticker' || cmd === '.s') {
            if (!mediaBuffer || (mediaType !== 'image' && mediaType !== 'video')) {
                await sock.sendMessage(from, { text: '❌ Kirim gambar/video dengan caption .sticker atau .s' });
                return;
            }
            try {
                // Gunakan Jimp untuk resize dan export webp
                const image = await Jimp.read(mediaBuffer);
                image.resize(512, 512, Jimp.RESIZE_BEZIER);
                const stickerBuffer = await image.getBufferAsync(Jimp.MIME_WEBP);
                await sock.sendMessage(from, { sticker: stickerBuffer });
            } catch (e) {
                console.error(e);
                await sock.sendMessage(from, { text: '❌ Gagal membuat stiker.' });
            }
        }
        else if (cmd === '.brat') {
            const text = params.join(' ') || 'Brat';
            try {
                const image = new Jimp(512, 512, '#ffffff');
                const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
                image.print(font, 10, 10, text, 500, 500);
                const buffer = await image.getBufferAsync(Jimp.MIME_WEBP);
                await sock.sendMessage(from, { sticker: buffer });
            } catch (e) {
                console.error(e);
                await sock.sendMessage(from, { text: '❌ Gagal membuat brat sticker.' });
            }
        }
        else if (cmd === '.antilink') {
            if (!isGroup) return;
            if (!isOwner) return;
            const action = params[0];
            const settings = getGroupSettings(from) || {};
            if (action === 'on') {
                settings.antilink = true;
                setGroupSettings(from, settings);
                await sock.sendMessage(from, { text: '✅ Anti-link diaktifkan di grup ini.' });
            } else if (action === 'off') {
                settings.antilink = false;
                setGroupSettings(from, settings);
                await sock.sendMessage(from, { text: '❌ Anti-link dinonaktifkan di grup ini.' });
            } else {
                await sock.sendMessage(from, { text: 'Gunakan .antilink on/off' });
            }
        }
        else if (cmd === '.antitoxic') {
            if (!isGroup) return;
            if (!isOwner) return;
            const action = params[0];
            const settings = getGroupSettings(from) || {};
            if (action === 'on') {
                settings.antitoxic = true;
                setGroupSettings(from, settings);
                await sock.sendMessage(from, { text: '✅ Anti-toxic diaktifkan di grup ini.' });
            } else if (action === 'off') {
                settings.antitoxic = false;
                setGroupSettings(from, settings);
                await sock.sendMessage(from, { text: '❌ Anti-toxic dinonaktifkan di grup ini.' });
            } else {
                await sock.sendMessage(from, { text: 'Gunakan .antitoxic on/off' });
            }
        }
        else if (cmd === '.antisticker') {
            if (!isGroup) return;
            if (!isOwner) return;
            const action = params[0];
            const settings = getGroupSettings(from) || {};
            if (action === 'on') {
                settings.antisticker = true;
                setGroupSettings(from, settings);
                await sock.sendMessage(from, { text: '✅ Anti-sticker diaktifkan di grup ini.' });
            } else if (action === 'off') {
                settings.antisticker = false;
                setGroupSettings(from, settings);
                await sock.sendMessage(from, { text: '❌ Anti-sticker dinonaktifkan di grup ini.' });
            } else {
                await sock.sendMessage(from, { text: 'Gunakan .antisticker on/off' });
            }
        }
        else if (cmd === '.add') {
            if (!isGroup) return;
            if (!isOwner) return;
            const metadata = await sock.groupMetadata(from);
            const botAdmin = metadata.participants.find(p => p.id === botNumber && p.admin);
            if (!botAdmin) {
                await sock.sendMessage(from, { text: '❌ Bot bukan admin grup.' });
                return;
            }
            const mention = params[0] || '';
            let number = mention.replace(/[^0-9]/g, '');
            if (!number) {
                await sock.sendMessage(from, { text: '❌ Masukkan nomor yang akan ditambahkan. Contoh: .add 6281234567890' });
                return;
            }
            const jid = number + '@s.whatsapp.net';
            try {
                await sock.groupParticipantsUpdate(from, [jid], 'add');
                await sock.sendMessage(from, { text: `✅ Berhasil menambahkan @${number}`, mentions: [jid] });
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Gagal menambahkan member.' });
            }
        }
        else if (cmd === '.kick') {
            if (!isGroup) return;
            if (!isOwner) return;
            const metadata = await sock.groupMetadata(from);
            const botAdmin = metadata.participants.find(p => p.id === botNumber && p.admin);
            if (!botAdmin) {
                await sock.sendMessage(from, { text: '❌ Bot bukan admin grup.' });
                return;
            }
            const mention = params[0] || '';
            let number = mention.replace(/[^0-9]/g, '');
            if (!number) {
                await sock.sendMessage(from, { text: '❌ Masukkan nomor yang akan dikick. Contoh: .kick 6281234567890' });
                return;
            }
            const jid = number + '@s.whatsapp.net';
            try {
                await sock.groupParticipantsUpdate(from, [jid], 'remove');
                await sock.sendMessage(from, { text: `✅ Berhasil mengeluarkan @${number}`, mentions: [jid] });
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Gagal mengeluarkan member.' });
            }
        }
        else if (cmd === '.upswgc') {
            if (!isGroup) return;
            if (!isOwner) return;
            const newSubject = params.join(' ') || 'Update by Bot';
            try {
                await sock.groupUpdateSubject(from, newSubject);
                await sock.sendMessage(from, { text: `✅ Subject grup diubah menjadi: ${newSubject}` });
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Gagal mengupdate subject grup.' });
            }
        }
        else if (cmd === '.rvo' || cmd === '.getpp') {
            let target = sender;
            if (params.length > 0) {
                let num = params[0].replace(/[^0-9]/g, '');
                if (num) target = num + '@s.whatsapp.net';
            }
            try {
                const ppUrl = await sock.profilePictureUrl(target, 'image');
                const buffer = await axios.get(ppUrl, { responseType: 'arraybuffer' }).then(res => Buffer.from(res.data));
                await sock.sendMessage(from, { image: buffer, caption: `📸 Foto profil ${target.split('@')[0]}` });
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ Gagal mengambil foto profil.' });
            }
        }
        else if (cmd === '.tagall') {
            if (!isGroup) return;
            if (!isOwner) return;
            const metadata = await sock.groupMetadata(from);
            const participants = metadata.participants;
            const mentions = participants.map(p => p.id);
            const text = params.join(' ') || '📢 *PENGUMUMAN* untuk semua member:';
            await sock.sendMessage(from, { text: text, mentions: mentions });
        }
        else if (cmd === '.hidetag' || cmd === '.h') {
            if (!isGroup) return;
            if (!isOwner) return;
            const metadata = await sock.groupMetadata(from);
            const participants = metadata.participants;
            const mentions = participants.map(p => p.id);
            const text = params.join(' ') || '📢 *PENGUMUMAN* untuk semua member (tersembunyi):';
            await sock.sendMessage(from, { text: text, mentions: mentions });
            await sock.sendMessage(from, { delete: msg.key });
        }
        else if (cmd === '.groupinfo') {
            if (!isGroup) return;
            const metadata = await sock.groupMetadata(from);
            const desc = metadata.desc || 'Tidak ada deskripsi';
            const count = metadata.participants.length;
            const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
            await sock.sendMessage(from, { text: `📋 *INFO GRUP*\n📛 Nama: ${metadata.subject}\n📝 Deskripsi: ${desc}\n👥 Anggota: ${count}\n👑 Admin: ${admins.length}\n📅 Dibuat: ${moment(metadata.creation * 1000).format('DD/MM/YYYY HH:mm')}` });
        }
        else if (cmd === '.listadmins') {
            if (!isGroup) return;
            const metadata = await sock.groupMetadata(from);
            const admins = metadata.participants.filter(p => p.admin);
            if (admins.length === 0) {
                await sock.sendMessage(from, { text: 'Tidak ada admin.' });
                return;
            }
            const adminList = admins.map((p, i) => `${i+1}. @${p.id.split('@')[0]}`).join('\n');
            const mentions = admins.map(p => p.id);
            await sock.sendMessage(from, { text: `👑 *Daftar Admin Grup:*\n${adminList}`, mentions });
        }
        else {
            return;
        }

        // ------ FITUR OTOMATIS GRUP ------
        if (isGroup) {
            const settings = getGroupSettings(from) || {};
            if (settings.antilink) {
                const text = content;
                if (text.includes('http://') || text.includes('https://')) {
                    if (!isOwner) {
                        await sock.sendMessage(from, { delete: msg.key });
                    }
                }
            }
            if (settings.antitoxic) {
                const toxicWords = ['babi', 'anjing', 'kontol', 'memek', 'ngentot'];
                if (toxicWords.some(word => content.toLowerCase().includes(word))) {
                    if (!isOwner) {
                        await sock.sendMessage(from, { delete: msg.key });
                    }
                }
            }
            if (settings.antisticker && msg.message.stickerMessage) {
                if (!isOwner) {
                    await sock.sendMessage(from, { delete: msg.key });
                }
            }
        }

    } catch (err) {
        console.error('Error handling message:', err);
    }
}

// ==================== MAIN BOT ====================
async function startBot() {
    console.log('🔄 Memulai BOT WANGZ...');
    const auth = await useMultiFileAuthState('session');
    const sock = makeWASocket({
        auth: auth.state,
        printQRInTerminal: false,
        logger: Pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome'),
    });

    if (!auth.state.creds.registered) {
        const phone = await question('📱 Masukkan nomor WhatsApp (contoh: 6281234567890): ');
        rl.close();
        console.log('⏳ Meminta kode pairing...');
        const code = await sock.requestPairingCode(phone);
        console.log(`🔑 Kode Pairing: ${code}`);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log('🚫 Session logout, hapus folder session dan restart...');
                fs.rmSync('./session', { recursive: true, force: true });
                startBot();
            } else {
                console.log('🔄 Koneksi terputus, mencoba reconnect...');
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ Bot BOT WANGZ berhasil login!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        await handleMessage(sock, m);
    });
}

startBot().catch(err => console.error('Error start:', err));
