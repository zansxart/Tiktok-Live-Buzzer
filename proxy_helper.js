const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Mengambil daftar proxy gratisan dari berbagai sumber
 * @returns {Promise<string[]>} Daftar proxy dalam format ip:port
 */
async function getFreeProxies() {
    try {
        console.log("🔍 Sedang berburu proxy gratisan...");
        // Sumber 1: ProxyScrape (HTTP)
        const response = await axios.get('https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all', { timeout: 10000 });
        
        // Gunakan regex agar lebih aman memisahkan baris baru
        const proxies = response.data.split(/\r?\n/).filter(p => p.trim() !== '');
        console.log(`✅ Berhasil dapet ${proxies.length} proxy gratisan.`);
        
        // Simpan ke proxies.txt buat cadangan
        fs.writeFileSync(path.join(__dirname, 'proxies.txt'), proxies.join('\n'));
        
        return proxies;
    } catch (error) {
        console.log("❌ Gagal berburu proxy, pake yang ada di proxies.txt");
        try {
            if (!fs.existsSync(path.join(__dirname, 'proxies.txt'))) return [];
            const data = fs.readFileSync(path.join(__dirname, 'proxies.txt'), 'utf8');
            return data.split(/\r?\n/).filter(p => p.trim() !== '' && !p.startsWith('#'));
        } catch (e) {
            return [];
        }
    }
}

module.exports = { getFreeProxies };
