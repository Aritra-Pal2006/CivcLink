# CivicLink: AI-Powered Grievance Redressal Platform

**Local Development Guide (No Blaze Plan Required)**

This project uses a **Local Express Server** for backend logic (AI, Email, Geocoding) and **Firebase** only for Auth, Firestore, and Storage. This architecture allows full local development without the Firebase Emulator Suite or the paid Blaze plan.

## 🚀 Quick Start

For a detailed, step-by-step setup guide, please read [INSTALL.md](./INSTALL.md).

### Prerequisites
1.  **Node.js** (v18+)
2.  **Firebase Project**: Create one at [console.firebase.google.com](https://console.firebase.google.com/). Enable **Auth**, **Firestore**, and **Storage**.

### Setup

1.  **Clone & Install**:
    ```bash
    npm install
    cd frontend && npm install
    cd ../server && npm install
    ```

2.  **Configure Frontend**:
    - Copy `frontend/.env.example` to `frontend/.env`.
    - Fill in your Firebase Project config (API Key, etc.).
    - Ensure `VITE_API_BASE_URL=http://localhost:5000/api`.

3.  **Configure Server**:
    - Copy `server/.env.example` to `server/.env`.
    - **Firebase Admin**: Generate a new Private Key from Project Settings -> Service Accounts. Save the JSON file as `service-account.json` in the root directory.
    - Update `FIREBASE_ADMIN_SDK_PATH=../../service-account.json`.
    - Fill in other keys (AI, SMTP, etc.).

4.  **Run Locally**:
    Run the following command in the root directory:
    ```bash
    npm run dev
    ```
    This starts:
    - **Frontend**: http://localhost:5173
    - **Local Server**: http://localhost:5000

## 🛠️ Architecture

| Feature | Implementation |
| :--- | :--- |
| **Frontend** | React + Vite + Tailwind |
| **Backend Logic** | Local Express Server (`/server`) |
| **Database** | Firebase Firestore (Live) |
| **Auth** | Firebase Auth (Live) |
| **AI** | Proxy via Local Server (Gemini/HuggingFace) |
| **Geocoding** | Proxy via Local Server (Nominatim) |

## 🧪 Testing Features

### AI Classification
1.  Go to "New Complaint".
2.  Fill in Title and Description.
3.  Click **"Ask AI"**.
4.  The frontend calls `POST http://localhost:5000/api/ai/classify`.

### Geocoding
1.  Go to "New Complaint" -> Step 2 (Location).
2.  Click on the map.
3.  The frontend calls `GET http://localhost:5000/api/geocode/reverse`.

### India Features (GeoJSON & WhatsApp)
1.  **GeoJSON Setup**:
    -   Ensure `gadm41_IND_2.json` is placed in `server/data/india_level2.geojson`.
    -   This enables auto-tagging of State and District for complaints within India.

2.  **WhatsApp Integration (Twilio)**:
    -   Configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_NUMBER` in `server/.env`.
    -   **Webhook**: Set your Twilio Sandbox "When a message comes in" URL to `http://<your-ngrok-url>/api/webhooks/whatsapp/twilio`.
    -   **Testing**: Send a message with location to the Twilio Sandbox number to create a complaint.

## ⚠️ Troubleshooting

### "Blocked request" (CORS/Auth)
If you see CORS errors or blocked requests:
1.  Ensure `VITE_API_BASE_URL` matches your server port.
2.  For OAuth (Google Drive), add `http://localhost:5000` to authorized domains if needed.

### "Firebase Admin Error"
If the server fails to start with auth errors:
1.  Check `service-account.json` path in `server/.env`.
2.  Ensure the service account has permissions.

## 📂 Project Structure

-   `frontend/`: React App.
-   `server/`: Express API.
    -   `src/routes/`: API endpoints (ai, geocode, email).
    -   `src/middleware/`: Auth verification.
-   `service-account.json`: **SECRET** (Do not commit).
