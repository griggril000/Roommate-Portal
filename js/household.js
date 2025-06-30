// Roommate Portal - Household Management Module
// Handles household creation, joining, management, and member operations

window.RoommatePortal = window.RoommatePortal || {};

const household = {
    // Check if user is part of a household
    async checkUserHousehold() {
        try {
            const { db } = window.RoommatePortal.config;
            const currentUser = window.RoommatePortal.state.getCurrentUser();

            // Check if user is member of any household
            const userDoc = await db.collection('users').doc(currentUser.uid).get();

            if (userDoc.exists && userDoc.data().householdId) {
                const householdId = userDoc.data().householdId;
                const householdDoc = await db.collection('households').doc(householdId).get();

                if (householdDoc.exists) {
                    const householdData = { id: householdDoc.id, ...householdDoc.data() };
                    window.RoommatePortal.state.setCurrentHousehold(householdData);
                    window.RoommatePortal.ui.updateUIForAuth();
                    this.loadHouseholdData();
                } else {
                    // Household doesn't exist, clear user's household reference
                    await db.collection('users').doc(currentUser.uid).update({
                        householdId: firebase.firestore.FieldValue.delete()
                    });
                    this.showHouseholdModal();
                }
            } else {
                // User is not part of any household
                this.showHouseholdModal();
            }
        } catch (error) {
            console.error('Error checking user household:', error);
            this.showHouseholdModal();
        }
    },

    // Load household data
    loadHouseholdData() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (currentHousehold) {
            // Enable main content when household data is loaded
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.style.display = 'block';
                mainContent.style.opacity = '1';
                mainContent.style.pointerEvents = 'auto';
            }

            window.RoommatePortal.chores.loadChoresFromFirestore();
            window.RoommatePortal.messages.loadMessagesFromFirestore();
            this.updateHouseholdMembers();
        }
    },

    // Show household modal
    showHouseholdModal() {
        const householdModal = document.getElementById('householdModal');
        if (!householdModal) {
            this.createHouseholdModal();
        }

        const modal = document.getElementById('householdModal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    // Hide household modal
    hideHouseholdModal() {
        const householdModal = document.getElementById('householdModal');
        if (householdModal) {
            householdModal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    },

    // Create household modal
    createHouseholdModal() {
        const modalHTML = `
            <div id="householdModal" class="fixed inset-0 bg-gray-800 bg-opacity-40 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg shadow-lg p-6 w-96 max-w-md mx-4">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">🏠 Household Setup</h2>
                    <p class="text-gray-600 mb-6">You need to create or join a household to continue.</p>
                    
                    <div class="space-y-4">
                        <button id="createHouseholdBtn" class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                            <i class="fas fa-plus mr-2"></i>Create New Household
                        </button>
                        <button id="joinHouseholdBtn" class="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                            <i class="fas fa-users mr-2"></i>Join Existing Household
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        document.getElementById('createHouseholdBtn').addEventListener('click', this.showCreateHouseholdForm.bind(this));
        document.getElementById('joinHouseholdBtn').addEventListener('click', this.showJoinHouseholdForm.bind(this));
    },

    // Show create household form
    showCreateHouseholdForm() {
        const modal = document.getElementById('householdModal');
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 w-96 max-w-md mx-4">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">🏠 Create Household</h2>
                <form id="createHouseholdForm" class="space-y-4">
                    <input type="text" id="householdNameInput" class="w-full px-4 py-3 border rounded-lg focus:border-blue-500 focus:outline-none" placeholder="Household Name" required>
                    <textarea id="householdDescInput" class="w-full px-4 py-3 border rounded-lg focus:border-blue-500 focus:outline-none resize-none" rows="3" placeholder="Description (optional)"></textarea>
                    <div class="flex space-x-3">
                        <button type="submit" class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                            Create
                        </button>
                        <button type="button" id="backToHouseholdOptions" class="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors">
                            Back
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('createHouseholdForm').addEventListener('submit', this.handleCreateHousehold.bind(this));
        document.getElementById('backToHouseholdOptions').addEventListener('click', () => {
            modal.remove();
            this.createHouseholdModal();
            this.showHouseholdModal();
        });
    },

    // Show join household form
    showJoinHouseholdForm() {
        const modal = document.getElementById('householdModal');
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 w-96 max-w-md mx-4">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">🏠 Join Household</h2>
                <form id="joinHouseholdForm" class="space-y-4">
                    <input type="text" id="householdCodeInput" class="w-full px-4 py-3 border rounded-lg focus:border-blue-500 focus:outline-none" placeholder="Household Code" required>
                    <div class="flex space-x-3">
                        <button type="submit" class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                            Join
                        </button>
                        <button type="button" id="backToHouseholdOptionsJoin" class="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors">
                            Back
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('joinHouseholdForm').addEventListener('submit', this.handleJoinHousehold.bind(this));
        document.getElementById('backToHouseholdOptionsJoin').addEventListener('click', () => {
            modal.remove();
            this.createHouseholdModal();
            this.showHouseholdModal();
        });
    },

    // Handle create household
    async handleCreateHousehold(e) {
        e.preventDefault();
        const { db } = window.RoommatePortal.config;
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        const householdName = document.getElementById('householdNameInput').value.trim();
        const householdDesc = document.getElementById('householdDescInput').value.trim();

        if (!householdName) return;

        try {
            // Generate a unique household code
            const householdCode = await window.RoommatePortal.utils.generateHouseholdCode();

            // Create household document
            const householdData = {
                name: householdName,
                description: householdDesc || '',
                code: householdCode,
                createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                members: [currentUser.uid],
                memberDetails: {
                    [currentUser.uid]: {
                        displayName: currentUser.displayName || currentUser.email,
                        email: currentUser.email,
                        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        role: 'admin'
                    }
                }
            };

            const householdRef = await db.collection('households').add(householdData);

            // Update user document with household reference
            await db.collection('users').doc(currentUser.uid).set({
                householdId: householdRef.id,
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email
            }, { merge: true });

            const household = { id: householdRef.id, ...householdData };
            window.RoommatePortal.state.setCurrentHousehold(household);
            this.hideHouseholdModal();
            window.RoommatePortal.ui.updateUIForAuth();
            this.loadHouseholdData();

            window.RoommatePortal.utils.showNotification(`🎉 Household "${householdName}" created! Code: ${householdCode}`);
        } catch (error) {
            console.error('Error creating household:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to create household. Please try again.');
        }
    },

    // Handle join household
    async handleJoinHousehold(e) {
        e.preventDefault();
        const { db } = window.RoommatePortal.config;
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        const householdCode = document.getElementById('householdCodeInput').value.trim().toUpperCase();

        if (!householdCode) return;

        try {
            // Find household by code
            const householdQuery = await db.collection('households')
                .where('code', '==', householdCode)
                .limit(1)
                .get();

            if (householdQuery.empty) {
                window.RoommatePortal.utils.showNotification('❌ Invalid household code. Please check and try again.');
                return;
            }

            const householdDoc = householdQuery.docs[0];
            const householdData = householdDoc.data();

            // Check if user is already a member
            if (householdData.members && householdData.members.includes(currentUser.uid)) {
                window.RoommatePortal.utils.showNotification('ℹ️ You are already a member of this household.');
                const household = { id: householdDoc.id, ...householdData };
                window.RoommatePortal.state.setCurrentHousehold(household);
                this.hideHouseholdModal();
                window.RoommatePortal.ui.updateUIForAuth();
                this.loadHouseholdData();
                return;
            }

            // Add user to household
            await db.collection('households').doc(householdDoc.id).update({
                members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
                [`memberDetails.${currentUser.uid}`]: {
                    displayName: currentUser.displayName || currentUser.email,
                    email: currentUser.email,
                    joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    role: 'member'
                }
            });

            // Update user document
            await db.collection('users').doc(currentUser.uid).set({
                householdId: householdDoc.id,
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email
            }, { merge: true });

            const household = { id: householdDoc.id, ...householdData };
            window.RoommatePortal.state.setCurrentHousehold(household);
            this.hideHouseholdModal();
            window.RoommatePortal.ui.updateUIForAuth();
            this.loadHouseholdData();

            window.RoommatePortal.utils.showNotification(`🎉 Successfully joined household "${householdData.name}"!`);
        } catch (error) {
            console.error('Error joining household:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to join household. Please try again.');
        }
    },

    // Update household members dropdown
    updateHouseholdMembers() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!currentHousehold || !currentHousehold.memberDetails) return;

        // Update assignee dropdown with household members
        const choreAssignee = document.getElementById('choreAssignee');
        if (choreAssignee) {
            // Clear existing options
            choreAssignee.innerHTML = '';

            // Create and add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Assign to...';
            choreAssignee.appendChild(defaultOption);

            // Add member options
            Object.values(currentHousehold.memberDetails).forEach(member => {
                const option = document.createElement('option');
                option.value = member.displayName;
                option.textContent = member.displayName;
                choreAssignee.appendChild(option);
            });

            // Add "Everyone" option
            const everyoneOption = document.createElement('option');
            everyoneOption.value = 'Everyone';
            everyoneOption.textContent = 'Everyone';
            choreAssignee.appendChild(everyoneOption);
        }

        // Update author input with current user's name
        const authorInput = document.getElementById('authorInput');
        if (authorInput && currentUser) {
            const userDetails = currentHousehold.memberDetails[currentUser.uid];
            if (userDetails) {
                authorInput.value = userDetails.displayName;
                authorInput.readOnly = true;
            }
        }
    }
};

// Export household module to global namespace
window.RoommatePortal.household = household;
