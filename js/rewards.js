// Roommate Portal - Rewards System Module
// Handles opt-in rewards system with points and redemption

window.RoommatePortal = window.RoommatePortal || {};

const rewardsModule = {
    // Initialize rewards system
    init() {
        this.loadRewardsFromFirestore();
        this.loadTransactionHistory();
    },

    // Check if household has rewards system enabled
    isRewardsEnabled() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        return currentHousehold && currentHousehold.rewardsEnabled === true;
    },

    // Enable rewards system for household
    async enableRewardsSystem() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!currentHousehold || !currentUser) {
            window.RoommatePortal.utils.showNotification('❌ You must be logged in and part of a household to enable rewards.');
            return;
        }

        const { db } = window.RoommatePortal.config;

        try {
            await db.collection('households').doc(currentHousehold.id).update({
                rewardsEnabled: true,
                rewardsPoints: 0,
                rewardsEnabledBy: currentUser.uid,
                rewardsEnabledAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Log the enabling as a transaction
            await this.logTransaction('system', 'Rewards system enabled', 0, currentUser.displayName);

            // Update local household state immediately
            currentHousehold.rewardsEnabled = true;
            currentHousehold.rewardsPoints = 0;
            currentHousehold.rewardsEnabledBy = currentUser.uid;
            window.RoommatePortal.state.setCurrentHousehold(currentHousehold);

            window.RoommatePortal.utils.showNotification('🎉 Rewards system enabled! Start earning points by completing chores.');

            // Refresh UI components
            if (window.RoommatePortal.chores && window.RoommatePortal.chores.updateRewardsUI) {
                window.RoommatePortal.chores.updateRewardsUI();
            }
            if (window.RoommatePortal.statistics && window.RoommatePortal.statistics.updateStatistics) {
                window.RoommatePortal.statistics.updateStatistics();
            }

            // Refresh modal if open
            this.refreshRewardsModalIfOpen();

            // Start loading rewards data
            this.loadRewardsFromFirestore();
            this.loadTransactionHistory();

            // Refresh household data in background
            window.RoommatePortal.household.loadHouseholdData();
        } catch (error) {
            console.error('Error enabling rewards:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to enable rewards system.');
        }
    },

    // Disable rewards system for household
    async disableRewardsSystem() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!currentHousehold || !currentUser) {
            window.RoommatePortal.utils.showNotification('❌ You must be logged in and part of a household to disable rewards.');
            return;
        }

        if (!confirm('Are you sure you want to disable the rewards system? This will reset points and remove ALL rewards for the household.')) {
            return;
        }

        const { db } = window.RoommatePortal.config;

        try {
            await db.collection('households').doc(currentHousehold.id).update({
                rewardsEnabled: false,
                rewardsPoints: firebase.firestore.FieldValue.delete(),
                rewardsEnabledBy: firebase.firestore.FieldValue.delete(),
                rewardsEnabledAt: firebase.firestore.FieldValue.delete()
            });

            // Delete all rewards for this household
            const rewardsSnapshot = await db.collection('households').doc(currentHousehold.id)
                .collection('rewards')
                .get();

            const batch = db.batch();
            rewardsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            // Log the disabling as a transaction
            await this.logTransaction('system', 'Rewards system disabled', 0, currentUser.displayName);

            // Update local household state immediately
            currentHousehold.rewardsEnabled = false;
            delete currentHousehold.rewardsPoints;
            delete currentHousehold.rewardsEnabledBy;
            delete currentHousehold.rewardsEnabledAt;
            window.RoommatePortal.state.setCurrentHousehold(currentHousehold);

            // Clear rewards and transactions data
            window.RoommatePortal.state.setRewards([]);
            window.RoommatePortal.state.setRewardTransactions([]);

            // Clean up listeners
            const rewardsListener = window.RoommatePortal.state.getRewardsListener();
            if (rewardsListener) {
                rewardsListener();
                window.RoommatePortal.state.setRewardsListener(null);
            }

            const transactionsListener = window.RoommatePortal.state.getRewardTransactionsListener();
            if (transactionsListener) {
                transactionsListener();
                window.RoommatePortal.state.setRewardTransactionsListener(null);
            }

            window.RoommatePortal.utils.showNotification('🔄 Rewards system disabled and reset.');

            // Refresh UI components
            if (window.RoommatePortal.chores && window.RoommatePortal.chores.updateRewardsUI) {
                window.RoommatePortal.chores.updateRewardsUI();
            }
            if (window.RoommatePortal.statistics && window.RoommatePortal.statistics.updateStatistics) {
                window.RoommatePortal.statistics.updateStatistics();
            }

            // Refresh modal if open
            this.refreshRewardsModalIfOpen();

            // Refresh household data in background
            window.RoommatePortal.household.loadHouseholdData();
        } catch (error) {
            console.error('Error disabling rewards:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to disable rewards system.');
        }
    },

    // Get current household points
    getCurrentPoints() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        return currentHousehold?.rewardsPoints || 0;
    },

    // Award points for completing a chore
    async awardPointsForChore(choreId, choreText, points) {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!this.isRewardsEnabled() || !currentHousehold || !currentUser) {
            return;
        }

        const { db } = window.RoommatePortal.config;

        try {
            const newPoints = this.getCurrentPoints() + points;

            // Update local household state immediately
            currentHousehold.rewardsPoints = newPoints;
            window.RoommatePortal.state.setCurrentHousehold(currentHousehold);

            // Update UI immediately
            if (window.RoommatePortal.statistics && window.RoommatePortal.statistics.updateStatistics) {
                window.RoommatePortal.statistics.updateStatistics();
            }

            // Refresh modal if open
            this.refreshRewardsModalIfOpen();

            await db.collection('households').doc(currentHousehold.id).update({
                rewardsPoints: newPoints
            });

            // Log the transaction
            await this.logTransaction('earned', `Completed chore: ${choreText}`, points, currentUser.displayName);

            window.RoommatePortal.utils.showNotification(`🌟 +${points} points earned! Total: ${newPoints} points`);

            // Refresh household data in background
            window.RoommatePortal.household.loadHouseholdData();
        } catch (error) {
            console.error('Error awarding points:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to award points.');
        }
    },

    // Deduct points for uncompleting a chore
    async deductPointsForChore(choreId, choreText, points) {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!this.isRewardsEnabled() || !currentHousehold || !currentUser) {
            return;
        }

        const { db } = window.RoommatePortal.config;

        try {
            const currentPoints = this.getCurrentPoints();
            const newPoints = Math.max(0, currentPoints - points); // Don't allow negative points

            // Update local state immediately for instant UI feedback
            currentHousehold.rewardsPoints = newPoints;
            window.RoommatePortal.state.setCurrentHousehold(currentHousehold);

            // Update UI immediately
            if (window.RoommatePortal.statistics && window.RoommatePortal.statistics.updateStatistics) {
                window.RoommatePortal.statistics.updateStatistics();
            }

            // Refresh modal if open
            this.refreshRewardsModalIfOpen();

            window.RoommatePortal.utils.showNotification(`🔻 -${points} points deducted! Total: ${newPoints} points`);

            // Update Firestore in background
            await db.collection('households').doc(currentHousehold.id).update({
                rewardsPoints: newPoints
            });

            // Log the transaction
            await this.logTransaction('deducted', `Uncompleted chore: ${choreText}`, -points, currentUser.displayName);

            // Refresh household data in background
            window.RoommatePortal.household.loadHouseholdData();
        } catch (error) {
            console.error('Error deducting points:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to deduct points.');
        }
    },

    // Redeem points for a reward
    async redeemReward(rewardId) {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!this.isRewardsEnabled() || !currentHousehold || !currentUser) {
            window.RoommatePortal.utils.showNotification('❌ Rewards system not available.');
            return;
        }

        const { db } = window.RoommatePortal.config;

        try {
            const rewardDoc = await db.collection('households').doc(currentHousehold.id)
                .collection('rewards').doc(rewardId).get();
            const reward = rewardDoc.data();

            if (!reward) {
                window.RoommatePortal.utils.showNotification('❌ Reward not found.');
                return;
            }

            const currentPoints = this.getCurrentPoints();
            if (currentPoints < reward.points) {
                window.RoommatePortal.utils.showNotification(`❌ Not enough points! You need ${reward.points} points but only have ${currentPoints}.`);
                return;
            }

            if (!confirm(`HOUSEHOLD REWARD NOTICE: "${reward.name}" will be redeemed for the entire household using ${reward.points} shared household points.\n\n Do you want to proceed with this redemption?`)) {
                return;
            }

            const newPoints = currentPoints - reward.points;

            // Update local state immediately for instant UI feedback
            currentHousehold.rewardsPoints = newPoints;
            window.RoommatePortal.state.setCurrentHousehold(currentHousehold);

            // Update UI immediately
            if (window.RoommatePortal.statistics && window.RoommatePortal.statistics.updateStatistics) {
                window.RoommatePortal.statistics.updateStatistics();
            }

            // Refresh modal if open
            this.refreshRewardsModalIfOpen();

            window.RoommatePortal.utils.showNotification(`🎉 Reward redeemed! "${reward.name}" - Remaining points: ${newPoints}`);

            // Update Firestore in background
            await db.collection('households').doc(currentHousehold.id).update({
                rewardsPoints: newPoints
            });

            // Log the transaction
            await this.logTransaction('redeemed', `Redeemed reward: ${reward.name}`, -reward.points, currentUser.displayName);

            // Refresh household data in background
            window.RoommatePortal.household.loadHouseholdData();
        } catch (error) {
            console.error('Error redeeming reward:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to redeem reward.');
        }
    },

    // Add a new reward
    async addReward(name, points, description = '') {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!this.isRewardsEnabled() || !currentHousehold || !currentUser) {
            window.RoommatePortal.utils.showNotification('❌ Rewards system not available.');
            return;
        }

        const { db } = window.RoommatePortal.config;

        try {
            const reward = {
                name: name.trim(),
                points: parseInt(points),
                description: description.trim(),
                createdBy: currentUser.uid,
                createdByName: currentUser.displayName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('households').doc(currentHousehold.id)
                .collection('rewards').add(reward);

            // Log the transaction
            await this.logTransaction('system', `Added reward: ${name} (${points} points)`, 0, currentUser.displayName);

            window.RoommatePortal.utils.showNotification(`✅ Reward "${name}" added successfully!`);

            this.loadRewardsFromFirestore();
        } catch (error) {
            console.error('Error adding reward:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to add reward.');
        }
    },

    // Delete a reward
    async deleteReward(rewardId) {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!this.isRewardsEnabled() || !currentHousehold || !currentUser) {
            window.RoommatePortal.utils.showNotification('❌ Rewards system not available.');
            return;
        }

        if (!confirm('Are you sure you want to delete this reward?')) {
            return;
        }

        const { db } = window.RoommatePortal.config;

        try {
            const rewardDoc = await db.collection('households').doc(currentHousehold.id)
                .collection('rewards').doc(rewardId).get();
            const reward = rewardDoc.data();

            if (!reward) {
                window.RoommatePortal.utils.showNotification('❌ Reward not found.');
                return;
            }

            await db.collection('households').doc(currentHousehold.id)
                .collection('rewards').doc(rewardId).delete();

            // Log the transaction
            await this.logTransaction('system', `Deleted reward: ${reward.name}`, 0, currentUser.displayName);

            window.RoommatePortal.utils.showNotification('🗑️ Reward deleted successfully!');

            this.loadRewardsFromFirestore();
        } catch (error) {
            console.error('Error deleting reward:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to delete reward.');
        }
    },

    // Load rewards from Firestore
    loadRewardsFromFirestore() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (!currentHousehold || !this.isRewardsEnabled()) {
            window.RoommatePortal.state.setRewards([]);
            return;
        }

        const { db } = window.RoommatePortal.config;

        // Clean up existing listener
        const rewardsListener = window.RoommatePortal.state.getRewardsListener();
        if (rewardsListener) {
            rewardsListener();
            window.RoommatePortal.state.setRewardsListener(null);
        }

        const listener = db.collection('households').doc(currentHousehold.id)
            .collection('rewards')
            .orderBy('points', 'asc')
            .onSnapshot((snapshot) => {
                const rewardsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                window.RoommatePortal.state.setRewards(rewardsList);
                this.renderRewards();
            }, (error) => {
                console.error('Error loading rewards:', error);
                window.RoommatePortal.state.setRewards([]);
                this.renderRewards();
            });

        window.RoommatePortal.state.setRewardsListener(listener);
    },

    // Log a transaction
    async logTransaction(type, description, points, userName) {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();

        if (!currentHousehold) return;

        const { db } = window.RoommatePortal.config;

        try {
            const transaction = {
                type: type, // 'earned', 'redeemed', 'system'
                description: description,
                points: points,
                userName: userName,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('households').doc(currentHousehold.id)
                .collection('rewardTransactions').add(transaction);
        } catch (error) {
            console.error('Error logging transaction:', error);
        }
    },

    // Load transaction history
    loadTransactionHistory() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (!currentHousehold || !this.isRewardsEnabled()) {
            window.RoommatePortal.state.setRewardTransactions([]);
            return;
        }

        const { db } = window.RoommatePortal.config;

        // Clean up existing listener
        const transactionsListener = window.RoommatePortal.state.getRewardTransactionsListener();
        if (transactionsListener) {
            transactionsListener();
            window.RoommatePortal.state.setRewardTransactionsListener(null);
        }

        const listener = db.collection('households').doc(currentHousehold.id)
            .collection('rewardTransactions')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot((snapshot) => {
                const transactionsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                window.RoommatePortal.state.setRewardTransactions(transactionsList);
                this.renderTransactionHistory();
            }, (error) => {
                console.error('Error loading transactions:', error);
                window.RoommatePortal.state.setRewardTransactions([]);
                this.renderTransactionHistory();
            });

        window.RoommatePortal.state.setRewardTransactionsListener(listener);
    },

    // Render rewards list
    renderRewards() {
        const rewardsContainer = document.getElementById('rewardsList');
        if (!rewardsContainer) return;

        const rewards = window.RoommatePortal.state.getRewards();
        const currentPoints = this.getCurrentPoints();

        if (rewards.length === 0) {
            rewardsContainer.innerHTML = `
                <div class="empty-state text-center py-8">
                    <i class="fas fa-gift text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-600 mb-2">No rewards yet!</h3>
                    <p class="text-gray-500">Add rewards for your household to work towards.</p>
                </div>
            `;
            return;
        }

        rewardsContainer.innerHTML = rewards.map(reward => `
            <div class="reward-item bg-white border rounded-lg p-4 flex items-center justify-between ${currentPoints >= reward.points ? 'border-green-300 bg-green-50' : 'border-gray-200'}">
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        <h4 class="font-semibold text-gray-800">${reward.name}</h4>
                    </div>
                    ${reward.description ? `<p class="text-gray-600 text-sm mt-1">${reward.description}</p>` : ''}
                    <div class="flex items-center space-x-2 mt-2">
                        <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                            ${reward.points} points
                        </span>
                        <span class="text-xs text-gray-500">
                            Added by ${reward.createdByName}
                        </span>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button 
                        onclick="window.RoommatePortal.rewards.redeemReward('${reward.id}')"
                        class="px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPoints >= reward.points
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}"
                        ${currentPoints >= reward.points ? '' : 'disabled'}>
                        ${currentPoints >= reward.points ? '🎉 Redeem' : '🔒 Locked'}
                    </button>
                    <button 
                        onclick="window.RoommatePortal.rewards.deleteReward('${reward.id}')"
                        class="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    // Render transaction history
    renderTransactionHistory() {
        const historyContainer = document.getElementById('transactionHistory');
        if (!historyContainer) return;

        const transactions = window.RoommatePortal.state.getRewardTransactions();

        if (transactions.length === 0) {
            historyContainer.innerHTML = `
                <div class="empty-state text-center py-8">
                    <i class="fas fa-history text-4xl text-gray-400 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-600 mb-2">No transaction history yet!</h3>
                    <p class="text-gray-500">Complete chores and redeem rewards to see activity here.</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = transactions.map(transaction => {
            const date = transaction.timestamp ? new Date(transaction.timestamp.toDate()).toLocaleDateString() : 'Unknown';
            const time = transaction.timestamp ? new Date(transaction.timestamp.toDate()).toLocaleTimeString() : '';

            let icon, pointsColor, pointsText;

            switch (transaction.type) {
                case 'earned':
                    icon = '🌟';
                    pointsColor = 'text-green-600';
                    pointsText = `+${transaction.points}`;
                    break;
                case 'deducted':
                    icon = '🔻';
                    pointsColor = 'text-orange-600';
                    pointsText = `${transaction.points}`;
                    break;
                case 'redeemed':
                    icon = '🎉';
                    pointsColor = 'text-red-600';
                    pointsText = `${transaction.points}`;
                    break;
                case 'system':
                    icon = '⚙️';
                    pointsColor = 'text-gray-600';
                    pointsText = transaction.points === 0 ? '' : `${transaction.points > 0 ? '+' : ''}${transaction.points}`;
                    break;
                default:
                    icon = '📝';
                    pointsColor = 'text-gray-600';
                    pointsText = `${transaction.points > 0 ? '+' : ''}${transaction.points}`;
            }

            return `
                <div class="transaction-item bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <span class="text-lg">${icon}</span>
                        <div>
                            <p class="font-medium text-gray-800">${transaction.description}</p>
                            <p class="text-sm text-gray-500">
                                ${transaction.userName} • ${date} ${time}
                            </p>
                        </div>
                    </div>
                    ${pointsText ? `<span class="font-semibold ${pointsColor}">${pointsText}</span>` : ''}
                </div>
            `;
        }).join('');
    },

    // Refresh rewards modal if it's currently open
    refreshRewardsModalIfOpen() {
        const existingModal = document.getElementById('rewardsModal');
        if (existingModal) {
            // Modal is open, refresh it
            existingModal.remove();
            document.body.style.overflow = '';
            setTimeout(() => this.showRewardsModal(), 100);
        }
    },

    // Show rewards management modal
    showRewardsModal() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!currentHousehold || !currentUser) {
            window.RoommatePortal.utils.showNotification('❌ You must be logged in and part of a household to manage rewards.');
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'rewardsModal';
        modal.className = 'fixed inset-0 bg-gray-800 bg-opacity-40 flex items-center justify-center z-50';

        const isEnabled = this.isRewardsEnabled();
        const currentPoints = this.getCurrentPoints();

        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-2xl font-bold text-gray-800">
                            🎁 Rewards System
                        </h2>
                        <button id="closeRewardsModal" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    ${!isEnabled ? `
                        <div class="text-center py-8 bg-blue-50 rounded-lg mb-6">
                            <i class="fas fa-star text-4xl text-blue-600 mb-4"></i>
                            <h3 class="text-lg font-semibold text-gray-800 mb-2">Rewards System Not Enabled</h3>
                            <p class="text-gray-600 mb-4">Enable the rewards system to start earning points for completing chores and redeem rewards as a household.</p>
                            <button id="enableRewardsBtn" class="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                                <i class="fas fa-star mr-2"></i>Enable Rewards System
                            </button>
                        </div>
                    ` : `
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Points Status -->
                            <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h3 class="text-lg font-semibold mb-2">Household Points</h3>
                                        <p class="text-3xl font-bold">${currentPoints}</p>
                                    </div>
                                    <div class="text-4xl opacity-80">
                                        <i class="fas fa-coins"></i>
                                    </div>
                                </div>
                                <div class="mt-4 flex space-x-2">
                                    <button id="disableRewardsBtn" class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors">
                                        Disable System
                                    </button>
                                </div>
                            </div>

                            <!-- Add Reward Form -->
                            <div class="bg-gray-50 p-6 rounded-lg">
                                <h3 class="text-lg font-semibold text-gray-800 mb-2">Add New Reward</h3>
                                <p class="text-sm text-purple-700 mb-4"><i class="fas fa-info-circle mr-1"></i> All rewards are shared by the entire household and use household points.</p>
                                <form id="addRewardForm" class="space-y-4">
                                    <input type="text" id="rewardName" placeholder="Reward name" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" required>
                                    <input type="number" id="rewardPoints" placeholder="Points required" min="1" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" required>
                                    <textarea id="rewardDescription" placeholder="Description (optional)" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none" rows="2"></textarea>
                                    <button type="submit" class="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                                        <i class="fas fa-plus mr-2"></i>Add Reward
                                    </button>
                                </form>
                            </div>
                        </div>

                        <!-- Rewards List -->
                        <div class="mt-6">
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Available Rewards</h3>
                            <div id="rewardsList" class="space-y-3">
                                <!-- Rewards will be populated here -->
                            </div>
                        </div>

                        <!-- Transaction History -->
                        <div class="mt-6">
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
                            <div id="transactionHistory" class="space-y-2 max-h-60 overflow-y-auto">
                                <!-- Transactions will be populated here -->
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Add event listeners
        document.getElementById('closeRewardsModal').addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });

        if (!isEnabled) {
            document.getElementById('enableRewardsBtn').addEventListener('click', () => {
                this.enableRewardsSystem();
            });
        } else {
            document.getElementById('disableRewardsBtn').addEventListener('click', () => {
                this.disableRewardsSystem();
            });

            document.getElementById('addRewardForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('rewardName').value;
                const points = document.getElementById('rewardPoints').value;
                const description = document.getElementById('rewardDescription').value;

                if (name && points) {
                    this.addReward(name, points, description);
                    e.target.reset();
                }
            });

            // Load current rewards and transactions
            this.renderRewards();
            this.renderTransactionHistory();
        }
    }
};

// Export rewards module to global namespace
window.RoommatePortal.rewards = rewardsModule;
