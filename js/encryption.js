// Roommate Portal - Encryption Module
// Handles encryption and decryption of sensitive user data

window.RoommatePortal = window.RoommatePortal || {};

const encryptionModule = {
    // Generate a new encryption key for a household
    generateEncryptionKey() {
        const array = new Uint8Array(32); // 256-bit key
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    // Convert hex string to Uint8Array
    hexToUint8Array(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
    },

    // Convert Uint8Array to hex string
    uint8ArrayToHex(bytes) {
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    // Encrypt data using AES-GCM
    async encryptData(data, key) {
        try {
            const encoder = new TextEncoder();
            const dataBytes = encoder.encode(JSON.stringify(data));

            // Import the key
            const keyBytes = this.hexToUint8Array(key);
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyBytes,
                'AES-GCM',
                false,
                ['encrypt']
            );

            // Generate a random IV
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Encrypt the data
            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                cryptoKey,
                dataBytes
            );

            // Combine IV and encrypted data
            const result = new Uint8Array(iv.length + encryptedData.byteLength);
            result.set(iv);
            result.set(new Uint8Array(encryptedData), iv.length);

            return this.uint8ArrayToHex(result);
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    },

    // Decrypt data using AES-GCM
    async decryptData(encryptedHex, key) {
        try {
            const encryptedBytes = this.hexToUint8Array(encryptedHex);

            // Extract IV and encrypted data
            const iv = encryptedBytes.slice(0, 12);
            const encryptedData = encryptedBytes.slice(12);

            // Import the key
            const keyBytes = this.hexToUint8Array(key);
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyBytes,
                'AES-GCM',
                false,
                ['decrypt']
            );

            // Decrypt the data
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                cryptoKey,
                encryptedData
            );

            const decoder = new TextDecoder();
            const jsonString = decoder.decode(decryptedData);
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    },

    // Get or create encryption key for current household
    async getOrCreateHouseholdKey() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (!currentHousehold) {
            console.warn('No household available for encryption key retrieval');
            throw new Error('No household available');
        }

        const { db } = window.RoommatePortal.config;

        // If household already has encryption key in state, use it
        if (currentHousehold.encryptionKey) {
            return currentHousehold.encryptionKey;
        }

        // Otherwise fetch from database
        const householdDoc = await db.collection('households').doc(currentHousehold.id).get();

        if (!householdDoc.exists) {
            throw new Error('Household not found');
        }

        const householdData = householdDoc.data();

        // If encryption key doesn't exist, create one
        if (!householdData.encryptionKey) {
            const newKey = this.generateEncryptionKey();
            await db.collection('households').doc(currentHousehold.id).update({
                encryptionKey: newKey
            });

            // Update local state
            currentHousehold.encryptionKey = newKey;
            window.RoommatePortal.state.setCurrentHousehold(currentHousehold);

            return newKey;
        }

        // Update local state with the key from database
        currentHousehold.encryptionKey = householdData.encryptionKey;
        window.RoommatePortal.state.setCurrentHousehold(currentHousehold);

        return householdData.encryptionKey;
    },

    // Encrypt sensitive fields in an object
    async encryptSensitiveData(data, sensitiveFields) {
        try {
            const encryptionKey = await this.getOrCreateHouseholdKey();
            const encryptedData = { ...data };

            for (const field of sensitiveFields) {
                if (data[field] !== undefined && data[field] !== null) {
                    encryptedData[field] = await this.encryptData(data[field], encryptionKey);
                    encryptedData[`${field}_encrypted`] = true;
                }
            }

            return encryptedData;
        } catch (error) {
            console.warn('Encryption failed, returning original data:', error.message);
            // Return original data if encryption fails
            return { ...data };
        }
    },

    // Encrypt sensitive fields in an object using a specific key
    async encryptDataWithKey(data, sensitiveFields, encryptionKey) {
        const encryptedData = { ...data };

        for (const field of sensitiveFields) {
            if (data[field] !== undefined && data[field] !== null) {
                encryptedData[field] = await this.encryptData(data[field], encryptionKey);
                encryptedData[`${field}_encrypted`] = true;
            }
        }

        return encryptedData;
    },

    // Decrypt sensitive fields in an object
    async decryptSensitiveData(data, sensitiveFields) {
        const encryptionKey = await this.getOrCreateHouseholdKey();
        const decryptedData = { ...data };

        for (const field of sensitiveFields) {
            if (data[`${field}_encrypted`] && data[field]) {
                try {
                    decryptedData[field] = await this.decryptData(data[field], encryptionKey);
                    delete decryptedData[`${field}_encrypted`];
                } catch (error) {
                    console.error(`Failed to decrypt ${field}:`, error);
                    // If decryption fails, keep the original (encrypted) value
                }
            }
        }

        return decryptedData;
    },

    // Process an array of data objects for encryption
    async encryptDataArray(dataArray, sensitiveFields) {
        const results = [];
        for (const item of dataArray) {
            const encrypted = await this.encryptSensitiveData(item, sensitiveFields);
            results.push(encrypted);
        }
        return results;
    },

    // Process an array of data objects for decryption
    async decryptDataArray(dataArray, sensitiveFields) {
        const results = [];
        for (const item of dataArray) {
            const decrypted = await this.decryptSensitiveData(item, sensitiveFields);
            results.push(decrypted);
        }
        return results;
    }
};

// Export the encryption module
window.RoommatePortal.encryption = encryptionModule;
