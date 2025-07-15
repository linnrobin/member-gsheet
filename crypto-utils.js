// crypto-utils.js
// Simple password hashing utilities for when bcrypt is not available

export class SimpleCrypto {
  static generateSalt(rounds = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./';
    let salt = '$2a$' + rounds.toString().padStart(2, '0') + '$';
    
    for (let i = 0; i < 22; i++) {
      salt += chars[Math.floor(Math.random() * chars.length)];
    }
    
    return salt;
  }

  static async hashPassword(password, salt) {
    // Use Web Crypto API if available, fallback to simple hash
    if (crypto && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        const hash = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hash));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return salt + hashHex.substring(0, 31); // bcrypt-like format
      } catch (error) {
        console.warn('Web Crypto API failed, using fallback:', error);
      }
    }
    
    // Simple fallback hash
    let hash = 0;
    const combined = password + salt;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return salt + Math.abs(hash).toString(36).padEnd(31, '0').substring(0, 31);
  }

  static genSaltSync(rounds = 10) {
    return this.generateSalt(rounds);
  }

  static hashSync(password, salt) {
    // For sync compatibility, use the simple hash method
    let hash = 0;
    const combined = password + salt;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return salt + Math.abs(hash).toString(36).padEnd(31, '0').substring(0, 31);
  }

  static compareSync(password, hash) {
    if (!hash || hash.length < 29) return false;
    
    // Extract salt from hash (bcrypt format: $2a$rounds$salt+hash)
    const parts = hash.split('$');
    if (parts.length < 4) return false;
    
    const salt = parts.slice(0, 4).join('$');
    const testHash = this.hashSync(password, salt);
    
    return testHash === hash;
  }
}

// Initialize crypto utilities
export function initCryptoUtils() {
  if (!window.bcrypt) {
    console.log('Setting up SimpleCrypto as bcrypt replacement...');
    
    window.bcrypt = {
      genSaltSync: SimpleCrypto.genSaltSync.bind(SimpleCrypto),
      hashSync: SimpleCrypto.hashSync.bind(SimpleCrypto),
      compareSync: SimpleCrypto.compareSync.bind(SimpleCrypto)
    };
    
    console.log('✅ SimpleCrypto initialized as bcrypt replacement');
    return true;
  }
  
  return false;
}
