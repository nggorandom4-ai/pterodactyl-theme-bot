// Theme handler - untuk manage instalasi themes
const { exec } = require('child_process');
const config = require('./config');
const util = require('util');
const execPromise = util.promisify(exec);

class ThemeManager {
  // Dapatkan daftar themes
  static getAllThemes() {
    return config.THEMES;
  }

  // Dapatkan detail theme
  static getTheme(themeName) {
    return config.THEMES[themeName.toLowerCase()];
  }

  // Install theme via SSH
  static async installTheme(sshUser, sshIp, sshPort, pterodactylPath, themeName) {
    const theme = this.getTheme(themeName);
    
    if (!theme) {
      throw new Error(`Theme ${themeName} tidak ditemukan`);
    }

    const commands = [
      // Masuk direktori Pterodactyl
      `cd ${pterodactylPath}`,
      
      // Buat folder themes kalau belum ada
      `mkdir -p resources/views/themes`,
      
      // Clone atau pull theme
      `cd resources/views/themes && (rm -rf ${themeName} || true)`,
      `git clone -b ${theme.branch} ${theme.repo} ${themeName}`,
      
      // Set permissions
      `chown -R www-data:www-data ${pterodactylPath}/resources/views/themes`,
      `chmod -R 755 ${pterodactylPath}/resources/views/themes`,
      
      // Clear cache
      `cd ${pterodactylPath} && php artisan cache:clear`,
      `php artisan config:clear`,
      `php artisan view:clear`
    ];

    const fullCommand = commands.join(' && ');
    const sshCommand = `ssh -p ${sshPort} ${sshUser}@${sshIp} "${fullCommand}"`;

    try {
      const { stdout, stderr } = await execPromise(sshCommand, { 
        maxBuffer: 1024 * 1024 * 10 
      });
      
      return {
        success: true,
        message: `✅ Theme ${themeName} berhasil diinstall!`,
        stdout,
        stderr
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Gagal install theme ${themeName}`,
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr
      };
    }
  }

  // Update .env untuk theme
  static async updateThemeConfig(sshUser, sshIp, sshPort, pterodactylPath, themeName) {
    const updateEnv = `
      cd ${pterodactylPath} && \
      sed -i 's/APP_THEME=.*/APP_THEME=${themeName}/' .env && \
      php artisan config:clear
    `;

    const sshCommand = `ssh -p ${sshPort} ${sshUser}@${sshIp} "${updateEnv}"`;

    try {
      const { stdout, stderr } = await execPromise(sshCommand);
      
      return {
        success: true,
        message: `✅ Config updated ke theme ${themeName}`,
        stdout
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Gagal update config`,
        error: error.message
      };
    }
  }

  // Uninstall theme
  static async uninstallTheme(sshUser, sshIp, sshPort, pterodactylPath, themeName) {
    const removeTheme = `
      rm -rf ${pterodactylPath}/resources/views/themes/${themeName}
    `;

    const sshCommand = `ssh -p ${sshPort} ${sshUser}@${sshIp} "${removeTheme}"`;

    try {
      const { stdout, stderr } = await execPromise(sshCommand);
      
      return {
        success: true,
        message: `✅ Theme ${themeName} berhasil dihapus`,
        stdout
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Gagal hapus theme`,
        error: error.message
      };
    }
  }

  // Cek status theme yang terinstall
  static async checkInstalledThemes(sshUser, sshIp, sshPort, pterodactylPath) {
    const checkCommand = `ls -la ${pterodactylPath}/resources/views/themes/`;
    const sshCommand = `ssh -p ${sshPort} ${sshUser}@${sshIp} "${checkCommand}"`;

    try {
      const { stdout } = await execPromise(sshCommand);
      const themes = stdout.split('\n')
        .filter(line => !line.includes('total') && line.trim())
        .map(line => line.split(/\s+/).pop());
      
      return {
        success: true,
        themes: themes.filter(t => t && t !== '.' && t !== '..')
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate theme info keyboard
  static generateThemeKeyboard() {
    const themes = Object.entries(config.THEMES);
    const keyboard = [];
    
    for (let i = 0; i < themes.length; i += 2) {
      const row = [];
      row.push({ text: themes[i][1].name, callback_data: `theme_${themes[i][0]}` });
      
      if (i + 1 < themes.length) {
        row.push({ text: themes[i + 1][1].name, callback_data: `theme_${themes[i + 1][0]}` });
      }
      
      keyboard.push(row);
    }
    
    keyboard.push([{ text: '« Kembali', callback_data: 'menu_main' }]);
    return keyboard;
  }

  // Format theme info
  static formatThemeInfo(themeName) {
    const theme = this.getTheme(themeName);
    
    if (!theme) {
      return null;
    }

    return `
📌 **${theme.name}**

📝 Deskripsi: ${theme.description}
👤 Author: ${theme.author}
📦 Versi: ${theme.version}
🔗 Repository: \`${theme.repo}\`

Ingin install theme ini?
    `;
  }
}

module.exports = ThemeManager;
