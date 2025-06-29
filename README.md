# 🏠 Roommate Portal

A modern, household-based roommate management application built with Firebase and Vanilla JavaScript.

## ✨ Features

### 🔐 Authentication
- Google Sign-In integration
- Email/Password authentication
- Persistent login sessions

### 🏡 Household Management
- **Create Household**: Set up a new shared living space with a unique code
- **Join Household**: Join an existing household using a 6-character code
- **Household Roles**: Admin and member roles with different permissions
- **Leave Household**: Leave a household with proper admin transfer
- **Member Management**: View all household members and their roles

### ✅ Chore Management
- **Full CRUD Access**: All household members can create, read, update, and delete chores
- **Assignee System**: Assign chores to specific household members
- **Priority Levels**: Set chore priorities (high, medium, low)
- **Completion Tracking**: Mark chores as complete with timestamps
- **Real-time Updates**: Changes sync across all household members instantly

### 💬 Message Board
- **Personal Messages**: Full CRUD access to your own messages
- **Message Privacy**: Cannot delete other roommates' messages
- **Real-time Chat**: Messages appear instantly for all household members
- **Author Attribution**: Messages show the author's name and timestamp
- **New Message Indicators**: Visual indicators for unread messages

### 📊 Dashboard & Statistics
- Active chore count
- Completed chores today
- New message count
- Member activity status

## 🚀 Getting Started

1. **Sign In**: Use Google or Email authentication
2. **Create or Join**: Either create a new household or join existing one with a code
3. **Start Collaborating**: Add chores, post messages, and manage your shared living space

## 🛡️ Security & Permissions

### Household Access Control
- Users must be part of a household to access chores and messages
- All data is scoped to the household level
- Household codes provide secure access control

### Message Permissions
- ✅ **Can Do**: Create, edit, and delete your own messages
- ❌ **Cannot Do**: Delete or edit other members' messages

### Chore Permissions
- ✅ **Can Do**: Full CRUD access to all household chores
- ✅ **Can Do**: Mark any chore as complete
- ✅ **Can Do**: Assign chores to any household member

### Admin Features
- Create household and get admin role
- Admin role transfers automatically when leaving household
- Last member leaving deletes the household

## 🔧 Technical Details

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Styling**: Tailwind CSS
- **Backend**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Real-time**: Firebase real-time listeners
- **Storage**: Client-side persistence with Firebase sync

## 🌟 User Experience

- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: No page refresh needed
- **Intuitive Interface**: Clean, modern UI with clear navigation
- **Keyboard Shortcuts**: Ctrl/Cmd + Enter to submit forms
- **Visual Feedback**: Toast notifications for all actions
- **Animated Interactions**: Smooth transitions and loading states