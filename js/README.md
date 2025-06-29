# JavaScript Modules Documentation

This directory contains the modular JavaScript files for the Roommate Portal application. The original monolithic `script.js` file has been split into manageable, purpose-specific modules.

## Module Overview

### Core Modules

1. **config.js** - Firebase configuration and initialization
   - Initializes Firebase app, Firestore, and Authentication
   - Sets up authentication persistence
   - Exports Firebase services to global namespace

2. **state.js** - Global state management
   - Manages application state variables (current user, household, chores, messages)
   - Provides DOM element references
   - Manages Firestore listeners
   - Central state access point for all modules

3. **utils.js** - Utility functions and helpers
   - Common utility functions (notifications, avatar generation, etc.)
   - UI helper functions (tab switching, header updates)
   - Household code generation
   - localStorage management

### Feature Modules

4. **auth.js** - Authentication management
   - User sign-in/sign-out functionality
   - Authentication state monitoring
   - User name prompting for new users
   - Login modal management

5. **household.js** - Household management
   - Household creation and joining
   - Household modal management
   - Member management and updates
   - Household data loading

6. **chores.js** - Chore management
   - Chore CRUD operations
   - Chore completion tracking
   - Firestore synchronization for chores
   - Chore display and sorting

7. **messages.js** - Message board management
   - Message posting and deletion
   - Message read status tracking
   - Firestore synchronization for messages
   - Message display and formatting

8. **statistics.js** - Dashboard statistics
   - Active chores count
   - Completed tasks today
   - New messages count
   - Statistics updates

### UI and Management Modules

9. **ui.js** - User interface management
   - UI state updates based on authentication
   - Button visibility management
   - Mobile menu setup
   - Application initialization

10. **dataCleanup.js** - Data cleanup operations
    - User data cleanup when leaving households
    - Firestore listener cleanup
    - Form and UI state reset
    - Account deletion data cleanup

11. **householdManagement.js** - Advanced household operations
    - Household management modal
    - Leave household functionality
    - Account deletion
    - User profile editing

12. **main.js** - Application orchestration
    - Application initialization
    - Module coordination
    - Tab handler setup
    - Error handling

## Loading Order

The modules are loaded in the following order in `index.html`:

1. `config.js` - Firebase setup
2. `state.js` - State management
3. `utils.js` - Utility functions
4. `auth.js` - Authentication
5. `household.js` - Household management
6. `chores.js` - Chore management
7. `messages.js` - Message management
8. `statistics.js` - Statistics
9. `ui.js` - UI management
10. `dataCleanup.js` - Data cleanup
11. `householdManagement.js` - Advanced household features
12. `main.js` - Application startup

## Global Namespace

All modules are attached to the global `window.RoommatePortal` namespace:

```javascript
window.RoommatePortal = {
    config: { app, db, auth },
    state: { /* state management methods */ },
    utils: { /* utility functions */ },
    auth: { /* authentication methods */ },
    household: { /* household management */ },
    chores: { /* chore management */ },
    messages: { /* message management */ },
    statistics: { /* statistics methods */ },
    ui: { /* UI management */ },
    dataCleanup: { /* cleanup methods */ },
    householdManagement: { /* advanced household features */ },
    app: { /* application orchestration */ }
}
```

## Benefits of Modular Structure

1. **Maintainability** - Each module has a single responsibility
2. **Readability** - Code is organized by feature
3. **Testability** - Individual modules can be tested in isolation
4. **Reusability** - Modules can be reused or replaced independently
5. **Debugging** - Easier to locate and fix issues
6. **Collaboration** - Multiple developers can work on different modules
7. **Performance** - Only necessary modules need to be loaded

## Original File

The original monolithic `script.js` file has been backed up as `script-original-backup.js` for reference.
