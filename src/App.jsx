import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import LandoltC from './components/LandoltC';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import SignupWithCalibration from './components/SignupWithCalibration';
import RecalibrationModal from './components/RecalibrationModal';

// --- 1. NEW COMPONENT: HistoryView ---
const HistoryView = ({ history, onBack }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Vision Test History</h2>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </button>
      </div>

      {!history || history.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-xl">No test records found.</p>
          <p className="text-sm mt-2">Complete a vision test to see results here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 uppercase font-semibold">
              <tr>
                <th className="px-6 py-3 rounded-tl-lg">Date</th>
                <th className="px-6 py-3">Acuity</th>
                <th className="px-6 py-3">Decimal</th>
                <th className="px-6 py-3 rounded-tr-lg">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {history.slice().reverse().map((record, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(record.timestamp).toLocaleDateString()} {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">{record.final_acuity}</td>
                  <td className="px-6 py-4 text-gray-600">{record.decimal_acuity?.toFixed(2) || "N/A"}</td>
                  <td className="px-6 py-4">
                    {record.decimal_acuity >= 1.0 ? (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">Normal</span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold">Needs Attention</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

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

    // --- 2. NEW STATE: View Mode ---
    const [showHistory, setShowHistory] = useState(false);

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
            const calibration = await getCalibration();
            if (calibration && calibration.focal_length) {
                window.userCalibration = calibration;
                setStatusMessage("✅ Calibration data loaded successfully");
            } else {
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

    // WebSocket connection
    useEffect(() => {
        if (!token || !user) return;
        const storedToken = localStorage.getItem('authToken');
        
        ws.current = new WebSocket(`ws://${window.location.host}/ws`);

        ws.current.onopen = () => {
            setConnectionStatus('connected');
            const tokenToSend = storedToken || token;
            ws.current.send(JSON.stringify({ token: tokenToSend }));
        };

        ws.current.onclose = () => setConnectionStatus('disconnected');

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.error) {
                setStatusMessage(`Error: ${data.error}`);
                if (data.error.includes('Authentication')) logout();
                return;
            }

            if (data.success) {
                if (data.processed_image) setProcessedImage(data.processed_image);
                if (data.reference_box) setReferenceBox(data.reference_box);
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
                            setStatusMessage("🎯 Perfect! 4m reached! Starting vision test...");
                            startCountdown();
                        }
                    } else {
                        setAtTargetDistance(false);
                        consecutiveTargetFrames.current = 0;
                        if (distance > 0) {
                            const diff = (distance - 4.0).toFixed(1);
                            if (Math.abs(diff) > 0.1) {
                                setStatusMessage(diff > 0 
                                    ? `Move ${diff}m closer (Current: ${distance}m)` 
                                    : `Move ${Math.abs(diff)}m further (Current: ${distance}m)`);
                            }
                        }
                    }
                }
            }
            if (data.message && !data.message.includes('Authenticated successfully')) {
                setStatusMessage(data.message);
            }
        };

        ws.current.onerror = () => {
            setConnectionStatus('error');
            setStatusMessage("⚠️ Error connecting to server.");
        };
        
        return () => { if (ws.current) ws.current.close(); };
    }, [isMeasuring, isDistanceReached, token, user, logout]);

    const startMeasuringDistance = async () => {
        if (!user) return;
        if (!window.userCalibration || !window.userCalibration.focal_length) {
            setStatusMessage("❌ Please calibrate first");
            await loadUserCalibration();
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
            
            ws.current.send(JSON.stringify({ 
                command: "start_distance",
                focal_length: window.userCalibration.focal_length,
                pixels_per_mm: window.userCalibration.pixels_per_mm,
                screen_ppi: window.userCalibration.screen_ppi
            }));
            
            setStatusMessage(`🎯 Move to 4m (FL: ${window.userCalibration.focal_length?.toFixed(2)})`);
            detectionInterval.current = setInterval(sendFrame, 100);
        } else {
            setStatusMessage("⚠️ Not connected to server.");
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
        setStatusMessage(`🎉 Test complete! Acuity: ${acuityScore}`);
        stopMeasuringDistance();
    };

    const handleRecalibrationComplete = () => {
        setShowRecalibration(false);
        loadUserCalibration();
    };

    // --- 3. HELPER: Handle Home Button Click ---
    const goHome = () => {
        stopMeasuringDistance(); // Ensure cameras are off
        setShowHistory(false);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            {/* Header */}
            <header className="bg-white shadow-sm border-b mb-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center cursor-pointer" onClick={goHome}>
                            <h1 className="text-xl font-semibold text-gray-900">
                                Vision Acuity Test
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            {user && (
                                <>
                                    <span className="text-sm text-gray-700 hidden sm:block">
                                        Welcome, {user.full_name}
                                    </span>
                                    
                                    {/* --- 4. UI UPDATE: History Button --- */}
                                    <button
                                        onClick={() => setShowHistory(true)}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                            showHistory 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                        }`}
                                    >
                                        History
                                    </button>

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
                    <>
                        {/* --- 5. UI UPDATE: Conditional Rendering --- */}
                        {showHistory ? (
                            <HistoryView 
                                history={user.test_history || []} 
                                onBack={goHome} 
                            />
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Panel - Controls */}
                                <div className="bg-white rounded-lg shadow-lg p-6">
                                    <h2 className="text-xl font-semibold mb-4">Distance Measurement</h2>
                                    
                                    <div className="space-y-4 mb-6">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700">Connection:</span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                connectionStatus === 'connected' ? 'bg-green-100 text-green-800'
                                                : connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                                {connectionStatus}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700">Current Distance:</span>
                                            <span className={`text-lg font-bold ${atTargetDistance ? 'text-green-600' : 'text-blue-600'}`}>
                                                {currentDistance}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700">Focal Length:</span>
                                            <span className="text-sm text-gray-600">
                                                {window.userCalibration?.focal_length?.toFixed(2) || 'N/A'}
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
                                                    videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
                                                />
                                                {processedImage && (
                                                    <img src={processedImage} alt="Processed" className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {showCountdown && (
                                        <div className="flex flex-col items-center justify-center h-64">
                                            <div className="text-6xl font-bold text-blue-600 mb-4">{countdownValue}</div>
                                            <p className="text-lg text-gray-600">Vision test starting...</p>
                                        </div>
                                    )}

                                    {showLandoltTest && (
                                        <LandoltC 
                                            onClose={() => {
                                                handleLandoltComplete(); 
                                                goHome(); 
                                            }}
                                            // onHome prop will be handled by LandoltC's internal button
                                            // which calls onClose anyway in your LandoltC logic
                                            onHome={goHome}
                                        />
                                    )}

                                    {!showCamera && !showCountdown && !showLandoltTest && (
                                        <div className="text-center py-12 text-gray-500">
                                            <p>Click "Start Distance Measurement" to begin</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
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

export default function AppWrapper() {
    return (
        <AuthProvider>
            <App />
        </AuthProvider>
    );
}