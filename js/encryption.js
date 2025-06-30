// Roommate Portal - End-to-End Encryption Module
// Handles client-side encryption/decryption of messages

window.RoommatePortal = window.RoommatePortal || {};

const encryptionModule = {
    // Store household encryption keys in memory
    householdKeys: new Map(),

    // Initialize encryption for a household
    async initializeHouseholdEncryption(householdId) {
        try {
            // Try to load existing key from secure storage
            const existingKey = await this.loadHouseholdKey(householdId);
            if (existingKey) {
                this.householdKeys.set(householdId, existingKey);
                return existingKey;
            }

            // Generate new key if none exists
            const key = await crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                true, // extractable
                ["encrypt", "decrypt"]
            );

            this.householdKeys.set(householdId, key);
            await this.saveHouseholdKey(householdId, key);
            return key;
        } catch (error) {
            console.error('Error initializing encryption:', error);
            throw error;
        }
    },

    // Encrypt a message
    async encryptMessage(message, householdId) {
        try {
            const key = this.householdKeys.get(householdId);
            if (!key) {
                throw new Error('No encryption key found for household');
            }

            // Convert message to bytes
            const encoder = new TextEncoder();
            const data = encoder.encode(message);

            // Generate random IV
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Encrypt the message
            const encrypted = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                key,
                data
            );

            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);

            // Convert to base64 for storage
            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Error encrypting message:', error);
            throw error;
        }
    },

    // Decrypt a message
    async decryptMessage(encryptedMessage, householdId) {
        try {
            const key = this.householdKeys.get(householdId);
            if (!key) {
                throw new Error('No encryption key found for household');
            }

            // Convert from base64
            const combined = new Uint8Array(
                atob(encryptedMessage).split('').map(char => char.charCodeAt(0))
            );

            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);

            // Decrypt the message
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                encrypted
            );

            // Convert back to string
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Error decrypting message:', error);
            // Return a placeholder if decryption fails
            return '[Unable to decrypt message]';
        }
    },

    // Save household key securely
    async saveHouseholdKey(householdId, key) {
        try {
            // Export key for storage
            const exported = await crypto.subtle.exportKey('raw', key);
            const keyArray = new Uint8Array(exported);
            const keyBase64 = btoa(String.fromCharCode(...keyArray));

            // Store in localStorage (in production, consider more secure storage)
            // You might want to encrypt this with a user-specific key
            localStorage.setItem(`household_key_${householdId}`, keyBase64);
        } catch (error) {
            console.error('Error saving household key:', error);
            throw error;
        }
    },

    // Load household key from storage
    async loadHouseholdKey(householdId) {
        try {
            const keyBase64 = localStorage.getItem(`household_key_${householdId}`);
            if (!keyBase64) return null;

            // Convert back to key
            const keyArray = new Uint8Array(
                atob(keyBase64).split('').map(char => char.charCodeAt(0))
            );

            const key = await crypto.subtle.importKey(
                'raw',
                keyArray,
                { name: "AES-GCM" },
                true,
                ["encrypt", "decrypt"]
            );

            return key;
        } catch (error) {
            console.error('Error loading household key:', error);
            return null;
        }
    },

    // Share household key with new member (simplified version)
    async shareKeyWithUser(householdId, newUserEmail) {
        // In production, you'd want to:
        // 1. Get the new user's public key
        // 2. Encrypt the household key with their public key
        // 3. Store the encrypted key where they can access it
        
        console.log('Key sharing would be implemented here');
        // For now, the key is stored in localStorage when they join
    },

    // Clean up keys when leaving household
    removeHouseholdKey(householdId) {
        this.householdKeys.delete(householdId);
        localStorage.removeItem(`household_key_${householdId}`);
    }
};

// Export encryption module to global namespace
window.RoommatePortal.encryption = encryptionModule;
