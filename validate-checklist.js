const fs = require('fs');
const path = require('path');

const projectRoot = 'd:/CivcLink';
const frontendPath = path.join(projectRoot, 'frontend/src');
const functionsPath = path.join(projectRoot, 'functions/src');

const checklist = [
    { id: 1, feature: "Authentication with roles", file: "contexts/AuthContext.tsx", keywords: ["role", "official", "citizen"] },
    { id: 2, feature: "Citizen complaint filing", file: "pages/complaints/NewComplaintPage.tsx", keywords: ["createComplaint", "location"] },
    { id: 3, feature: "AI categorization + priority", file: "ai.ts", path: functionsPath, keywords: ["analyzeComplaint", "HuggingFace", "priority"] },
    { id: 4, feature: "AI summary generation", file: "ai.ts", path: functionsPath, keywords: ["summary"] },
    { id: 5, feature: "Location picker using OpenStreetMap", file: "components/complaints/LocationPicker.tsx", keywords: ["MapContainer", "TileLayer"] },
    { id: 6, feature: "Reverse geocoding", file: "components/complaints/LocationPicker.tsx", keywords: ["nominatim"] },
    { id: 7, feature: "Attachments + Google Drive", file: "services/complaintService.ts", keywords: ["uploadAttachment", "driveService"] },
    { id: 8, feature: "Citizen dashboard", file: "pages/dashboard/CitizenDashboard.tsx", keywords: ["getUserComplaints"] },
    { id: 9, feature: "Complaint status timeline", file: "pages/complaints/ComplaintDetailPage.tsx", keywords: ["Timeline", "status"] },
    { id: 10, feature: "Admin dashboard", file: "pages/dashboard/AdminDashboard.tsx", keywords: ["getAllComplaints", "updateComplaint"] },
    { id: 11, feature: "Heatmap visualization", file: "pages/public/PublicDashboard.tsx", keywords: ["MapContainer", "CircleMarker"] },
    { id: 12, feature: "Real-time Firestore updates", file: "services/complaintService.ts", keywords: ["onSnapshot"] },
    { id: 13, feature: "Email notifications", file: "index.ts", path: functionsPath, keywords: ["sendEmail"] },
    { id: 14, feature: "In-app notifications", file: "index.ts", path: functionsPath, keywords: ["fcmToken"] }, // Checking FCM as proxy for notifications
    { id: 15, feature: "FCM push notifications", file: "index.ts", path: functionsPath, keywords: ["admin.messaging().send"] },
    { id: 16, feature: "Multilingual UI", file: "i18n.ts", keywords: ["i18n", "init"] },
    { id: 17, feature: "Accessibility features", file: "index.css", keywords: ["@media", "prefers-reduced-motion"] }, // Basic check
    { id: 18, feature: "Analytics dashboard", file: "pages/dashboard/AdminDashboard.tsx", keywords: ["recharts", "BarChart"] }, // Admin dashboard has stats
    { id: 19, feature: "Offline/PWA support", file: "main.tsx", keywords: ["vite-plugin-pwa"] }, // Check if PWA is set up (might fail if not explicitly added)
    { id: 20, feature: "India-specific features", file: "pages/complaints/NewComplaintPage.tsx", keywords: ["pincode"] } // Check for pincode logic
];

console.log("Starting Checklist Validation...");
console.log("================================");

let passed = 0;
let failed = 0;
const report = [];

checklist.forEach(item => {
    const basePath = item.path || frontendPath;
    const filePath = path.join(basePath, item.file);

    let status = "❌ MISSING";
    let note = "";

    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const hasKeywords = item.keywords.every(k => content.includes(k));

        if (hasKeywords) {
            status = "✔ PASS";
            passed++;
        } else {
            status = "⚠️ PARTIAL";
            note = `File exists but missing keywords: ${item.keywords.filter(k => !content.includes(k)).join(", ")}`;
            failed++; // Count partial as failed for strictness
        }
    } else {
        note = `File not found: ${item.file}`;
        failed++;
    }

    console.log(`${item.id}. ${item.feature}: ${status} ${note ? `(${note})` : ''}`);
    report.push({ ...item, status, note });
});

console.log("================================");
console.log(`Total: ${checklist.length}, Passed: ${passed}, Failed: ${failed}`);

// Write report to file
fs.writeFileSync(path.join(projectRoot, 'QA_REPORT.md'), JSON.stringify(report, null, 2));
