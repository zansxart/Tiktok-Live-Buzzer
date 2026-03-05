const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * Fungsi untuk membuat backup ZIP dari seluruh folder project
 * @param {string} outputPath - Path file zip yang akan dihasilkan
 * @returns {Promise<string>} - Path file zip jika sukses
 */
async function createBackup(outputPath = 'backup-project.zip') {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve(outputPath));
        archive.on('error', (err) => reject(err));

        archive.pipe(output);

        // Masukkan semua file kecuali folder yang berat/sensitif
        archive.glob('**/*', {
            ignore: [
                'node_modules/**',
                'temp_profiles/**', // Skip folder profile yang lagi dipake browser
                'backup-project.zip',
                'LIVE TIKTOK.zip',
                '.git/**',
                'profiles/**',
                'backup_project_*.zip' // Skip backup-backup sebelumnya
            ]
        });

        archive.finalize();
    });
}

module.exports = { createBackup };

// Jika dijalankan langsung: node backup.js
if (require.main === module) {
    createBackup().then(path => console.log(`✅ Backup selesai: ${path}`)).catch(err => console.error('❌ Gagal:', err));
}
