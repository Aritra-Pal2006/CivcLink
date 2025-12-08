# Installation & Setup Guide

This guide provides step-by-step instructions to set up and run the **CivicLink** application locally.

## 1. Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** (v18 or higher): [Download Here](https://nodejs.org/)
*   **Git**: [Download Here](https://git-scm.com/)
*   **Firebase Account**: You need a Google account to use [Firebase Console](https://console.firebase.google.com/).

## 2. Repository Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd CivcLink
    ```

2.  **Install Dependencies**:
    You need to install dependencies for both the root, frontend, and server directories.

    ```bash
    # Root dependencies (if any)
    npm install

    # Frontend dependencies
    cd frontend
    npm install

    # Server dependencies
    cd ../server
    npm install
    
    # Return to root
    cd ..
    ```

## 3. Firebase Configuration

1.  **Create a Project**: Go to [Firebase Console](https://console.firebase.google.com/) and create a new project (e.g., `civiclink-dev`).
2.  **Enable Authentication**:
    *   Go to **Build** -> **Authentication**.
    *   Click **Get Started**.
    *   Enable **Email/Password** and **Google** sign-in providers.
3.  **Enable Firestore Database**:
    *   Go to **Build** -> **Firestore Database**.
    *   Click **Create Database**.
    *   Start in **Test Mode** (for development).
    *   Choose a location (e.g., `asia-south1` or `us-central1`).
4.  **Enable Storage**:
    *   Go to **Build** -> **Storage**.
    *   Click **Get Started**.
    *   Start in **Test Mode**.
5.  **Get Project Config**:
    *   Go to **Project Settings** (gear icon).
    *   Scroll down to **Your apps**.
    *   Click the **Web** icon (`</>`).
    *   Register the app (e.g., "CivicLink Web").
    *   Copy the `firebaseConfig` object values. You will need these for the frontend `.env`.

## 4. Backend Setup (Server)

The backend is a local Express server that handles AI, Email, and Geocoding.

1.  **Navigate to Server Directory**:
    ```bash
    cd server
    ```

2.  **Configure Environment Variables**:
    *   Copy `.env.example` to `.env`:
        ```bash
        cp .env.example .env
        # OR on Windows Command Prompt:
        copy .env.example .env
        ```
    *   Open `.env` and fill in the required values:
        *   `PORT`: `5000` (default)
        *   `GEMINI_API_KEY`: Get an API key from [Google AI Studio](https://aistudio.google.com/).
        *   `SMTP_*`: Configure your email provider (e.g., Gmail App Password) for sending emails.
        *   `TWILIO_*`: (Optional) For WhatsApp integration.

3.  **Firebase Admin SDK Setup**:
    *   In Firebase Console, go to **Project Settings** -> **Service Accounts**.
    *   Click **Generate new private key**.
    *   Save the downloaded JSON file as `service-account.json` in the **root** of the project (parent of `server/`).
    *   In `server/.env`, ensure `FIREBASE_ADMIN_SDK_PATH` points to it (e.g., `../../service-account.json`).

4.  **Start the Server**:
    ```bash
    npm run dev
    ```
    You should see: `Server running on port 5000`.

## 5. Frontend Setup

1.  **Navigate to Frontend Directory**:
    ```bash
    cd frontend
    ```

2.  **Configure Environment Variables**:
    *   Copy `.env.example` to `.env`:
        ```bash
        cp .env.example .env
        # OR on Windows Command Prompt:
        copy .env.example .env
        ```
    *   Open `.env` and fill in your Firebase config from Step 3.5:
        ```env
        VITE_FIREBASE_API_KEY=...
        VITE_FIREBASE_AUTH_DOMAIN=...
        VITE_FIREBASE_PROJECT_ID=...
        VITE_FIREBASE_STORAGE_BUCKET=...
        VITE_FIREBASE_MESSAGING_SENDER_ID=...
        VITE_FIREBASE_APP_ID=...
        
        VITE_API_BASE_URL=http://localhost:5000/api
        ```

3.  **Start the Frontend**:
    ```bash
    npm run dev
    ```
    The app will open at `http://localhost:5173`.

## 6. Verification

1.  Open `http://localhost:5173` in your browser.
2.  **Sign Up**: Create a new account.
3.  **Test AI**: Go to "New Complaint", enter a title/description, and click "Ask AI". It should auto-fill the category.
4.  **Test Geocoding**: Click on the map in the location step. It should fetch the address.

## Troubleshooting

*   **CORS Errors**: Ensure `VITE_API_BASE_URL` in frontend `.env` matches the server port.
*   **Firebase Errors**: Check that your `.env` keys are correct and Firestore/Storage rules allow access (Test Mode).
*   **Server Crash**: Check `service-account.json` path and validity.
