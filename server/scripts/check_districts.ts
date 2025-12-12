import { lookupAdminArea, loadGeoJSON } from '../src/utils/geoTagger';

// Coordinates for major cities
const cities = {
    "Delhi": { lat: 28.6139, lng: 77.2090 },
    "Mumbai": { lat: 19.0760, lng: 72.8777 },
    "Kolkata": { lat: 22.5726, lng: 88.3639 },
    "Bangalore": { lat: 12.9716, lng: 77.5946 },
    "Chennai": { lat: 13.0827, lng: 80.2707 },
    "Hyderabad": { lat: 17.3850, lng: 78.4867 },
    "Pune": { lat: 18.5204, lng: 73.8567 }
};

console.log("Loading GeoJSON...");
loadGeoJSON();

import * as fs from 'fs';

let output = "Checking Admin Areas:\n";
for (const [city, coords] of Object.entries(cities)) {
    const area = lookupAdminArea(coords.lat, coords.lng);
    output += `${city}:\n`;
    output += `  District: "${area.districtName}"\n`;
    output += `  State: "${area.stateName}"\n`;
}

fs.writeFileSync('districts_check.txt', output);
console.log("Output written to districts_check.txt");
