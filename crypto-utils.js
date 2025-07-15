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
    console.log('SimpleCrypto.compareSync called with:', { password: '***', hash: hash });
    
    if (!hash || hash.length < 10) {
      console.log('Hash too short or empty');
      return false;
    }
    
    // Handle different hash formats
    if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
      console.log('Detected bcrypt-style hash format');
      // Real bcrypt hash format - extract salt and compare
      const parts = hash.split('$');
      if (parts.length >= 4) {
        // For bcrypt format: $2a$rounds$saltAndHash
        // Extract salt (first 29 chars after $2a$rounds$)
        const salt = hash.substring(0, 29);
        console.log('Extracted salt:', salt);
        const testHash = this.hashSync(password, salt);
        console.log('Generated test hash:', testHash);
        const result = testHash === hash;
        console.log('Bcrypt comparison result:', result);
        return result;
      }
    }
    
    // SimpleCrypto hash format - extract salt and compare
    if (hash.includes('$')) {
      console.log('Detected SimpleCrypto hash format');
      const parts = hash.split('$');
      if (parts.length >= 4) {
        const salt = parts.slice(0, 4).join('$');
        console.log('Extracted salt:', salt);
        const testHash = this.hashSync(password, salt);
        console.log('Generated test hash:', testHash);
        const result = testHash === hash;
        console.log('SimpleCrypto comparison result:', result);
        return result;
      }
    }
    
    // Legacy format or direct comparison
    console.log('Using direct comparison');
    const result = password === hash;
    console.log('Direct comparison result:', result);
    return result;
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
