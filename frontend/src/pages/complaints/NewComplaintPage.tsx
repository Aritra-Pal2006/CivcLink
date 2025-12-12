import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { LocationPicker } from '../../components/complaints/LocationPicker';
import { createComplaint } from '../../services/complaintService';
import { useAuth } from '../../contexts/AuthContext';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Mic, Square, Loader2 } from 'lucide-react';

import { useLanguage } from '../../contexts/LanguageContext';

const complaintSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    description: z.string().min(20, "Description must be at least 20 characters"),
    category: z.string().optional(),
    isAnonymous: z.boolean().optional(),
});

type ComplaintFormInputs = z.infer<typeof complaintSchema>;

export const NewComplaintPage: React.FC = () => {
    const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<ComplaintFormInputs>({
        resolver: zodResolver(complaintSchema),
        defaultValues: {
            isAnonymous: false
        }
    });
    const { currentUser } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
    const [ward, setWard] = useState('');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<ComplaintFormInputs | null>(null);
    const [attachment, setAttachment] = useState<File | null>(null);

    // Voice Input State
    const [isRecording, setIsRecording] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const audioChunksRef = React.useRef<Blob[]>([]);

    // Watch form inputs for changes
    const formValues = watch();

    // Load draft from localStorage on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem('complaintDraft');
        if (savedDraft) {
            try {
                const { step: savedStep, location: savedLocation, ward: savedWard, formData: savedFormData, formValues: savedFormValues } = JSON.parse(savedDraft);
                if (savedStep) setStep(savedStep);
                if (savedLocation) setLocation(savedLocation);
                if (savedWard) setWard(savedWard);
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
            ward,
            formData, // Confirmed data from step 1
            formValues // Current values in inputs
        };
        localStorage.setItem('complaintDraft', JSON.stringify(draft));
    }, [step, location, ward, formData, formValues]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachment(e.target.files[0]);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setTranscribing(true);
                try {
                    const { transcribeAudio } = await import('../../services/complaintService');
                    const result = await transcribeAudio(audioBlob);
                    if (result.transcript) {
                        const currentDesc = watch('description') || '';
                        // Append to existing description
                        const newDesc = currentDesc ? `${currentDesc} ${result.transcript}` : result.transcript;
                        setValue('description', newDesc);
                    }
                } catch (error) {
                    console.error("Transcription failed", error);
                    alert("Failed to transcribe audio. Please try again.");
                } finally {
                    setTranscribing(false);
                    // Stop all tracks
                    stream.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone. Please ensure permissions are granted.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
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
                location: {
                    ...location,
                    wardCode: ward ? ward.trim().toUpperCase().replace(/\s+/g, '_') : undefined
                },
                attachments: uploadedAttachments,
                isAnonymous: formData.isAnonymous
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
                <h1 className="text-2xl font-bold text-white drop-shadow-md">{t('newComplaint')}</h1>
                <p className="mt-1 text-sm text-primary-100">
                    {t('welcome')}
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
                            <div className="flex justify-between items-center mb-1">
                                <label htmlFor="description" className="block text-sm font-medium text-white">Description</label>
                                <button
                                    type="button"
                                    onClick={isRecording ? stopRecording : startRecording}
                                    disabled={transcribing}
                                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all ${isRecording
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                                        : transcribing
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                            : 'bg-white/10 text-primary-200 hover:bg-white/20 border border-white/10'
                                        }`}
                                >
                                    {isRecording ? (
                                        <>
                                            <Square className="h-3 w-3 fill-current" /> Stop Recording
                                        </>
                                    ) : transcribing ? (
                                        <>
                                            <Loader2 className="h-3 w-3 animate-spin" /> Transcribing...
                                        </>
                                    ) : (
                                        <>
                                            <Mic className="h-3 w-3" /> Voice Input
                                        </>
                                    )}
                                </button>
                            </div>
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
                            <label htmlFor="category" className="block text-sm font-medium text-white">{t('categoryLabel')} (Optional)</label>
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

                        <div className="flex items-center">
                            <input
                                id="isAnonymous"
                                type="checkbox"
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                {...register("isAnonymous")}
                            />
                            <label htmlFor="isAnonymous" className="ml-2 block text-sm text-white">
                                {t('anonymousLabel')}
                            </label>
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

                        <div>
                            <label htmlFor="ward" className="block text-sm font-medium text-white">Ward Number (Optional)</label>
                            <input
                                type="text"
                                id="ward"
                                value={ward}
                                onChange={(e) => setWard(e.target.value)}
                                className="mt-1 block w-full bg-black/20 border border-white/20 rounded-md shadow-sm py-2 px-3 text-white placeholder-white/40 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                placeholder="e.g., WARD_12 (Will be auto-formatted to uppercase/underscores)"
                            />
                            <p className="mt-1 text-xs text-primary-200">
                                System format: WARD_XX. Your input will be converted (e.g., "ward 12" &rarr; "WARD_12").
                            </p>
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
