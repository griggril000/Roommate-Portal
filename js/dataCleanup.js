// Roommate Portal - Data Cleanup Module
// Handles data cleanup when users log out or leave households

window.RoommatePortal = window.RoommatePortal || {};

const dataCleanup = {
    // Clean up listeners and data when logging out
    cleanupData() {
        // Stop listening to Firestore
        const choresListener = window.RoommatePortal.state.getChoresListener();
        const messagesListener = window.RoommatePortal.state.getMessagesListener();

        if (choresListener) {
            choresListener();
            window.RoommatePortal.state.setChoresListener(null);
        }

        if (messagesListener) {
            messagesListener();
            window.RoommatePortal.state.setMessagesListener(null);
        }

        // Clear data arrays
        window.RoommatePortal.state.setChores([]);
        window.RoommatePortal.state.setMessages([]);

        // Clear current user and household if logging out completely
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        if (!currentUser) {
            window.RoommatePortal.state.setCurrentHousehold(null);
        }

        // Force clear the UI elements directly to ensure no stale data
        const elements = window.RoommatePortal.state.elements;
        if (elements.choreList) {
            elements.choreList.innerHTML = '';
        }
        if (elements.messageList) {
            elements.messageList.innerHTML = '';
        }

        // Reset statistics to zero
        if (elements.activeChoresCount) elements.activeChoresCount.textContent = '0';
        if (elements.completedTodayCount) elements.completedTodayCount.textContent = '0';
        if (elements.newMessagesCount) elements.newMessagesCount.textContent = '0';

        // Clear form inputs
        const chorePriority = document.getElementById('chorePriority');

        if (elements.choreInput) elements.choreInput.value = '';
        if (elements.choreAssignee) elements.choreAssignee.value = '';
        if (chorePriority) chorePriority.value = 'medium';
        if (elements.messageInput) elements.messageInput.value = '';
        if (elements.authorInput) {
            elements.authorInput.value = '';
            elements.authorInput.readOnly = false; // Make it editable again
        }

        // Always update UI to show empty state, but don't hide main content
        window.RoommatePortal.chores.loadChores();
        window.RoommatePortal.messages.loadMessages();
        window.RoommatePortal.statistics.updateStatistics();
    },

    // Delete user data from household (called when leaving household or deleting account)
    async deleteUserDataFromHousehold(userId, householdId, isLastMember = false) {
        try {
            const { db } = window.RoommatePortal.config;
            const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

            if (isLastMember) {
                // If this is the last member, delete all chores in the household
                const deleteBatch = db.batch();

                const allChoresQuery = await db.collection('chores')
                    .where('householdId', '==', householdId)
                    .get();

                allChoresQuery.docs.forEach(doc => {
                    deleteBatch.delete(doc.ref);
                });

                // Delete all messages in the household
                const userMessagesQuery = await db.collection('messages')
                    .where('householdId', '==', householdId)
                    .get();

                userMessagesQuery.docs.forEach(doc => {
                    deleteBatch.delete(doc.ref);
                });

                // Commit all deletions for last member
                await deleteBatch.commit();
            } else {
                // Get user's display name for operations
                const userDetails = currentHousehold.memberDetails[userId];
                const userDisplayName = userDetails ? userDetails.displayName : 'Unknown User';

                // First batch: Handle updates only (no deletions)
                const updateBatch = db.batch();

                // Unassign chores assigned to this user (set to "Unassigned")
                const userAssignedChoresQuery = await db.collection('chores')
                    .where('householdId', '==', householdId)
                    .where('assignee', '==', userDisplayName)
                    .get();

                userAssignedChoresQuery.docs.forEach(doc => {
                    updateBatch.update(doc.ref, {
                        assignee: 'Unassigned'
                    });
                });

                // Update ALL chores created by this user to mark as "former-member" (preserve all chores)
                const userCreatedChoresQuery = await db.collection('chores')
                    .where('householdId', '==', householdId)
                    .where('createdBy', '==', userId)
                    .get();

                userCreatedChoresQuery.docs.forEach(doc => {
                    // Keep ALL chores (completed and incomplete) but mark as created by "Former Member"
                    updateBatch.update(doc.ref, {
                        createdBy: 'former-member',
                        originalCreator: userDisplayName
                    });
                });

                // Remove user from readBy arrays in remaining messages
                const allMessagesQuery = await db.collection('messages')
                    .where('householdId', '==', householdId)
                    .get();

                allMessagesQuery.docs.forEach(doc => {
                    const messageData = doc.data();
                    if (messageData.readBy && messageData.readBy.includes(userId)) {
                        updateBatch.update(doc.ref, {
                            readBy: firebase.firestore.FieldValue.arrayRemove(userId)
                        });
                    }
                });

                // Commit all updates first
                await updateBatch.commit();

                // Second batch: Handle deletions only
                const deleteBatch = db.batch();

                // Delete all messages posted by this user
                const userMessagesQuery = await db.collection('messages')
                    .where('householdId', '==', householdId)
                    .where('authorId', '==', userId)
                    .get();

                userMessagesQuery.docs.forEach(doc => {
                    deleteBatch.delete(doc.ref);
                });

                // Commit all deletions
                await deleteBatch.commit();
            }

            console.log(`Cleaned up data for user ${userId} from household ${householdId}${isLastMember ? ' (last member)' : ''}`);
        } catch (error) {
            console.error('Error cleaning up user data from household:', error);

            // Provide more specific error information
            if (error.code === 'permission-denied') {
                throw new Error('Permission denied: Unable to delete user data from household. Check Firestore security rules.');
            } else if (error.code === 'not-found') {
                console.warn('Some data was not found (may have been already deleted)');
                // This is not necessarily an error, continue
            } else {
                throw new Error(`Failed to clean up user data: ${error.message || error.code || 'Unknown error'}`);
            }
        }
    },

    // Delete entire household (called when last member leaves)
    async deleteEntireHousehold(householdId) {
        try {
            const { db } = window.RoommatePortal.config;
            const batch = db.batch();

            // Delete all chores in the household
            const choresQuery = await db.collection('chores')
                .where('householdId', '==', householdId)
                .get();

            choresQuery.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Delete all messages in the household
            const messagesQuery = await db.collection('messages')
                .where('householdId', '==', householdId)
                .get();

            messagesQuery.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Delete the household document itself
            batch.delete(db.collection('households').doc(householdId));

            // Commit all deletions
            await batch.commit();
            console.log(`Deleted entire household ${householdId} and all associated data`);
        } catch (error) {
            console.error('Error deleting entire household:', error);

            // Provide more specific error information
            if (error.code === 'permission-denied') {
                throw new Error('Permission denied: Unable to delete household data. Check Firestore security rules.');
            } else {
                throw new Error(`Failed to delete household: ${error.message || error.code || 'Unknown error'}`);
            }
        }
    }
};

// Export dataCleanup module to global namespace
window.RoommatePortal.dataCleanup = dataCleanup;
