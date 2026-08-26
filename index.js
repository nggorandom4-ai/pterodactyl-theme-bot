// Main bot file - Pterodactyl Theme Installer Bot
require('dotenv').config();

const { Telegraf } = require('telegraf');
const config = require('./config');
const database = require('./database');
const CommandHandler = require('./commands');
const ThemeManager = require('./themes');
const Utils = require('./utils');

// Initialize bot
const bot = new Telegraf(config.BOT_TOKEN);

// Middleware untuk check admin
const adminOnly = (ctx, next) => {
  if (!config.ADMIN_IDS.includes(ctx.from.id)) {
    ctx.reply(config.MESSAGES.unauthorized);
    return;
  }
  return next();
};

// Middleware untuk logging
bot.use((ctx, next) => {
  Utils.log(`User: ${ctx.from.first_name} (@${ctx.from.username}) | Chat: ${ctx.chat.id}`);
  return next();
});

// ============ COMMANDS ============

// /start command
bot.start(async (ctx) => {
  try {
    await CommandHandler.handleStart(ctx);
  } catch (error) {
    Utils.log(`Error in /start: ${error.message}`, 'error');
    ctx.reply('❌ Error: ' + error.message);
  }
});

// /list command
bot.command('list', async (ctx) => {
  try {
    await CommandHandler.handleList(ctx);
  } catch (error) {
    Utils.log(`Error in /list: ${error.message}`, 'error');
    ctx.reply('❌ Error: ' + error.message);
  }
});

// /help command
bot.command('help', async (ctx) => {
  try {
    await CommandHandler.handleHelp(ctx);
  } catch (error) {
    Utils.log(`Error in /help: ${error.message}`, 'error');
    ctx.reply('❌ Error: ' + error.message);
  }
});

// /servers command
bot.command('servers', async (ctx) => {
  try {
    await CommandHandler.handleShowServers(ctx);
  } catch (error) {
    Utils.log(`Error in /servers: ${error.message}`, 'error');
    ctx.reply('❌ Error: ' + error.message);
  }
});

// ============ CALLBACK QUERIES ============

// Main menu
bot.action('menu_main', async (ctx) => {
  try {
    await CommandHandler.handleStart(ctx);
    await ctx.answerCbQuery();
  } catch (error) {
    Utils.log(`Error in menu_main: ${error.message}`, 'error');
  }
});

// List themes
bot.action('cmd_list', async (ctx) => {
  try {
    await CommandHandler.handleList(ctx);
    await ctx.answerCbQuery();
  } catch (error) {
    Utils.log(`Error in cmd_list: ${error.message}`, 'error');
  }
});

// Show servers
bot.action('cmd_servers', async (ctx) => {
  try {
    await CommandHandler.handleShowServers(ctx);
    await ctx.answerCbQuery();
  } catch (error) {
    Utils.log(`Error in cmd_servers: ${error.message}`, 'error');
  }
});

// Add server
bot.action('cmd_addserver', async (ctx) => {
  ctx.reply(
    '🖥️ **Cara Tambah Server:**\n\n' +
    'Kirim pesan dengan format:\n' +
    '```\n' +
    '/addserver SERVER_NAME IP_ADDRESS PORT SSH_USER PATH\n' +
    '```\n\n' +
    'Contoh:\n' +
    '```\n' +
    '/addserver Gaming-Server 192.168.1.100 22 root /var/www/pterodactyl\n' +
    '```',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '« Kembali', callback_data: 'menu_main' }]]
      }
    }
  );
  await ctx.answerCbQuery();
});

// Help
bot.action('cmd_help', async (ctx) => {
  try {
    await CommandHandler.handleHelp(ctx);
    await ctx.answerCbQuery();
  } catch (error) {
    Utils.log(`Error in cmd_help: ${error.message}`, 'error');
  }
});

// Server actions
bot.action(/^server_(\d+)$/, async (ctx) => {
  try {
    const serverId = parseInt(ctx.match[1]);
    await CommandHandler.handleServerSelect(ctx, serverId);
    await ctx.answerCbQuery();
  } catch (error) {
    Utils.log(`Error in server select: ${error.message}`, 'error');
    ctx.answerCbQuery('❌ Error', true);
  }
});

// Theme selection for install
bot.action(/^theme_select_(\d+)$/, async (ctx) => {
  try {
    const serverId = parseInt(ctx.match[1]);
    await CommandHandler.handleList(ctx);
    ctx.scene.state = { serverId };
    await ctx.answerCbQuery();
  } catch (error) {
    Utils.log(`Error in theme_select: ${error.message}`, 'error');
  }
});

// Individual theme install
bot.action(/^theme_(\w+)$/, async (ctx) => {
  try {
    const themeName = ctx.match[1];
    
    // Jika ada serverId di state, lanjutkan ke confirm
    if (ctx.scene && ctx.scene.state && ctx.scene.state.serverId) {
      const serverId = ctx.scene.state.serverId;
      await CommandHandler.handleThemeSelect(ctx, themeName, serverId);
    } else {
      // Tampilkan info theme
      const message = ThemeManager.formatThemeInfo(themeName);
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '« Kembali', callback_data: 'cmd_list' }]]
        }
      });
    }
    
    await ctx.answerCbQuery();
  } catch (error) {
    Utils.log(`Error in theme action: ${error.message}`, 'error');
  }
});

// Confirm install
bot.action(/^confirm_install_(\d+)_(\w+)$/, async (ctx) => {
  try {
    const serverId = parseInt(ctx.match[1]);
    const themeName = ctx.match[2];
    await CommandHandler.handleInstallConfirm(ctx, serverId, themeName);
    await ctx.answerCbQuery();
  } catch (error) {
    Utils.log(`Error in confirm_install: ${error.message}`, 'error');
    ctx.answerCbQuery('❌ Error', true);
  }
});

// ============ MESSAGE HANDLER ============

// Handle /addserver command
bot.command('addserver', async (ctx) => {
  try {
    const args = Utils.parseArguments(ctx.message.text.replace('/addserver', '').trim());

    if (args.length < 5) {
      ctx.reply(
        '❌ Format tidak sesuai!\n\n' +
        'Gunakan format: /addserver SERVER_NAME IP PORT SSH_USER PATH'
      );
      return;
    }

    const [serverName, ip, port, sshUser, ...pathParts] = args;
    const path = pathParts.join(' ');

    // Validate
    const validation = await Utils.validateSSHCredentials(sshUser, ip, port);
    if (!validation.valid) {
      ctx.reply('❌ Validasi gagal: ' + validation.error);
      return;
    }

    // Add to database
    const serverId = await database.addServer(
      ctx.from.id,
      serverName,
      ip,
      parseInt(port),
      sshUser,
      path
    );

    ctx.reply(`✅ Server ${serverName} berhasil ditambahkan!\n\nID: ${serverId}`);
    Utils.log(`Server added: ${serverName} by ${ctx.from.first_name}`, 'success');
  } catch (error) {
    Utils.log(`Error in /addserver: ${error.message}`, 'error');
    ctx.reply('❌ Error: ' + error.message);
  }
});

// Handle /stats command
bot.command('stats', adminOnly, async (ctx) => {
  try {
    const servers = await database.getUserServers(ctx.from.id);
    
    let message = '📊 **Statistics**\n\n';
    message += `👤 Total Servers: ${servers.length}\n`;
    
    let totalThemes = 0;
    for (const server of servers) {
      const history = await database.getInstallHistory(server.id, 1000);
      totalThemes += history.length;
    }
    
    message += `📦 Total Theme Installs: ${totalThemes}\n`;

    ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    Utils.log(`Error in /stats: ${error.message}`, 'error');
  }
});

// Handle other messages
bot.on('message', async (ctx) => {
  if (!ctx.message.text.startsWith('/')) {
    await ctx.reply(
      'Perintah tidak dikenali. Gunakan /help untuk melihat daftar perintah.',
      {
        reply_markup: {
          inline_keyboard: [[{ text: 'Menu', callback_data: 'menu_main' }]]
        }
      }
    );
  }
});

// ============ ERROR HANDLING ============

bot.catch((err, ctx) => {
  Utils.log(`Bot error: ${err.message}`, 'error');
  ctx.reply('❌ Terjadi error: ' + err.message);
});

// ============ START BOT ============

bot.launch().then(() => {
  Utils.log('🤖 Bot started successfully!', 'success');
  Utils.log(`Bot username: @${bot.botInfo.username}`, 'info');
});

// Graceful shutdown
process.once('SIGINT', () => {
  Utils.log('Shutting down bot...', 'warning');
  bot.stop('SIGINT');
  database.close();
});

process.once('SIGTERM', () => {
  Utils.log('Shutting down bot...', 'warning');
  bot.stop('SIGTERM');
  database.close();
});

module.exports = bot;
