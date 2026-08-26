// Utility functions
const crypto = require('crypto');

class Utils {
  // Generate unique ID
  static generateId() {
    return crypto.randomBytes(8).toString('hex');
  }

  // Validate IP address
  static isValidIP(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([\da-f]{0,4}:){2,7}[\da-f]{0,4}$/i;

    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
      return false;
    }

    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.');
      return parts.every(part => parseInt(part) <= 255);
    }

    return true;
  }

  // Validate port
  static isValidPort(port) {
    const num = parseInt(port);
    return !isNaN(num) && num > 0 && num <= 65535;
  }

  // Format date
  static formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Escape markdown
  static escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }

  // Log to console with timestamp
  static log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('id-ID');
    const prefix = {
      'info': '[ℹ️]',
      'success': '[✅]',
      'error': '[❌]',
      'warning': '[⚠️]'
    };

    console.log(`${prefix[type] || '[•]'} [${timestamp}] ${message}`);
  }

  // Rate limiter
  static createRateLimiter(maxRequests = 5, windowMs = 60000) {
    const requests = new Map();

    return (userId) => {
      const now = Date.now();
      const userRequests = requests.get(userId) || [];
      
      // Remove old requests
      const recentRequests = userRequests.filter(time => now - time < windowMs);
      
      if (recentRequests.length >= maxRequests) {
        return false;
      }

      recentRequests.push(now);
      requests.set(userId, recentRequests);
      return true;
    };
  }

  // Parse command arguments
  static parseArguments(text) {
    return text.split(' ').filter(arg => arg.length > 0);
  }

  // Validate credentials
  static async validateSSHCredentials(sshUser, sshIp, sshPort) {
    // Simple validation - dapat diganti dengan actual SSH test
    if (!sshUser || !sshIp || !sshPort) {
      return { valid: false, error: 'Missing credentials' };
    }

    if (!this.isValidIP(sshIp)) {
      return { valid: false, error: 'Invalid IP address' };
    }

    if (!this.isValidPort(sshPort)) {
      return { valid: false, error: 'Invalid port' };
    }

    return { valid: true };
  }

  // Get current timestamp
  static getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // Convert bytes to readable format
  static bytesToReadable(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Wait for milliseconds
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = Utils;
