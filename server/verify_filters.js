"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const API_URL = 'http://localhost:5000/api/complaints';
function verifyFilters() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        console.log("Starting Filter Verification...");
        try {
            // 1. Test Priority Filter
            console.log("\n1. Testing Priority Filter (priority=high)...");
            const priorityRes = yield (0, node_fetch_1.default)(`${API_URL}?priority=high`);
            if (!priorityRes.ok) {
                const text = yield priorityRes.text();
                console.error(`Failed to fetch priority: ${priorityRes.status} ${text}`);
            }
            else {
                const priorityData = yield priorityRes.json();
                console.log(`Fetched ${priorityData.length} complaints.`);
                const invalidPriority = priorityData.filter((c) => c.priority !== 'high');
                if (invalidPriority.length > 0) {
                    console.error("❌ FAILED: Found complaints with non-high priority:", invalidPriority.map((c) => c.priority));
                }
                else {
                    console.log("✅ PASSED: All complaints have priority 'high'.");
                }
            }
            // 2. Test State Filter
            // We need a state that likely exists. Let's try "Maharashtra" or "Delhi" or just fetch all first to see what exists.
            console.log("\nFetching one complaint to check available states...");
            const allRes = yield (0, node_fetch_1.default)(`${API_URL}?limit=5`);
            const allData = yield allRes.json();
            const sampleState = (_b = (_a = allData.find((c) => { var _a; return (_a = c.location) === null || _a === void 0 ? void 0 : _a.stateName; })) === null || _a === void 0 ? void 0 : _a.location) === null || _b === void 0 ? void 0 : _b.stateName;
            if (!sampleState) {
                console.log("⚠️ No complaints with stateName found to test state filter.");
            }
            else {
                console.log(`\n2. Testing State Filter (state=${sampleState})...`);
                const stateRes = yield (0, node_fetch_1.default)(`${API_URL}?state=${encodeURIComponent(sampleState)}`);
                if (!stateRes.ok) {
                    const text = yield stateRes.text();
                    console.error(`Failed to fetch state: ${stateRes.status} ${text}`);
                    if (text.includes("FAILED_PRECONDITION")) {
                        console.log("💡 NOTE: This error usually means a Firestore Index is missing. Check server logs for the creation link.");
                    }
                }
                else {
                    const stateData = yield stateRes.json();
                    console.log(`Fetched ${stateData.length} complaints.`);
                    const invalidState = stateData.filter((c) => { var _a; return ((_a = c.location) === null || _a === void 0 ? void 0 : _a.stateName) !== sampleState; });
                    if (invalidState.length > 0) {
                        console.error(`❌ FAILED: Found complaints with non-${sampleState} state:`, invalidState.map((c) => { var _a; return (_a = c.location) === null || _a === void 0 ? void 0 : _a.stateName; }));
                    }
                    else {
                        console.log(`✅ PASSED: All complaints have state '${sampleState}'.`);
                    }
                }
            }
        }
        catch (error) {
            console.error("Verification failed with error:", error);
        }
    });
}
verifyFilters();
