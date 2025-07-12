// Roommate Portal - Migration Script for Encryption
// This script helps migrate existing households to use encryption and read receipts

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
    },

    // Check and add readBy fields to existing messages and announcements
    async checkReadReceiptMigration() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (!currentHousehold) return;

        const { db } = window.RoommatePortal.config;

        try {
            console.log('Checking if read receipt migration is needed...');

            // Check messages for readBy field
            const messagesSnapshot = await db.collection('households')
                .doc(currentHousehold.id)
                .collection('messages')
                .limit(5)
                .get();

            let needsMessageMigration = false;
            messagesSnapshot.forEach(doc => {
                const data = doc.data();
                if (!data.readBy) {
                    needsMessageMigration = true;
                }
            });

            // Check announcements for readBy field
            const announcementsSnapshot = await db.collection('households')
                .doc(currentHousehold.id)
                .collection('announcements')
                .limit(5)
                .get();

            let needsAnnouncementMigration = false;
            announcementsSnapshot.forEach(doc => {
                const data = doc.data();
                if (!data.readBy) {
                    needsAnnouncementMigration = true;
                }
            });

            if (needsMessageMigration || needsAnnouncementMigration) {
                console.log('Performing read receipt migration...');
                await this.performReadReceiptMigration();
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error checking read receipt migration:', error);
            return false;
        }
    },

    // Add readBy fields to all existing messages and announcements
    async performReadReceiptMigration() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (!currentHousehold) return;

        const { db } = window.RoommatePortal.config;
        const batch = db.batch();
        let batchCount = 0;

        try {
            // Migrate messages
            const messagesSnapshot = await db.collection('households')
                .doc(currentHousehold.id)
                .collection('messages')
                .get();

            messagesSnapshot.forEach(doc => {
                const data = doc.data();
                if (!data.readBy && data.authorId) {
                    // Set readBy to include only the author (preserving existing behavior)
                    batch.update(doc.ref, {
                        readBy: [data.authorId]
                    });
                    batchCount++;

                    // Firestore batch limit is 500
                    if (batchCount >= 400) {
                        throw new Error('Too many documents to migrate in one batch');
                    }
                }
            });

            // Migrate announcements
            const announcementsSnapshot = await db.collection('households')
                .doc(currentHousehold.id)
                .collection('announcements')
                .get();

            announcementsSnapshot.forEach(doc => {
                const data = doc.data();
                if (!data.readBy && data.authorId) {
                    // Set readBy to include only the author (preserving existing behavior)
                    batch.update(doc.ref, {
                        readBy: [data.authorId]
                    });
                    batchCount++;

                    // Firestore batch limit is 500
                    if (batchCount >= 400) {
                        throw new Error('Too many documents to migrate in one batch');
                    }
                }
            });

            if (batchCount > 0) {
                await batch.commit();
                console.log(`Successfully migrated ${batchCount} documents with readBy fields`);
            }

        } catch (error) {
            console.error('Error performing read receipt migration:', error);
            throw error;
        }
    },

    // Run all migrations
    async runAllMigrations() {
        try {
            await this.checkEncryptionMigration();
            await this.checkReadReceiptMigration();
        } catch (error) {
            console.error('Error running migrations:', error);
        }
    },
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
