require('dotenv').config();
const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { launchViewer } = require('./viewer');
const { createBackup } = require('./backup');
const { getFreeProxies } = require('./proxy_helper');

const bot = new Telegraf(process.env.BOT_TOKEN);
const OWNER_ID = parseInt(process.env.OWNER_ID);
let activeBrowsers = [];
let globalProxies = []; // Simpan proxy sementara

const MAX_VIEWERS = 50; // Batas aman biar RAM gak jebol
const BOT_IMG = 'https://raw.githubusercontent.com/node-telegram-bot-api/node-telegram-bot-api/master/doc/logo.png'; // Gambar cadangan yang lebih stabil

// Fungsi kirim pesan aman dengan Photo + Fallback ke Teks
async function safeReply(ctx, text, isPhoto = false) {
    try {
        if (isPhoto) {
            try {
                await ctx.replyWithPhoto(BOT_IMG, { caption: text, parse_mode: 'HTML' });
            } catch (photoErr) {
                // Kalo gambar gagal, kirim teks aja biar gak eror
                await ctx.reply(text, { parse_mode: 'HTML' });
            }
        } else {
            await ctx.reply(text, { parse_mode: 'HTML' });
        }
    } catch (e) {
        console.log(`⚠️ Gagal kirim pesan ke Tele: ${e.message}`);
    }
}

function getAvailableCookies() {
    try {
        if (!fs.existsSync('cookies')) fs.mkdirSync('cookies');
        return fs.readdirSync('cookies').filter(file => file.endsWith('.json')).sort();
    } catch (e) { return []; }
}

// Bersihkan list browser kalau ada yang udah mati
async function cleanBrowsers() {
    activeBrowsers = activeBrowsers.filter(b => b.isConnected());
}

bot.start((ctx) => {
    const msg = `<b>🚀 TIKTOK BUZZER ELITE READY</b>\n\n` +
                `Halo <b>${ctx.from.first_name}</b>, selamat datang di panel kontrol bot buzzer TikTok paling menyala! 🔥\n\n` +
                `<b>📌 DAFTAR PERINTAH:</b>\n` +
                `<code>/view [URL] [JUMLAH]</code>\n└ Mode senyap + Auto Proxy\n\n` +
                `<code>/view_show [URL] [JUMLAH]</code>\n└ Muncul jendela + Auto Proxy\n\n` +
                `<code>/status</code>\n└ Pantau viewer & cookies\n\n` +
                `<code>/stop</code>\n└ Matikan semua proses\n\n` +
                `<code>/clean</code>\n└ Bersih-bersih sampah (SSD Aman)\n\n` +
                `<code>/backup</code>\n└ Amankan file project\n\n` +
                `<code>/restart</code>\n└ Refresh bot via PM2\n\n` +
                `💡 <i>Contoh: /view https://tiktok.com/@user/live 5</i>`;
    safeReply(ctx, msg, true);
});

bot.command('backup', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return safeReply(ctx, '<b>❌ AKSES DITOLAK!</b>\nAnda bukan owner yang sah.');

    try {
        const zipName = `backup_project_${Date.now()}.zip`;
        await safeReply(ctx, '<b>📦 BACKUP PROCESS...</b>\nSedang mengompres data project, harap tunggu sejenak.');
        
        await createBackup(zipName);
        
        try {
            await ctx.replyWithDocument({ source: zipName, filename: 'TikTok_Buzzer_Project.zip' });
            await safeReply(ctx, '<b>✅ BACKUP SELESAI!</b>\nFile sudah dikirim. Harap simpan di tempat aman.');
        } catch (teleErr) {
            console.log("Gagal kirim file zip ke Tele:", teleErr.message);
        }
        
        if (fs.existsSync(zipName)) fs.unlinkSync(zipName);
    } catch (e) {
        safeReply(ctx, `<b>❌ GAGAL BACKUP:</b>\n<code>${e.message}</code>`);
    }
});

const runBuzzer = async (ctx, isHeadless) => {
    await cleanBrowsers();
    const args = ctx.message.text.split(/\s+/);
    if (args.length < 3) return safeReply(ctx, '<b>⚠️ FORMAT SALAH!</b>\nGunakan: <code>/view [URL] [JUMLAH]</code>');

    const url = args[1];
    if (!url.startsWith('http')) return safeReply(ctx, '<b>❌ URL TIDAK VALID!</b>\nHarus diawali dengan http/https.');

    const cookieFiles = getAvailableCookies();
    if (cookieFiles.length === 0) return safeReply(ctx, '<b>❌ COOKIES KOSONG!</b>\nSilakan isi folder cookies terlebih dahulu.');

    let count = parseInt(args[2]);
    if (isNaN(count) || count <= 0) return safeReply(ctx, '<b>⚠️ JUMLAH INVALID!</b>\nMasukkan angka yang benar.');
    
    if (count > cookieFiles.length) {
        await safeReply(ctx, `<b>⚠️ AKUN TERBATAS!</b>\nCuma ada ${cookieFiles.length} akun. Bot akan menggunakan semua akun yang tersedia.`);
        count = cookieFiles.length;
    } else if (count > MAX_VIEWERS) {
        await safeReply(ctx, `<b>❌ OVERLOAD!</b>\nMaksimal ${MAX_VIEWERS} akun demi kesehatan RAM.`);
        count = MAX_VIEWERS;
    }

    await safeReply(ctx, `<b>🔍 PROXY HUNTING...</b>\nSedang mencari ${count} IP proxy paling seger dari internet.`);
    const fetchedProxies = await getFreeProxies();
    globalProxies = fetchedProxies.sort(() => Math.random() - 0.5);

    await safeReply(ctx, `<b>🔥 MISSION START!</b>\nMeluncurkan <b>${count}</b> viewer ke target...\n\n<i>Mohon tunggu proses pemanasan 30-60 detik per akun.</i>`);

    let success = 0;
    for (let i = 0; i < count; i++) {
        const cookieFile = cookieFiles[i % cookieFiles.length];
        const proxy = globalProxies.length > 0 ? globalProxies[i % globalProxies.length] : null;
        
        launchViewer(url, proxy, cookieFile, i + 1, isHeadless)
            .then(browser => { if (browser) { activeBrowsers.push(browser); success++; } })
            .catch(e => { console.log(`❌ Gagal meluncurkan Akun ${i+1}:`, e.message); });
        
        await new Promise(r => setTimeout(r, 8000 + Math.random() * 2000));
        
        if ((i + 1) % 5 === 0) await safeReply(ctx, `<b>📊 PROGRESS:</b>\n<code>${i + 1}/${count}</code> akun sedang dimuat...`);
    }
    
    await safeReply(ctx, `<b>✅ DEPLOYMENT FINISHED!</b>\nSeluruh proses peluncuran sudah dimulai.\n\nCek <code>/status</code> untuk pantauan berkala.`);
};

// Error handler global
bot.catch((err, ctx) => {
    console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
});

bot.command('view', (ctx) => runBuzzer(ctx, true));
bot.command('view_show', (ctx) => runBuzzer(ctx, false));

bot.command('status', async (ctx) => {
    await cleanBrowsers();
    const msg = `<b>📊 STATUS BOT BUZZER</b>\n` +
                `──────────────────\n` +
                `👥 <b>Viewer Aktif:</b> <code>${activeBrowsers.length} akun</code>\n` +
                `🍪 <b>Total Database:</b> <code>${getAvailableCookies().length} cookies</code>\n` +
                `──────────────────\n` +
                `✅ <i>Bot berjalan normal.</i>`;
    safeReply(ctx, msg);
});

bot.command('clean', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return safeReply(ctx, '<b>❌ AKSES DITOLAK!</b>');
    
    await cleanBrowsers();
    if (activeBrowsers.length > 0) return safeReply(ctx, '<b>⚠️ BOT MASIH JALAN!</b>\nSilakan <code>/stop</code> dulu sebelum bersih-bersih.');

    try {
        await safeReply(ctx, '<b>🧹 CLEANING MODE...</b>\nMenghapus cache browser dan merapikan log.');
        const profilePath = path.join(__dirname, 'temp_profiles');
        if (fs.existsSync(profilePath)) {
            fs.rmSync(profilePath, { recursive: true, force: true });
            fs.mkdirSync(profilePath);
        }
        if (fs.existsSync('log.md')) fs.writeFileSync('log.md', '');
        safeReply(ctx, '<b>✅ DISK CLEANED!</b>\nRuang penyimpanan sudah lega kembali.');
    } catch (e) {
        safeReply(ctx, `<b>❌ GAGAL CLEAN:</b> ${e.message}`);
    }
});

bot.command('stop', async (ctx) => {
    await safeReply(ctx, '<b>🛑 TERMINATING...</b>\nSedang mematikan semua browser yang aktif. Harap nunggu bentar.');
    let closed = 0;
    for (const b of activeBrowsers) { 
        try { if (b.isConnected()) { await b.close(); closed++; } } catch(e){} 
    }
    activeBrowsers = [];
    safeReply(ctx, `<b>✅ SEMUA BERHENTI!</b>\nTotal <code>${closed}</code> browser berhasil dimatikan.`);
});

bot.command('restart', async (ctx) => {
    if (ctx.from.id !== OWNER_ID) return safeReply(ctx, '<b>❌ AKSES DITOLAK!</b>');

    await safeReply(ctx, '<b>🔄 REBOOTING...</b>\nMenutup semua proses dan memulai ulang bot.');
    for (const b of activeBrowsers) { 
        try { if (b.isConnected()) await b.close(); } catch(e){} 
    }
    
    await safeReply(ctx, '<b>🚀 BOT RESTARTING!</b>\nAktif kembali dalam 3-5 detik.');
    setTimeout(() => { process.exit(0); }, 2000);
});

bot.launch();
console.log('BOT BUZZER TIKTOK ONLINE!');
