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
            window.RoommatePortal.calendar.init();

            // Initialize rewards system
            window.RoommatePortal.rewards.init();

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
        const choresTile = document.getElementById('choresTile');
        const rewardPointsTile = document.getElementById('rewardPointsTile');
        const newMessagesTile = document.getElementById('newMessagesTile');
        const activeAnnouncementsTile = document.getElementById('activeAnnouncementsTile');
        const upcomingEventsTile = document.getElementById('upcomingEventsTile');

        // Chores tile - navigate to chores
        if (choresTile) {
            choresTile.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('chores');
                setTimeout(() => this.createFAB('chores'), 100);
                // Event is already dispatched by switchTab function
            });
        }

        // Reward points tile - open rewards modal
        if (rewardPointsTile) {
            rewardPointsTile.addEventListener('click', () => {
                window.RoommatePortal.rewards.showRewardsModal();
            });
        }

        // New messages tile - navigate to messages
        if (newMessagesTile) {
            newMessagesTile.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('messages');
                setTimeout(() => this.createFAB('messages'), 100);
                // Event is already dispatched by switchTab function
            });
        }

        // Active announcements tile - navigate to announcements
        if (activeAnnouncementsTile) {
            activeAnnouncementsTile.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('announcements');
                setTimeout(() => this.createFAB('announcements'), 100);
                // Event is already dispatched by switchTab function
            });
        }

        // Upcoming events tile - navigate to calendar
        if (upcomingEventsTile) {
            upcomingEventsTile.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('calendar');
                setTimeout(() => this.createFAB('calendar'), 100);
                // Event is already dispatched by switchTab function
            });
        }
    },

    // Setup "Back to Dashboard" buttons
    setupBackToDashboardButtons() {
        const backToDashboardFromChores = document.getElementById('backToDashboardFromChores');
        const backToDashboardFromMessages = document.getElementById('backToDashboardFromMessages');
        const backToDashboardFromAnnouncements = document.getElementById('backToDashboardFromAnnouncements');
        const backToDashboardFromCalendar = document.getElementById('backToDashboardFromCalendar');

        // Back to dashboard from chores
        if (backToDashboardFromChores) {
            backToDashboardFromChores.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('dashboard');
                // Remove FAB when returning to dashboard
                if (this.currentFAB) {
                    this.currentFAB.remove();
                    this.currentFAB = null;
                }
                // Event is already dispatched by switchTab function
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
                // Event is already dispatched by switchTab function
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
                // Event is already dispatched by switchTab function
            });
        }

        // Back to dashboard from calendar
        if (backToDashboardFromCalendar) {
            backToDashboardFromCalendar.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('dashboard');
                // Remove FAB when returning to dashboard
                if (this.currentFAB) {
                    this.currentFAB.remove();
                    this.currentFAB = null;
                }
                // Event is already dispatched by switchTab function
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

            // Set initial visibility for chore points field based on rewards status
            if (section === 'chores') {
                const pointsField = formClone.querySelector('input[type="number"]');
                if (pointsField) {
                    const rewardsEnabled = window.RoommatePortal.rewards?.isRewardsEnabled();
                    pointsField.style.display = rewardsEnabled ? 'block' : 'none';
                }
            }

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
            'announcements': 'Create Announcement',
            'calendar': 'Add New Event'
        };

        // Check if we're in edit mode for calendar
        if (section === 'calendar' && window.RoommatePortal.calendar?.editingEventData) {
            return 'Edit Event';
        }

        return titles[section] || 'Add New Item';
    },

    // Get original form element
    getOriginalForm(section) {
        const formIds = {
            'chores': 'addChoreForm',
            'messages': 'postMessageForm',
            'announcements': 'postAnnouncementForm',
            'calendar': 'addEventForm'
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

        // Special handling for calendar forms - rebind all-day checkbox event
        if (section === 'calendar') {
            const allDayCheckbox = formClone.querySelector('input[type="checkbox"]');
            if (allDayCheckbox) {
                allDayCheckbox.addEventListener('change', (e) => {
                    this.toggleAllDayFieldsInModal(formClone, e.target.checked);
                });

                // Set initial state
                this.toggleAllDayFieldsInModal(formClone, allDayCheckbox.checked);
            }
        }
    },    // Toggle all-day fields in modal form (similar to calendar.js logic)
    toggleAllDayFieldsInModal(modalForm, isAllDay) {

        // Find time containers and fields in the modal form using more robust selectors
        // Look for divs that contain time inputs (since IDs are removed)
        const allTimeInputs = modalForm.querySelectorAll('input[type="time"]');

        // Find their parent containers by traversing up the DOM
        const timeContainers = [];
        allTimeInputs.forEach(timeInput => {
            // Look for the parent div that contains the time input and its label
            let container = timeInput.parentElement;
            // Make sure we get the right container (usually the div containing both label and input)
            if (container && (container.querySelector('label') || container.querySelector('input[type="time"]'))) {
                timeContainers.push(container);
            }
        });        // Also look for the grid containers that need class adjustments
        // Find all grid containers, but exclude the main form container
        const gridContainers = modalForm.querySelectorAll('.grid');

        // Filter to only get containers that have grid-cols classes and are NOT the main form container
        const relevantGridContainers = Array.from(gridContainers).filter(container => {
            return container.className.includes('grid-cols-') && !container.classList.contains('form-container');
        });

        if (isAllDay) {
            // Hide time containers and remove required attribute from time fields
            timeContainers.forEach((container) => {
                container.style.display = 'none';
            });

            allTimeInputs.forEach((field) => {
                field.removeAttribute('required');
                field.value = '';
            });

            // Adjust grid layouts to single column
            relevantGridContainers.forEach((gridContainer) => {
                gridContainer.className = 'grid grid-cols-1 gap-4';
            });
        } else {
            // Show time containers and restore required attribute for start time
            timeContainers.forEach((container) => {
                container.style.display = 'block';
            });

            allTimeInputs.forEach((field, index) => {
                // Only the first time field (start time) should be required
                if (index === 0) {
                    field.setAttribute('required', 'required');
                }
            });

            // Restore grid layouts to two columns
            relevantGridContainers.forEach((gridContainer) => {
                gridContainer.className = 'grid grid-cols-2 gap-4';
            });
        }

    },

    // Clear modal form after submission
    clearModalForm(formClone) {
        const inputs = formClone.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'text' || input.type === 'email' || input.type === 'datetime-local' || input.type === 'date' || input.type === 'time' || input.tagName === 'TEXTAREA') {
                input.value = '';
            } else if (input.type === 'checkbox') {
                input.checked = false;
            } else if (input.type === 'select-one') {
                input.selectedIndex = 0;
            }
        });

        // For calendar forms, reset the all-day fields visibility
        const isCalendarForm = formClone.querySelector('input[type="checkbox"]');
        if (isCalendarForm) {
            this.toggleAllDayFieldsInModal(formClone, false);
        }
    },

    // Copy form data from modal to original form
    copyFormData(modalForm, section) {
        const originalForm = this.getOriginalForm(section);
        if (!originalForm) return;

        // Get form inputs by type and position for more reliable matching
        const modalInputs = modalForm.querySelectorAll('input[type="text"], input[type="email"], input[type="datetime-local"], input[type="date"], input[type="time"], textarea');
        const modalSelects = modalForm.querySelectorAll('select');
        const modalNumberInputs = modalForm.querySelectorAll('input[type="number"]');
        const modalCheckboxes = modalForm.querySelectorAll('input[type="checkbox"]');

        const originalInputs = originalForm.querySelectorAll('input[type="text"], input[type="email"], input[type="datetime-local"], input[type="date"], input[type="time"], textarea');
        const originalSelects = originalForm.querySelectorAll('select');
        const originalNumberInputs = originalForm.querySelectorAll('input[type="number"]');
        const originalCheckboxes = originalForm.querySelectorAll('input[type="checkbox"]');

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

        // Copy checkbox elements
        modalCheckboxes.forEach((modalCheckbox, index) => {
            if (originalCheckboxes[index]) {
                originalCheckboxes[index].checked = modalCheckbox.checked;
            }
        });

        // Handle number inputs specially for chores points
        modalNumberInputs.forEach((modalInput, index) => {
            if (originalNumberInputs[index]) {
                // Only copy values greater than 0
                const numValue = parseInt(modalInput.value);
                if (!isNaN(numValue) && numValue > 0) {
                    originalNumberInputs[index].value = numValue;
                } else {
                    originalNumberInputs[index].value = '';
                }
            }
        });

        // Copy form dataset attributes (like editingEventId for calendar)
        const modalFormElement = modalForm.querySelector('form') || modalForm;
        const originalFormElement = originalForm.querySelector('form') || originalForm;
        if (modalFormElement && originalFormElement) {
            // Copy all data attributes
            Object.keys(modalFormElement.dataset).forEach(key => {
                originalFormElement.dataset[key] = modalFormElement.dataset[key];
            });
        }
    },

    // Remove IDs from cloned elements to avoid conflicts
    removeIdsFromClone(element) {
        // Create a mapping of old IDs to new unique IDs
        const idMap = new Map();
        const generateUniqueId = (oldId) => {
            const newId = `cloned_${oldId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            idMap.set(oldId, newId);
            return newId;
        };

        // Update IDs and create mapping
        if (element.id) {
            const newId = generateUniqueId(element.id);
            element.id = newId;
        }

        const elementsWithIds = element.querySelectorAll('[id]');
        elementsWithIds.forEach(el => {
            if (el.id) {
                const newId = generateUniqueId(el.id);
                el.id = newId;
            }
        });

        // Update all 'for' attributes to match the new IDs
        const labelsWithFor = element.querySelectorAll('label[for]');
        labelsWithFor.forEach(label => {
            const forValue = label.getAttribute('for');
            if (idMap.has(forValue)) {
                label.setAttribute('for', idMap.get(forValue));
            }
        });
    },
};

// Export app module and auto-initialize
window.RoommatePortal.app = appModule;

// Auto-start the application
window.RoommatePortal.app.init();
