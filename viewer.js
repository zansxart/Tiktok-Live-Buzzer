const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

// Load komentar dari JSON
let COMMENTS_DATA = {};
try {
    COMMENTS_DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'comments.json'), 'utf8'));
} catch (e) {
    console.log("❌ Gagal load comments.json, pake fallback.");
    COMMENTS_DATA = { "default": ["Semangat bang! 🔥"] };
}

function getRandomComment() {
    const categories = Object.keys(COMMENTS_DATA);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const comments = COMMENTS_DATA[randomCategory];
    return comments[Math.floor(Math.random() * comments.length)];
}

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
];

async function launchViewer(url, proxy = null, cookieFile = null, index = 0, isHeadless = true) {
    let browser;
    try {
        const profileDir = path.join(__dirname, 'temp_profiles', `acc_${index}`);
        if (!fs.existsSync(path.join(__dirname, 'temp_profiles'))) fs.mkdirSync(path.join(__dirname, 'temp_profiles'));

        // --- SMART CLEAN: Hapus sampah tapi simpan login ---
        if (fs.existsSync(profileDir)) {
            const foldersToClean = [
                'Default/Cache', 
                'Default/Code Cache', 
                'Default/GPUCache', 
                'Default/Media Cache',
                'Default/Service Worker/CacheStorage',
                'Default/Service Worker/ScriptCache',
                'Cache',
                'GPUCache'
            ];
            foldersToClean.forEach(folder => {
                const target = path.join(profileDir, folder);
                if (fs.existsSync(target)) {
                    try { fs.rmSync(target, { recursive: true, force: true }); } catch (e) {}
                }
            });
        }

        const launchOptions = {
            headless: isHeadless ? "new" : false, 
            userDataDir: profileDir,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-notifications', 
                '--mute-audio', 
                '--window-size=1280,720',
                '--disable-gpu',
                '--disable-dev-shm-usage'
            ]
        };
        if (proxy) launchOptions.args.push(`--proxy-server=${proxy}`);

        browser = await puppeteer.launch(launchOptions);
        const pages = await browser.pages();
        const page = pages[0];
        
        const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        await page.setUserAgent(randomUA);
        await page.setViewport({ width: 1280, height: 720 });

        if (cookieFile) {
            const cookiePath = path.join(__dirname, 'cookies', cookieFile);
            if (fs.existsSync(cookiePath)) {
                const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf8')).map(c => {
                    const { id, storeId, ...rest } = c;
                    return rest;
                });
                await page.setCookie(...cookies);
            }
        }

        console.log(`[Akun ${index}] 🚀 Meluncur dengan UA: ${randomUA.substring(0, 30)}...`);
        
        try {
            // --- FITUR PEMANASAN (WARM UP FYP) ---
            console.log(`[Akun ${index}] 🕯️ Pemanasan dulu di Beranda (FYP)...`);
            await page.goto('https://www.tiktok.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
            await new Promise(r => setTimeout(r, 8000));

            // Simulasi Scroll FYP (1-2 kali) pake kombinasi Mouse & Keyboard
            for (let s = 0; s < 2; s++) {
                if (Math.random() > 0.5) {
                    await page.mouse.wheel(0, 600 + Math.random() * 400);
                } else {
                    await page.keyboard.press('ArrowDown');
                    await new Promise(r => setTimeout(r, 500));
                    await page.keyboard.press('ArrowDown');
                }
                console.log(`[Akun ${index}] 📜 Scrolling FYP (Keyboard/Mouse)...`);
                await new Promise(r => setTimeout(r, 4000 + Math.random() * 4000));
                
                // Kadang scroll balik dikit (biar kyk orang beneran)
                if (Math.random() > 0.8) {
                    await page.keyboard.press('ArrowUp');
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
            
            // Nunggu bentar biar dikira beneran nonton
            const warmUpTime = 20000 + Math.random() * 20000;
            console.log(`[Akun ${index}] ⏳ Nunggu ${Math.round(warmUpTime/1000)} detik biar dikira manusia...`);
            await new Promise(r => setTimeout(r, warmUpTime));

            // Baru deh masuk ke URL LIVE target
            console.log(`[Akun ${index}] 🎯 OTW ke Live Target: ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        } catch (gotoErr) {
            // Kalo proxy bermasalah, kita retry TANPA proxy
            if (proxy && (gotoErr.message.includes('ERR_PROXY') || gotoErr.message.includes('ERR_TUNNEL') || gotoErr.message.includes('ERR_TIMED_OUT'))) {
                console.log(`[Akun ${index}] ⚠️ Proxy bermasalah (${proxy}), mencoba ulang TANPA proxy...`);
                if (browser) await browser.close().catch(() => {});
                return launchViewer(url, null, cookieFile, index, isHeadless);
            }
            throw gotoErr;
        }
        
        // --- BYPASS OVERLAY / CAPTCHA AWAL ---
        console.log(`[Akun ${index}] ⏳ Memantau overlay awal...`);
        await new Promise(r => setTimeout(r, 8000)); 

        const checkInitialOverlay = async () => {
            const isBlocked = await page.evaluate(() => {
                const selectors = ['div[id*="captcha"]', 'div[class*="captcha"]', 'div[class*="Verify"]', 'div[class*="modal"]'];
                return selectors.some(s => !!document.querySelector(s)) || document.body.innerText.includes('Verify to continue');
            }).catch(() => false);

            if (isBlocked) {
                console.log(`[Akun ${index}] 🛡️ Terdeteksi penghalang/captcha, mencoba Bypass (Escape + Reload)...`);
                await page.keyboard.press('Escape').catch(() => {}); 
                await new Promise(r => setTimeout(r, 2000));
                await page.reload({ waitUntil: 'domcontentloaded' });
                await new Promise(r => setTimeout(r, 10000));
            }
        };
        await checkInitialOverlay();

        // Cek login
        const isLogged = await page.evaluate(() => {
            return !!document.querySelector('span[data-e2e="profile-icon"]') || !!document.querySelector('div[data-e2e="avatar-container"]');
        }).catch(() => false);
        console.log(`[Akun ${index}] Status Login: ${isLogged ? '✅ BERHASIL' : '❌ GAGAL (Mungkin Logout)'}`);

        // --- MEGA BRUTAL TAPTAP & RANDOM COMMENT ---
        const startBrutalAction = async () => {
            while (browser && browser.isConnected()) {
                try {
                    const startTime = Date.now();
                    console.log(`[Akun ${index}] 🔥 Taptap L (1 Menit)...`);
                    
                    while (Date.now() - startTime < 60000 && browser.isConnected()) {
                        await page.keyboard.press('l').catch(() => {});
                        await new Promise(r => setTimeout(r, 150 + Math.random() * 200)); 
                    }
                    
                    if (!browser.isConnected()) break;
                    
                    // --- RANDOM COMMENT ---
                    if (Math.random() > 0.3) {
                        try {
                            const comment = getRandomComment();
                            const chatInput = await page.$('div[contenteditable="plaintext-only"]');
                            
                            if (chatInput) {
                                console.log(`[Akun ${index}] 💬 Mencoba komen: "${comment}"`);
                                await chatInput.click();
                                await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
                                await page.keyboard.type(comment, { delay: 100 + Math.random() * 50 });
                                await new Promise(r => setTimeout(r, 500));
                                await page.keyboard.press('Enter');
                                
                                const sendBtn = await page.$('button:has(svg path[d*="m21.88 3.88"])');
                                if (sendBtn) await sendBtn.click();
                                
                                await new Promise(r => setTimeout(r, 1000));
                                await page.keyboard.press('Escape').catch(() => {}); 
                                
                                const video = await page.$('video') || await page.$('div[data-e2e="video-player-container"]');
                                if (video) {
                                    const box = await video.boundingBox();
                                    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2).catch(() => {});
                                }
                            }
                        } catch (commentErr) {}
                    }

                    // --- RANDOM SOCIAL INTERACTION (SHARE) ---
                    if (Math.random() > 0.9) {
                        try {
                            const shareBtn = await page.$('button:has(svg path[d*="M23.82 3.5"])');
                            if (shareBtn) {
                                console.log(`[Akun ${index}] 📢 Klik Tombol Share...`);
                                await shareBtn.click();
                                await new Promise(r => setTimeout(r, 2000));
                                await page.keyboard.press('Escape');
                            }
                        } catch (e) {}
                    }

                    // --- CEK LIVE BERAKHIR ---
                    const isLiveEnded = await page.evaluate(() => {
                        const texts = ['Live has ended', 'Siaran langsung berakhir', 'LIVE ini telah berakhir'];
                        return texts.some(t => document.body.innerText.includes(t));
                    }).catch(() => false);

                    if (isLiveEnded) {
                        console.log(`[Akun ${index}] 🛑 Live Berakhir!`);
                        if (browser) await browser.close().catch(() => {});
                        return;
                    }

                    const restTime = 3000 + Math.random() * 7000;
                    console.log(`[Akun ${index}] 💤 Istirahat ${Math.round(restTime/1000)} detik...`);
                    await new Promise(r => setTimeout(r, restTime)); 

                } catch (e) {
                    console.log(`[Akun ${index}] Loop Action Error: ${e.message}`);
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
        };
        startBrutalAction();

        // --- SATPAM CAPTCHA ---
        const captchaBuster = async () => {
            while (browser && browser.isConnected()) {
                try {
                    const hasCaptcha = await page.evaluate(() => {
                        return !!document.querySelector('div[id="captcha_container"]') || document.body.innerText.includes('Verify to continue');
                    }).catch(() => false);

                    if (hasCaptcha) {
                        console.log(`[Akun ${index}] 🛡️ Terdeteksi Captcha! Reloading...`);
                        await page.reload({ waitUntil: 'domcontentloaded' });
                        await new Promise(r => setTimeout(r, 8000));
                    }
                } catch (e) {}
                await new Promise(r => setTimeout(r, 15000));
            }
        };
        captchaBuster();

        return browser;
    } catch (error) {
        console.log(`[Akun ${index}] ❌ Error Fatal: ${error.message}`);
        if (browser) await browser.close().catch(() => {});
        return null;
    }
}

module.exports = { launchViewer };
