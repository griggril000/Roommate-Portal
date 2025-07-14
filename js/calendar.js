// Roommate Portal - Calendar Management Module
// Handles calendar events creation, editing, and management using FullCalendar.io

window.RoommatePortal = window.RoommatePortal || {};

const calendarModule = {
    calendar: null,
    events: [],
    editingEventData: null,
    updateCalendarTimeout: null,

    // Initialize calendar management
    init() {
        this.setupCalendarForm();
        this.setupCleanupSchedule();
        this.initializeFullCalendar();
        this.setupTabSwitchListener();

        // Load events if user is already in a household
        if (window.RoommatePortal.state.getCurrentHousehold()) {
            this.loadEvents();
        }
    },

    // Setup listener for tab switching to re-render calendar when visible
    setupTabSwitchListener() {
        window.addEventListener('roommatePortal:tabSwitch', (event) => {
            if (event.detail.tab === 'calendar') {
                // Calendar tab became visible - re-render the calendar
                setTimeout(() => {
                    this.ensureCalendarRender();
                }, 100); // Small delay to ensure the tab is fully visible
            }
        });
    },

    // Ensure calendar renders properly when made visible
    ensureCalendarRender() {
        if (this.calendar) {
            // Update size to trigger proper rendering
            this.calendar.updateSize();
            // Re-render to ensure proper display
            this.calendar.render();
        }
    },

    // Initialize FullCalendar
    initializeFullCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) {
            console.error('Calendar: Calendar element not found');
            return;
        }

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
            },
            height: 'auto',
            navLinks: true,
            selectable: true,
            selectMirror: true,
            dayMaxEvents: true,
            weekends: true,

            // Now indicator - shows current time line
            nowIndicator: true,

            // More link configuration
            dayMaxEventRows: 3, // Limit to 3 rows of events before showing +more
            moreLinkClick: this.handleMoreLinkClick.bind(this),
            moreLinkText: function (num) {
                return `+${num} more`;
            },

            // Event handling
            select: this.handleDateSelect.bind(this),
            eventClick: this.handleEventClick.bind(this),
            eventDidMount: this.handleEventMount.bind(this),

            // Enable drag and drop editing
            editable: true,
            eventDrop: this.handleEventDrop.bind(this),
            eventResize: this.handleEventResize.bind(this),

            // Custom event rendering
            eventDisplay: 'block',
            displayEventTime: true,

            // Mobile responsiveness
            aspectRatio: window.innerWidth < 768 ? 1.0 : 1.35,

            // Event data source
            events: []
        });

        this.calendar.render();

        // Handle window resize for mobile responsiveness
        window.addEventListener('resize', () => {
            if (this.calendar) {
                this.calendar.setOption('aspectRatio', window.innerWidth < 768 ? 1.0 : 1.35);
            }
        });
    },

    // Handle date selection for creating new events
    handleDateSelect(selectInfo) {
        console.log('Calendar: Date selected:', selectInfo);

        // Pre-fill form with selected date
        const startDate = selectInfo.start;
        const endDate = selectInfo.end;

        // Store selection for form population
        this.selectedDateInfo = {
            start: startDate,
            end: endDate,
            allDay: selectInfo.allDay
        };

        // Open the event creation modal
        if (window.RoommatePortal.app && window.RoommatePortal.app.openInputModal) {
            window.RoommatePortal.app.openInputModal('calendar');

            // Populate form after a delay to ensure modal is loaded
            setTimeout(() => {
                console.log('Calendar: Attempting to populate form with selection:', this.selectedDateInfo);
                this.populateFormWithSelection();
            }, 250);
        }

        // Clear the selection
        this.calendar.unselect();
    },

    // Handle event click for editing/viewing
    handleEventClick(clickInfo) {

        const event = clickInfo.event;
        const eventData = this.events.find(e => e.id === event.id);

        if (eventData) {
            this.showEventDetails(eventData, clickInfo.jsEvent);
        }
    },

    // Handle event mounting (for custom styling)
    handleEventMount(info) {
        const event = info.event;
        const eventData = this.events.find(e => e.id === event.id);

        if (eventData) {
            // Add custom CSS classes based on event properties
            if (eventData.privacy === 'private') {
                info.el.classList.add('event-private');
            } else {
                info.el.classList.add('event-shared');
            }

            if (eventData.isAllDay) {
                info.el.classList.add('event-allday');
            }

            // Add privacy icon
            if (eventData.privacy === 'private') {
                const icon = document.createElement('i');
                icon.className = 'fas fa-lock';
                icon.style.marginRight = '4px';
                info.el.querySelector('.fc-event-title').prepend(icon);
            }

            // Add all-day icon
            if (eventData.isAllDay) {
                const icon = document.createElement('i');
                icon.className = 'fas fa-calendar';
                icon.style.marginRight = '4px';
                info.el.querySelector('.fc-event-title').prepend(icon);
            }
        }
    },

    // Handle event drag and drop
    async handleEventDrop(dropInfo) {
        const event = dropInfo.event;
        const eventData = this.events.find(e => e.id === event.id);

        if (!eventData) return;

        const currentUser = window.RoommatePortal.state.getCurrentUser();
        if (eventData.createdBy !== currentUser?.uid) {
            window.RoommatePortal.utils.showNotification('❌ You can only move events you created.');
            dropInfo.revert();
            return;
        }

        // Update event in database
        try {
            // For all-day events, FullCalendar provides exclusive end dates
            // but we store inclusive end dates in our database
            let endDate = event.end || event.start;
            if (eventData.isAllDay && event.end) {
                // Subtract one day to convert from exclusive to inclusive
                endDate = new Date(event.end);
                endDate.setDate(endDate.getDate() - 1);
            }

            const updatedData = {
                ...eventData,
                startDate: window.RoommatePortal.utils.getLocalDateTimeString(event.start),
                endDate: window.RoommatePortal.utils.getLocalDateTimeString(endDate)
            };

            await this.updateEvent(updatedData);
            window.RoommatePortal.utils.showNotification('✅ Event moved successfully!');
        } catch (error) {
            console.error('Error updating event:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to move event.');
            dropInfo.revert();
        }
    },

    // Handle event resize
    async handleEventResize(resizeInfo) {
        const event = resizeInfo.event;
        const eventData = this.events.find(e => e.id === event.id);

        if (!eventData) return;

        const currentUser = window.RoommatePortal.state.getCurrentUser();
        if (eventData.createdBy !== currentUser?.uid) {
            window.RoommatePortal.utils.showNotification('❌ You can only resize events you created.');
            resizeInfo.revert();
            return;
        }

        // Update event in database
        try {
            // For all-day events, FullCalendar provides exclusive end dates
            // but we store inclusive end dates in our database
            let endDate = event.end || event.start;
            if (eventData.isAllDay && event.end) {
                // Subtract one day to convert from exclusive to inclusive
                endDate = new Date(event.end);
                endDate.setDate(endDate.getDate() - 1);
            }

            const updatedData = {
                ...eventData,
                startDate: window.RoommatePortal.utils.getLocalDateTimeString(event.start),
                endDate: window.RoommatePortal.utils.getLocalDateTimeString(endDate)
            };

            await this.updateEvent(updatedData);
            window.RoommatePortal.utils.showNotification('✅ Event resized successfully!');
        } catch (error) {
            console.error('Error updating event:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to resize event.');
            resizeInfo.revert();
        }
    },

    // Show event details in a modal or popup
    showEventDetails(eventData, jsEvent) {
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        // Create a temporary modal for event details
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.style.zIndex = '9999';

        const startDateTime = window.RoommatePortal.utils.parseLocalDateTimeString(eventData.startDate);
        const endDateTime = window.RoommatePortal.utils.parseLocalDateTimeString(eventData.endDate);

        let timeDisplay;
        if (eventData.isAllDay) {
            const startDate = startDateTime.toLocaleDateString();
            const endDate = endDateTime.toLocaleDateString();
            timeDisplay = startDate === endDate ?
                `All day on ${startDate}` :
                `All day: ${startDate} - ${endDate}`;
        } else {
            timeDisplay = `${startDateTime.toLocaleString()} - ${endDateTime.toLocaleString()}`;
        }

        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">
                            <i class="fas ${eventData.privacy === 'private' ? 'fa-lock' : ''} mr-2"></i>
                            ${window.RoommatePortal.utils.escapeHtml(eventData.title)}
                        </h3>
                        <button class="text-gray-400 hover:text-gray-600 close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-3 text-sm">
                        <div class="flex items-center text-gray-600">
                            <i class="fas fa-clock mr-2"></i>
                            ${timeDisplay}
                        </div>
                        
                        ${eventData.location ? `
                            <div class="flex items-center text-gray-600">
                                <i class="fas fa-map-marker-alt mr-2"></i>
                                ${window.RoommatePortal.utils.escapeHtml(eventData.location)}
                            </div>
                        ` : ''}
                        
                        ${eventData.description ? `
                            <div class="text-gray-700">
                                <i class="fas fa-align-left mr-2"></i>
                                ${window.RoommatePortal.utils.escapeHtml(eventData.description)}
                            </div>
                        ` : ''}
                        
                        <div class="text-gray-500 text-xs pt-2 border-t">
                            Created by: ${window.RoommatePortal.utils.escapeHtml(eventData.createdByName)}
                        </div>
                    </div>
                    
                    ${eventData.createdBy === currentUser?.uid ? `
                        <div class="flex space-x-3 mt-6">
                            <button class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 edit-event">
                                <i class="fas fa-edit mr-2"></i>Edit
                            </button>
                            <button class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 delete-event">
                                <i class="fas fa-trash mr-2"></i>Delete
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        if (eventData.createdBy === currentUser?.uid) {
            modal.querySelector('.edit-event').addEventListener('click', () => {
                document.body.removeChild(modal);
                this.editEvent(eventData.id);
            });

            modal.querySelector('.delete-event').addEventListener('click', () => {
                document.body.removeChild(modal);
                this.deleteEvent(eventData.id);
            });
        }

        document.body.appendChild(modal);
    },

    // Handle "+more" link click in month view
    handleMoreLinkClick(arg) {
        console.log('Calendar: More link clicked for date:', arg.date);

        // Get all events for this day
        const clickedDate = arg.date;
        const dayEvents = this.getEventsForDay(clickedDate);

        // Show day events modal
        this.showDayEventsModal(clickedDate, dayEvents);

        // Prevent default FullCalendar popover
        return 'popover';
    },

    // Show modal with all events for a specific day
    showDayEventsModal(date, events) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.style.zIndex = '10000'; // Higher than event details modal

        const dateStr = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-gray-900">
                            <i class="fas fa-calendar-day mr-2"></i>
                            Events for ${dateStr}
                        </h3>
                        <button class="text-gray-400 hover:text-gray-600 close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div class="overflow-y-auto max-h-96 p-6">
                    ${events.length === 0 ? `
                        <div class="text-center text-gray-500 py-8">
                            <i class="fas fa-calendar-times text-3xl mb-3"></i>
                            <p>No events for this day</p>
                        </div>
                    ` : `
                        <div class="space-y-3">
                            ${events.map(event => {
            const startDateTime = window.RoommatePortal.utils.parseLocalDateTimeString(event.startDate);
            const endDateTime = window.RoommatePortal.utils.parseLocalDateTimeString(event.endDate);

            let timeDisplay;
            if (event.isAllDay) {
                timeDisplay = 'All day';
            } else {
                const startTime = startDateTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                });
                const endTime = endDateTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                });
                timeDisplay = `${startTime} - ${endTime}`;
            }

            return `
                                    <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer event-item" 
                                         data-event-id="${event.id}">
                                        <div class="flex items-start justify-between">
                                            <div class="flex-1">
                                                <div class="flex items-center mb-1">
                                                    <div class="w-3 h-3 rounded-full mr-2" 
                                                         style="background-color: ${event.privacy === 'private' ? '#8b5cf6' : '#10b981'}"></div>
                                                    <h4 class="font-medium text-gray-900">
                                                        ${event.privacy === 'private' ? '<i class="fas fa-lock mr-1"></i>' : ''}
                                                        ${window.RoommatePortal.utils.escapeHtml(event.title)}
                                                    </h4>
                                                </div>
                                                <p class="text-sm text-gray-600 mb-1">
                                                    <i class="fas fa-clock mr-1"></i>
                                                    ${timeDisplay}
                                                </p>
                                                ${event.location ? `
                                                    <p class="text-sm text-gray-600 mb-1">
                                                        <i class="fas fa-map-marker-alt mr-1"></i>
                                                        ${window.RoommatePortal.utils.escapeHtml(event.location)}
                                                    </p>
                                                ` : ''}
                                                ${event.description ? `
                                                    <p class="text-sm text-gray-500 mt-2">
                                                        ${window.RoommatePortal.utils.escapeHtml(event.description)}
                                                    </p>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                `;
        }).join('')}
                        </div>
                    `}
                </div>
                
                <div class="p-6 border-t border-gray-200 bg-gray-50">
                    <button class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 add-event-btn">
                        <i class="fas fa-plus mr-2"></i>Add Event for This Day
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        // Handle event item clicks
        modal.querySelectorAll('.event-item').forEach(item => {
            item.addEventListener('click', () => {
                const eventId = item.dataset.eventId;
                const eventData = this.events.find(e => e.id === eventId);
                if (eventData) {
                    document.body.removeChild(modal);
                    this.showEventDetails(eventData);
                }
            });
        });

        // Handle add event button
        modal.querySelector('.add-event-btn').addEventListener('click', () => {
            // Pre-select this date for new event
            this.selectedDateInfo = {
                start: date,
                end: date,
                allDay: true
            };

            document.body.removeChild(modal);

            // Open event creation modal
            if (window.RoommatePortal.app && window.RoommatePortal.app.openInputModal) {
                window.RoommatePortal.app.openInputModal('calendar');
                setTimeout(() => {
                    this.populateFormWithSelection();
                }, 250);
            }
        });

        document.body.appendChild(modal);
    },

    // Populate form with selected date range
    populateFormWithSelection() {
        if (!this.selectedDateInfo) return;

        const container = document.querySelector('.input-modal') || document;

        // For modal forms, IDs are removed, so we need to find fields by type and data attributes
        const dateField = container.querySelector('#eventDate') ||
            container.querySelector('input[data-field="start-date"]') ||
            container.querySelector('input[type="date"]');

        const endDateField = container.querySelector('#eventEndDate') ||
            container.querySelector('input[data-field="end-date"]') ||
            container.querySelectorAll('input[type="date"]')[1];

        const allDayField = container.querySelector('#eventAllDay') ||
            container.querySelector('input[type="checkbox"]');

        const timeField = container.querySelector('#eventTime') ||
            container.querySelector('input[data-field="start-time"]') ||
            container.querySelector('input[type="time"]');

        const endTimeField = container.querySelector('#eventEndTime') ||
            container.querySelector('input[data-field="end-time"]') ||
            container.querySelectorAll('input[type="time"]')[1];

        if (dateField) {
            dateField.value = window.RoommatePortal.utils.getLocalDateString(this.selectedDateInfo.start);
        }

        if (endDateField && this.selectedDateInfo.end) {
            // FullCalendar's end date is exclusive, so subtract a day for all-day events
            const endDate = new Date(this.selectedDateInfo.end);
            if (this.selectedDateInfo.allDay) {
                endDate.setDate(endDate.getDate() - 1);
            }
            endDateField.value = window.RoommatePortal.utils.getLocalDateString(endDate);
        }

        if (allDayField) {
            allDayField.checked = this.selectedDateInfo.allDay;
            this.toggleAllDayFieldsInContainer(container);

            // For modal forms, also trigger the modal's toggle function
            if (container.classList.contains('input-modal') || container.querySelector('.input-modal')) {
                // Use a small delay to ensure the field is set
                setTimeout(() => {
                    if (window.RoommatePortal.app && window.RoommatePortal.app.toggleAllDayFieldsInModal) {
                        const modalForm = container.querySelector('form') || container;
                        window.RoommatePortal.app.toggleAllDayFieldsInModal(modalForm, this.selectedDateInfo.allDay);
                    }
                }, 50);
            }
        }

        if (!this.selectedDateInfo.allDay && timeField) {
            timeField.value = window.RoommatePortal.utils.getLocalTimeString(this.selectedDateInfo.start);
        }

        if (!this.selectedDateInfo.allDay && endTimeField && this.selectedDateInfo.end) {
            endTimeField.value = window.RoommatePortal.utils.getLocalTimeString(this.selectedDateInfo.end);
        }

        // Clear selection
        this.selectedDateInfo = null;
    },    // Refresh calendar when household context changes
    refresh() {
        this.loadEvents();

        // Ensure FullCalendar is rendered properly
        setTimeout(() => {
            this.ensureCalendarRender();
        }, 100);

        // Trigger cleanup when household changes
        setTimeout(() => {
            this.cleanupOldEvents();
        }, 2000);
    },

    // Setup calendar form event listener
    setupCalendarForm() {
        const addEventForm = document.getElementById('addEventForm');
        if (addEventForm) {
            addEventForm.addEventListener('submit', this.handleAddEvent.bind(this));
        } else {
            console.warn('⚠️ Add event form not found');
        }

        // Setup all-day checkbox toggle
        const allDayCheckbox = document.getElementById('eventAllDay');
        if (allDayCheckbox) {
            allDayCheckbox.addEventListener('change', (e) => {
                this.toggleAllDayFields();
            });
        } else {
            console.error('❌ All-day checkbox not found during setup!');

            // Debug: Try to find the checkbox by different means
            setTimeout(() => {
                const delayedCheckbox = document.getElementById('eventAllDay');
                if (delayedCheckbox) {
                    delayedCheckbox.addEventListener('change', (e) => {
                        this.toggleAllDayFields();
                    });
                }
            }, 1000);
        }
    },

    // Toggle time fields visibility based on all-day checkbox
    toggleAllDayFields() {
        const allDayCheckbox = document.getElementById('eventAllDay');
        if (!allDayCheckbox) {
            console.error('❌ All-day checkbox not found!');
            return;
        }

        const isAllDay = allDayCheckbox.checked;
        const startTimeContainer = document.getElementById('startTimeContainer');
        const endTimeContainer = document.getElementById('endTimeContainer');
        const timeField = document.getElementById('eventTime');
        const endTimeField = document.getElementById('eventEndTime');

        // Hide/show time containers
        if (startTimeContainer) {
            startTimeContainer.style.display = isAllDay ? 'none' : '';
        }
        if (endTimeContainer) {
            endTimeContainer.style.display = isAllDay ? 'none' : '';
        }

        // Handle time field requirements
        if (timeField) {
            if (isAllDay) {
                timeField.removeAttribute('required');
                timeField.value = '';
            } else {
                timeField.setAttribute('required', 'required');
            }
        }
        if (endTimeField && isAllDay) {
            endTimeField.value = '';
        }
    },

    // Toggle time fields visibility based on all-day checkbox within a specific container
    toggleAllDayFieldsInContainer(container) {
        const allDayCheckbox = container.querySelector('#eventAllDay') ||
            container.querySelector('input[type="checkbox"]');

        if (!allDayCheckbox) {
            console.error('❌ All-day checkbox not found in container!');
            return;
        }

        const isAllDay = allDayCheckbox.checked;

        // Find time containers within this container - look for containers with time inputs
        const timeInputs = container.querySelectorAll('input[type="time"]');
        const timeContainers = [];

        timeInputs.forEach(timeInput => {
            // Look for parent container that includes the label and input
            let timeContainer = timeInput.parentElement;
            if (timeContainer) {
                timeContainers.push(timeContainer);
            }
        });

        // Also try finding by IDs for non-modal forms
        const startTimeContainer = container.querySelector('#startTimeContainer');
        const endTimeContainer = container.querySelector('#endTimeContainer');

        if (startTimeContainer && !timeContainers.includes(startTimeContainer)) {
            timeContainers.push(startTimeContainer);
        }
        if (endTimeContainer && !timeContainers.includes(endTimeContainer)) {
            timeContainers.push(endTimeContainer);
        }

        // Find time fields by multiple methods
        const timeField = container.querySelector('#eventTime') ||
            container.querySelector('input[data-field="start-time"]') ||
            container.querySelector('input[type="time"]');

        const endTimeField = container.querySelector('#eventEndTime') ||
            container.querySelector('input[data-field="end-time"]') ||
            container.querySelectorAll('input[type="time"]')[1];

        // Hide/show time containers
        timeContainers.forEach(timeContainer => {
            if (timeContainer) {
                timeContainer.style.display = isAllDay ? 'none' : '';
            }
        });

        // Handle time field requirements and values
        if (timeField) {
            if (isAllDay) {
                timeField.removeAttribute('required');
                timeField.value = '';
            } else {
                timeField.setAttribute('required', 'required');
            }
        }
        if (endTimeField) {
            if (isAllDay) {
                endTimeField.removeAttribute('required');
                endTimeField.value = '';
            } else {
                endTimeField.setAttribute('required', 'required');
            }
        }

        // For modal forms, also handle grid layout adjustments
        if (container.classList.contains('input-modal') || container.querySelector('.input-modal')) {
            const gridContainers = container.querySelectorAll('.grid');
            const relevantGridContainers = Array.from(gridContainers).filter(grid => {
                return grid.className.includes('grid-cols-') && !grid.classList.contains('form-container');
            });

            relevantGridContainers.forEach(gridContainer => {
                if (isAllDay) {
                    gridContainer.className = 'grid grid-cols-1 gap-4';
                } else {
                    gridContainer.className = 'grid grid-cols-2 gap-4';
                }
            });
        }
    },

    // Handle add event form submission
    async handleAddEvent(e) {
        if (e.preventDefault) e.preventDefault();

        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        if (!currentHousehold || !currentUser) {
            window.RoommatePortal.utils.showNotification('❌ You must be part of a household to add events.');
            return;
        }

        const eventTitle = document.getElementById('eventTitle').value.trim();
        const eventDate = document.getElementById('eventDate').value;
        const eventTime = document.getElementById('eventTime').value;
        const eventEndDate = document.getElementById('eventEndDate').value;
        const eventEndTime = document.getElementById('eventEndTime').value;
        const eventDescription = document.getElementById('eventDescription').value.trim();
        const eventLocation = document.getElementById('eventLocation').value.trim();
        const eventPrivacy = document.getElementById('eventPrivacy').value;
        const eventAllDay = document.getElementById('eventAllDay').checked;

        if (!eventTitle || !eventDate) {
            window.RoommatePortal.utils.showNotification('❌ Please fill in all required fields.');
            return;
        }

        // Validate time fields for non-all-day events
        if (!eventAllDay && !eventTime) {
            window.RoommatePortal.utils.showNotification('❌ Please specify a start time for non-all-day events.');
            return;
        }

        // Create start and end datetime objects
        let startDateTime, endDateTime;

        if (eventAllDay) {
            // For all-day events, set times to start and end of day
            startDateTime = new Date(eventDate + 'T00:00:00');
            if (eventEndDate) {
                endDateTime = new Date(eventEndDate + 'T23:59:59');
            } else {
                // Default to same day for all-day events
                endDateTime = new Date(eventDate + 'T23:59:59');
            }
        } else {
            // Regular timed events
            startDateTime = window.RoommatePortal.utils.createLocalDateTime(eventDate, eventTime);
            if (eventEndDate && eventEndTime) {
                endDateTime = window.RoommatePortal.utils.createLocalDateTime(eventEndDate, eventEndTime);
            } else {
                // Default to 1 hour after start time
                endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
            }
        }

        // Validate dates
        if (!eventAllDay && endDateTime <= startDateTime) {
            window.RoommatePortal.utils.showNotification('❌ End time must be after start time.');
            return;
        } else if (eventAllDay && eventEndDate && new Date(eventEndDate) < new Date(eventDate)) {
            window.RoommatePortal.utils.showNotification('❌ End date must be on or after start date.');
            return;
        }

        // Check if we're editing an existing event
        const form = document.getElementById('addEventForm');
        const editingEventId = form.dataset.editingEventId;

        try {
            // Encrypt sensitive event data
            const encryptedData = await window.RoommatePortal.encryption.encryptSensitiveData({
                title: eventTitle,
                description: eventDescription,
                location: eventLocation
            }, ['title', 'description', 'location']);

            const eventData = {
                title: encryptedData.title,
                description: encryptedData.description,
                location: encryptedData.location,
                startDate: window.RoommatePortal.utils.getLocalDateTimeString(startDateTime),
                endDate: window.RoommatePortal.utils.getLocalDateTimeString(endDateTime),
                isAllDay: eventAllDay,
                privacy: eventPrivacy,
                createdBy: currentUser.uid,
                createdByName: currentUser.displayName || currentUser.email,
                householdId: currentHousehold.id
            };

            // Only add encrypted flags if the fields were actually encrypted
            if (encryptedData.title_encrypted) {
                eventData.title_encrypted = encryptedData.title_encrypted;
            }
            if (encryptedData.description_encrypted) {
                eventData.description_encrypted = encryptedData.description_encrypted;
            }
            if (encryptedData.location_encrypted) {
                eventData.location_encrypted = encryptedData.location_encrypted;
            }

            if (editingEventId) {
                // Editing existing event
                eventData.id = editingEventId;
                // Keep original creation time
                const originalEvent = this.events.find(e => e.id === editingEventId);
                if (originalEvent) {
                    eventData.createdAt = originalEvent.createdAt;
                }
                await this.updateEvent(eventData);
            } else {
                // Creating new event
                eventData.id = Date.now().toString();
                eventData.createdAt = window.RoommatePortal.utils.getLocalDateTimeString(new Date());
                await this.saveEvent(eventData);
            }

            this.clearForm();
            window.RoommatePortal.utils.showNotification(editingEventId ? '✅ Event updated successfully!' : '✅ Event added successfully!');

            // Close modal if it exists
            const modal = document.querySelector('.input-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        } catch (error) {
            console.error('Error encrypting event data:', error);
            window.RoommatePortal.utils.showNotification('❌ Failed to save event. Please try again.');
        }
    },

    // Save new event to Firestore
    async saveEvent(event) {
        try {
            const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
            if (!currentHousehold) return;

            const eventsCollection = firebase.firestore()
                .collection('households')
                .doc(currentHousehold.id)
                .collection('events');

            await eventsCollection.doc(event.id).set(event);

        } catch (error) {
            console.error('Error saving event:', error);
            window.RoommatePortal.utils.showNotification('❌ Error saving event. Please try again.');
        }
    },

    // Update existing event in Firestore
    async updateEvent(event) {
        try {
            const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
            if (!currentHousehold) return;

            const eventsCollection = firebase.firestore()
                .collection('households')
                .doc(currentHousehold.id)
                .collection('events');

            await eventsCollection.doc(event.id).update(event);

        } catch (error) {
            console.error('Error updating event:', error);
            window.RoommatePortal.utils.showNotification('❌ Error updating event. Please try again.');
        }
    },

    // Load events from Firestore and update FullCalendar
    loadEvents() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (!currentHousehold) {
            console.log('Calendar: No household found, cannot load events');
            return;
        }

        const eventsCollection = firebase.firestore()
            .collection('households')
            .doc(currentHousehold.id)
            .collection('events');

        // Set up real-time listener
        const eventsListener = eventsCollection.orderBy('startDate', 'asc').onSnapshot(async (snapshot) => {
            // Process document changes more efficiently
            const changes = snapshot.docChanges();
            let hasChanges = false;

            // If it's the initial load, process all documents
            if (this.events.length === 0 || changes.length === snapshot.size) {
                const eventsList = [];
                snapshot.forEach((doc) => {
                    const eventData = { ...doc.data(), id: doc.id };
                    eventsList.push(eventData);
                });

                // Decrypt event data
                try {
                    this.events = await window.RoommatePortal.encryption.decryptDataArray(eventsList, ['title', 'description', 'location']);
                    hasChanges = true;
                } catch (error) {
                    console.error('Error decrypting events:', error);
                    this.events = eventsList; // Use original data if decryption fails
                    window.RoommatePortal.utils.showNotification('⚠️ Some events could not be decrypted.');
                    hasChanges = true;
                }
            } else {
                // Process incremental changes for better performance
                for (const change of changes) {
                    const eventData = { ...change.doc.data(), id: change.doc.id };

                    if (change.type === 'added') {
                        try {
                            const decryptedEvent = await window.RoommatePortal.encryption.decryptDataArray([eventData], ['title', 'description', 'location']);
                            this.events.push(decryptedEvent[0]);
                            hasChanges = true;
                        } catch (error) {
                            console.error('Error decrypting new event:', error);
                            this.events.push(eventData);
                            hasChanges = true;
                        }
                    } else if (change.type === 'modified') {
                        try {
                            const decryptedEvent = await window.RoommatePortal.encryption.decryptDataArray([eventData], ['title', 'description', 'location']);
                            const index = this.events.findIndex(e => e.id === eventData.id);
                            if (index !== -1) {
                                this.events[index] = decryptedEvent[0];
                                hasChanges = true;
                            }
                        } catch (error) {
                            console.error('Error decrypting modified event:', error);
                            const index = this.events.findIndex(e => e.id === eventData.id);
                            if (index !== -1) {
                                this.events[index] = eventData;
                                hasChanges = true;
                            }
                        }
                    } else if (change.type === 'removed') {
                        const index = this.events.findIndex(e => e.id === eventData.id);
                        if (index !== -1) {
                            this.events.splice(index, 1);
                            hasChanges = true;
                        }
                    }
                }
            }

            // Only update UI if there were actual changes
            if (hasChanges) {
                // Debounce UI updates to prevent excessive re-rendering
                clearTimeout(this.updateCalendarTimeout);
                this.updateCalendarTimeout = setTimeout(() => {
                    this.updateCalendarEvents();
                    this.updateCalendarStats();
                }, 100);
            }
        }, (error) => {
            console.error('Calendar: Error loading events:', error);
            window.RoommatePortal.utils.showNotification('❌ Error loading calendar events. Please refresh the page.');
        });

        // Store listener for cleanup
        window.RoommatePortal.state.setEventsListener(eventsListener);
    },

    // Update FullCalendar with current events
    updateCalendarEvents() {
        if (!this.calendar) return;

        const currentUser = window.RoommatePortal.state.getCurrentUser();

        // Filter and format events for FullCalendar
        const calendarEvents = this.events
            .filter(event => {
                // Filter private events (only show to creator)
                if (event.privacy === 'private' && event.createdBy !== currentUser?.uid) {
                    return false;
                }
                return true;
            })
            .map(event => {
                const startDateTime = window.RoommatePortal.utils.parseLocalDateTimeString(event.startDate);
                const endDateTime = window.RoommatePortal.utils.parseLocalDateTimeString(event.endDate);

                // For all-day events, FullCalendar expects exclusive end dates
                // (the end date should be the day after the actual end)
                let calendarEndDate = endDateTime;
                if (event.isAllDay) {
                    calendarEndDate = new Date(endDateTime);
                    calendarEndDate.setDate(calendarEndDate.getDate() + 1);
                }

                return {
                    id: event.id,
                    title: event.title,
                    start: startDateTime,
                    end: calendarEndDate,
                    allDay: event.isAllDay,
                    backgroundColor: event.privacy === 'private' ? '#8b5cf6' : '#10b981',
                    borderColor: event.privacy === 'private' ? '#7c3aed' : '#059669',
                    textColor: 'white',
                    extendedProps: {
                        description: event.description,
                        location: event.location,
                        privacy: event.privacy,
                        createdBy: event.createdBy,
                        createdByName: event.createdByName
                    }
                };
            });

        // More efficient event updating - only replace if events have actually changed
        const currentEvents = this.calendar.getEvents();

        // Quick check if we need to update (compare event count and IDs)
        const needsUpdate = currentEvents.length !== calendarEvents.length ||
            !calendarEvents.every(newEvent =>
                currentEvents.some(currentEvent => currentEvent.id === newEvent.id)
            );

        if (needsUpdate) {
            // Use refetchEvents if we have an event source, otherwise replace all
            const eventSources = this.calendar.getEventSources();
            if (eventSources.length > 0) {
                // Remove existing sources and add new one
                eventSources.forEach(source => source.remove());
            }

            // Add events directly (more efficient than removeAllEvents + addEventSource)
            this.calendar.removeAllEvents();
            this.calendar.addEventSource(calendarEvents);
        }
    },

    // Render calendar
    renderCalendar() {
        const calendarGrid = document.getElementById('calendarGrid');
        const currentMonthYear = document.getElementById('currentMonthYear');

        if (!calendarGrid || !currentMonthYear) return;

        // Update month/year display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        currentMonthYear.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        // Clear calendar and set up container
        calendarGrid.innerHTML = '';
        calendarGrid.className = 'calendar-container bg-gray-100 p-4 rounded-lg';

        // Get first day of month and number of days
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Add day headers
        const headerRow = document.createElement('div');
        headerRow.className = 'calendar-header-row grid grid-cols-7 gap-1 mb-1';

        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header text-center font-semibold text-gray-600 py-2';
            dayHeader.textContent = day;
            headerRow.appendChild(dayHeader);
        });
        calendarGrid.appendChild(headerRow);

        // Create array to store day elements for multi-day event rendering
        const dayElements = [];
        const totalCells = startingDayOfWeek + daysInMonth;
        const weeks = Math.ceil(totalCells / 7);        // Create week rows
        for (let week = 0; week < weeks; week++) {
            const weekRow = document.createElement('div');
            weekRow.className = 'calendar-week-row grid grid-cols-7 gap-1 mb-1 relative';

            // Responsive height based on screen size
            const isMobile = window.innerWidth <= 768;
            const isSmallMobile = window.innerWidth <= 480;

            if (isSmallMobile) {
                weekRow.style.minHeight = '80px';
            } else if (isMobile) {
                weekRow.style.minHeight = '100px';
            } else {
                weekRow.style.minHeight = '140px';
            }

            // Add 7 days to this week row
            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                const cellIndex = week * 7 + dayOfWeek;
                const dayNumber = cellIndex - startingDayOfWeek + 1;

                if (cellIndex < startingDayOfWeek || dayNumber > daysInMonth) {
                    // Empty cell (before first day or after last day)
                    const emptyDay = document.createElement('div');
                    emptyDay.className = 'calendar-day calendar-day-empty relative';
                    weekRow.appendChild(emptyDay);
                    dayElements.push({ element: emptyDay, date: null, dayNumber: null, row: week, col: dayOfWeek });
                } else {
                    // Actual day cell
                    const dayElement = document.createElement('div');
                    dayElement.className = 'calendar-day cursor-pointer hover:bg-gray-100 transition-colors relative';

                    const currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), dayNumber);
                    const isToday = this.isToday(currentDate);

                    if (isToday) {
                        dayElement.classList.add('calendar-day-today');
                    }

                    // Get single-day events for this day (multi-day events will be handled separately)
                    const singleDayEvents = this.getSingleDayEventsForDay(currentDate);
                    const maxSingleDayEvents = 2;
                    const displayedSingleDayEvents = singleDayEvents.slice(0, maxSingleDayEvents);
                    const hasMoreSingleDayEvents = singleDayEvents.length > maxSingleDayEvents;

                    dayElement.innerHTML = `
                        <div class="calendar-day-number ${isToday ? 'font-bold text-blue-600' : 'text-gray-700'}">${dayNumber}</div>
                        <div class="calendar-day-events">
                            ${displayedSingleDayEvents.map(event => `
                                <div class="calendar-event ${event.privacy === 'private' ? 'calendar-event-private' : 'calendar-event-shared'} ${event.isAllDay ? 'calendar-event-allday' : ''}" 
                                     title="${event.title}${event.description ? ' - ' + event.description : ''}${event.location ? ' at ' + event.location : ''}${event.isAllDay ? ' (All day)' : ''}"
                                     data-event-id="${event.id}">
                                    <i class="fas ${event.privacy === 'private' ? 'fa-lock' : ''} mr-1"></i>${event.isAllDay ? '<i class="fas fa-calendar mr-1"></i>' : ''}${event.title}
                                </div>
                            `).join('')}
                            ${hasMoreSingleDayEvents ? `<div class="calendar-view-all-btn">+${singleDayEvents.length - maxSingleDayEvents} more...</div>` : ''}
                        </div>
                    `;

                    // Add click handler using event delegation
                    dayElement.addEventListener('click', (e) => {
                        // Prevent event bubbling issues
                        e.stopPropagation();

                        // Get all events for this day (including multi-day)
                        const allDayEvents = this.getEventsForDay(currentDate);
                        this.showDayEvents(currentDate, allDayEvents);
                    });

                    weekRow.appendChild(dayElement);
                    dayElements.push({ element: dayElement, date: currentDate, dayNumber: dayNumber, row: week, col: dayOfWeek });
                }
            }

            calendarGrid.appendChild(weekRow);
        }

        // Now render multi-day events as spanning elements
        this.renderMultiDayEvents(dayElements);
    },

    // Check if date is today
    isToday(date) {
        return window.RoommatePortal.utils.isToday(date);
    },

    // Get events for a specific day
    getEventsForDay(date) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        return this.events.filter(event => {
            const startDate = window.RoommatePortal.utils.parseLocalDateTimeString(event.startDate);
            const endDate = window.RoommatePortal.utils.parseLocalDateTimeString(event.endDate);

            if (event.isAllDay) {
                // For all-day events, check if the target date falls within the range
                const eventStart = new Date(startDate);
                eventStart.setHours(0, 0, 0, 0);

                const eventEnd = new Date(endDate);
                eventEnd.setHours(0, 0, 0, 0);

                return targetDate >= eventStart && targetDate <= eventEnd;
            } else {
                // For timed events, check if they occur on this day
                const eventStartDay = new Date(startDate);
                eventStartDay.setHours(0, 0, 0, 0);

                const eventEndDay = new Date(endDate);
                eventEndDay.setHours(0, 0, 0, 0);

                return targetDate >= eventStartDay && targetDate <= eventEndDay;
            }
        });
    },

    // Get single-day events for a specific day (excludes multi-day events)
    getSingleDayEventsForDay(date) {
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        const filteredEvents = this.events.filter(event => {
            const eventStart = window.RoommatePortal.utils.parseLocalDateTimeString(event.startDate);
            const eventEnd = window.RoommatePortal.utils.parseLocalDateTimeString(event.endDate);

            // Check if event occurs on this day and is single-day
            const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
            const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
            const isSingleDay = eventStartDate.getTime() === eventEndDate.getTime();
            const eventOnDay = eventStartDate.getTime() === date.getTime();

            // Filter private events (only show to creator)
            if (event.privacy === 'private' && event.createdBy !== currentUser?.uid) {
                return false;
            }

            return eventOnDay && isSingleDay;
        });

        return filteredEvents;
    },

    // Edit event
    editEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const currentUser = window.RoommatePortal.state.getCurrentUser();
        if (event.createdBy !== currentUser?.uid) {
            window.RoommatePortal.utils.showNotification('❌ You can only edit events you created.');
            return;
        }

        // Store event data for population after modal opens
        this.editingEventData = {
            id: eventId,
            title: event.title,
            description: event.description || '',
            location: event.location || '',
            privacy: event.privacy,
            isAllDay: event.isAllDay || false,
            startDate: window.RoommatePortal.utils.parseLocalDateTimeString(event.startDate),
            endDate: window.RoommatePortal.utils.parseLocalDateTimeString(event.endDate)
        };

        // Show form modal using main.js method
        if (window.RoommatePortal.app && window.RoommatePortal.app.openInputModal) {
            window.RoommatePortal.app.openInputModal('calendar');
            // Populate form after a delay to ensure modal is fully loaded
            setTimeout(() => {
                this.populateEditForm();
            }, 250);
        } else {
            // Fallback - try to find existing modal
            const modal = document.querySelector('.input-modal');
            if (modal) {
                modal.style.display = 'block';
                this.populateEditForm();
            }
        }
    },

    // Delete event
    async deleteEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const currentUser = window.RoommatePortal.state.getCurrentUser();
        if (event.createdBy !== currentUser?.uid) {
            window.RoommatePortal.utils.showNotification('❌ You can only delete events you created.');
            return;
        }

        if (!confirm('Are you sure you want to delete this event?')) return;

        try {
            const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
            if (!currentHousehold) return;

            await firebase.firestore()
                .collection('households')
                .doc(currentHousehold.id)
                .collection('events')
                .doc(eventId)
                .delete();

            window.RoommatePortal.utils.showNotification('✅ Event deleted successfully!');

        } catch (error) {
            console.error('Error deleting event:', error);
            window.RoommatePortal.utils.showNotification('❌ Error deleting event. Please try again.');
        }
    },

    // Populate form with editing event data
    populateEditForm() {
        if (!this.editingEventData) {
            return;
        }

        // Find form elements (could be in cloned form within modal)
        const modal = document.querySelector('.input-modal');

        if (!modal) {
            // Try original form if no modal
            this.populateFormElements(document);
            this.updateFormButtonText(document, true);
            return;
        }

        // Check if the modal content is ready
        const modalContent = modal.querySelector('form');

        if (!modalContent) {
            // Retry after a short delay
            setTimeout(() => {
                this.populateEditForm();
            }, 50);
            return;
        }

        // Populate form elements within the modal
        this.populateFormElements(modal);
        this.updateFormButtonText(modal, true);
    },

    // Helper method to populate form elements
    populateFormElements(container) {
        if (!this.editingEventData) return;

        // Find form fields by multiple methods (ID, data attribute, type)
        const titleField = container.querySelector('#eventTitle') ||
            container.querySelector('input[type="text"]');

        const descriptionField = container.querySelector('#eventDescription') ||
            container.querySelector('textarea');

        const locationField = container.querySelector('#eventLocation') ||
            container.querySelectorAll('input[type="text"]')[1];

        const allDayField = container.querySelector('#eventAllDay') ||
            container.querySelector('input[type="checkbox"]');

        const privacyField = container.querySelector('#eventPrivacy') ||
            container.querySelector('select');

        const dateField = container.querySelector('#eventDate') ||
            container.querySelector('input[data-field="start-date"]') ||
            container.querySelector('input[type="date"]');

        const timeField = container.querySelector('#eventTime') ||
            container.querySelector('input[data-field="start-time"]') ||
            container.querySelector('input[type="time"]');

        const endDateField = container.querySelector('#eventEndDate') ||
            container.querySelector('input[data-field="end-date"]') ||
            container.querySelectorAll('input[type="date"]')[1];

        const endTimeField = container.querySelector('#eventEndTime') ||
            container.querySelector('input[data-field="end-time"]') ||
            container.querySelectorAll('input[type="time"]')[1];

        const form = container.querySelector('#addEventForm') ||
            container.querySelector('form');

        if (titleField) {
            titleField.value = this.editingEventData.title;
        }
        if (descriptionField) {
            descriptionField.value = this.editingEventData.description;
        }
        if (locationField) {
            locationField.value = this.editingEventData.location;
        }
        if (allDayField) {
            allDayField.checked = this.editingEventData.isAllDay;
            this.toggleAllDayFieldsInContainer(container);
        }
        if (privacyField) {
            privacyField.value = this.editingEventData.privacy;
        }

        if (dateField) {
            const dateValue = window.RoommatePortal.utils.getLocalDateString(this.editingEventData.startDate);
            dateField.value = dateValue;
        }
        if (timeField && !this.editingEventData.isAllDay) {
            const timeValue = window.RoommatePortal.utils.getLocalTimeString(this.editingEventData.startDate);
            timeField.value = timeValue;
        }
        if (endDateField) {
            const endDateValue = window.RoommatePortal.utils.getLocalDateString(this.editingEventData.endDate);
            endDateField.value = endDateValue;
        }
        if (endTimeField && !this.editingEventData.isAllDay) {
            const endTimeValue = window.RoommatePortal.utils.getLocalTimeString(this.editingEventData.endDate);
            endTimeField.value = endTimeValue;
        }

        // Store event ID for updating
        if (form) {
            form.dataset.editingEventId = this.editingEventData.id;
        }
    },

    // Clear form
    clearForm() {
        const elements = ['eventTitle', 'eventDescription', 'eventLocation', 'eventDate', 'eventTime', 'eventEndDate', 'eventEndTime'];

        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });

        const privacyField = document.getElementById('eventPrivacy');
        if (privacyField) {
            privacyField.value = 'shared';
        }

        const allDayCheckbox = document.getElementById('eventAllDay');
        if (allDayCheckbox) {
            allDayCheckbox.checked = false;
        }

        // Reset time fields visibility
        this.toggleAllDayFields();

        // Remove editing state
        const form = document.getElementById('addEventForm');
        if (form) {
            delete form.dataset.editingEventId;
        }

        // Clear editing event data
        this.editingEventData = null;

        // Reset button text to "Add Event"
        this.updateFormButtonText(document, false);
    },

    // Update calendar statistics (optimized)
    updateCalendarStats() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        if (!currentUser) return;

        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Cache parsed dates and filter in one pass for better performance
        let upcomingCount = 0;

        for (const event of this.events) {
            // Skip private events not owned by current user
            if (event.privacy === 'private' && event.createdBy !== currentUser.uid) {
                continue;
            }

            // Parse dates only once per event
            const eventStart = window.RoommatePortal.utils.parseLocalDateTimeString(event.startDate);
            const eventEnd = window.RoommatePortal.utils.parseLocalDateTimeString(event.endDate);

            if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
                continue; // Skip invalid dates
            }

            const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());

            const startsInFuture = eventStart > now && eventStart <= nextWeek;
            const isCurrentlyOngoing = eventStart <= now && eventEnd >= now;
            const startsToday = eventStartDate.getTime() === today.getTime();

            if (startsInFuture || isCurrentlyOngoing || startsToday) {
                upcomingCount++;
            }
        }

        // Update dashboard tile only if it exists
        const upcomingEventsCount = document.getElementById('upcomingEventsCount');
        if (upcomingEventsCount) {
            upcomingEventsCount.textContent = upcomingCount;
        }
    },

    // Setup automatic cleanup of old events
    setupCleanupSchedule() {
        // Clean up old events daily (24 hours)
        setInterval(() => {
            this.cleanupOldEvents();
        }, 24 * 60 * 60 * 1000);

        // Initial cleanup after a delay
        setTimeout(() => {
            this.cleanupOldEvents();
        }, 5000);
    },

    // Clean up events older than 90 days past their end date
    async cleanupOldEvents() {
        const currentHousehold = window.RoommatePortal.state.getCurrentHousehold();
        if (!currentHousehold) {
            return;
        }

        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        try {
            const eventsCollection = firebase.firestore()
                .collection('households')
                .doc(currentHousehold.id)
                .collection('events');

            const snapshot = await eventsCollection.get();
            const eventsToDelete = [];

            snapshot.forEach(doc => {
                const event = doc.data();

                if (!event.endDate) {
                    return;
                }

                const eventEnd = window.RoommatePortal.utils.parseLocalDateTimeString(event.endDate);

                if (isNaN(eventEnd.getTime())) {
                    return;
                }

                if (eventEnd < ninetyDaysAgo) {
                    eventsToDelete.push({
                        id: doc.id,
                        title: event.title || 'Unknown',
                        endDate: eventEnd
                    });
                }
            });

            if (eventsToDelete.length === 0) {
                return;
            }

            // Delete events in batches
            const batchSize = 500;
            for (let i = 0; i < eventsToDelete.length; i += batchSize) {
                const batch = firebase.firestore().batch();
                const batchEvents = eventsToDelete.slice(i, i + batchSize);

                batchEvents.forEach(event => {
                    batch.delete(eventsCollection.doc(event.id));
                });

                await batch.commit();
            }

        } catch (error) {
            console.error('Calendar: Error cleaning up old events:', error);
        }
    },

    // Delete all private events for a specific user
    async deleteUserPrivateEvents(userId, householdId) {
        return await window.RoommatePortal.dataCleanup.deleteUserPrivateEvents(userId, householdId);
    },

    // Delete all events for a household
    async deleteAllHouseholdEvents(householdId) {
        return await window.RoommatePortal.dataCleanup.deleteAllHouseholdEvents(householdId);
    },

    // Update form button text based on editing state
    updateFormButtonText(container, isEditing) {
        const submitButton = container.querySelector('#addEventForm button[type="submit"]') ||
            container.querySelector('form button[type="submit"]');

        if (submitButton) {
            if (isEditing) {
                submitButton.innerHTML = '<i class="fas fa-edit mr-2"></i>Update Event';
            } else {
                submitButton.innerHTML = '<i class="fas fa-calendar-plus mr-2"></i>Add Event';
            }
        }
    },

    // Clean up resources when module is destroyed
    cleanup() {
        // Clear any pending timeouts
        if (this.updateCalendarTimeout) {
            clearTimeout(this.updateCalendarTimeout);
            this.updateCalendarTimeout = null;
        }

        // Clear events and reset state
        if (this.calendar) {
            this.calendar.removeAllEvents();
        }

        this.events = [];
        this.editingEventData = null;
    },
};

// Add calendar module to RoommatePortal namespace
window.RoommatePortal.calendar = calendarModule;
