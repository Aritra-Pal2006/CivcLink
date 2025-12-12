
export interface AIResult {
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    summary: string;
    meta?: any;
}

export interface AIImageComparisonResult {
    similarityScore: number;
    verdict: 'LIKELY_MATCH' | 'UNCERTAIN' | 'LIKELY_FAKE' | 'VERIFIED' | 'REJECTED';
    reason: string;
}

export interface AIProvider {
    name: string;
    classify(title: string, description: string): Promise<AIResult>;
    compareImages(originalUrl: string, resolutionUrl: string): Promise<AIImageComparisonResult>;
}
