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
            return;
        }

        const choresList = window.RoommatePortal.state.getChores();
        const messagesList = window.RoommatePortal.state.getMessages();

        const activeChores = choresList.filter(c => !c.completed).length;
        const completedToday = choresList.filter(c =>
            c.completed && c.completedDate === new Date().toLocaleDateString()
        ).length;

        // Count messages that the current user hasn't read yet
        const newMessages = messagesList.filter(m =>
            !m.readBy || !m.readBy.includes(currentUser.uid)
        ).length;

        if (elements.activeChoresCount) elements.activeChoresCount.textContent = activeChores;
        if (elements.completedTodayCount) elements.completedTodayCount.textContent = completedToday;
        if (elements.newMessagesCount) elements.newMessagesCount.textContent = newMessages;

        // Mark messages as read after viewing (only if user is still logged in and has household)
        if (currentUser && currentHousehold && messagesList.length > 0) {
            setTimeout(() => {
                window.RoommatePortal.messages.markMessagesAsRead();
            }, 5000);
        }
    }
};

// Export statistics module to global namespace
window.RoommatePortal.statistics = statistics;
