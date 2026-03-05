const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

async function runDc() {
    console.log("🚀 START DEBUG (MODAL PROJECT OLD)");

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--start-maximized'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    try {
        const cookiePath = path.join(__dirname, 'cookies', 'jule.json');
        const rawData = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));

        // Bersihkan data cookie (samakan dengan project old abang)
        const cookies = rawData.map(c => {
            const mapped = {
                name: c.name,
                value: c.value,
                domain: c.domain,
                path: c.path || '/',
                secure: c.secure || false,
                httpOnly: c.httpOnly || false,
            };
            if (c.expirationDate) mapped.expires = c.expirationDate;

            // Puppeteer sangat rewel soal sameSite, kita ikuti aslinya tapi hati-hati
            const ss = (c.sameSite || '').toLowerCase();
            if (ss === 'no_restriction' || ss === 'none') mapped.sameSite = 'None';
            else if (ss === 'lax') mapped.sameSite = 'Lax';
            else if (ss === 'strict') mapped.sameSite = 'Strict';

            return mapped;
        });

        console.log(`🍪 Suntik ${cookies.length} cookie...`);
        await page.setCookie(...cookies);

        console.log("🌍 Buka TikTok Home...");
        await page.goto('https://www.tiktok.com', { waitUntil: 'networkidle2' });

        console.log("⏳ Tunggu 10 detik...");
        await new Promise(r => setTimeout(r, 10000));

        // CEK LOGIN
        const isLogged = await page.evaluate(() => {
            return !!document.querySelector('span[data-e2e="profile-icon"]') || !!document.querySelector('div[data-e2e="avatar-container"]');
        });

        console.log(`\n--- HASIL ---`);
        console.log(`Login: ${isLogged ? '✅ BERHASIL' : '❌ GAGAL'}`);
        console.log(`-------------\n`);

        if (!isLogged) {
            console.log("💡 Coba abang liat di browser, ada tombol 'Log in' gak?");
            console.log("Kalau ada, berarti cookienya ditolak TikTok.");
        }

    } catch (e) {
        console.log("❌ ERROR: " + e.message);
    }
}

runDc();
