"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: 'server/.env' });
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require('../service-account.json')),
        projectId: process.env.FIREBASE_PROJECT_ID || 'civiclink-61370'
    });
}
const db = admin.firestore();
const auth = admin.auth();
function createOfficial() {
    return __awaiter(this, void 0, void 0, function* () {
        const email = 'official_test_v2@test.com';
        const password = 'password123';
        try {
            // 1. Create Auth User
            let uid;
            try {
                const userRecord = yield auth.getUserByEmail(email);
                uid = userRecord.uid;
                console.log(`User ${email} already exists with UID: ${uid}`);
            }
            catch (error) {
                const userRecord = yield auth.createUser({
                    email,
                    password,
                    displayName: 'Test Official'
                });
                uid = userRecord.uid;
                console.log(`Created new user ${email} with UID: ${uid}`);
            }
            // 2. Create/Update Firestore User Document
            yield db.collection('users').doc(uid).set({
                uid,
                email,
                displayName: 'Test Official',
                role: 'official',
                department: 'Roads',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log(`Successfully set role 'official' for ${email}`);
        }
        catch (error) {
            console.error('Error creating official:', error);
        }
    });
}
createOfficial();
