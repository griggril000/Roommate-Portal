// Roommate Portal - Chores Management Module
// Handles chore creation, editing, completion, and deletion

window.RoommatePortal = window.RoommatePortal || {};

const choresModule = {
    // Initialize chore management
    init() {
        this.setupChoreForm();
        this.setupRewardsOptIn();
    },

    // Setup chore form event listener
    setupChoreForm() {
        const elements = window.RoommatePortal.state.elements;

        // Handle the FAB form
        if (elements.addChoreForm) {
            elements.addChoreForm.addEventListener('submit', this.handleAddChore.bind(this));
        }
    },

    // Setup rewards opt-in functionality
    setupRewardsOptIn() {
        const elements = window.RoommatePortal.state.elements;

        if (elements.rewardsOptInBtn) {
            elements.rewardsOptInBtn.addEventListener('click', () => {
                window.RoommatePortal.rewards.enableRewardsSystem();
            });
        }

        // Update UI based on rewards system status
        this.updateRewardsUI();
    },

    // Update UI based on rewards system status
    updateRewardsUI() {
        const elements = window.RoommatePortal.state.elements;
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        console.log('Updating rewards UI:', {
            currentHousehold: !!currentHousehold,
            rewardsEnabled: window.RoommatePortal.rewards?.isRewardsEnabled()
        });

        if (!currentHousehold) {
            // Hide rewards elements when no household
            if (elements.rewardsOptInBtn) elements.rewardsOptInBtn.classList.add('hidden');
            if (elements.chorePoints) elements.chorePoints.style.display = 'none';
            return;
        }

        const rewardsEnabled = window.RoommatePortal.rewards?.isRewardsEnabled();

        if (rewardsEnabled) {
            // Show points input, hide opt-in button
            if (elements.rewardsOptInBtn) elements.rewardsOptInBtn.classList.add('hidden');
            if (elements.chorePoints) elements.chorePoints.style.display = 'block';

            // Also update any chorePoints field in modal forms (FAB system)
            const modalForms = document.querySelectorAll('.input-modal form');
            modalForms.forEach(form => {
                const pointsField = form.querySelector('input[placeholder="Points (0-100)"]');
                if (pointsField) {
                    pointsField.style.display = 'block';
                }
            });
        } else {
            // Show opt-in button, hide points input
            if (elements.rewardsOptInBtn) elements.rewardsOptInBtn.classList.remove('hidden');
            if (elements.chorePoints) elements.chorePoints.style.display = 'none';

            // Also update any chorePoints field in modal forms (FAB system)
            const modalForms = document.querySelectorAll('.input-modal form');
            modalForms.forEach(form => {
                const pointsField = form.querySelector('input[placeholder="Points (0-100)"]');
                if (pointsField) {
                    pointsField.style.display = 'none';
                }
            });
        }
    },

    // Handle add chore form submission
    async handleAddChore(e) {
        if (e.preventDefault) e.preventDefault();

        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const elements = window.RoommatePortal.state.elements;

        if (!currentHousehold) {
            window.RoommatePortal.utils.showNotification('❌ You must be part of a household to add chores.');
            return;
        }

        const choreText = elements.choreInput.value.trim();
        const assignee = elements.choreAssignee.value;

        // Only set points if rewards are enabled and a valid positive value is entered
        let chorePoints = 0;
        if (elements.chorePoints && window.RoommatePortal.rewards?.isRewardsEnabled()) {
            const pointsValue = parseInt(elements.chorePoints.value);
            // Only use the points value if it's a valid number greater than 0
            if (!isNaN(pointsValue) && pointsValue > 0) {
                chorePoints = pointsValue;
            }
        }

        if (choreText) {
            try {
                // Encrypt the chore text
                const encryptedData = await window.RoommatePortal.encryption.encryptSensitiveData({
                    text: choreText
                }, ['text']);

                const chore = {
                    text: encryptedData.text,
                    assignee: assignee || 'Unassigned',
                    completed: false,
                    dateAdded: new Date().toLocaleDateString(),
                    priority: 'medium',
                    createdBy: currentUser.uid,
                    createdByName: currentUser.displayName,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    points: chorePoints // Add points to chore
                };

                // Only add encrypted flag if the field was actually encrypted
                if (encryptedData.text_encrypted) {
                    chore.text_encrypted = encryptedData.text_encrypted;
                }

                // Add to Firestore subcollection
                const { db } = window.RoommatePortal.config;
                await db.collection('households')
                    .doc(currentHousehold.id)
                    .collection('chores')
                    .add(chore);

                // Clear form
                elements.choreInput.value = '';
                elements.choreAssignee.value = '';
                if (elements.chorePoints) elements.chorePoints.value = '';
                window.RoommatePortal.utils.showNotification('✅ Chore added successfully!');
            } catch (error) {
                console.error('Error adding chore:', error);
                window.RoommatePortal.utils.showNotification('❌ Failed to add chore. Please try again.');
            }
        } else {
            window.RoommatePortal.utils.showNotification('❌ Please enter a chore description.');
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

        const listener = db.collection('households')
            .doc(currentHousehold.id)
            .collection('chores')
            .onSnapshot(async (snapshot) => {
                let choresList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Decrypt chore text
                try {
                    choresList = await window.RoommatePortal.encryption.decryptDataArray(choresList, ['text']);
                } catch (error) {
                    console.error('Error decrypting chores:', error);
                    window.RoommatePortal.utils.showNotification('⚠️ Some chores could not be decrypted.');
                }

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

            // Only show points when rewards are enabled AND points value is greater than 0
            const pointsDisplay = (window.RoommatePortal.rewards?.isRewardsEnabled() && chore.points > 0) ?
                `<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium ml-2">
                    ${chore.points} points
                </span>` : '';

            choreElement.innerHTML = `
                <div class="flex flex-col md:flex-row md:items-start md:justify-between">
                    <div class="flex items-start space-x-4 flex-1 min-w-0">
                        <input type="checkbox" ${chore.completed ? 'checked' : ''} 
                               onchange="window.RoommatePortal.chores.toggleChore('${chore.id}')" 
                               class="custom-checkbox mt-1 flex-shrink-0">
                        <div class="flex-1 min-w-0">
                            <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-2">
                                <span class="${chore.completed ? 'line-through text-gray-500' : 'text-gray-800'} font-semibold text-base sm:text-lg break-words">
                                    ${priorityIcon} ${chore.text}
                                </span>
                                <div class="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                                    <span class="chore-assignee">${chore.assignee}</span>
                                    ${pointsDisplay}
                                    ${isFormerMemberChore ? '<span class="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">Legacy</span>' : ''}
                                </div>
                            </div>
                            <div class="chore-date text-sm">
                                📅 Added: ${chore.dateAdded} • Created by: <span class="font-medium">${createdByName}</span>
                                ${chore.completed ? ` | ✅ Completed: ${chore.completedDate || new Date().toLocaleDateString()}` : ''}
                                ${chore.completed && completedByName ? ` • by: <span class="font-medium">${completedByName}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4 md:mt-0 md:ml-4">
                        ${!chore.completed ? `<button onclick="window.RoommatePortal.chores.markComplete('${chore.id}')" class="btn-complete w-full sm:w-auto">
                            <i class="fas fa-check mr-1"></i>Complete
                        </button>` : ''}
                        <button onclick="window.RoommatePortal.chores.deleteChore('${chore.id}')" class="btn-delete w-full sm:w-auto">
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

                // Award points only if rewards system is enabled and points value is greater than 0
                if (window.RoommatePortal.rewards?.isRewardsEnabled() && chore.points > 0) {
                    window.RoommatePortal.rewards.awardPointsForChore(chore.id, chore.text, chore.points);
                }

                window.RoommatePortal.utils.showNotification('🎉 Chore completed! Great job!');
            } else {
                // Deduct points only if rewards system is enabled and points value is greater than 0
                if (window.RoommatePortal.rewards?.isRewardsEnabled() && chore.points > 0) {
                    window.RoommatePortal.rewards.deductPointsForChore(chore.id, chore.text, chore.points);
                }

                delete chore.completedDate;
                delete chore.completedBy;
                delete chore.completedByName;

                window.RoommatePortal.utils.showNotification('🔄 Chore marked as incomplete.');
            }

            // Update in Firestore
            const { db } = window.RoommatePortal.config;
            const updateData = {
                completed: chore.completed,
                completedDate: chore.completedDate || firebase.firestore.FieldValue.delete(),
                completedBy: chore.completedBy || firebase.firestore.FieldValue.delete(),
                completedByName: chore.completedByName || firebase.firestore.FieldValue.delete()
            };

            db.collection('households')
                .doc(currentHousehold.id)
                .collection('chores')
                .doc(id)
                .update(updateData)
                .catch(error => {
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
            db.collection('households')
                .doc(currentHousehold.id)
                .collection('chores')
                .doc(id)
                .update({
                    completed: true,
                    completedDate: chore.completedDate,
                    completedBy: chore.completedBy,
                    completedByName: chore.completedByName
                }).then(() => {
                    // Award points only if rewards system is enabled and points value is greater than 0
                    if (window.RoommatePortal.rewards?.isRewardsEnabled() && chore.points > 0) {
                        window.RoommatePortal.rewards.awardPointsForChore(chore.id, chore.text, chore.points);
                    }

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
            db.collection('households')
                .doc(currentHousehold.id)
                .collection('chores')
                .doc(id)
                .delete()
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
