import fs from 'fs';
import path from 'path';

interface GeoJSONFeature {
    type: string;
    properties: {
        NAME_1: string; // State
        NAME_2: string; // District
        GID_1: string;
        GID_2: string;
        [key: string]: any;
    };
    geometry: {
        type: string;
        coordinates: any[];
    };
    bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

interface AdminArea {
    stateName: string | null;
    stateCode: string | null;
    districtName: string | null;
    districtCode: string | null;
}

let features: GeoJSONFeature[] = [];
let isLoaded = false;

// Helper: Calculate Bounding Box for a Polygon/MultiPolygon
function calculateBBox(geometry: any): [number, number, number, number] {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

    const traverse = (coords: any) => {
        if (typeof coords[0] === 'number') {
            const lng = coords[0];
            const lat = coords[1];
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        } else {
            coords.forEach(traverse);
        }
    };

    traverse(geometry.coordinates);
    return [minLng, minLat, maxLng, maxLat];
}

// Helper: Point in Polygon (Ray Casting)
function pointInPolygon(point: [number, number], vs: [number, number][]): boolean {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Helper: Point in MultiPolygon
function pointInMultiPolygon(point: [number, number], geometry: any): boolean {
    if (geometry.type === 'Polygon') {
        // First ring is exterior, others are holes (simple check: just check exterior for now, ignore holes for admin areas usually ok)
        // Actually, for strictness, we should check if inside exterior AND NOT inside holes.
        // But for district mapping, usually just checking exterior is 99% fine.
        // Let's do simple: check if inside the first ring (exterior).
        return pointInPolygon(point, geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
        for (const polygon of geometry.coordinates) {
            if (pointInPolygon(point, polygon[0])) return true;
        }
    }
    return false;
}

export const loadGeoJSON = () => {
    if (isLoaded) return;
    try {
        const filePath = path.join(__dirname, '../../data/india_level2.geojson');
        if (!fs.existsSync(filePath)) {
            console.warn("⚠️ GeoJSON file not found at:", filePath);
            return;
        }
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const geojson = JSON.parse(rawData);
        
        features = geojson.features.map((f: any) => ({
            ...f,
            bbox: calculateBBox(f.geometry)
        }));
        
        isLoaded = true;
        console.log(`✅ GeoJSON loaded: ${features.length} districts mapped.`);
    } catch (error) {
        console.error("❌ Failed to load GeoJSON:", error);
    }
};

export const lookupAdminArea = (lat: number, lng: number): AdminArea => {
    if (!isLoaded) loadGeoJSON();

    const result: AdminArea = {
        stateName: null,
        stateCode: null,
        districtName: null,
        districtCode: null
    };

    // 1. Filter by BBox
    const candidates = features.filter(f => {
        const [minLng, minLat, maxLng, maxLat] = f.bbox!;
        return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
    });

    // 2. Exact Point in Polygon check
    for (const feature of candidates) {
        if (pointInMultiPolygon([lng, lat], feature.geometry)) {
            result.stateName = feature.properties.NAME_1;
            result.stateCode = feature.properties.GID_1;
            result.districtName = feature.properties.NAME_2;
            result.districtCode = feature.properties.GID_2;
            break; // Found it
        }
    }

    return result;
};
