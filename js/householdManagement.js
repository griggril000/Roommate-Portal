// Roommate Portal - Household Management Actions Module
// Handles advanced household management like leaving household, account deletion, etc.

window.RoommatePortal = window.RoommatePortal || {};

const householdManagement = {
    // Show household management modal
    showHouseholdManagement() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!currentHousehold) return;

        const modal = document.createElement('div');
        modal.id = 'householdManagementModal';
        modal.className = 'fixed inset-0 bg-gray-800 bg-opacity-40 flex items-center justify-center z-50';

        const membersList = Object.entries(currentHousehold.memberDetails || {})
            .map(([uid, member]) => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <span class="text-2xl">${window.RoommatePortal.utils.getAvatarEmoji(member.displayName)}</span>
                        <div>
                            <div class="flex items-center space-x-2">
                                <p class="font-medium text-gray-800">${member.displayName}</p>
                                ${uid === currentUser.uid ? `<button onclick="window.RoommatePortal.householdManagement.showEditProfileModal()" class="text-blue-600 hover:text-blue-800 transition-colors p-1" title="Edit your name">
                                    <i class="fas fa-pencil-alt text-sm"></i>
                                </button>` : ''}
                            </div>
                            <p class="text-sm text-gray-500">${member.email}</p>
                        </div>
                    </div>
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${member.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                }">${member.role}</span>
                </div>
            `).join('');

        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">🏠 Household Management</h2>
                
                <div class="space-y-4">
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h3 class="font-semibold text-blue-800 mb-2">Household Details</h3>
                        <p class="text-gray-700"><strong>Name:</strong> ${currentHousehold.name}</p>
                        <p class="text-gray-700"><strong>Code:</strong> ${currentHousehold.code}</p>
                        <p class="text-gray-700"><strong>Members:</strong> ${Object.keys(currentHousehold.memberDetails || {}).length}</p>
                    </div>
                    
                    <div>
                        <h3 class="font-semibold text-gray-800 mb-3">Members</h3>
                        <div class="space-y-2 max-h-48 overflow-y-auto">
                            ${membersList}
                        </div>
                    </div>
                    
                    <div class="flex space-x-3 pt-4 border-t">
                        <button id="leaveHouseholdBtn" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
                            Leave Household
                        </button>
                        <button id="closeHouseholdManagementBtn" class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors">
                            Close
                        </button>
                    </div>
                    
                    <div class="pt-3 border-t border-gray-200 mt-3">
                        <button id="deleteAccountBtn" class="w-full px-4 py-2 bg-red-800 text-white rounded-lg font-medium hover:bg-red-900 transition-colors text-sm">
                            ⚠️ Delete Account Permanently
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Add event listeners
        document.getElementById('leaveHouseholdBtn').addEventListener('click', window.RoommatePortal.householdManagement.leaveHousehold.bind(window.RoommatePortal.householdManagement));
        document.getElementById('deleteAccountBtn').addEventListener('click', window.RoommatePortal.householdManagement.deleteUserAccount.bind(window.RoommatePortal.householdManagement));
        document.getElementById('closeHouseholdManagementBtn').addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });
    },

    // Leave household
    async leaveHousehold() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const { db } = window.RoommatePortal.config;

        if (!currentHousehold || !currentUser) return;

        const isAdmin = currentHousehold.memberDetails[currentUser.uid]?.role === 'admin';
        const memberCount = Object.keys(currentHousehold.memberDetails || {}).length;

        let confirmMessage = 'Are you sure you want to leave this household? This will unassign chores assigned to you and delete your messages, but preserve all chores for household history.';
        if (isAdmin && memberCount > 1) {
            confirmMessage = 'You are the admin of this household. Leaving will transfer admin rights to another member, unassign your chores, and delete your messages. All chores will be preserved. Are you sure?';
        } else if (isAdmin && memberCount === 1) {
            confirmMessage = 'You are the only member of this household. Leaving will delete the household and ALL data permanently (including all chores and messages). Are you sure?';
        }

        if (confirm(confirmMessage)) {
            try {
                const isLastMember = memberCount === 1;

                // Delete user's data from the household
                await window.RoommatePortal.dataCleanup.deleteUserDataFromHousehold(currentUser.uid, currentHousehold.id, isLastMember);

                if (isLastMember) {
                    // Delete the household entirely (including all remaining data)
                    await window.RoommatePortal.dataCleanup.deleteEntireHousehold(currentHousehold.id);
                    window.RoommatePortal.utils.showNotification('🏠 Household and all data deleted successfully.');
                } else {
                    // Remove user from household
                    await db.collection('households').doc(currentHousehold.id).update({
                        members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid),
                        [`memberDetails.${currentUser.uid}`]: firebase.firestore.FieldValue.delete()
                    });

                    // If user was admin, transfer admin to first remaining member
                    if (isAdmin) {
                        const remainingMembers = Object.keys(currentHousehold.memberDetails).filter(uid => uid !== currentUser.uid);
                        if (remainingMembers.length > 0) {
                            await db.collection('households').doc(currentHousehold.id).update({
                                [`memberDetails.${remainingMembers[0]}.role`]: 'admin'
                            });
                        }
                    }
                    window.RoommatePortal.utils.showNotification('👋 You have left the household. Your chores have been unassigned and marked as created by "Former Member", and your messages have been deleted.');
                }

                // Remove household reference from user
                await db.collection('users').doc(currentUser.uid).update({
                    householdId: firebase.firestore.FieldValue.delete()
                });

                // Reset household state
                window.RoommatePortal.state.setCurrentHousehold(null);

                // Close modal and show household selection
                const modal = document.getElementById('householdManagementModal');
                if (modal) {
                    modal.remove();
                    document.body.style.overflow = '';
                }

                window.RoommatePortal.household.showHouseholdModal();

            } catch (error) {
                console.error('Error leaving household:', error);
                window.RoommatePortal.utils.showNotification('❌ Failed to leave household. Please try again.');
            }
        }
    },

    // Delete user account permanently
    async deleteUserAccount() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const { db } = window.RoommatePortal.config;

        if (!currentUser) {
            window.RoommatePortal.utils.showNotification('❌ No user is currently signed in.');
            return;
        }

        const confirmMessage = 'Are you sure you want to delete your account? This will:\n\n' +
            '• Remove you from your current household\n' +
            '• Unassign chores assigned to you (chores will be preserved)\n' +
            '• Mark chores you created as "Former Member"\n' +
            '• Delete your messages\n' +
            '• Permanently delete your account\n\n' +
            'This action cannot be undone!';

        if (confirm(confirmMessage)) {
            let householdDataDeleted = false;
            let userRemovedFromHousehold = false;

            try {
                // If user is part of a household, clean up their data first
                if (currentHousehold) {
                    try {
                        // Check if user was the only member
                        const memberCount = Object.keys(currentHousehold.memberDetails || {}).length;
                        const isLastMember = memberCount === 1;

                        // Clean up household data
                        await window.RoommatePortal.dataCleanup.deleteUserDataFromHousehold(currentUser.uid, currentHousehold.id, isLastMember);
                        householdDataDeleted = true;

                        if (isLastMember) {
                            // Delete the entire household since user was the only member
                            await window.RoommatePortal.dataCleanup.deleteEntireHousehold(currentHousehold.id);
                        } else {
                            // Remove user from household
                            await db.collection('households').doc(currentHousehold.id).update({
                                members: firebase.firestore.FieldValue.arrayRemove(currentUser.uid),
                                [`memberDetails.${currentUser.uid}`]: firebase.firestore.FieldValue.delete()
                            });
                            userRemovedFromHousehold = true;

                            // If user was admin, transfer admin to first remaining member
                            const isAdmin = currentHousehold.memberDetails[currentUser.uid]?.role === 'admin';
                            if (isAdmin) {
                                const remainingMembers = Object.keys(currentHousehold.memberDetails).filter(uid => uid !== currentUser.uid);
                                if (remainingMembers.length > 0) {
                                    await db.collection('households').doc(currentHousehold.id).update({
                                        [`memberDetails.${remainingMembers[0]}.role`]: 'admin'
                                    });
                                }
                            }
                        }
                    } catch (householdError) {
                        console.error('Error cleaning up household data:', householdError);
                        // Continue with account deletion even if household cleanup fails
                        window.RoommatePortal.utils.showNotification('⚠️ Warning: Could not fully clean up household data, but proceeding with account deletion.');
                    }
                }

                // Delete user document from Firestore
                try {
                    await db.collection('users').doc(currentUser.uid).delete();
                } catch (userDocError) {
                    console.error('Error deleting user document:', userDocError);
                    // Continue with auth user deletion even if user document deletion fails
                }

                // Delete the Firebase Auth user account
                await currentUser.delete();

                // Clear local state
                window.RoommatePortal.state.setCurrentUser(null);
                window.RoommatePortal.state.setCurrentHousehold(null);

                // Close the management modal
                const modal = document.getElementById('householdManagementModal');
                if (modal) {
                    modal.remove();
                    document.body.style.overflow = '';
                }

                // Clean up data and update UI
                window.RoommatePortal.dataCleanup.cleanupData();
                window.RoommatePortal.utils.clearLocalStorage();
                window.RoommatePortal.ui.updateUIForAuth();

                // Show success message based on what was actually deleted
                if (householdDataDeleted) {
                    window.RoommatePortal.utils.showNotification('✅ Your account and all associated data have been deleted successfully.');
                } else {
                    window.RoommatePortal.utils.showNotification('✅ Your account has been deleted (some household data may remain).');
                }

            } catch (error) {
                console.error('Error deleting user account:', error);

                // Handle different types of errors with specific messages
                if (error.code === 'auth/requires-recent-login') {
                    window.RoommatePortal.utils.showNotification('❌ Please sign out and sign back in to delete your account (for security).');
                } else if (error.code === 'permission-denied') {
                    window.RoommatePortal.utils.showNotification('❌ Permission denied. Unable to delete account data. Please contact support.');
                } else {
                    window.RoommatePortal.utils.showNotification(`❌ Failed to delete account: ${error.message || 'Unknown error'}. Please try again.`);
                }

                // Close the management modal on any error
                const modal = document.getElementById('householdManagementModal');
                if (modal) {
                    modal.remove();
                    document.body.style.overflow = '';
                }
            }
        }
    },

    // Show edit profile modal
    showEditProfileModal() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        if (!currentUser) return;

        const modal = document.createElement('div');
        modal.id = 'editProfileModal';
        modal.className = 'fixed inset-0 bg-gray-800 bg-opacity-40 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 w-96 max-w-md mx-4">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">✏️ Edit Your Name</h2>
                
                <form id="editNameForm" class="space-y-4">
                    <input type="text" id="newNameInput" class="w-full px-4 py-3 border rounded-lg focus:border-blue-500 focus:outline-none" 
                           placeholder="Enter your new name" value="${currentUser.displayName || ''}" required />
                    <div class="flex space-x-3">
                        <button type="submit" class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                            Update Name
                        </button>
                        <button type="button" id="cancelEditName" class="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        const editNameForm = document.getElementById('editNameForm');
        const newNameInput = document.getElementById('newNameInput');
        const cancelBtn = document.getElementById('cancelEditName');

        // Focus on input
        setTimeout(() => newNameInput.focus(), 100);

        editNameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = newNameInput.value.trim();

            if (!newName) {
                window.RoommatePortal.utils.showNotification('❌ Please enter a valid name.');
                return;
            }

            if (newName === currentUser.displayName) {
                // No change needed
                modal.remove();
                document.body.style.overflow = '';
                return;
            }

            try {
                await window.RoommatePortal.householdManagement.updateUserName(newName);
                modal.remove();
                document.body.style.overflow = '';
                window.RoommatePortal.utils.showNotification('✅ Your name has been updated successfully!');

                // Refresh the household management modal
                const householdModal = document.getElementById('householdManagementModal');
                if (householdModal) {
                    householdModal.remove();
                    window.RoommatePortal.householdManagement.showHouseholdManagement();
                }
            } catch (error) {
                console.error('Error updating name:', error);
                window.RoommatePortal.utils.showNotification('❌ Failed to update name. Please try again.');
            }
        });

        cancelBtn.addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });
    },

    // Update user name across all systems
    async updateUserName(newName) {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const { db } = window.RoommatePortal.config;

        if (!currentUser || !currentHousehold) {
            throw new Error('User must be logged in and part of a household');
        }

        const oldName = currentUser.displayName;
        const userId = currentUser.uid;

        try {
            // 1. Update Firebase Auth profile
            await currentUser.updateProfile({
                displayName: newName
            });

            // 2. Update user document in Firestore
            await db.collection('users').doc(userId).update({
                displayName: newName
            });

            // 3. Update household member details
            await db.collection('households').doc(currentHousehold.id).update({
                [`memberDetails.${userId}.displayName`]: newName
            });

            // 4. Update all chores created by this user
            const choresQuery = await db.collection('chores')
                .where('householdId', '==', currentHousehold.id)
                .where('createdBy', '==', userId)
                .get();

            const choreUpdates = [];
            choresQuery.docs.forEach(doc => {
                choreUpdates.push(
                    db.collection('chores').doc(doc.id).update({
                        createdByName: newName
                    })
                );
            });

            // 5. Update all chores completed by this user
            const completedChoresQuery = await db.collection('chores')
                .where('householdId', '==', currentHousehold.id)
                .where('completedBy', '==', userId)
                .get();

            completedChoresQuery.docs.forEach(doc => {
                choreUpdates.push(
                    db.collection('chores').doc(doc.id).update({
                        completedByName: newName
                    })
                );
            });

            // 6. Update all chores assigned to this user (by name)
            if (oldName) {
                const assignedChoresQuery = await db.collection('chores')
                    .where('householdId', '==', currentHousehold.id)
                    .where('assignee', '==', oldName)
                    .get();

                assignedChoresQuery.docs.forEach(doc => {
                    choreUpdates.push(
                        db.collection('chores').doc(doc.id).update({
                            assignee: newName
                        })
                    );
                });
            }

            // 7. Update all messages authored by this user
            const messagesQuery = await db.collection('messages')
                .where('householdId', '==', currentHousehold.id)
                .where('authorId', '==', userId)
                .get();

            const messageUpdates = [];
            messagesQuery.docs.forEach(doc => {
                messageUpdates.push(
                    db.collection('messages').doc(doc.id).update({
                        author: newName
                    })
                );
            });

            // Execute all updates
            await Promise.all([...choreUpdates, ...messageUpdates]);

            // Update local household data
            if (currentHousehold.memberDetails && currentHousehold.memberDetails[userId]) {
                currentHousehold.memberDetails[userId].displayName = newName;
            }

            // Refresh household members dropdown
            window.RoommatePortal.household.updateHouseholdMembers();

            // Refresh UI components that show user names
            window.RoommatePortal.ui.updateUIForAuth();

        } catch (error) {
            console.error('Error updating user name:', error);
            throw error;
        }
    }
};

// Export householdManagement module to global namespace
window.RoommatePortal.householdManagement = householdManagement;
