# CCAPDEV

# TikTalk - Social Media Web App

[![Node.js](https://img.shields.io/badge/Built%20With-Node.js-brightgreen)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-green)](https://www.mongodb.com/)
[![Handlebars](https://img.shields.io/badge/Templating-Handlebars-orange)](https://handlebarsjs.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

TikTalk is a full-stack social media web app that allows users to create, like, dislike, and comment on posts. Users can upload images, manage profiles, and explore content by tags.

---

## 🚀 Features

- User registration and login with session management
- Post creation with optional image and tag
- Like/Dislike support with counts
- Real-time comment system with editing and deletion
- Profile page with liked/disliked/saved posts
- Tag-based post filtering and full search functionality
- Profile picture upload with live preview
- Responsive UI with modal post creation

---

## 🛠 Technologies Used

- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Frontend**: HTML, CSS (modular styles), JavaScript
- **Templating**: Handlebars (`.hbs`)
- **Authentication**: express-session
- **Image Uploads**: multer
- **Date Formatting**: moment.js

---

## 🧪 Setup Instructions

1. **Clone the repository**:

```bash
git clone https://github.com/yourusername/tiktalk.git
cd tiktalk
```

2. **Install dependencies**:

```bash
npm install
```

3. **Set up MongoDB**:

- Update the connection string in `database.js` if needed.
- Current:  
  `mongodb+srv://eidentieng:password2434@tiktalkdb.r3ho1qq.mongodb.net/`

4. **Run the app**:

```bash
node app.js
```

Then open your browser and go to:  
**`http://localhost:3000/`**

---
