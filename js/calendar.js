// Roommate Portal - Calendar Management Module
// Handles calendar events creation, editing, and management

window.RoommatePortal = window.RoommatePortal || {};

const calendarModule = {
    currentDate: new Date(),
    events: [],

    // Initialize calendar management
    init() {
        this.setupCalendarForm();
        this.setupCalendarNavigation();
        this.setupCleanupSchedule();

        // Load events if user is already in a household
        if (window.RoommatePortal.state.getCurrentHousehold()) {
            this.loadEvents();
            this.renderCalendar();
        }
    },

    // Refresh calendar when household context changes
    refresh() {
        this.loadEvents();
        this.renderCalendar();

        // Trigger cleanup when household changes
        setTimeout(() => {
            this.cleanupOldEvents();
        }, 2000);
    },

    // Setup calendar form event listener
    setupCalendarForm() {
        const elements = window.RoommatePortal.state.elements;
        const addEventForm = document.getElementById('addEventForm');

        if (addEventForm) {
            addEventForm.addEventListener('submit', this.handleAddEvent.bind(this));
        }
    },

    // Setup calendar navigation
    setupCalendarNavigation() {
        const prevMonthBtn = document.getElementById('prevMonthBtn');
        const nextMonthBtn = document.getElementById('nextMonthBtn');
        const todayBtn = document.getElementById('todayBtn');

        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.renderCalendar();
            });
        }

        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.renderCalendar();
            });
        }

        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.currentDate = new Date();
                this.renderCalendar();
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
        const eventPrivacy = document.getElementById('eventPrivacy').value;

        if (!eventTitle || !eventDate || !eventTime) {
            window.RoommatePortal.utils.showNotification('❌ Please fill in all required fields.');
            return;
        }

        // Create start and end datetime objects using helper function
        const startDateTime = this.createLocalDateTime(eventDate, eventTime);
        let endDateTime;

        if (eventEndDate && eventEndTime) {
            endDateTime = this.createLocalDateTime(eventEndDate, eventEndTime);
        } else {
            // Default to 1 hour after start time
            endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
        }

        // Validate dates
        if (endDateTime <= startDateTime) {
            window.RoommatePortal.utils.showNotification('❌ End time must be after start time.');
            return;
        }

        // Check if we're editing an existing event
        const form = document.getElementById('addEventForm');
        const editingEventId = form.dataset.editingEventId;

        try {
            // Encrypt sensitive event data
            const encryptedData = await window.RoommatePortal.encryption.encryptSensitiveData({
                title: eventTitle,
                description: eventDescription
            }, ['title', 'description']);

            const eventData = {
                title: encryptedData.title,
                title_encrypted: encryptedData.title_encrypted,
                description: encryptedData.description,
                description_encrypted: encryptedData.description_encrypted,
                startDate: this.getLocalDateTimeString(startDateTime),
                endDate: this.getLocalDateTimeString(endDateTime),
                privacy: eventPrivacy,
                createdBy: currentUser.uid,
                createdByName: currentUser.displayName || currentUser.email,
                householdId: currentHousehold.id
            };

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
                eventData.createdAt = this.getLocalDateTimeString(new Date());
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

            // Don't add to local array - let the Firestore listener handle it

        } catch (error) {
            console.error('Error updating event:', error);
            window.RoommatePortal.utils.showNotification('❌ Error updating event. Please try again.');
        }
    },

    // Load events from Firestore
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
            this.events = [];
            const eventsList = [];
            snapshot.forEach((doc) => {
                const eventData = { ...doc.data(), id: doc.id };
                eventsList.push(eventData);
            });

            // Decrypt event data
            try {
                this.events = await window.RoommatePortal.encryption.decryptDataArray(eventsList, ['title', 'description']);
            } catch (error) {
                console.error('Error decrypting events:', error);
                this.events = eventsList; // Use original data if decryption fails
                window.RoommatePortal.utils.showNotification('⚠️ Some events could not be decrypted.');
            }

            this.renderCalendar();
            this.updateCalendarStats();
        }, (error) => {
            console.error('Calendar: Error loading events:', error);
            window.RoommatePortal.utils.showNotification('❌ Error loading calendar events. Please refresh the page.');
        });

        // Store listener for cleanup
        window.RoommatePortal.state.setEventsListener(eventsListener);
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
                                <div class="calendar-event ${event.privacy === 'private' ? 'calendar-event-private' : 'calendar-event-shared'}" 
                                     title="${event.title}${event.description ? ' - ' + event.description : ''}"
                                     data-event-id="${event.id}">
                                    ${event.privacy === 'private' ? '🔒' : '👥'} ${event.title}
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
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },

    // Get events for a specific day
    getEventsForDay(date) {
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        const filteredEvents = this.events.filter(event => {
            const eventStart = this.parseLocalDateTimeString(event.startDate);
            const eventEnd = this.parseLocalDateTimeString(event.endDate);

            // Check if event occurs on this day
            const eventOnDay = eventStart.toDateString() === date.toDateString() ||
                (eventStart <= date && eventEnd >= date);

            // Filter private events (only show to creator)
            if (event.privacy === 'private' && event.createdBy !== currentUser?.uid) {
                return false;
            }

            return eventOnDay;
        });

        return filteredEvents;
    },

    // Get single-day events for a specific day (excludes multi-day events)
    getSingleDayEventsForDay(date) {
        const currentUser = window.RoommatePortal.state.getCurrentUser();

        const filteredEvents = this.events.filter(event => {
            const eventStart = this.parseLocalDateTimeString(event.startDate);
            const eventEnd = this.parseLocalDateTimeString(event.endDate);

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
    },    // Render multi-day events as spanning elements
    renderMultiDayEvents(dayElements) {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const maxDisplayedEvents = 3; // Maximum number of multi-day events to display

        // Get all multi-day events that intersect with this month
        const multiDayEvents = this.events.filter(event => {
            const eventStart = this.parseLocalDateTimeString(event.startDate);
            const eventEnd = this.parseLocalDateTimeString(event.endDate);

            // Check if it's a multi-day event
            const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
            const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
            const isMultiDay = eventStartDate.getTime() !== eventEndDate.getTime();

            // Filter private events (only show to creator)
            if (event.privacy === 'private' && event.createdBy !== currentUser?.uid) {
                return false;
            }

            // Check if event intersects with current month
            const monthStart = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            const monthEnd = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
            const intersectsMonth = eventStartDate <= monthEnd && eventEndDate >= monthStart;

            return isMultiDay && intersectsMonth;
        });

        console.log('Calendar: Found', multiDayEvents.length, 'multi-day events to render');

        // Sort events by start date to prioritize earlier events
        multiDayEvents.sort((a, b) => {
            const aStart = this.parseLocalDateTimeString(a.startDate);
            const bStart = this.parseLocalDateTimeString(b.startDate);
            return aStart - bStart;
        });

        // Limit the number of events displayed
        const eventsToDisplay = multiDayEvents.slice(0, maxDisplayedEvents);
        const hasMoreEvents = multiDayEvents.length > maxDisplayedEvents;

        // Group events by rows to avoid overlaps
        const eventRows = [];

        eventsToDisplay.forEach(event => {
            const eventStart = this.parseLocalDateTimeString(event.startDate);
            const eventEnd = this.parseLocalDateTimeString(event.endDate);

            console.log('Calendar: Processing multi-day event:', event.title,
                'Start:', eventStart.toLocaleDateString(),
                'End:', eventEnd.toLocaleDateString());

            // Find the start and end indices in the dayElements array
            let startIndex = -1;
            let endIndex = -1;

            for (let i = 0; i < dayElements.length; i++) {
                const dayElement = dayElements[i];
                if (dayElement.date) {
                    const dayDate = new Date(dayElement.date.getFullYear(), dayElement.date.getMonth(), dayElement.date.getDate());
                    const eventStartDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
                    const eventEndDate = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());

                    if (startIndex === -1 && dayDate >= eventStartDate) {
                        startIndex = i;
                    }
                    if (dayDate <= eventEndDate) {
                        endIndex = i;
                    }
                }
            }

            if (startIndex !== -1 && endIndex !== -1) {
                // Find an available row for this event
                let rowIndex = 0;
                while (eventRows[rowIndex] && this.eventsOverlap(eventRows[rowIndex], startIndex, endIndex)) {
                    rowIndex++;
                }

                if (!eventRows[rowIndex]) {
                    eventRows[rowIndex] = [];
                }

                eventRows[rowIndex].push({
                    event,
                    startIndex,
                    endIndex,
                    rowIndex
                });
            }
        });

        // Render each event row
        eventRows.forEach((row, rowIndex) => {
            row.forEach(eventInfo => {
                this.renderSpanningEvent(eventInfo, dayElements);
            });
        });

        // Add "View All" indicator if there are more events
        if (hasMoreEvents) {
            this.addViewAllIndicator(dayElements, eventRows.length, multiDayEvents.length - maxDisplayedEvents);
        }
    },

    // Add "View All" indicator when there are more events than displayed
    addViewAllIndicator(dayElements, lastRowIndex, hiddenEventsCount) {
        // Find the first day that has events to place the indicator
        const firstDayWithEvents = dayElements.find(elem => elem.date && this.getEventsForDay(elem.date).length > 0);

        if (!firstDayWithEvents) return;

        const weekRow = firstDayWithEvents.element.parentElement;
        if (!weekRow) return;

        // Create view all indicator with mobile responsiveness
        const viewAllIndicator = document.createElement('div');
        viewAllIndicator.className = 'calendar-spanning-event calendar-view-all-indicator';
        viewAllIndicator.style.left = '2%';
        viewAllIndicator.style.width = '96%';

        // Responsive positioning
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;

        let top, spacing;
        if (isSmallMobile) {
            top = 26; // Increased from 22
            spacing = 18;
        } else if (isMobile) {
            top = 28; // Increased from 24
            spacing = 20;
        } else {
            top = 32; // Increased from 28
            spacing = 28;
        }

        viewAllIndicator.style.top = `${top + (lastRowIndex * spacing)}px`;
        viewAllIndicator.style.textAlign = 'center';
        viewAllIndicator.style.background = '#f9fafb';
        viewAllIndicator.style.color = '#6b7280';
        viewAllIndicator.style.border = '1px dashed #d1d5db';
        viewAllIndicator.style.fontSize = '11px';
        viewAllIndicator.style.fontStyle = 'italic';
        viewAllIndicator.style.zIndex = '40'; // Slightly lower than regular events

        viewAllIndicator.innerHTML = `+${hiddenEventsCount} more event${hiddenEventsCount === 1 ? '' : 's'}...`;
        viewAllIndicator.title = 'Click any day to view all events';

        weekRow.appendChild(viewAllIndicator);
    },

    // Check if two events overlap in their date ranges
    eventsOverlap(existingEvents, newStartIndex, newEndIndex) {
        return existingEvents.some(event => {
            return !(newEndIndex < event.startIndex || newStartIndex > event.endIndex);
        });
    },

    // Render a single spanning event
    renderSpanningEvent(eventInfo, dayElements) {
        const { event, startIndex, endIndex, rowIndex } = eventInfo;

        // Find the week row elements
        const startElement = dayElements[startIndex];
        const endElement = dayElements[endIndex];

        if (!startElement || !endElement) return;

        // Handle events that span across weeks
        const startWeek = startElement.row;
        const endWeek = endElement.row;

        if (startWeek === endWeek) {
            // Event is within a single week
            this.createSpanningEventElement(event, startElement, endElement, rowIndex, false, false);
        } else {
            // Event spans multiple weeks - create separate elements for each week
            for (let week = startWeek; week <= endWeek; week++) {
                // Find start and end elements for this week segment
                const weekElements = dayElements.filter(elem => elem.row === week);
                const segmentStart = week === startWeek ? startElement : weekElements.find(elem => elem.date !== null);
                const segmentEnd = week === endWeek ? endElement : weekElements[weekElements.length - 1];

                if (segmentStart && segmentEnd) {
                    const isFirstSegment = week === startWeek;
                    const isLastSegment = week === endWeek;
                    this.createSpanningEventElement(event, segmentStart, segmentEnd, rowIndex, !isFirstSegment, !isLastSegment);
                }
            }
        }
    },

    // Create a spanning event element
    createSpanningEventElement(event, startElement, endElement, rowIndex, showStartEllipsis, showEndEllipsis) {
        const startCol = startElement.col;
        const endCol = endElement.col;
        const weekRow = startElement.element.parentElement;

        if (!weekRow) return;

        console.log('Calendar: Creating spanning event:', event.title, 'from col', startCol, 'to col', endCol, 'row', rowIndex);

        // Create the spanning event element
        const spanningEvent = document.createElement('div');
        spanningEvent.className = `calendar-spanning-event ${event.privacy === 'private' ? 'calendar-event-private' : 'calendar-event-shared'}`;        // Calculate position and size with mobile responsiveness
        const left = (startCol / 7) * 100;
        const width = ((endCol - startCol + 1) / 7) * 100;

        // Responsive positioning based on screen size
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;

        let top, spacing;
        if (isSmallMobile) {
            top = 26; // Increased from 22
            spacing = 18;
        } else if (isMobile) {
            top = 28; // Increased from 24
            spacing = 20;
        } else {
            top = 32; // Increased from 28
            spacing = 28;
        }

        const finalTop = top + (rowIndex * spacing);

        spanningEvent.style.left = `${left}%`;
        spanningEvent.style.width = `${width}%`;
        spanningEvent.style.top = `${finalTop}px`;
        spanningEvent.style.zIndex = '50'; // Ensure high z-index

        console.log('Calendar: Event positioned at', left + '%', 'width', width + '%', 'top', top + 'px');

        // Set content with ellipsis for continuation
        let displayText = `${event.privacy === 'private' ? '🔒' : '👥'} ${event.title}`;
        if (showStartEllipsis) displayText = '← ' + displayText;
        if (showEndEllipsis) displayText = displayText + ' →';

        spanningEvent.innerHTML = displayText;
        spanningEvent.title = `${event.title}${event.description ? ' - ' + event.description : ''}`;
        spanningEvent.dataset.eventId = event.id;

        // Add click handler
        spanningEvent.addEventListener('click', (e) => {
            e.stopPropagation();
            const eventStartDate = this.parseLocalDateTimeString(event.startDate);
            const clickDate = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate());
            const allDayEvents = this.getEventsForDay(clickDate);
            this.showDayEvents(clickDate, allDayEvents);
        });

        weekRow.appendChild(spanningEvent);
    },

    // Show day events in a modal
    showDayEvents(date, events) {

        const modal = document.getElementById('dayEventsModal');
        const modalDate = document.getElementById('modalDate');
        const modalEventsList = document.getElementById('modalEventsList');

        if (!modal || !modalDate || !modalEventsList) {
            console.error('Calendar: Modal elements not found', { modal: !!modal, modalDate: !!modalDate, modalEventsList: !!modalEventsList });
            return;
        }

        modalDate.textContent = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        modalEventsList.innerHTML = '';

        if (events.length === 0) {
            modalEventsList.innerHTML = '<p class="text-gray-500 text-center py-4">No events scheduled for this day.</p>';
        } else {
            events.forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = `event-item p-4 border rounded-lg mb-3 ${event.privacy === 'private' ? 'border-purple-200 bg-purple-50' : 'border-green-200 bg-green-50'
                    }`;

                const startDateTime = this.parseLocalDateTimeString(event.startDate);
                const endDateTime = this.parseLocalDateTimeString(event.endDate);

                // Check if event spans multiple days
                const startDate = new Date(startDateTime.getFullYear(), startDateTime.getMonth(), startDateTime.getDate());
                const endDate = new Date(endDateTime.getFullYear(), endDateTime.getMonth(), endDateTime.getDate());
                const spansMultipleDays = startDate.getTime() !== endDate.getTime();

                let timeDisplay;
                if (spansMultipleDays) {
                    // Show full date and time for multi-day events
                    const startDateStr = startDateTime.toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric'
                    });
                    const startTimeStr = startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const endDateStr = endDateTime.toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric'
                    });
                    const endTimeStr = endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    timeDisplay = `<i class="fas fa-calendar-week text-gray-500 mr-1"></i>${startDateStr}, ${startTimeStr} - ${endDateStr} ${endTimeStr}`;
                } else {
                    // Show just times for same-day events
                    const startTime = startDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const endTime = endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    timeDisplay = `<i class="fas fa-clock text-gray-500 mr-1"></i>${startTime} - ${endTime}`;
                }

                eventElement.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-semibold text-lg">
                            ${event.privacy === 'private' ? '🔒' : '👥'} ${window.RoommatePortal.utils.escapeHtml(event.title)}
                        </h4>
                        <div class="flex space-x-2">
                            <button class="edit-event-btn text-blue-600 hover:text-blue-800" data-event-id="${event.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-event-btn text-red-600 hover:text-red-800" data-event-id="${event.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <p class="text-gray-600 mb-2">${timeDisplay}</p>
                    ${event.description ? `<p class="text-gray-700">${window.RoommatePortal.utils.escapeHtml(event.description)}</p>` : ''}
                    <p class="text-sm text-gray-500 mt-2">Created by: ${window.RoommatePortal.utils.escapeHtml(event.createdByName)}</p>
                `;

                modalEventsList.appendChild(eventElement);
            });
        }

        // Setup event handlers for edit/delete buttons
        modal.querySelectorAll('.edit-event-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.edit-event-btn').dataset.eventId;
                this.editEvent(eventId);
            });
        });

        modal.querySelectorAll('.delete-event-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.delete-event-btn').dataset.eventId;
                this.deleteEvent(eventId);
            });
        });

        modal.classList.remove('hidden');
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

        // Close day events modal
        const dayEventsModal = document.getElementById('dayEventsModal');
        if (dayEventsModal) {
            dayEventsModal.classList.add('hidden');
        }

        // Store event data for population after modal opens
        this.editingEventData = {
            id: eventId,
            title: event.title,
            description: event.description || '',
            privacy: event.privacy,
            startDate: this.parseLocalDateTimeString(event.startDate),
            endDate: this.parseLocalDateTimeString(event.endDate)
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

            // Close modal
            const dayEventsModal = document.getElementById('dayEventsModal');
            if (dayEventsModal) {
                dayEventsModal.classList.add('hidden');
            }

        } catch (error) {
            console.error('Error deleting event:', error);
            window.RoommatePortal.utils.showNotification('❌ Error deleting event. Please try again.');
        }
    },

    // Populate form with editing event data
    populateEditForm() {
        if (!this.editingEventData) return;

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
            console.log('Calendar: Modal content not ready, retrying...');
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

        // Try to find elements by ID first (for original form), then by data attributes, then by more robust selectors
        const titleField = container.querySelector('#eventTitle') ||
            container.querySelector('input[placeholder*="Event title"]') ||
            container.querySelector('input[type="text"]:first-of-type');

        const descriptionField = container.querySelector('#eventDescription') ||
            container.querySelector('textarea[placeholder*="Event description"]') ||
            container.querySelector('textarea');

        const privacyField = container.querySelector('#eventPrivacy') ||
            container.querySelector('select');

        const dateField = container.querySelector('#eventDate') ||
            container.querySelector('input[data-field="start-date"]') ||
            container.querySelector('input[type="date"]:first-of-type');

        // More robust selectors for time fields using data attributes, labels, and position
        const timeField = container.querySelector('#eventTime') ||
            container.querySelector('input[data-field="start-time"]') ||
            this.findTimeFieldByLabel(container, 'Start Time') ||
            container.querySelector('input[type="time"]:first-of-type');

        const endDateField = container.querySelector('#eventEndDate') ||
            container.querySelector('input[data-field="end-date"]') ||
            container.querySelector('input[type="date"]:last-of-type');

        const endTimeField = container.querySelector('#eventEndTime') ||
            container.querySelector('input[data-field="end-time"]') ||
            this.findTimeFieldByLabel(container, 'End Time') ||
            container.querySelector('input[type="time"]:last-of-type');

        const form = container.querySelector('#addEventForm') ||
            container.querySelector('form');

        if (titleField) {
            titleField.value = this.editingEventData.title;
        }
        if (descriptionField) {
            descriptionField.value = this.editingEventData.description;
        }
        if (privacyField) {
            privacyField.value = this.editingEventData.privacy;
        }

        if (dateField) {
            const dateValue = this.getLocalDateString(this.editingEventData.startDate);
            dateField.value = dateValue;
        }
        if (timeField) {
            const timeValue = this.getLocalTimeString(this.editingEventData.startDate);
            timeField.value = timeValue;
        }
        if (endDateField) {
            const endDateValue = this.getLocalDateString(this.editingEventData.endDate);
            endDateField.value = endDateValue;
        }
        if (endTimeField) {
            const endTimeValue = this.getLocalTimeString(this.editingEventData.endDate);
            endTimeField.value = endTimeValue;
        }

        // Store event ID for updating
        if (form) {
            form.dataset.editingEventId = this.editingEventData.id;
        }

        // Also set on original form
        const originalForm = document.getElementById('addEventForm');
        if (originalForm) {
            originalForm.dataset.editingEventId = this.editingEventData.id;
        }
    },

    // Helper method to find time field by associated label text
    findTimeFieldByLabel(container, labelText) {
        const labels = container.querySelectorAll('label');
        for (let label of labels) {
            if (label.textContent.includes(labelText)) {
                // Try to find the associated input field
                const inputId = label.getAttribute('for');
                if (inputId) {
                    const input = container.querySelector(`#${inputId}`);
                    if (input) return input;
                }

                // If no 'for' attribute, look for the next input sibling
                const nextInput = label.nextElementSibling;
                if (nextInput && nextInput.tagName === 'INPUT' && nextInput.type === 'time') {
                    return nextInput;
                }

                // Look for input within the same parent container
                const parent = label.parentElement;
                if (parent) {
                    const input = parent.querySelector('input[type="time"]');
                    if (input) return input;
                }
            }
        }
        return null;
    },

    // Clear form
    clearForm() {
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventDescription').value = '';
        document.getElementById('eventDate').value = '';
        document.getElementById('eventTime').value = '';
        document.getElementById('eventEndDate').value = '';
        document.getElementById('eventEndTime').value = '';
        document.getElementById('eventPrivacy').value = 'shared';

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

    // Update calendar statistics
    updateCalendarStats() {
        const currentUser = window.RoommatePortal.state.getCurrentUser();
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Count upcoming events (next 7 days including events happening today)
        const upcomingEvents = this.events.filter(event => {
            const eventStart = this.parseLocalDateTimeString(event.startDate);
            const eventEnd = this.parseLocalDateTimeString(event.endDate);

            // Include events that:
            // 1. Start in the future (within next 7 days)
            // 2. Are happening right now (started but not ended)
            // 3. Start later today but haven't started yet
            const startsInFuture = eventStart >= now && eventStart <= nextWeek;
            const isCurrentlyOngoing = eventStart <= now && eventEnd >= now;
            const eventInRange = startsInFuture || isCurrentlyOngoing;

            // Filter private events
            if (event.privacy === 'private' && event.createdBy !== currentUser?.uid) {
                return false;
            }

            return eventInRange;
        });

        // Update dashboard tile
        const upcomingEventsCount = document.getElementById('upcomingEventsCount');
        if (upcomingEventsCount) {
            upcomingEventsCount.textContent = upcomingEvents.length;
        }
    },

    // Setup automatic cleanup of old events
    setupCleanupSchedule() {
        // Clean up old events daily (24 hours)
        setInterval(() => {
            this.cleanupOldEvents();
        }, 24 * 60 * 60 * 1000);

        // Initial cleanup after a delay to ensure events are loaded
        setTimeout(() => {
            this.cleanupOldEvents();
        }, 5000); // Wait 5 seconds for events to load
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
            // Query Firestore directly instead of relying on local events array
            const eventsCollection = firebase.firestore()
                .collection('households')
                .doc(currentHousehold.id)
                .collection('events');

            const snapshot = await eventsCollection.get();
            const eventsToDelete = [];

            snapshot.forEach(doc => {
                const event = doc.data();

                // Skip events without endDate
                if (!event.endDate) {
                    console.log('Calendar: Skipping event without endDate:', event.title || 'Unknown');
                    return;
                }

                const eventEnd = this.parseLocalDateTimeString(event.endDate);

                // Skip events with invalid dates
                if (isNaN(eventEnd.getTime())) {
                    console.log('Calendar: Skipping event with invalid endDate:', event.title || 'Unknown', event.endDate);
                    return;
                }

                console.log('Calendar: Checking event:', event.title,
                    'End date:', eventEnd.toLocaleDateString(),
                    'Older than cutoff:', eventEnd < ninetyDaysAgo);

                if (eventEnd < ninetyDaysAgo) {
                    eventsToDelete.push({
                        id: doc.id,
                        title: event.title || 'Unknown',
                        endDate: eventEnd
                    });
                }
            });

            if (eventsToDelete.length === 0) {
                console.log('Calendar: No old events to clean up');
                return;
            }

            console.log(`Calendar: Found ${eventsToDelete.length} old events to delete:`,
                eventsToDelete.map(e => `${e.title} (ended ${e.endDate.toLocaleDateString()})`));

            // Delete events in batches (Firestore batch limit is 500)
            const batchSize = 500;
            for (let i = 0; i < eventsToDelete.length; i += batchSize) {
                const batch = firebase.firestore().batch();
                const batchEvents = eventsToDelete.slice(i, i + batchSize);

                batchEvents.forEach(event => {
                    batch.delete(eventsCollection.doc(event.id));
                });

                await batch.commit();
                console.log(`Calendar: Deleted batch of ${batchEvents.length} old events`);
            }

            console.log('Calendar: Old events cleanup completed successfully');

        } catch (error) {
            console.error('Calendar: Error cleaning up old events:', error);
            // Don't show notification to user as this is background cleanup
        }
    },

    // Helper function to get local date string for HTML date input (YYYY-MM-DD)
    getLocalDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Helper function to get local time string for HTML time input (HH:MM)
    getLocalTimeString(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    },

    // Helper function to create a date object from date and time inputs that preserves local time
    createLocalDateTime(dateStr, timeStr) {
        // Parse date components
        const [year, month, day] = dateStr.split('-').map(Number);
        // Parse time components
        const [hours, minutes] = timeStr.split(':').map(Number);

        // Create date object using local timezone
        return new Date(year, month - 1, day, hours, minutes);
    },

    // Helper function to create a local datetime string that preserves timezone
    getLocalDateTimeString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    },

    // Helper function to parse local datetime string back to Date object
    parseLocalDateTimeString(dateTimeStr) {
        try {
            // Handle both old ISO format and new local format
            if (dateTimeStr.includes('Z') || dateTimeStr.includes('+')) {
                // Old ISO format - convert from UTC
                return new Date(dateTimeStr);
            } else {
                // New local format - parse as local time
                const [datePart, timePart] = dateTimeStr.split('T');
                const [year, month, day] = datePart.split('-').map(Number);
                const [hours, minutes, seconds] = timePart.split(':').map(Number);

                return new Date(year, month - 1, day, hours, minutes, seconds || 0);
            }
        } catch (error) {
            console.error('Calendar: Error parsing datetime string:', dateTimeStr, error);
            // Return a very old date so the event gets cleaned up
            return new Date('1970-01-01');
        }
    },

    // Delete all private events for a specific user (called when user leaves or deletes account)
    async deleteUserPrivateEvents(userId, householdId) {
        try {
            const eventsCollection = firebase.firestore()
                .collection('households')
                .doc(householdId)
                .collection('events');

            // Query for private events created by this user
            const privateEventsQuery = await eventsCollection
                .where('createdBy', '==', userId)
                .where('privacy', '==', 'private')
                .get();

            if (privateEventsQuery.empty) {
                console.log(`Calendar: No private events found for user ${userId} in household ${householdId}`);
                return;
            }

            // Delete events in batches
            const batch = firebase.firestore().batch();
            privateEventsQuery.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`Calendar: Deleted ${privateEventsQuery.docs.length} private events for user ${userId} in household ${householdId}`);

        } catch (error) {
            console.error('Calendar: Error deleting user private events:', error);
            throw new Error(`Failed to delete private events: ${error.message || error.code || 'Unknown error'}`);
        }
    },

    // Delete all events for a household (called when household is deleted)
    async deleteAllHouseholdEvents(householdId) {
        try {
            const eventsCollection = firebase.firestore()
                .collection('households')
                .doc(householdId)
                .collection('events');

            // Get all events in the household
            const allEventsQuery = await eventsCollection.get();

            if (allEventsQuery.empty) {
                console.log(`Calendar: No events found for household ${householdId}`);
                return;
            }

            // Delete events in batches
            const batch = firebase.firestore().batch();
            allEventsQuery.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`Calendar: Deleted ${allEventsQuery.docs.length} events for household ${householdId}`);

        } catch (error) {
            console.error('Calendar: Error deleting household events:', error);
            throw new Error(`Failed to delete household events: ${error.message || error.code || 'Unknown error'}`);
        }
    },

    // Update form button text based on editing state
    updateFormButtonText(container, isEditing) {
        // Find the submit button in the form
        const submitButton = container.querySelector('#addEventForm button[type="submit"]') ||
            container.querySelector('form button[type="submit"]') ||
            container.querySelector('button[type="submit"]');

        if (submitButton) {
            if (isEditing) {
                submitButton.innerHTML = '<i class="fas fa-edit mr-2"></i>Update Event';
            } else {
                submitButton.innerHTML = '<i class="fas fa-calendar-plus mr-2"></i>Add Event';
            }
        }
    },
};

// Add calendar module to RoommatePortal namespace
window.RoommatePortal.calendar = calendarModule;
