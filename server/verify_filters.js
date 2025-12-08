
const API_URL = 'http://localhost:5001/api/complaints';

async function verifyFilters() {
    console.log("Starting Filter Verification...");

    try {
        // 1. Test Priority Filter
        console.log("\n1. Testing Priority Filter (priority=high)...");
        const priorityRes = await fetch(`${API_URL}?priority=high`);
        if (!priorityRes.ok) {
            const text = await priorityRes.text();
            console.error(`Failed to fetch priority: ${priorityRes.status} ${text}`);
        } else {
            const priorityData = await priorityRes.json();
            console.log(`Fetched ${priorityData.length} complaints.`);
            const invalidPriority = priorityData.filter(c => c.priority !== 'high');
            if (invalidPriority.length > 0) {
                console.error("❌ FAILED: Found complaints with non-high priority:", invalidPriority.map(c => c.priority));
            } else {
                console.log("✅ PASSED: All complaints have priority 'high'.");
            }
        }

        // 2. Test State Filter
        console.log("\nFetching one complaint to check available states...");
        const allRes = await fetch(`${API_URL}?limit=5`);
        const allData = await allRes.json();
        const sampleState = allData.find(c => c.location?.stateName)?.location?.stateName;

        if (!sampleState) {
            console.log("⚠️ No complaints with stateName found to test state filter.");
        } else {
            console.log(`\n2. Testing State Filter (state=${sampleState})...`);
            const stateRes = await fetch(`${API_URL}?state=${encodeURIComponent(sampleState)}`);
            if (!stateRes.ok) {
                const text = await stateRes.text();
                console.error(`Failed to fetch state: ${stateRes.status} ${text}`);
                if (text.includes("FAILED_PRECONDITION")) {
                    console.log("💡 NOTE: This error usually means a Firestore Index is missing. Check server logs for the creation link.");
                }
            } else {
                const stateData = await stateRes.json();
                console.log(`Fetched ${stateData.length} complaints.`);
                const invalidState = stateData.filter(c => c.location?.stateName !== sampleState);
                if (invalidState.length > 0) {
                    console.error(`❌ FAILED: Found complaints with non-${sampleState} state:`, invalidState.map(c => c.location?.stateName));
                } else {
                    console.log(`✅ PASSED: All complaints have state '${sampleState}'.`);
                }
            }
        }

    } catch (error) {
        console.error("Verification failed with error:", error);
    }
}

verifyFilters();
