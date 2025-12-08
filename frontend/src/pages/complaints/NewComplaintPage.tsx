import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { LocationPicker } from '../../components/complaints/LocationPicker';
import { createComplaint } from '../../services/complaintService';
import { useAuth } from '../../contexts/AuthContext';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

const complaintSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    description: z.string().min(20, "Description must be at least 20 characters"),
    category: z.string().optional(),
});

type ComplaintFormInputs = z.infer<typeof complaintSchema>;

export const NewComplaintPage: React.FC = () => {
    const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<ComplaintFormInputs>({
        resolver: zodResolver(complaintSchema)
    });
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<ComplaintFormInputs | null>(null);
    const [attachment, setAttachment] = useState<File | null>(null);

    // Watch form inputs for changes
    const formValues = watch();

    // Load draft from localStorage on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem('complaintDraft');
        if (savedDraft) {
            try {
                const { step: savedStep, location: savedLocation, formData: savedFormData, formValues: savedFormValues } = JSON.parse(savedDraft);
                if (savedStep) setStep(savedStep);
                if (savedLocation) setLocation(savedLocation);
                if (savedFormData) setFormData(savedFormData);
                if (savedFormValues) reset(savedFormValues);
            } catch (e) {
                console.error("Failed to parse draft", e);
            }
        }
    }, [reset]);

    // Save draft to localStorage on changes
    useEffect(() => {
        const draft = {
            step,
            location,
            formData, // Confirmed data from step 1
            formValues // Current values in inputs
        };
        localStorage.setItem('complaintDraft', JSON.stringify(draft));
    }, [step, location, formData, formValues]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachment(e.target.files[0]);
        }
    };

    const onStep1Submit = (data: ComplaintFormInputs) => {
        setFormData(data);
        setStep(2);
    };

    const handleLocationSelect = (lat: number, lng: number, address: string) => {
        console.log("Location selected:", lat, lng, address);
        setLocation({ lat, lng, address });
    };

    const handleNextStep = () => {
        console.log("Attempting to go to step 3. Location:", location);
        if (location) {
            setStep(3);
        } else {
            console.warn("Location is missing!");
        }
    };

    const onFinalSubmit = async () => {
        if (!formData || !location || !currentUser) return;

        setLoading(true);
        try {
            let uploadedAttachments = [];
            if (attachment) {
                const { uploadComplaintAttachment } = await import('../../services/complaintService');
                const result = await uploadComplaintAttachment(attachment);
                uploadedAttachments.push({
                    fileId: result.fileId,
                    webViewLink: result.webViewLink,
                    thumbnailLink: result.thumbnailLink,
                    name: attachment.name
                });
            }

            let aiResult = {
                category: formData.category || 'General',
                priority: 'medium' as 'low' | 'medium' | 'high',
                aiSummary: ''
            };

            // Automatic AI Analysis
            try {
                const token = await currentUser.getIdToken();
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/ai/classify`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: formData.title,
                        description: formData.description
                    })
                });
                const data = await res.json();
                if (data.category) {
                    aiResult.category = formData.category || data.category; // User override wins if set
                    aiResult.priority = data.priority || 'medium';
                    aiResult.aiSummary = data.summary || '';
                }
            } catch (error) {
                console.error("AI Auto-Analysis failed", error);
                aiResult.aiSummary = "AI Analysis Unavailable";
            }
            console.log("AI Result:", aiResult); // Debug log

            const complaintId = await createComplaint({
                userId: currentUser.uid,
                title: formData.title,
                description: formData.description,
                category: aiResult.category,
                priority: aiResult.priority,
                aiSummary: aiResult.aiSummary,
                location: location,
                attachments: uploadedAttachments
            });

            // Clear draft after successful submission
            localStorage.removeItem('complaintDraft');

            navigate(`/complaints/${complaintId}`);
        } catch (error) {
            console.error("Failed to submit complaint", error);
            alert("Failed to submit complaint. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white drop-shadow-md">File a New Complaint</h1>
                <p className="mt-1 text-sm text-primary-100">
                    Please provide details about the issue. AI will help categorize and route it.
                </p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
                <div className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${step >= 1 ? 'bg-primary-600 border-primary-600 text-white' : 'bg-transparent border-white/30 text-white/50'}`}>1</div>
                    <div className={`flex-1 h-1 mx-2 rounded-full ${step >= 2 ? 'bg-primary-600' : 'bg-white/20'}`}></div>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${step >= 2 ? 'bg-primary-600 border-primary-600 text-white' : 'bg-transparent border-white/30 text-white/50'}`}>2</div>
                    <div className={`flex-1 h-1 mx-2 rounded-full ${step >= 3 ? 'bg-primary-600' : 'bg-white/20'}`}></div>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${step >= 3 ? 'bg-primary-600 border-primary-600 text-white' : 'bg-transparent border-white/30 text-white/50'}`}>3</div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-primary-200">
                    <span>Details</span>
                    <span>Location</span>
                    <span>Review</span>
                </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md shadow-xl rounded-lg p-6 border border-white/20">
                {step === 1 && (
                    <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-6">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-white">Title</label>
                            <input
                                type="text"
                                id="title"
                                className="mt-1 block w-full bg-black/20 border border-white/20 rounded-md shadow-sm py-2 px-3 text-white placeholder-white/40 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                placeholder="e.g., Pothole on Main Street"
                                {...register("title")}
                            />
                            {errors.title && <p className="mt-2 text-sm text-red-300">{errors.title.message}</p>}
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-white">Description</label>
                            <textarea
                                id="description"
                                rows={4}
                                className="mt-1 block w-full bg-black/20 border border-white/20 rounded-md shadow-sm py-2 px-3 text-white placeholder-white/40 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                placeholder="Describe the issue in detail..."
                                {...register("description")}
                            />
                            {errors.description && <p className="mt-2 text-sm text-red-300">{errors.description.message}</p>}
                        </div>

                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-white">Category (Optional)</label>
                            <select
                                id="category"
                                className="mt-1 block w-full bg-black/20 border border-white/20 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                {...register("category")}
                            >
                                <option value="" className="text-gray-900">Let AI decide</option>
                                <option value="Roads" className="text-gray-900">Roads</option>
                                <option value="Water" className="text-gray-900">Water</option>
                                <option value="Electricity" className="text-gray-900">Electricity</option>
                                <option value="Sanitation" className="text-gray-900">Sanitation</option>
                                <option value="Public Safety" className="text-gray-900">Public Safety</option>
                            </select>
                            <p className="mt-1 text-xs text-primary-200">
                                If you leave this blank, our AI will automatically categorize it for you.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white">Attachment (Optional)</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-white/20 border-dashed rounded-md hover:bg-white/5 transition-colors">
                                <div className="space-y-1 text-center">
                                    <svg
                                        className="mx-auto h-12 w-12 text-primary-200"
                                        stroke="currentColor"
                                        fill="none"
                                        viewBox="0 0 48 48"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    <div className="flex text-sm text-primary-100">
                                        <label
                                            htmlFor="file-upload"
                                            className="relative cursor-pointer rounded-md font-medium text-primary-300 hover:text-white focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                                        >
                                            <span>Upload a file</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-primary-200">PNG, JPG, GIF up to 5MB</p>
                                    {attachment && (
                                        <div className="mt-2 flex items-center justify-center space-x-2">
                                            <span className="text-sm text-green-300">Selected: {attachment.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAttachment(null);
                                                    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                                                    if (fileInput) fileInput.value = '';
                                                }}
                                                className="text-xs text-red-300 hover:text-red-100 underline"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-900 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-white">Pin the location</h3>
                        <p className="text-sm text-primary-100">Click on the map to pinpoint the exact location of the issue.</p>

                        <div className="rounded-lg overflow-hidden border border-white/20">
                            <LocationPicker onLocationSelect={handleLocationSelect} />
                        </div>

                        <div className="flex justify-between pt-4">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="inline-flex items-center px-4 py-2 border border-white/20 shadow-sm text-sm font-medium rounded-md text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </button>
                            <button
                                type="button"
                                onClick={handleNextStep}
                                disabled={!location}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-900 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && formData && location && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-white">Review & Submit</h3>

                        <div className="bg-white/5 border border-white/10 p-4 rounded-md space-y-3">
                            <div>
                                <span className="block text-xs font-medium text-primary-200 uppercase">Title</span>
                                <span className="block text-sm text-white">{formData.title}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-medium text-primary-200 uppercase">Description</span>
                                <span className="block text-sm text-white">{formData.description}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-medium text-primary-200 uppercase">Location</span>
                                <span className="block text-sm text-white">{location.address}</span>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="inline-flex items-center px-4 py-2 border border-white/20 shadow-sm text-sm font-medium rounded-md text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </button>
                            <button
                                type="button"
                                onClick={onFinalSubmit}
                                disabled={loading}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            >
                                {loading ? 'Analyzing & Submitting...' : 'Submit Complaint'} <Check className="ml-2 h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
