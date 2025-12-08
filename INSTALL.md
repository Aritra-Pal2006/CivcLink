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
## 6. Optional: WhatsApp Integration (Twilio)

To enable citizens to file complaints via WhatsApp:

1.  **Twilio Setup**:
    *   Sign up for [Twilio](https://www.twilio.com/).
    *   Get your **Account SID** and **Auth Token**.
    *   Join the **WhatsApp Sandbox** (Messaging -> Try it out -> Send a WhatsApp message).
    *   Note the Sandbox Number (e.g., `+14155238886`).

2.  **Configure Server**:
    *   In `server/.env`, set:
        ```env
        TWILIO_ACCOUNT_SID=your_sid
        TWILIO_AUTH_TOKEN=your_token
        TWILIO_WHATSAPP_NUMBER=your_sandbox_number
        ENABLE_WHATSAPP_INTAKE=true
        ENABLE_WHATSAPP_NOTIFICATIONS=true
        ```

3.  **Expose Local Server**:
    *   Since Twilio needs to reach your local server, use **ngrok**:
        ```bash
        npx ngrok http 5000
        ```
    *   Copy the HTTPS URL (e.g., `https://abc1-23-45-67-89.ngrok-free.app`).

4.  **Configure Webhook**:
    *   In Twilio Console (Sandbox Settings), set the **"When a message comes in"** URL to:
        `YOUR_NGROK_URL/api/webhooks/whatsapp/twilio`
    *   Method: `POST`.

5.  **Verify**:
    *   Send a message (e.g., "Broken streetlight") to the Sandbox Number from your WhatsApp.
    *   You should receive an automated reply: "Thanks! Your complaint has been registered...".
    *   Check the app dashboard; the complaint should appear there.
