# Live TikTok Bot 🤖

Bot otomatisasi untuk TikTok Live menggunakan Puppeteer, Playwright, dan Telegraf (Telegram). Proyek ini membantu mengelola interaksi, tampilan, dan otomatisasi akun TikTok melalui sesi browser yang tersimpan.

## 🚀 Fitur

- **Otomatisasi Browser:** Menggunakan `puppeteer-extra` dengan `stealth-plugin` untuk menghindari deteksi.
- **Multibrowser Support:** Dukungan untuk `puppeteer` dan `playwright`.
- **Integrasi Telegram:** Notifikasi dan kontrol melalui Telegram Bot (Telegraf).
- **Manajemen Proxy:** Mendukung daftar proxy untuk rotasi IP.
- **Sesi Cookies:** Penggunaan file JSON untuk menyimpan sesi login akun.

## 🛠️ Instalasi

1. **Clone repositori ini:**
   ```bash
   git clone <URL_REPOSITORI_ANDA>
   cd live-tiktok
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment:**
   Buat file `.env` di direktori utama dan tambahkan variabel yang diperlukan (lihat `.env.example` jika tersedia).

4. **Siapkan Cookies & Proxy:**
   - Masukkan cookies akun Anda ke dalam folder `cookies/` (opsional, pastikan format JSON benar).
   - Isi daftar proxy di `proxies.txt` jika diperlukan.

## 🖥️ Penggunaan

Jalankan script utama:
```bash
npm start
```

## ⚠️ Peringatan
Gunakan proyek ini dengan bijak. Penyalahgunaan bot untuk melanggar ketentuan layanan TikTok dapat menyebabkan akun Anda diblokir. Penulis tidak bertanggung jawab atas segala konsekuensi penggunaan script ini.

## 📄 Lisensi
[ISC License](LICENSE)
