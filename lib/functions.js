const moment = require('moment');

let startTime = Date.now();

function getUptime() {
    const diff = Date.now() - startTime;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
}

function generateMenuText(sock, selfMode) {
    const now = moment().format('HH:mm:ss');
    const date = moment().format('DD/MM/YYYY');
    const uptime = getUptime();
    const name = sock?.user?.name || 'Bot';
    const botNumber = sock?.user?.id?.split(':')[0] || '';

    return `
*🤖 Bot* 

╔═══════════════╗
║     🚀 *Wangz BOT*          ║
╚═══════════════╝
╔═══════════════╗
║  ✨ Created by: *Fiq*       ║
║  ⏰ Time: ${now}               ║
║  📅 Date: ${date}  ║
╚═══════════════╝

*Hello there 👋*  
I'm *Bot*, a versatile WhatsApp bot!

🔧 *Quick Commands:*
• .menu all - Show all features
• .menu list - Show categories
• .owner - Contact creator

╭─「 📊 SYSTEM INFO 」
├ Speed: 0 MHz
└ Uptime: ${uptime}
╰─────────────

╭─「 👤 USER INFO 」
├ Name: ${name}
├ Number: ${botNumber}
└ Status: ${selfMode ? 'Self Mode' : 'Public Mode'}
╰─────────────

🎉 *Thank you for using jere-md!*
📞 Fiq • (${now}) WIB
    `;
}

function generateCategoryText(category) {
    const now = moment().format('HH:mm:ss');
    const date = moment().format('DD/MM/YYYY');
    let commands = '';
    if (category === 'owner') {
        commands = `.self\n.public\n.ping\n.owner\n.info\n.tagall (owner only)\n.hidetag / .h (owner only)`;
    } else if (category === 'grub') {
        commands = `.add\n.kick\n.upswgc\n.antilink\n.antitoxic\n.antisticker\n.groupinfo\n.listadmins\n.tagall\n.hidetag / .h`;
    } else if (category === 'tools') {
        commands = `.sticker (gambar/video) alias .s\n.brat (teks)\n.rvo (foto 1x)\n.getpp (foto profil)`;
    } else { // all
        commands = `.self\n.public\n.ping\n.owner\n.info\n.sticker\n.brat\n.antilink\n.antitoxic\n.antisticker\n.add\n.kick\n.upswgc\n.rvo\n.getpp\n.groupinfo\n.listadmins\n.tagall\n.hidetag / .h`;
    }
    return `
*🤖 BOT WANGZ - MENU ${category.toUpperCase()}*

╔═══════════════╗
║  📅 ${date}  ║
╚═══════════════╝

${commands}

📞 Fiq • (${now}) WIB
    `;
}

module.exports = {
    getUptime,
    generateMenuText,
    generateCategoryText
};
