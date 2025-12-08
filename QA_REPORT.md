[
  {
    "id": 1,
    "feature": "Authentication with roles",
    "file": "contexts/AuthContext.tsx",
    "keywords": [
      "role",
      "official",
      "citizen"
    ],
    "status": "✔ PASS",
    "note": ""
  },
  {
    "id": 2,
    "feature": "Citizen complaint filing",
    "file": "pages/complaints/NewComplaintPage.tsx",
    "keywords": [
      "createComplaint",
      "location"
    ],
    "status": "✔ PASS",
    "note": ""
  },
  {
    "id": 3,
    "feature": "AI categorization + priority",
    "file": "ai.ts",
    "path": "d:\\CivcLink\\functions\\src",
    "keywords": [
      "analyzeComplaint",
      "HuggingFace",
      "priority"
    ],
    "status": "✔ PASS",
    "note": ""
  },
  {
    "id": 4,
    "feature": "AI summary generation",
    "file": "ai.ts",
    "path": "d:\\CivcLink\\functions\\src",
    "keywords": [
      "summary"
    ],
    "status": "✔ PASS",
    "note": ""
  },
  {
    "id": 5,
    "feature": "Location picker using OpenStreetMap",
    "file": "components/complaints/LocationPicker.tsx",
    "keywords": [
      "MapContainer",
      "TileLayer"
    ],
    "status": "✔ PASS",
    "note": ""
  },
  {
    "id": 6,
    "feature": "Reverse geocoding",
    "file": "components/complaints/LocationPicker.tsx",
    "keywords": [
      "nominatim"
    ],
    "status": "⚠️ PARTIAL",
    "note": "File exists but missing keywords: nominatim"
  },
  {
    "id": 7,
    "feature": "Attachments + Google Drive",
    "file": "services/complaintService.ts",
    "keywords": [
      "uploadAttachment",
      "driveService"
    ],
    "status": "⚠️ PARTIAL",
    "note": "File exists but missing keywords: driveService"
  },
  {
    "id": 8,
    "feature": "Citizen dashboard",
    "file": "pages/dashboard/CitizenDashboard.tsx",
    "keywords": [
      "getUserComplaints"
    ],
    "status": "✔ PASS",
    "note": ""
  },
  {
    "id": 9,
    "feature": "Complaint status timeline",
    "file": "pages/complaints/ComplaintDetailPage.tsx",
    "keywords": [
      "Timeline",
      "status"
    ],
    "status": "✔ PASS",
    "note": ""
  },
  {
    "id": 10,
    "feature": "Admin dashboard",
    "file": "pages/dashboard/AdminDashboard.tsx",
    "keywords": [
      "getAllComplaints",
      "updateComplaint"
    ],
    "status": "✔ PASS",
    "note": ""
  },
  {
    "id": 11,
    "feature": "Heatmap visualization",
    "file": "pages/public/PublicDashboard.tsx",
    "keywords": [
      "MapContainer",
      "CircleMarker"
    ],
    "status": "✔ PASS",
    "note": ""
  },
  {
    "id": 12,
    "feature": "Real-time Firestore updates",
    "file": "services/complaintService.ts",
    "keywords": [
      "onSnapshot"
    ],
    "status": "✔ PASS",
    "note": ""
  },
  {
    "id": 13,
    "feature": "Email notifications",
    "file": "index.ts",
    "path": "d:\\CivcLink\\functions\\src",
    "keywords": [
      "sendEmail"
    ],
    "status": "✔ PASS",
    "note": ""
  },
  {
    "id": 14,
    "feature": "In-app notifications",
    "file": "index.ts",
    "path": "d:\\CivcLink\\functions\\src",
    "keywords": [
      "fcmToken"
    ],
    "status": "✔ PASS",
    "note": ""
  },
  {
    "id": 15,
    "feature": "FCM push notifications",
    "file": "index.ts",
    "path": "d:\\CivcLink\\functions\\src",
    "keywords": [
      "admin.messaging().send"
    ],
    "status": "✔ PASS",
    "note": ""
  },
  {
    "id": 16,
    "feature": "Multilingual UI",
    "file": "i18n.ts",
    "keywords": [
      "i18n",
      "init"
    ],
    "status": "✔ PASS",
    "note": ""
  },
  {
    "id": 17,
    "feature": "Accessibility features",
    "file": "index.css",
    "keywords": [
      "@media",
      "prefers-reduced-motion"
    ],
    "status": "⚠️ PARTIAL",
    "note": "File exists but missing keywords: @media, prefers-reduced-motion"
  },
  {
    "id": 18,
    "feature": "Analytics dashboard",
    "file": "pages/dashboard/AdminDashboard.tsx",
    "keywords": [
      "recharts",
      "BarChart"
    ],
    "status": "⚠️ PARTIAL",
    "note": "File exists but missing keywords: recharts, BarChart"
  },
  {
    "id": 19,
    "feature": "Offline/PWA support",
    "file": "main.tsx",
    "keywords": [
      "vite-plugin-pwa"
    ],
    "status": "⚠️ PARTIAL",
    "note": "File exists but missing keywords: vite-plugin-pwa"
  },
  {
    "id": 20,
    "feature": "India-specific features",
    "file": "pages/complaints/NewComplaintPage.tsx",
    "keywords": [
      "pincode"
    ],
    "status": "⚠️ PARTIAL",
    "note": "File exists but missing keywords: pincode"
  }
]