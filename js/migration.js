// Roommate Portal - Migration Script for Encryption
// This script helps migrate existing households to use encryption

window.RoommatePortal = window.RoommatePortal || {};

const migrationModule = {
    // Check if current household needs encryption key
    async checkEncryptionMigration() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (!currentHousehold) return;

        const { db } = window.RoommatePortal.config;

        try {
            const householdDoc = await db.collection('households').doc(currentHousehold.id).get();
            if (!householdDoc.exists) return;

            const householdData = householdDoc.data();

            // If no encryption key exists, add one
            if (!householdData.encryptionKey) {
                console.log('Adding encryption key to existing household...');
                const newKey = window.RoommatePortal.encryption.generateEncryptionKey();

                await db.collection('households').doc(currentHousehold.id).update({
                    encryptionKey: newKey
                });

                // Update local state
                currentHousehold.encryptionKey = newKey;
                window.RoommatePortal.state.setCurrentHousehold(currentHousehold);

                console.log('Encryption key added successfully');
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error checking encryption migration:', error);
            return false;
        }
    },

    // Manual migration function for admins
    async performManualMigration() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        if (!currentUser || !currentHousehold) {
            window.RoommatePortal.utils.showNotification('❌ You must be logged in and part of a household to perform migration.');
            return;
        }

        // Check if user is admin
        if (currentHousehold.memberDetails &&
            currentHousehold.memberDetails[currentUser.uid] &&
            currentHousehold.memberDetails[currentUser.uid].role !== 'admin') {
            window.RoommatePortal.utils.showNotification('❌ Only household admins can perform migrations.');
            return;
        }

        const migrationNeeded = await this.checkEncryptionMigration();

        if (migrationNeeded) {
            window.RoommatePortal.utils.showNotification('✅ Encryption migration completed successfully!');

            // Refresh household data
            setTimeout(() => {
                window.RoommatePortal.household.loadHouseholdData();
            }, 1000);
        } else {
            window.RoommatePortal.utils.showNotification('ℹ️ No migration needed - household already has encryption enabled.');
        }
    }
};

// Export migration module
window.RoommatePortal.migration = migrationModule;

// Auto-check for migration on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for user to be authenticated and household to be loaded
    setTimeout(() => {
        if (window.RoommatePortal.state.getCurrentUser() &&
            window.RoommatePortal.state.getCurrentHousehold()) {
            migrationModule.checkEncryptionMigration();
        }
    }, 3000);
});

// Also check when household changes
window.addEventListener('roommatePortal:householdChange', () => {
    setTimeout(() => {
        migrationModule.checkEncryptionMigration();
    }, 1000);
});
