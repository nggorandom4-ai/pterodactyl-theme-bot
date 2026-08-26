// Database handler untuk menyimpan data instalasi themes
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const config = require('./config');

class Database {
  constructor() {
    // Buat folder database kalau belum ada
    const dbDir = path.dirname(config.DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(config.DB_PATH, (err) => {
      if (err) {
        console.error('Database error:', err);
      } else {
        console.log('✅ Database connected');
        this.init();
      }
    });
  }

  // Inisialisasi database
  init() {
    this.db.serialize(() => {
      // Tabel untuk server
      this.db.run(`
        CREATE TABLE IF NOT EXISTS servers (
          id INTEGER PRIMARY KEY,
          user_id INTEGER NOT NULL,
          server_name TEXT NOT NULL,
          server_ip TEXT NOT NULL,
          ssh_port INTEGER DEFAULT 22,
          ssh_user TEXT,
          pterodactyl_path TEXT,
          current_theme TEXT,
          status TEXT DEFAULT 'offline',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabel untuk instalasi themes
      this.db.run(`
        CREATE TABLE IF NOT EXISTS theme_installs (
          id INTEGER PRIMARY KEY,
          server_id INTEGER NOT NULL,
          theme_name TEXT NOT NULL,
          install_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'success',
          logs TEXT,
          FOREIGN KEY(server_id) REFERENCES servers(id)
        )
      `);

      // Tabel untuk users
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          user_id INTEGER NOT NULL UNIQUE,
          username TEXT,
          first_name TEXT,
          last_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });
  }

  // Tambah server
  addServer(userId, serverName, serverIp, sshPort, sshUser, pterodactylPath) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO servers (user_id, server_name, server_ip, ssh_port, ssh_user, pterodactyl_path) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, serverName, serverIp, sshPort, sshUser, pterodactylPath],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Dapatkan server berdasarkan ID
  getServer(serverId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM servers WHERE id = ?',
        [serverId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Dapatkan semua server user
  getUserServers(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM servers WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // Update theme saat ini
  updateCurrentTheme(serverId, themeName) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE servers SET current_theme = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [themeName, serverId],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  // Catat instalasi theme
  logInstall(serverId, themeName, status, logs) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO theme_installs (server_id, theme_name, status, logs) 
         VALUES (?, ?, ?, ?)`,
        [serverId, themeName, status, logs],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  // Dapatkan history instalasi
  getInstallHistory(serverId, limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM theme_installs WHERE server_id = ? ORDER BY install_date DESC LIMIT ?',
        [serverId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // Tambah atau update user
  upsertUser(userId, username, firstName, lastName) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO users (user_id, username, first_name, last_name) 
         VALUES (?, ?, ?, ?)`,
        [userId, username, firstName, lastName],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  // Close database
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = new Database();
