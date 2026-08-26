// Command handler untuk bot
const config = require('./config');
const database = require('./database');
const ThemeManager = require('./themes');

class CommandHandler {
  // Command /start
  static async handleStart(ctx) {
    const user = ctx.from;
    
    // Simpan user ke database
    await database.upsertUser(user.id, user.username, user.first_name, user.last_name);

    const keyboard = [
      [
        { text: '📋 List Themes', callback_data: 'cmd_list' },
        { text: '🖥️ My Servers', callback_data: 'cmd_servers' }
      ],
      [
        { text: '➕ Add Server', callback_data: 'cmd_addserver' },
        { text: '📚 Help', callback_data: 'cmd_help' }
      ]
    ];

    await ctx.reply(config.MESSAGES.start, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  }

  // Command /list
  static async handleList(ctx) {
    const themes = ThemeManager.getAllThemes();
    let message = '🎨 **Daftar Themes yang Tersedia:**\n\n';

    Object.entries(themes).forEach(([key, theme]) => {
      message += `${theme.name}\n`;
      message += `└─ ${theme.description}\n\n`;
    });

    const keyboard = ThemeManager.generateThemeKeyboard();

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  }

  // Command /help
  static async handleHelp(ctx) {
    await ctx.reply(config.MESSAGES.help, {
      parse_mode: 'Markdown'
    });
  }

  // Show servers
  static async handleShowServers(ctx) {
    try {
      const servers = await database.getUserServers(ctx.from.id);

      if (servers.length === 0) {
        await ctx.reply('❌ Anda belum menambahkan server apapun.\n\nGunakan /addserver untuk menambah server.');
        return;
      }

      let message = '🖥️ **Server Anda:**\n\n';
      const keyboard = [];

      servers.forEach((server, index) => {
        message += `${index + 1}. ${server.server_name}\n`;
        message += `   IP: \`${server.server_ip}\`\n`;
        message += `   Theme: ${server.current_theme || 'Default'}\n\n`;

        keyboard.push([
          { text: `⚙️ ${server.server_name}`, callback_data: `server_${server.id}` }
        ]);
      });

      keyboard.push([{ text: '« Kembali', callback_data: 'menu_main' }]);

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } catch (error) {
      await ctx.reply('❌ Error: ' + error.message);
    }
  }

  // Handle server selection
  static async handleServerSelect(ctx, serverId) {
    try {
      const server = await database.getServer(serverId);

      if (!server) {
        await ctx.reply('❌ Server tidak ditemukan');
        return;
      }

      const installedThemes = await ThemeManager.checkInstalledThemes(
        server.ssh_user,
        server.server_ip,
        server.ssh_port,
        server.pterodactyl_path
      );

      let message = `🖥️ **${server.server_name}**\n\n`;
      message += `IP: \`${server.server_ip}\`\n`;
      message += `SSH Port: ${server.ssh_port}\n`;
      message += `Path: \`${server.pterodactyl_path}\`\n`;
      message += `Current Theme: ${server.current_theme || 'Default'}\n`;

      if (installedThemes.success) {
        message += `\n📦 Themes Installed:\n`;
        installedThemes.themes.forEach(theme => {
          message += `  • ${theme}\n`;
        });
      }

      const keyboard = [
        [{ text: '📦 Install Theme', callback_data: `theme_select_${serverId}` }],
        [{ text: '🗑️ Uninstall Theme', callback_data: `uninstall_${serverId}` }],
        [{ text: '🔧 Edit Server', callback_data: `edit_${serverId}` }],
        [{ text: '❌ Delete Server', callback_data: `delete_${serverId}` }],
        [{ text: '« Kembali', callback_data: 'cmd_servers' }]
      ];

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } catch (error) {
      await ctx.reply('❌ Error: ' + error.message);
    }
  }

  // Handle theme selection for install
  static async handleThemeSelect(ctx, themeName, serverId) {
    const theme = ThemeManager.getTheme(themeName);
    const message = ThemeManager.formatThemeInfo(themeName);

    const keyboard = [
      [
        { text: '✅ Install', callback_data: `confirm_install_${serverId}_${themeName}` },
        { text: '❌ Cancel', callback_data: `server_${serverId}` }
      ]
    ];

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  }

  // Confirm install
  static async handleInstallConfirm(ctx, serverId, themeName) {
    try {
      await ctx.reply(`⏳ Installing ${themeName}... Please wait...`);

      const server = await database.getServer(serverId);
      const result = await ThemeManager.installTheme(
        server.ssh_user,
        server.server_ip,
        server.ssh_port,
        server.pterodactyl_path,
        themeName
      );

      if (result.success) {
        // Update config
        await ThemeManager.updateThemeConfig(
          server.ssh_user,
          server.server_ip,
          server.ssh_port,
          server.pterodactyl_path,
          themeName
        );

        // Update database
        await database.updateCurrentTheme(serverId, themeName);
        await database.logInstall(serverId, themeName, 'success', result.stdout);

        await ctx.reply(`✅ Theme ${themeName} berhasil diinstall!\n\nSilakan refresh Pterodactyl panel Anda.`);
      } else {
        await database.logInstall(serverId, themeName, 'failed', result.error);
        await ctx.reply(`❌ Gagal install theme: ${result.error}`);
      }
    } catch (error) {
      await ctx.reply('❌ Error: ' + error.message);
    }
  }
}

module.exports = CommandHandler;
