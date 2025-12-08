import axios from 'axios';

export const analyzeFraud = async (
    imageUrl: string,
    imageNote: string,
    complaintCategory: string,
    complaintDescription: string
): Promise<{ possibleFraud: boolean; reason?: string; confidence?: number }> => {
    const apiKey = process.env.AI_API_KEY;
    const apiBaseUrl = process.env.AI_API_BASE_URL;

    if (!apiKey || !apiBaseUrl) {
        console.warn("AI Configuration missing, skipping fraud check.");
        return { possibleFraud: false };
    }

    try {
        const prompt = `
        Analyze the following evidence for a citizen complaint resolution to detect potential fraud or mismatch.
        
        Complaint Context:
        - Category: ${complaintCategory}
        - Description: ${complaintDescription}
        
        Evidence Provided by Official:
        - Image URL: ${imageUrl} (Note: I cannot see the image directly, but assume the image content matches the note description for this exercise, or if you have multimodal capabilities, analyze the image at this URL if possible. For this text-only prompt, rely on the note and logical consistency).
        - Official's Note: ${imageNote}

        Task:
        Determine if the official's note and the context logically align. 
        If the note contradicts the category (e.g., "Pothole fixed" for a "Streetlight" complaint) or seems irrelevant, flag it.
        
        Response JSON:
        {
            "possibleFraud": boolean,
            "reason": "short explanation",
            "confidence": number (0-1)
        }
        `;

        // Note: Gemini API with text-only model might not actually see the image URL content unless using a multimodal model and passing image bytes. 
        // For this implementation, we are simulating the "image analysis" part or relying on the text description consistency.
        // If using a multimodal model (Gemini Pro Vision), we would pass the image data. 
        // For this snippet, we'll stick to text-based consistency check as a proxy, or assume the API can handle the URL if supported.

        const response = await axios.post(
            `${apiBaseUrl}?key=${apiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }]
            },
            { timeout: 10000 }
        );

        const text = response.data.candidates[0].content.parts[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return { possibleFraud: false };

    } catch (error) {
        console.error("AI Fraud Analysis Error:", error);
        return { possibleFraud: false };
    }
};
