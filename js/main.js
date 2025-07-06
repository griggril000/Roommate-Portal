// Roommate Portal - Main Application Module
// Initializes and coordinates all other modules

window.RoommatePortal = window.RoommatePortal || {};

const appModule = {
    // Initialize the entire application
    init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.initializeApp.bind(this));
        } else {
            this.initializeApp();
        }
    },

    // Initialize all application components
    initializeApp() {
        console.log('🚀 Initializing Roommate Portal...');

        try {
            // Initialize UI first
            window.RoommatePortal.ui.initializeApp();
            window.RoommatePortal.ui.setupMobileMenu();
            window.RoommatePortal.ui.setupHouseholdManagementButtons();
            window.RoommatePortal.ui.setupNotificationButtons();

            // Initialize authentication
            window.RoommatePortal.auth.init();

            // Initialize chores and messages modules
            window.RoommatePortal.chores.init();
            window.RoommatePortal.messages.init();
            window.RoommatePortal.announcements.init();

            // Initialize notifications module
            window.RoommatePortal.notifications.init();

            // Setup global click handlers for tabs
            this.setupTabHandlers();

            console.log('✅ Roommate Portal initialized successfully!');
        } catch (error) {
            console.error('❌ Error initializing Roommate Portal:', error);
            window.RoommatePortal.utils.showNotification('❌ Application failed to initialize. Please refresh the page.');
        }
    },

    // Setup dashboard navigation handlers
    setupTabHandlers() {
        // Setup clickable dashboard tiles (primary navigation)
        this.setupDashboardTiles();

        // Setup "Back to Dashboard" buttons
        this.setupBackToDashboardButtons();

        // Setup floating action buttons
        this.setupFloatingActionButtons();
    },

    // Setup clickable dashboard tiles
    setupDashboardTiles() {
        const activeChoresTile = document.getElementById('activeChoresTile');
        const completedTodayTile = document.getElementById('completedTodayTile');
        const newMessagesTile = document.getElementById('newMessagesTile');
        const activeAnnouncementsTile = document.getElementById('activeAnnouncementsTile');

        // Active chores tile - navigate to chores
        if (activeChoresTile) {
            activeChoresTile.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('chores');
                setTimeout(() => this.createFAB('chores'), 100);
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'chores' }
                }));
            });
        }

        // Completed today tile - navigate to chores
        if (completedTodayTile) {
            completedTodayTile.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('chores');
                setTimeout(() => this.createFAB('chores'), 100);
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'chores' }
                }));
            });
        }

        // New messages tile - navigate to messages
        if (newMessagesTile) {
            newMessagesTile.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('messages');
                setTimeout(() => this.createFAB('messages'), 100);
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'messages' }
                }));
            });
        }

        // Active announcements tile - navigate to announcements
        if (activeAnnouncementsTile) {
            activeAnnouncementsTile.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('announcements');
                setTimeout(() => this.createFAB('announcements'), 100);
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'announcements' }
                }));
            });
        }
    },

    // Setup "Back to Dashboard" buttons
    setupBackToDashboardButtons() {
        const backToDashboardFromChores = document.getElementById('backToDashboardFromChores');
        const backToDashboardFromMessages = document.getElementById('backToDashboardFromMessages');
        const backToDashboardFromAnnouncements = document.getElementById('backToDashboardFromAnnouncements');

        // Back to dashboard from chores
        if (backToDashboardFromChores) {
            backToDashboardFromChores.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('dashboard');
                // Remove FAB when returning to dashboard
                if (this.currentFAB) {
                    this.currentFAB.remove();
                    this.currentFAB = null;
                }
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'dashboard' }
                }));
            });
        }

        // Back to dashboard from messages
        if (backToDashboardFromMessages) {
            backToDashboardFromMessages.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('dashboard');
                // Remove FAB when returning to dashboard
                if (this.currentFAB) {
                    this.currentFAB.remove();
                    this.currentFAB = null;
                }
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'dashboard' }
                }));
            });
        }

        // Back to dashboard from announcements
        if (backToDashboardFromAnnouncements) {
            backToDashboardFromAnnouncements.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('dashboard');
                // Remove FAB when returning to dashboard
                if (this.currentFAB) {
                    this.currentFAB.remove();
                    this.currentFAB = null;
                }
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'dashboard' }
                }));
            });
        }
    },

    // Setup floating action buttons for each section
    setupFloatingActionButtons() {
        // Remove any existing FABs first
        document.querySelectorAll('.fab').forEach(fab => fab.remove());

        // We'll create FABs dynamically when switching to each tab
        this.currentFAB = null;
    },

    // Create FAB for specific section
    createFAB(section) {
        // Remove existing FAB if any
        if (this.currentFAB) {
            this.currentFAB.remove();
        }

        const fab = document.createElement('button');
        fab.className = `fab fab-${section}`;
        fab.innerHTML = '<i class="fas fa-plus"></i>';

        // Base styles that are consistent across all FABs
        fab.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            transition: all 0.3s ease;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Add hover effects
        fab.addEventListener('mouseenter', () => {
            fab.style.transform = 'scale(1.1)';
        });

        fab.addEventListener('mouseleave', () => {
            fab.style.transform = 'scale(1)';
        });

        // Add click handler
        fab.addEventListener('click', () => {
            this.openInputModal(section);
        });

        document.body.appendChild(fab);
        this.currentFAB = fab;
    },

    // Open input modal
    openInputModal(section) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'input-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 32px;
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            transform: scale(0.8);
            transition: transform 0.3s ease;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        `;

        // Add title
        const title = document.createElement('h3');
        title.style.cssText = `
            margin: 0 0 20px 0;
            font-size: 24px;
            font-weight: 700;
            color: #1F2937;
        `;
        title.textContent = this.getModalTitle(section);

        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.style.cssText = `
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #6B7280;
            padding: 8px;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        `;

        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.backgroundColor = '#F3F4F6';
            closeBtn.style.color = '#374151';
        });

        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.backgroundColor = 'transparent';
            closeBtn.style.color = '#6B7280';
        });

        closeBtn.addEventListener('click', () => {
            this.closeModal(modal);
        });

        // Get the original form and clone it
        const originalForm = this.getOriginalForm(section);
        if (originalForm) {
            const formClone = originalForm.cloneNode(true);

            // Remove IDs from cloned elements to avoid conflicts
            this.removeIdsFromClone(formClone);

            formClone.style.display = 'block';
            formClone.style.margin = '0';
            formClone.style.padding = '0';
            formClone.style.backgroundColor = 'transparent';

            // Re-bind form events for the cloned form
            this.rebindFormEvents(formClone, section, modal);

            modalContent.appendChild(title);
            modalContent.appendChild(closeBtn);
            modalContent.appendChild(formClone);
        }

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Animate in
        setTimeout(() => {
            modal.style.opacity = '1';
            modalContent.style.transform = 'scale(1)';

            // Auto-focus on the first input field after animation completes
            setTimeout(() => {
                let firstInput;

                // For messages section, prioritize the message textarea
                if (section === 'messages') {
                    firstInput = modalContent.querySelector('textarea');
                }

                // For other sections or if no textarea found, use the first text/email input
                if (!firstInput) {
                    firstInput = modalContent.querySelector('input[type="text"], input[type="email"], textarea');
                }

                if (firstInput) {
                    firstInput.focus();
                    // For mobile devices, scroll the input into view
                    firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }, 10);

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modal);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    },

    // Close modal with animation
    closeModal(modal) {
        const modalContent = modal.querySelector('div');
        modal.style.opacity = '0';
        modalContent.style.transform = 'scale(0.8)';

        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    },

    // Get modal title based on section
    getModalTitle(section) {
        const titles = {
            'chores': 'Add New Chore',
            'messages': 'Post New Message',
            'announcements': 'Create Announcement'
        };
        return titles[section] || 'Add New Item';
    },

    // Get original form element
    getOriginalForm(section) {
        const formIds = {
            'chores': 'addChoreForm',
            'messages': 'postMessageForm',
            'announcements': 'postAnnouncementForm'
        };

        const formId = formIds[section];
        return formId ? document.getElementById(formId) : null;
    },

    // Rebind form events for cloned form
    rebindFormEvents(formClone, section, modal) {
        const form = formClone.querySelector('form') || formClone;

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();

                // Copy form data to original form before submitting
                this.copyFormData(formClone, section);

                // Get the original form and trigger its submit event
                const originalForm = this.getOriginalForm(section);
                if (originalForm) {
                    // Create a new submit event and dispatch it on the original form
                    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                    originalForm.dispatchEvent(submitEvent);

                    // Clear the modal form after successful submission
                    setTimeout(() => {
                        this.clearModalForm(formClone);
                    }, 100);

                    this.closeModal(modal);
                } else {
                    console.error(`Original form not found for section: ${section}`);
                }
            });
        }
    },

    // Clear modal form after submission
    clearModalForm(formClone) {
        const inputs = formClone.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'text' || input.type === 'email' || input.type === 'datetime-local' || input.tagName === 'TEXTAREA') {
                input.value = '';
            } else if (input.type === 'select-one') {
                input.selectedIndex = 0;
            }
        });
    },

    // Copy form data from modal to original form
    copyFormData(modalForm, section) {
        const originalForm = this.getOriginalForm(section);
        if (!originalForm) return;

        // Get form inputs by type and position for more reliable matching
        const modalInputs = modalForm.querySelectorAll('input[type="text"], input[type="email"], input[type="datetime-local"], textarea');
        const modalSelects = modalForm.querySelectorAll('select');

        const originalInputs = originalForm.querySelectorAll('input[type="text"], input[type="email"], input[type="datetime-local"], textarea');
        const originalSelects = originalForm.querySelectorAll('select');

        // Copy all inputs (text, email, datetime-local, textarea)
        modalInputs.forEach((modalInput, index) => {
            if (originalInputs[index]) {
                originalInputs[index].value = modalInput.value;
            }
        });

        // Copy select elements
        modalSelects.forEach((modalSelect, index) => {
            if (originalSelects[index]) {
                originalSelects[index].value = modalSelect.value;
            }
        });

        console.log(`Form data copied for ${section}:`, {
            textInputs: modalInputs.length,
            selects: modalSelects.length,
            datetimeInputs: modalForm.querySelectorAll('input[type="datetime-local"]').length
        });
    },

    // Remove IDs from cloned elements to avoid conflicts
    removeIdsFromClone(element) {
        // Remove ID from the element itself
        if (element.id) {
            element.removeAttribute('id');
        }

        // Remove IDs from all child elements
        const elementsWithIds = element.querySelectorAll('[id]');
        elementsWithIds.forEach(el => {
            el.removeAttribute('id');
        });
    },
};

// Export app module and auto-initialize
window.RoommatePortal.app = appModule;

// Auto-start the application
window.RoommatePortal.app.init();
