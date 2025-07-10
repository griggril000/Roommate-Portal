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

            // Initialize voice commands
            if (window.RoommatePortal.voiceCommands) {
                window.RoommatePortal.voiceCommands.init();
            }

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

        // Setup section action buttons
        this.setupSectionButtons();
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
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'chores' }
                }));
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
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'messages' }
                }));
            });
        }

        // Active announcements tile - navigate to announcements
        if (activeAnnouncementsTile) {
            activeAnnouncementsTile.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('announcements');
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'announcements' }
                }));
            });
        }

        // Upcoming events tile - navigate to calendar
        if (upcomingEventsTile) {
            upcomingEventsTile.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('calendar');
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'calendar' }
                }));
            });
        }
    },

    // Setup "Back to Dashboard" buttons and section action buttons
    setupSectionButtons() {
        // Back to Dashboard buttons
        const backToDashboardFromChores = document.getElementById('backToDashboardFromChores');
        const backToDashboardFromMessages = document.getElementById('backToDashboardFromMessages');
        const backToDashboardFromAnnouncements = document.getElementById('backToDashboardFromAnnouncements');
        const backToDashboardFromCalendar = document.getElementById('backToDashboardFromCalendar');

        // Action buttons (Add content)
        const addChoreBtn = document.getElementById('addChoreBtn');
        const addMessageBtn = document.getElementById('addMessageBtn');
        const addAnnouncementBtn = document.getElementById('addAnnouncementBtn');
        const addEventBtn = document.getElementById('addEventBtn');

        // Voice buttons for each section - removed as requested by user
        // Individual voice buttons replaced with contextual voice FAB

        // Back to dashboard from chores
        if (backToDashboardFromChores) {
            backToDashboardFromChores.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('dashboard');
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'dashboard' }
                }));
            });
        }

        // Back to dashboard from messages
        if (backToDashboardFromMessages) {
            backToDashboardFromMessages.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('dashboard');
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'dashboard' }
                }));
            });
        }

        // Back to dashboard from announcements
        if (backToDashboardFromAnnouncements) {
            backToDashboardFromAnnouncements.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('dashboard');
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'dashboard' }
                }));
            });
        }

        // Back to dashboard from calendar
        if (backToDashboardFromCalendar) {
            backToDashboardFromCalendar.addEventListener('click', () => {
                window.RoommatePortal.utils.switchTab('dashboard');
                window.dispatchEvent(new CustomEvent('roommatePortal:tabSwitch', {
                    detail: { tab: 'dashboard' }
                }));
            });
        }

        // Add content buttons
        if (addChoreBtn) {
            addChoreBtn.addEventListener('click', () => {
                this.openInputModal('chores');
            });
        }

        if (addMessageBtn) {
            addMessageBtn.addEventListener('click', () => {
                this.openInputModal('messages');
            });
        }

        if (addAnnouncementBtn) {
            addAnnouncementBtn.addEventListener('click', () => {
                this.openInputModal('announcements');
            });
        }

        if (addEventBtn) {
            addEventBtn.addEventListener('click', () => {
                this.openInputModal('calendar');
            });
        }

        // Voice buttons - replaced with contextual voice FAB

        // Hide voice buttons if not supported
        if (!window.RoommatePortal.voiceCommands?.isSupported) {
            setTimeout(() => {
                window.RoommatePortal.voiceCommands?.updateVoiceSectionButtons();
            }, 100);
        }
    },

    // Start contextual voice input for specific section
    startContextualVoiceInput(context) {
        if (!window.RoommatePortal.voiceCommands?.isSupported) {
            window.RoommatePortal.utils?.showNotification('❌ Voice commands not supported');
            return;
        }

        // Store the context and trigger voice input
        window.RoommatePortal.voiceCommands.currentContext = context;
        window.RoommatePortal.voiceCommands.startUnifiedVoiceInput();

        // Show context-specific status
        const contextMessages = {
            'chore': '🧹 Voice: Say a chore like "clean the bathroom" or "vacuum living room"',
            'message': '💬 Voice: Say a message like "pizza party tonight" or "meeting at 7pm"',
            'announcement': '📢 Voice: Say an announcement like "rent due Friday" or "house meeting Sunday"',
            'event': '📅 Voice: Say an event like "party Saturday" or "meeting tomorrow at 6pm"'
        };

        if (window.innerWidth <= 768) {
            window.RoommatePortal.voiceCommands.showVoiceStatus(contextMessages[context] || '🎤 Voice: Speak your command', 'info');
        } else {
            window.RoommatePortal.utils?.showNotification(contextMessages[context] || '🎤 Voice: Speak your command');
        }
    },

    // Show contextual voice help for specific section
    showContextualVoiceHelp(context) {
        const contextHelp = {
            'chore': {
                title: '🧹 Voice Commands for Chores',
                examples: [
                    'clean the bathroom',
                    'vacuum living room',
                    'wash the dishes',
                    'take out trash',
                    'organize kitchen'
                ],
                tips: 'Just say the chore task naturally. The system will automatically format it properly.'
            },
            'message': {
                title: '💬 Voice Commands for Messages',
                examples: [
                    'pizza party tonight',
                    'meeting at 7pm',
                    'movie night Friday',
                    'grocery shopping tomorrow',
                    'game night this weekend'
                ],
                tips: 'Say your message naturally. Perfect for quick updates to roommates.'
            },
            'announcement': {
                title: '📢 Voice Commands for Announcements',
                examples: [
                    'rent due Friday',
                    'house meeting Sunday',
                    'maintenance visit tomorrow',
                    'party next weekend',
                    'new house rule about guests'
                ],
                tips: 'Speak important information that everyone should know about.'
            },
            'event': {
                title: '📅 Voice Commands for Events',
                examples: [
                    'party Saturday at 8pm',
                    'meeting tomorrow at 6',
                    'dinner Friday night',
                    'study session Sunday',
                    'cleaning day this weekend'
                ],
                tips: 'Say the event naturally. Event creation is coming soon!'
            }
        };

        const help = contextHelp[context];
        if (!help) return;

        const helpModal = document.createElement('div');
        helpModal.className = 'fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50 p-4';
        helpModal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold text-gray-800">${help.title}</h2>
                    <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.fixed').remove()">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div class="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-200">
                        <p class="text-sm text-gray-700 font-medium">
                            🎤 <strong>Just click Voice and speak naturally!</strong>
                        </p>
                    </div>

                    <div>
                        <h3 class="font-semibold text-gray-800 mb-2">Examples:</h3>
                        <ul class="text-sm text-gray-700 space-y-1">
                            ${help.examples.map(example => `<li>• "${example}"</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="bg-blue-50 p-3 rounded-lg">
                        <h4 class="font-semibold text-blue-800 mb-1">💡 Tip</h4>
                        <p class="text-sm text-blue-700">${help.tips}</p>
                    </div>
                </div>
                
                <div class="mt-6 flex justify-center space-x-3">
                    <button 
                        class="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors"
                        onclick="window.RoommatePortal.app.startContextualVoiceInput('${context}'); this.closest('.fixed').remove();"
                    >
                        Try Voice Now
                    </button>
                    <button 
                        class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        onclick="this.closest('.fixed').remove()"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(helpModal);
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
