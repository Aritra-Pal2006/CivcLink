import React, { useState, useRef } from 'react';
import { Phone, Mic, Upload, Square, CheckCircle } from 'lucide-react';
import { uploadComplaintAttachment } from '../../services/complaintService';

type CallState = 'IDLE' | 'MENU' | 'RECORDING' | 'FINISHED';

export const MockIvrPage: React.FC = () => {
    const [callState, setCallState] = useState<CallState>('IDLE');
    const [phoneNumber, setPhoneNumber] = useState('+919876543210');
    const [language, setLanguage] = useState<'en' | 'hi'>('en');
    const [callSid, setCallSid] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [twiml, setTwiml] = useState<any>(null);
    const [recordingFile, setRecordingFile] = useState<File | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

    const startCall = async () => {
        const newSid = `CA${Math.random().toString(36).substring(2, 15)}`;
        setCallSid(newSid);
        setCallState('MENU');
        setLogs([]);
        addLog(`📞 Call Started. SID: ${newSid}`);

        // Simulate Initial Webhook
        await sendWebhook({
            CallSid: newSid,
            From: phoneNumber,
            To: '+911234567890',
            CallStatus: 'ringing'
        });
    };

    const sendWebhook = async (payload: any) => {
        try {
            addLog(`📤 Sending Webhook: ${JSON.stringify(payload).slice(0, 50)}...`);
            const res = await fetch('http://localhost:5000/api/mock-ivr/webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            setTwiml(data);
            addLog(`📥 Received TwiML: ${JSON.stringify(data).slice(0, 50)}...`);

            if (data.hangup) {
                setCallState('FINISHED');
                addLog("📴 Call Ended by Server");
            }
        } catch (error) {
            addLog(`❌ Error: ${error}`);
        }
    };

    const handleDigitPress = async (digit: string) => {
        addLog(`🔢 Pressed Digit: ${digit}`);
        await sendWebhook({
            CallSid: callSid,
            From: phoneNumber,
            Digits: digit
        });
        if (digit === '1') {
            setCallState('RECORDING');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setRecordingFile(e.target.files[0]);
            addLog(`📁 File Selected: ${e.target.files[0].name}`);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const file = new File([audioBlob], "recording.wav", { type: 'audio/wav' });
                setRecordingFile(file);
                addLog("🎤 Recording Captured");
            };

            mediaRecorder.start();
            setIsRecording(true);
            addLog("🔴 Recording Started...");
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const submitRecording = async () => {
        if (!recordingFile) return;
        addLog("☁️ Uploading Audio...");

        try {
            const uploadResult = await uploadComplaintAttachment(recordingFile);
            addLog(`✅ Uploaded to: ${uploadResult.webViewLink}`);

            await sendWebhook({
                CallSid: callSid,
                From: phoneNumber,
                RecordingUrl: uploadResult.webViewLink,
                RecordingDuration: 15 // Mock duration
            });

            setCallState('FINISHED');

        } catch (error) {
            addLog("❌ Upload Failed");
            console.error(error);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Phone className="h-6 w-6 text-primary-600" />
                            IVR Simulator
                        </h1>
                        <p className="text-gray-500">Demo Mode (No Live Calls)</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${callState === 'IDLE' ? 'bg-gray-100 text-gray-600' :
                        callState === 'FINISHED' ? 'bg-red-100 text-red-600' :
                            'bg-green-100 text-green-600 animate-pulse'
                        }`}>
                        {callState}
                    </div>
                </div>

                {/* Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Caller Number</label>
                            <input
                                type="text"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Language</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as any)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="en">English</option>
                                <option value="hi">Hindi</option>
                            </select>
                        </div>

                        {callState === 'IDLE' && (
                            <button
                                onClick={startCall}
                                className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                            >
                                <Phone className="h-4 w-4" />
                                Simulate Incoming Call
                            </button>
                        )}

                        {callState === 'MENU' && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleDigitPress('1')}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-left"
                                >
                                    1️⃣ New Complaint
                                </button>
                                <button
                                    onClick={() => handleDigitPress('2')}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-left"
                                >
                                    2️⃣ Check Status
                                </button>
                            </div>
                        )}

                        {callState === 'RECORDING' && (
                            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-sm font-medium text-gray-700">Record or Upload Message</p>

                                <div className="flex gap-2">
                                    {!isRecording ? (
                                        <button
                                            onClick={startRecording}
                                            className="flex-1 flex justify-center items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                                        >
                                            <Mic className="h-4 w-4" /> Record
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopRecording}
                                            className="flex-1 flex justify-center items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 animate-pulse"
                                        >
                                            <Square className="h-4 w-4" /> Stop
                                        </button>
                                    )}
                                    <label className="flex-1 flex justify-center items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                                        <Upload className="h-4 w-4" /> Upload
                                        <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                </div>

                                {recordingFile && (
                                    <div className="flex items-center gap-2 text-sm text-green-600">
                                        <CheckCircle className="h-4 w-4" />
                                        {recordingFile.name}
                                    </div>
                                )}

                                <button
                                    onClick={submitRecording}
                                    disabled={!recordingFile}
                                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                                >
                                    Submit Recording (Press #)
                                </button>
                            </div>
                        )}

                        {(callState !== 'IDLE' && callState !== 'FINISHED') && (
                            <button
                                onClick={() => setCallState('FINISHED')}
                                className="w-full text-red-600 text-sm hover:underline"
                            >
                                Force End Call
                            </button>
                        )}
                        {callState === 'FINISHED' && (
                            <button
                                onClick={() => setCallState('IDLE')}
                                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                            >
                                Reset Simulator
                            </button>
                        )}
                    </div>

                    {/* Logs & Preview */}
                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 h-96 overflow-y-auto">
                        <div className="mb-2 text-gray-500 border-b border-gray-700 pb-1">Live Logs</div>
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1 break-all">{log}</div>
                        ))}
                    </div>
                </div>

                {twiml && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <h3 className="text-sm font-medium text-blue-900 mb-2">Last TwiML Response</h3>
                        <pre className="text-xs text-blue-800 overflow-x-auto">
                            {JSON.stringify(twiml, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};
