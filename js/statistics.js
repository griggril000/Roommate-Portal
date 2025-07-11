// Roommate Portal - Statistics Module
// Handles dashboard statistics and counts

window.RoommatePortal = window.RoommatePortal || {};

const statistics = {
    // Update all statistics
    updateStatistics() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const elements = window.RoommatePortal.state.elements;

        // Handle case when there's no data (logged out or no household)
        if (!currentUser || !currentHousehold) {
            if (elements.activeChoresCount) elements.activeChoresCount.textContent = '0';
            if (elements.completedTodayCount) elements.completedTodayCount.textContent = '0';
            if (elements.newMessagesCount) elements.newMessagesCount.textContent = '0';
            if (elements.activeAnnouncementsCount) elements.activeAnnouncementsCount.textContent = '0';
            this.updateRewardsStats();
            return;
        }

        const choresList = window.RoommatePortal.state.getChores();
        const messagesList = window.RoommatePortal.state.getMessages();
        const announcementsList = window.RoommatePortal.state.getAnnouncements();

        const activeChores = choresList.filter(c => !c.completed).length;
        const completedToday = choresList.filter(c =>
            c.completed && c.completedDate === new Date().toLocaleDateString()
        ).length;

        // Count messages that the current user hasn't read yet
        const newMessages = messagesList.filter(m =>
            !m.readBy || !m.readBy.includes(currentUser.uid)
        ).length;

        // Count active announcements (not expired)
        const activeAnnouncements = announcementsList.filter(a => {
            if (!a.expiresAt) return true; // No expiration date means always active
            return new Date(a.expiresAt) > new Date(); // Not expired
        }).length;

        if (elements.activeChoresCount) elements.activeChoresCount.textContent = activeChores;
        if (elements.completedTodayCount) elements.completedTodayCount.textContent = completedToday;
        if (elements.newMessagesCount) elements.newMessagesCount.textContent = newMessages;
        if (elements.activeAnnouncementsCount) elements.activeAnnouncementsCount.textContent = activeAnnouncements;

        // Update rewards statistics
        this.updateRewardsStats();
    },

    // Update rewards statistics
    updateRewardsStats() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const rewardPointsTile = document.getElementById('rewardPointsTile');
        const rewardPointsCount = document.getElementById('rewardPointsCount');

        if (!rewardPointsTile || !rewardPointsCount) return;

        const rewardsEnabled = window.RoommatePortal.rewards?.isRewardsEnabled();

        if (rewardsEnabled && currentHousehold) {
            const currentPoints = window.RoommatePortal.rewards.getCurrentPoints();
            rewardPointsCount.textContent = currentPoints;
            rewardPointsTile.classList.remove('hidden');
        } else {
            rewardPointsTile.classList.add('hidden');
        }
    }
};

// Export statistics module to global namespace
window.RoommatePortal.statistics = statistics;
