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

## 3. Configuration

**⚠️ TEAM NOTE**: This repository includes the necessary `.env` files and `service-account.json` for the team. **DO NOT share this repository publicly**, or these credentials will be compromised.

## 4. Backend Setup (Server)

1.  **Navigate to Server Directory**:
    ```bash
    cd server
    ```

2.  **Start the Server**:
    ```bash
    npm run dev
    ```
    You should see: `Server running on port 5000`.

## 5. Frontend Setup

1.  **Navigate to Frontend Directory**:
    ```bash
    cd frontend
    ```

2.  **Start the Frontend**:
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
