# OliLab - Science Laboratory Management System

OliLab is a comprehensive, modern web application designed to streamline the management of a science laboratory. It allows for efficient tracking of items, management of user borrowing privileges, and maintenance of a detailed log of all activities, ensuring accountability and smooth lab operations.

---

## Table of Contents

- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📂 Project Structure](#-project-structure)
- [🚀 Local Setup Guide](#-local-setup-guide)
  - [Prerequisites](#prerequisites)
  - [Step 1: Set Up Supabase Database](#step-1-set-up-supabase-database)
  - [Step 2: Backend Setup](#step-2-backend-setup-olilab-backend)
  - [Step 3: Database Initialization](#step-3-database-initialization)
  - [Step 4: Frontend Setup](#step-4-frontend-setup)
- [🏃‍♀️ Running the Application](#️-running-the-application)
- [🔧 Editor Setup (VS Code)](#-editor-setup-vs-code)
- [🌐 Deployment Guide (Render & Netlify)](#-deployment-guide-render--netlify)
  - [Deploying the Backend to Render](#deploying-the-backend-to-render)
  - [Deploying the Frontend to Netlify](#deploying-the-frontend-to-netlify)

---

## ✨ Features

- **Inventory Management**: Add, edit, delete, and track laboratory items with quantities and categories.
- **User Management**: Admin controls for user registration approval, roles, and profile management.
- **Borrowing System**: Members can request to borrow items, and admins can approve or deny requests.
- **Activity Logging**: A complete history of all borrow and return transactions.
- **QR Code Integration**: Generate and scan QR codes for quick item identification and search.
- **AI-Powered Reports**: (Admin-only) Generate intelligent inventory status briefings using the Gemini API.
- **Data Export/Import**: Export all major data types to CSV and import inventory from a CSV file.
- **User Suggestions**: A platform for users to suggest new items or features.
- **Responsive Design**: Fully functional on both desktop and mobile devices.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS.
- **Backend**: Python, Flask, Flask-SQLAlchemy.
- **Database**: PostgreSQL (instructions provided for Supabase).
- **AI**: Google Gemini API.

---

## 📂 Project Structure

```
.
├── olilab-backend/       # Python Flask backend server
│   ├── venv/             # Virtual environment (created by you)
│   ├── app.py            # Main Flask application with SQLAlchemy models and API routes
│   └── requirements.txt  # Python dependencies
│
├── components/           # Reusable React components
├── context/              # React context providers for state management
├── pages/                # Page components for different routes
├── services/             # Logic for API calls, etc.
├── src/                  # Source files for Tailwind CSS
├── dist/                 # Compiled Tailwind CSS output
│
├── index.html            # Main HTML entry point
├── index.tsx             # Main React application entry point
└── README.md             # This file
```

---

## 🚀 Local Setup Guide

Follow these steps to set up the project on your local machine.

### Prerequisites

- **Python 3.7+** and `pip`.
- **Node.js v16+** and `npm`.
- A free **[Supabase](https://supabase.com/) account** for the PostgreSQL database.
- A **[Google Gemini API Key](https://aistudio.google.com/app/apikey)**.
- A code editor like **[VS Code](https://code.visualstudio.com/)** with the Python extension.

### Step 1: Set Up Supabase Database

1.  **Create a New Project**: Go to [Supabase](https://supabase.com/), sign in, and create a new project.
2.  **Get the Connection String**:
    - In your project dashboard, navigate to **Project Settings** (the gear icon).
    - Go to the **Database** section.
    - Under **Connection string**, copy the **URI** string. It will look like `postgres://postgres:[YOUR-PASSWORD]@[...].supabase.co:5432/postgres`.
3.  **Create Database Tables**:
    - Navigate to the **SQL Editor** (the terminal icon) in your Supabase dashboard.
    - Click **+ New query**.
    - Copy the entire SQL script from the file below and paste it into the editor:
      - **[Click here to view the required SQL Schema](./olilab-backend/schema.sql)**
    - Click **RUN** to create all the necessary tables.

### Step 2: Backend Setup (`olilab-backend`)

1.  **Navigate to the backend directory:**
    ```bash
    cd olilab-backend
    ```
2.  **Create and activate a virtual environment:**
    - On macOS/Linux: `python3 -m venv venv && source venv/bin/activate`
    - On Windows: `python -m venv venv && .\venv\Scripts\activate`
3.  **Install Python packages:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Set up Environment Variables:**
    - In the `olilab-backend` directory, create a new file named `.env`.
    - Add your Supabase connection URI and your Gemini API key to this file:
      ```env
      # Replace with the URI you copied from Supabase
      DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@[...].supabase.co:5432/postgres

      # Replace with your key from Google AI Studio
      API_KEY=YOUR_GEMINI_API_KEY_HERE
      ```

### Step 3: Database Initialization

This one-time command will create your first admin user in the database.

1.  Make sure you are in the `olilab-backend` directory with your virtual environment activated.
2.  Run the Flask shell:
    ```bash
    flask shell
    ```
3.  You will be in a Python interpreter. Run the following commands one by one:
    ```python
    from app import init_db
    init_db()
    exit()
    ```
    This command creates a default admin user with the credentials you can use to log in for the first time.

### Step 4: Frontend Setup

1.  Navigate back to the project **root directory**.
2.  Install Tailwind CSS dependencies:
    ```bash
    npm install
    ```
---

## 🏃‍♀️ Running the Application

You need to run both the backend and frontend servers simultaneously in separate terminals.

1.  **Start the Backend Server**:
    - In a terminal at the `olilab-backend` directory (with `venv` active):
      ```bash
      flask run --host=0.0.0.0
      ```
    - The API will be running at `http://localhost:5000`.

2.  **Start the Frontend Server**:
    - In a **new terminal** at the project's **root directory**.
    - Run the Tailwind CSS watcher:
      ```bash
      npm run watch
      ```
    - In a **third terminal**, run the static file server:
      - Install `serve` globally if you haven't already: `npm install -g serve`
      - Start the server:
        ```bash
        serve
        ```
    - Your browser should open to the application (usually `http://localhost:3000`).

#### Default Login Credentials
The initialization script creates the following admin account:
- **Username**: `admin`
- **Password**: `password`

---

## 🔧 Editor Setup (VS Code)

If you see errors like `Import "flask" could not be resolved`, your editor isn't using the correct Python interpreter from your virtual environment. This project includes a `.vscode/settings.json` file to help VS Code find it automatically. If it fails, open the Command Palette (`Ctrl+Shift+P`), search for `Python: Select Interpreter`, and choose the one from your `olilab-backend/venv` directory.

---

## 🌐 Deployment Guide (Render & Netlify)

### Deploying the Backend to Render

1.  **Create a GitHub Repository**: Upload the contents of your `olilab-backend` folder to a new GitHub repository.
2.  **Create a Render Web Service**:
    - Sign up at [render.com](https://render.com/) and connect your GitHub.
    - Click **New > Web Service** and select your backend repository.
    - Use these settings:
      - **Runtime**: `Python 3`
      - **Build Command**: `pip install -r requirements.txt`
      - **Start Command**: `gunicorn "app:create_app()"`
3.  **Add Environment Variables**:
    - Under the **Environment** tab, add two secrets:
      - **Key**: `DATABASE_URL`, **Value**: *Your Supabase connection URI*.
      - **Key**: `API_KEY`, **Value**: *Your Gemini API key*.
4.  **Create & Deploy**: Click **Create Web Service**. Copy the live URL Render provides (e.g., `https://olilab-backend.onrender.com`).

### Deploying the Frontend to Netlify

1.  **Update the API URL**:
    - In your local project, open `services/apiService.ts`.
    - Change the `BASE_URL` to your live Render backend URL.
      ```typescript
      // Example:
      const BASE_URL = `https://olilab-backend.onrender.com/api`;
      ```
2.  **Deploy to Netlify**:
    - Go to [netlify.com](https://www.netlify.com/) and sign up.
    - Drag and drop your **entire frontend project folder** (the one with `index.html`) into the Netlify deploy area.
    - Your site will be live instantly.
