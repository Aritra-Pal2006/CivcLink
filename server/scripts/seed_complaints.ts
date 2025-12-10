import * as admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH || '../service-account.json';
const serviceAccount = require(path.resolve(__dirname, serviceAccountPath));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const CATEGORIES = ['Roads', 'Water', 'Electricity', 'Waste', 'Public Safety', 'General'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['submitted', 'in_progress', 'resolved', 'rejected', 'flagged'];
const WARDS = ['W01', 'W02', 'W03', 'W04', 'W05'];

// Bangalore Center
const BASE_LAT = 12.9716;
const BASE_LNG = 77.5946;

const TITLES = [
    "Pothole on Main Street",
    "Streetlight not working",
    "Garbage pileup near park",
    "Water pipe leakage",
    "Illegal parking blocking road",
    "Stray dog menace",
    "Drainage overflow",
    "Low voltage fluctuation",
    "Broken footpath tiles",
    "Dead animal removal request"
];

const DESCRIPTIONS = [
    "It has been there for weeks and causing traffic jams.",
    "Complete darkness in the area, very unsafe at night.",
    "Smell is unbearable, please clear it immediately.",
    "Wasting a lot of clean water, urgent fix needed.",
    "Cars are parked on the sidewalk, pedestrians cannot walk.",
    "Aggressive dogs chasing bikers.",
    "Sewage water entering the street.",
    "Electronic appliances are getting damaged.",
    "Senior citizens are tripping and falling.",
    "Needs immediate sanitation crew."
];

const getRandomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

const getRandomLocation = () => {
    // Random offset within ~5km
    const latOffset = (Math.random() - 0.5) * 0.05;
    const lngOffset = (Math.random() - 0.5) * 0.05;
    return {
        lat: BASE_LAT + latOffset,
        lng: BASE_LNG + lngOffset,
        address: "Mock Address, Bangalore",
        wardCode: getRandomItem(WARDS),
        city: "Bangalore",
        district: "Bangalore Urban",
        state: "Karnataka"
    };
};

const seedComplaints = async () => {
    console.log("🌱 Starting seed process...");

    const batchSize = 50;
    const batch = db.batch();

    for (let i = 0; i < 50; i++) {
        const ref = db.collection('complaints').doc();

        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30)); // Random date in last 30 days

        const status = getRandomItem(STATUSES);
        const category = getRandomItem(CATEGORIES);
        const priority = getRandomItem(PRIORITIES);

        // Logic to make data look realistic
        let isEscalated = false;
        if (status === 'flagged' || priority === 'critical') {
            isEscalated = Math.random() > 0.7;
        }

        const complaint = {
            userId: 'seed_user',
            title: getRandomItem(TITLES),
            description: getRandomItem(DESCRIPTIONS),
            category,
            priority,
            status,
            location: getRandomLocation(),
            createdAt: admin.firestore.Timestamp.fromDate(createdAt),
            updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
            isEscalated,
            fraudScore: Math.floor(Math.random() * 100),
            source: Math.random() > 0.8 ? 'whatsapp' : 'app',
            aiSummary: "Auto-generated summary for seed data.",
            upvotes: Math.floor(Math.random() * 20),
            verification: {
                needsCommunityVote: status === 'resolved' && Math.random() > 0.5
            }
        };

        batch.set(ref, complaint);
    }

    await batch.commit();
    console.log(`✅ Successfully seeded 50 complaints.`);
};

seedComplaints().catch(console.error);
