// Roommate Portal - Chores Management Module
// Handles chore creation, editing, completion, and deletion

window.RoommatePortal = window.RoommatePortal || {};

const choresModule = {
    // Initialize chore management
    init() {
        this.setupChoreForm();
    },

    // Setup chore form event listener
    setupChoreForm() {
        const elements = window.RoommatePortal.state.elements;

        if (elements.addChoreForm) {
            elements.addChoreForm.addEventListener('submit', this.handleAddChore.bind(this));
        }
    },

    // Handle add chore form submission
    handleAddChore(e) {
        e.preventDefault();

        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const elements = window.RoommatePortal.state.elements;

        if (!currentHousehold) {
            window.RoommatePortal.utils.showNotification('❌ You must be part of a household to add chores.');
            return;
        }

        const choreText = elements.choreInput.value.trim();
        const assignee = elements.choreAssignee.value;

        if (choreText) {
            const chore = {
                text: choreText,
                assignee: assignee || 'Unassigned',
                completed: false,
                dateAdded: new Date().toLocaleDateString(),
                priority: 'medium',
                householdId: currentHousehold.id,
                createdBy: currentUser.uid,
                createdByName: currentUser.displayName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add to Firestore
            const { db } = window.RoommatePortal.config;
            db.collection('chores').add(chore)
                .then(() => {
                    // Clear form
                    elements.choreInput.value = '';
                    elements.choreAssignee.value = '';
                    window.RoommatePortal.utils.showNotification('✅ Chore added successfully!');
                })
                .catch(error => {
                    console.error('Error adding chore:', error);
                    window.RoommatePortal.utils.showNotification('❌ Failed to add chore. Please try again.');
                });
        }
    },

    // Load chores from Firestore
    loadChoresFromFirestore() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (!currentHousehold) return;

        const { db } = window.RoommatePortal.config;

        // Clean up any existing listener
        const choresListener = window.RoommatePortal.state.getChoresListener();
        if (choresListener) {
            choresListener();
            window.RoommatePortal.state.setChoresListener(null);
        }

        const listener = db.collection('chores')
            .where('householdId', '==', currentHousehold.id)
            .onSnapshot((snapshot) => {
                const choresList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                window.RoommatePortal.state.setChores(choresList);
                this.loadChores();
                window.RoommatePortal.statistics.updateStatistics();
            }, (error) => {
                console.error('Error loading chores:', error);
                const currentUser = window.RoommatePortal.state.getCurrentUser();

                if (error.code === 'permission-denied') {
                    if (currentUser && currentHousehold) {
                        window.RoommatePortal.utils.showNotification('❌ Failed to load chores. Please check your permissions.');
                    }
                } else if (error.code === 'not-found' || error.message.includes('collection')) {
                    // Collection doesn't exist yet - normal for new households
                    window.RoommatePortal.state.setChores([]);
                    this.loadChores();
                    window.RoommatePortal.statistics.updateStatistics();
                } else {
                    if (currentUser && currentHousehold) {
                        window.RoommatePortal.utils.showNotification('❌ Failed to load chores. Please try again later.');
                    }
                }
            });

        window.RoommatePortal.state.setChoresListener(listener);
    },

    // Load and display chores
    loadChores() {
        const elements = window.RoommatePortal.state.elements;
        const choresList = window.RoommatePortal.state.getChores();
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        elements.choreList.innerHTML = '';

        if (choresList.length === 0) {
            const emptyStateMessage = !currentUser ?
                '<p>Sign in to manage your household chores and tasks.</p>' :
                !currentHousehold ?
                    '<p>Join or create a household to start managing chores together.</p>' :
                    '<p>Add your first chore using the form above to get started.</p>';

            elements.choreList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>No chores yet!</h3>
                    ${emptyStateMessage}
                </div>
            `;
            return;
        }

        // Sort chores: incomplete first, then by date
        const sortedChores = choresList.sort((a, b) => {
            if (a.completed === b.completed) {
                return new Date(b.dateAdded) - new Date(a.dateAdded);
            }
            return a.completed - b.completed;
        });

        sortedChores.forEach((chore, index) => {
            const choreElement = document.createElement('div');
            choreElement.className = `chore-item ${chore.completed ? 'completed' : ''} animate-slide-in`;
            choreElement.style.animationDelay = `${index * 0.1}s`;

            const priorityIcon = chore.priority === 'high' ? '🔴' : chore.priority === 'low' ? '🟢' : '🟡';
            const isFormerMemberChore = chore.createdBy === 'former-member';
            const createdByName = isFormerMemberChore ?
                (chore.originalCreator || 'Former Member') :
                (chore.createdByName || window.RoommatePortal.utils.getUserDisplayName(chore.createdBy));
            const completedByName = chore.completedBy ?
                (chore.completedByName || window.RoommatePortal.utils.getUserDisplayName(chore.completedBy)) :
                null;

            choreElement.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex items-start space-x-4 flex-1">
                        <input type="checkbox" ${chore.completed ? 'checked' : ''} 
                               onchange="window.RoommatePortal.chores.toggleChore('${chore.id}')" 
                               class="custom-checkbox mt-1">
                        <div class="flex-1">
                            <div class="flex items-center space-x-2">
                                <span class="${chore.completed ? 'line-through text-gray-500' : 'text-gray-800'} font-semibold text-lg">
                                    ${priorityIcon} ${chore.text}
                                </span>
                                <span class="chore-assignee">${chore.assignee}</span>
                                ${isFormerMemberChore ? '<span class="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">Legacy</span>' : ''}
                            </div>
                            <div class="chore-date">
                                📅 Added: ${chore.dateAdded} • Created by: <span class="font-medium">${createdByName}</span>
                                ${chore.completed ? ` | ✅ Completed: ${chore.completedDate || new Date().toLocaleDateString()}` : ''}
                                ${chore.completed && completedByName ? ` • by: <span class="font-medium">${completedByName}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex space-x-2 ml-4">
                        ${!chore.completed ? `<button onclick="window.RoommatePortal.chores.markComplete('${chore.id}')" class="btn-complete">
                            <i class="fas fa-check mr-1"></i>Complete
                        </button>` : ''}
                        <button onclick="window.RoommatePortal.chores.deleteChore('${chore.id}')" class="btn-delete">
                            <i class="fas fa-trash mr-1"></i>Delete
                        </button>
                    </div>
                </div>
            `;

            elements.choreList.appendChild(choreElement);
        });
    },

    // Toggle chore completion
    toggleChore(id) {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        if (!currentUser || !currentHousehold) {
            window.RoommatePortal.utils.showNotification('❌ You must be logged in and part of a household to manage chores.');
            return;
        }

        const choresList = window.RoommatePortal.state.getChores();
        const chore = choresList.find(c => c.id === id);
        if (chore) {
            chore.completed = !chore.completed;
            if (chore.completed) {
                chore.completedDate = new Date().toLocaleDateString();
                chore.completedBy = currentUser.uid;
                chore.completedByName = currentUser.displayName;
                window.RoommatePortal.utils.showNotification('🎉 Chore completed! Great job!');
            } else {
                delete chore.completedDate;
                delete chore.completedBy;
                delete chore.completedByName;
            }

            // Update in Firestore
            const { db } = window.RoommatePortal.config;
            const updateData = {
                completed: chore.completed,
                completedDate: chore.completedDate || firebase.firestore.FieldValue.delete(),
                completedBy: chore.completedBy || firebase.firestore.FieldValue.delete(),
                completedByName: chore.completedByName || firebase.firestore.FieldValue.delete()
            };

            db.collection('chores').doc(id).update(updateData).catch(error => {
                console.error('Error updating chore:', error);
                window.RoommatePortal.utils.showNotification('❌ Failed to update chore. Please try again.');
            });
        }
    },

    // Mark chore as complete
    markComplete(id) {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        if (!currentUser || !currentHousehold) {
            window.RoommatePortal.utils.showNotification('❌ You must be logged in and part of a household to manage chores.');
            return;
        }

        const choresList = window.RoommatePortal.state.getChores();
        const chore = choresList.find(c => c.id === id);
        if (chore) {
            chore.completed = true;
            chore.completedDate = new Date().toLocaleDateString();
            chore.completedBy = currentUser.uid;
            chore.completedByName = currentUser.displayName;

            // Update in Firestore
            const { db } = window.RoommatePortal.config;
            db.collection('chores').doc(id).update({
                completed: true,
                completedDate: chore.completedDate,
                completedBy: chore.completedBy,
                completedByName: chore.completedByName
            }).then(() => {
                window.RoommatePortal.utils.showNotification('🎉 Awesome! Chore marked as complete!');
            }).catch(error => {
                console.error('Error updating chore:', error);
                window.RoommatePortal.utils.showNotification('❌ Failed to update chore. Please try again.');
            });
        }
    },

    // Delete chore
    deleteChore(id) {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        if (!currentUser || !currentHousehold) {
            window.RoommatePortal.utils.showNotification('❌ You must be logged in and part of a household to manage chores.');
            return;
        }

        if (confirm('Are you sure you want to delete this chore?')) {
            const { db } = window.RoommatePortal.config;
            db.collection('chores').doc(id).delete()
                .then(() => {
                    window.RoommatePortal.utils.showNotification('🗑️ Chore deleted');
                })
                .catch(error => {
                    console.error('Error deleting chore:', error);
                    window.RoommatePortal.utils.showNotification('❌ Failed to delete chore. Please try again.');
                });
        }
    }
};

// Export chores module to global namespace
window.RoommatePortal.chores = choresModule;
