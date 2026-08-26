// Configuration file untuk Telegram Bot Pterodactyl Theme Installer
require('dotenv').config();

const config = {
  // Telegram Bot Token
  BOT_TOKEN: process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',
  
  // Admin IDs (untuk akses eksklusif)
  ADMIN_IDS: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(Number) : [123456789],
  
  // Database
  DB_PATH: process.env.DB_PATH || './database/themes.db',
  
  // Pterodactyl Panel Default Path
  PTERODACTYL_PATH: process.env.PTERODACTYL_PATH || '/var/www/pterodactyl',
  
  // Themes yang tersedia
  THEMES: {
    dracula: {
      name: '🟣 Dracula',
      repo: 'https://github.com/Pterodactyl-Themes/Dracula.git',
      branch: 'main',
      description: 'Dark elegant theme dengan warna ungu',
      author: 'Pterodactyl Themes',
      version: '1.0.0'
    },
    ely: {
      name: '🎨 Ely.by',
      repo: 'https://github.com/Ely-Theme/Pterodactyl-Theme.git',
      branch: 'master',
      description: 'Modern theme dengan design yang clean',
      author: 'Ely.by',
      version: '2.0.0'
    },
    minimal: {
      name: '⚪ Minimal',
      repo: 'https://github.com/Pterodactyl-Themes/Minimal.git',
      branch: 'main',
      description: 'Theme minimalis dengan fokus ke functionality',
      author: 'Pterodactyl Themes',
      version: '1.0.0'
    },
    nord: {
      name: '❄️ Nord',
      repo: 'https://github.com/Pterodactyl-Themes/Nord.git',
      branch: 'main',
      description: 'Theme dengan color scheme Nord yang cool',
      author: 'Arctic Ice Studio',
      version: '1.0.0'
    },
    gruvbox: {
      name: '🟧 Gruvbox',
      repo: 'https://github.com/Pterodactyl-Themes/Gruvbox.git',
      branch: 'main',
      description: 'Retro groove color scheme theme',
      author: 'Pterodactyl Themes',
      version: '1.0.0'
    },
    solarized: {
      name: '☀️ Solarized',
      repo: 'https://github.com/Pterodactyl-Themes/Solarized.git',
      branch: 'main',
      description: 'Theme dengan Solarized color palette',
      author: 'Ethan Schoonover',
      version: '1.0.0'
    }
  },
  
  // Messages
  MESSAGES: {
    start: 'Selamat datang! 👋\n\nSaya bot untuk install themes Pterodactyl Panel.\n\nPilih opsi di bawah:',
    help: '📚 **Panduan Penggunaan Bot**\n\n/start - Mulai\n/list - Lihat daftar themes\n/install [theme] - Install theme\n/status - Cek status server\n/help - Bantuan\n/reset - Reset ke theme default',
    unauthorized: '❌ Anda tidak memiliki akses ke bot ini!',
    invalidServer: '❌ Server tidak ditemukan atau offline',
    installSuccess: '✅ Theme berhasil diinstall!',
    installFailed: '❌ Gagal install theme',
    themeNotFound: '❌ Theme tidak ditemukan'
  }
};

module.exports = config;
