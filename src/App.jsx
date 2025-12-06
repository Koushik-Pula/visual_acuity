import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import LandoltC from './components/LandoltC';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import SignupWithCalibration from './components/SignupWithCalibration';
import RecalibrationModal from './components/RecalibrationModal';

function FaceDetectionApp() {
    const [showCamera, setShowCamera] = useState(false);
    const [currentDistance, setCurrentDistance] = useState('0m');
    const [processedImage, setProcessedImage] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [statusMessage, setStatusMessage] = useState('');
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [fps, setFps] = useState(0);
    const [referenceBox, setReferenceBox] = useState(null);
    const [atTargetDistance, setAtTargetDistance] = useState(false);
    const [isDistanceReached, setIsDistanceReached] = useState(false);
    const [lastFaceDetected, setLastFaceDetected] = useState(Date.now());
    const [showRecalibration, setShowRecalibration] = useState(false);
    
    // Landolt C test states
    const [showCountdown, setShowCountdown] = useState(false);
    const [countdownValue, setCountdownValue] = useState(5);
    const [showLandoltTest, setShowLandoltTest] = useState(false);

    const { user, logout, token, getCalibration } = useAuth();
    const webcamRef = useRef(null);
    const ws = useRef(null);
    const detectionInterval = useRef(null);
    const frameCountRef = useRef(0);
    const lastFrameTimeRef = useRef(Date.now());
    const consecutiveTargetFrames = useRef(0);
    const framesSinceLastFace = useRef(0);
    const countdownTimerRef = useRef(null);

    // Load user calibration data when user logs in
    useEffect(() => {
        if (user) {
            loadUserCalibration();
        }
    }, [user]);

    const loadUserCalibration = async () => {
        try {
            console.log("Loading user calibration data...");
            const calibration = await getCalibration();
            console.log("Calibration data from DB:", calibration);
            
            if (calibration && calibration.focal_length) {
                // Store calibration data globally for the session
                window.userCalibration = calibration;
                console.log("User calibration loaded:", calibration);
                setStatusMessage("✅ Calibration data loaded successfully");
            } else {
                console.log("No calibration data found for user");
                setStatusMessage("⚠️ Please calibrate your device first");
            }
        } catch (error) {
            console.error("Failed to load calibration:", error);
            setStatusMessage("❌ Failed to load calibration data");
        }
    };

    // FPS calculation
    useEffect(() => {
        const fpsInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - lastFrameTimeRef.current) / 1000;
            if (elapsed > 0) {
                setFps(Math.round(frameCountRef.current / elapsed));
                frameCountRef.current = 0;
                lastFrameTimeRef.current = now;
            }
        }, 1000);

        return () => clearInterval(fpsInterval);
    }, []);

    const sendFrame = useCallback(() => {
        if (!webcamRef.current || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        ws.current.send(JSON.stringify({ image: imageSrc }));
        frameCountRef.current++;
        
        if (isDistanceReached && (Date.now() - lastFaceDetected > 5000)) {
            framesSinceLastFace.current++;
            if (framesSinceLastFace.current > 10) {
                setStatusMessage("✅ Distance measurement complete! 4m distance reached and verified.");
                stopMeasuringDistance();
            }
        }
    }, [isDistanceReached, lastFaceDetected]);

    // WebSocket connection for distance measurement
    useEffect(() => {
        if (!token || !user) return;

        const storedToken = localStorage.getItem('authToken');
        
        ws.current = new WebSocket(`ws://${window.location.host}/ws`);

        ws.current.onopen = () => {
            setConnectionStatus('connected');
            const tokenToSend = storedToken || token;
            ws.current.send(JSON.stringify({ token: tokenToSend }));
        };

        ws.current.onclose = (event) => {
            setConnectionStatus('disconnected');
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("WebSocket message:", data);

            if (data.error) {
                setStatusMessage(`Error: ${data.error}`);
                if (data.error.includes('Authentication')) {
                    logout();
                }
                return;
            }

            if (data.success) {
                if (data.processed_image) {
                    setProcessedImage(data.processed_image);
                }

                if (data.reference_box) {
                    setReferenceBox(data.reference_box);
                }

                if (data.face_detected) {
                    setLastFaceDetected(Date.now());
                    framesSinceLastFace.current = 0;
                }

                if (data.faces && data.faces.length > 0 && isMeasuring) {
                    const distance = data.faces[0].distance;
                    setCurrentDistance(distance > 0 ? `${distance}m` : 'Calculating...');
                    
                    if (data.at_target_distance) {
                        setAtTargetDistance(true);
                        consecutiveTargetFrames.current++;
                        
                        if (consecutiveTargetFrames.current >= 15 && !isDistanceReached) {
                            setIsDistanceReached(true);
                            setStatusMessage("🎯 Perfect! You've reached the 4m distance! Starting countdown for vision test...");
                            startCountdown();
                        }
                    } else {
                        setAtTargetDistance(false);
                        consecutiveTargetFrames.current = 0;
                        
                        // Show distance guidance
                        if (distance > 0) {
                            const diff = (distance - 4.0).toFixed(1);
                            if (Math.abs(diff) > 0.1) { // Only show if significant difference
                                if (diff > 0) {
                                    setStatusMessage(`Move ${diff}m closer to reach 4m (Current: ${distance}m)`);
                                } else {
                                    setStatusMessage(`Move ${Math.abs(diff)}m further to reach 4m (Current: ${distance}m)`);
                                }
                            }
                        }
                    }
                }
            }

            if (data.message && !data.message.includes('Authenticated successfully')) {
                setStatusMessage(data.message);
            }
        };

        ws.current.onerror = (error) => {
            setConnectionStatus('error');
            setStatusMessage("⚠️ Error connecting to server.");
        };
        
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [isMeasuring, isDistanceReached, token, user, logout]);

    const startMeasuringDistance = async () => {
        if (!user) {
            setStatusMessage("Please log in to use distance measurement");
            return;
        }

        // Check if we have calibration data
        if (!window.userCalibration || !window.userCalibration.focal_length) {
            setStatusMessage("❌ Please calibrate your device first");
            await loadUserCalibration(); // Try to reload calibration data
            
            if (!window.userCalibration || !window.userCalibration.focal_length) {
                setShowRecalibration(true);
                return;
            }
        }

        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            setShowCamera(true);
            setIsMeasuring(true);
            setIsDistanceReached(false);
            setAtTargetDistance(false);
            consecutiveTargetFrames.current = 0;
            framesSinceLastFace.current = 0;
            
            // Send calibration data to server
            ws.current.send(JSON.stringify({ 
                command: "start_distance",
                focal_length: window.userCalibration.focal_length,
                pixels_per_mm: window.userCalibration.pixels_per_mm,
                screen_ppi: window.userCalibration.screen_ppi
            }));
            
            setStatusMessage(`🎯 Distance measurement started! Move to 4m (Using focal length: ${window.userCalibration.focal_length?.toFixed(2)})`);
            
            detectionInterval.current = setInterval(sendFrame, 100);
        } else {
            setStatusMessage("⚠️ Not connected to server. Please try again.");
        }
    };

    const stopMeasuringDistance = () => {
        setIsMeasuring(false);
        setShowCamera(false);
        setAtTargetDistance(false);
        setIsDistanceReached(false);
        setShowLandoltTest(false);
        setShowCountdown(false);
        
        if (detectionInterval.current) {
            clearInterval(detectionInterval.current);
            detectionInterval.current = null;
        }
        
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ command: "stop_all" }));
        }
        
        setStatusMessage("Measurement stopped");
    };

    const startCountdown = () => {
        setShowCountdown(true);
        setCountdownValue(5);
        
        countdownTimerRef.current = setInterval(() => {
            setCountdownValue(prev => {
                if (prev <= 1) {
                    clearInterval(countdownTimerRef.current);
                    setShowCountdown(false);
                    setShowLandoltTest(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleLandoltComplete = (acuityScore) => {
        setStatusMessage(`🎉 Vision test complete! Your visual acuity: ${acuityScore}`);
        stopMeasuringDistance();
    };

    const handleRecalibrationComplete = () => {
        setShowRecalibration(false);
        loadUserCalibration();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            {/* Header */}
            <header className="bg-white shadow-sm border-b mb-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-semibold text-gray-900">
                                Vision Acuity Test
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            {user && (
                                <>
                                    <span className="text-sm text-gray-700">
                                        Welcome, {user.full_name}
                                    </span>
                                    <div className="text-xs text-gray-500">
                                        FL: {window.userCalibration?.focal_length?.toFixed(2) || 'N/A'}
                                    </div>
                                    <button
                                        onClick={() => setShowRecalibration(true)}
                                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                                    >
                                        Recalibrate
                                    </button>
                                    <button
                                        onClick={logout}
                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                                    >
                                        Logout
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto">
                {!user ? (
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            Welcome to Vision Acuity Test
                        </h2>
                        <p className="text-gray-600 mb-8">
                            Please log in or sign up to start using the application
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Panel - Controls */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Distance Measurement</h2>
                            
                            <div className="space-y-4 mb-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Connection:</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        connectionStatus === 'connected' 
                                            ? 'bg-green-100 text-green-800'
                                            : connectionStatus === 'connecting'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {connectionStatus}
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Current Distance:</span>
                                    <span className={`text-lg font-bold ${
                                        atTargetDistance ? 'text-green-600' : 'text-blue-600'
                                    }`}>
                                        {currentDistance}
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">FPS:</span>
                                    <span className="text-sm text-gray-600">{fps}</span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Focal Length:</span>
                                    <span className="text-sm text-gray-600">
                                        {window.userCalibration?.focal_length?.toFixed(2) || 'Not calibrated'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={startMeasuringDistance}
                                    disabled={isMeasuring || connectionStatus !== 'connected'}
                                    className={`w-full py-3 px-4 rounded-md font-medium ${
                                        isMeasuring || connectionStatus !== 'connected'
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                >
                                    {isMeasuring ? 'Measuring...' : 'Start Distance Measurement'}
                                </button>
                                
                                {isMeasuring && (
                                    <button
                                        onClick={stopMeasuringDistance}
                                        className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-md font-medium"
                                    >
                                        Stop Measurement
                                    </button>
                                )}
                            </div>

                            {statusMessage && (
                                <div className={`mt-4 p-3 rounded-md text-sm ${
                                    statusMessage.includes('✅') || statusMessage.includes('🎯') || statusMessage.includes('🎉')
                                        ? 'bg-green-100 text-green-800'
                                        : statusMessage.includes('⚠️') || statusMessage.includes('Move')
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : statusMessage.includes('❌') || statusMessage.includes('Error')
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-blue-100 text-blue-800'
                                }`}>
                                    {statusMessage}
                                </div>
                            )}
                        </div>

                        {/* Right Panel - Camera/Test */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            {showCamera && !showCountdown && !showLandoltTest && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Camera View</h3>
                                    <div className="relative">
                                        <Webcam
                                            ref={webcamRef}
                                            className="rounded-lg w-full"
                                            mirrored={true}
                                            screenshotFormat="image/jpeg"
                                            screenshotQuality={0.4}
                                            videoConstraints={{ 
                                                width: 640, 
                                                height: 480, 
                                                facingMode: "user" 
                                            }}
                                        />
                                        {processedImage && (
                                            <img 
                                                src={processedImage} 
                                                alt="Processed" 
                                                className="absolute inset-0 w-full h-full object-cover rounded-lg"
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {showCountdown && (
                                <div className="flex flex-col items-center justify-center h-64">
                                    <div className="text-6xl font-bold text-blue-600 mb-4">
                                        {countdownValue}
                                    </div>
                                    <p className="text-lg text-gray-600">Vision test starting...</p>
                                </div>
                            )}

                            {showLandoltTest && (
                                <LandoltC 
                                    onComplete={handleLandoltComplete}
                                    onCancel={stopMeasuringDistance}
                                    userCalibration={window.userCalibration}
                                />
                            )}

                            {!showCamera && !showCountdown && !showLandoltTest && (
                                <div className="text-center py-12 text-gray-500">
                                    <p>Click "Start Distance Measurement" to begin</p>
                                    {window.userCalibration?.focal_length && (
                                        <p className="text-sm mt-2">
                                            Your focal length: {window.userCalibration.focal_length.toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Recalibration Modal */}
            {showRecalibration && (
                <RecalibrationModal 
                    onClose={() => setShowRecalibration(false)}
                    onComplete={handleRecalibrationComplete}
                />
            )}
        </div>
    );
}

// Main App component with routing
function App() {
    const [currentView, setCurrentView] = useState('login');
    const { isAuthenticated } = useAuth();

    if (isAuthenticated) {
        return <FaceDetectionApp />;
    }

    return (
        <div>
            {currentView === 'login' ? (
                <Login onSwitchToSignup={() => setCurrentView('signup')} />
            ) : (
                <SignupWithCalibration 
                    onComplete={() => setCurrentView('login')}
                    onBackToLogin={() => setCurrentView('login')}
                />
            )}
        </div>
    );
}

// Wrap with AuthProvider
export default function AppWrapper() {
    return (
        <AuthProvider>
            <App />
        </AuthProvider>
    );
}