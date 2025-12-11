import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Webcam from 'react-webcam';

const SignupWithCalibration = ({ onComplete, onBackToLogin }) => {
  const [step, setStep] = useState(1); // 1: Basic info, 2: Focal length, 3: Screen calibration
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Focal length calibration state
  const [focalLength, setFocalLength] = useState(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationMessage, setCalibrationMessage] = useState('');
  
  // Screen calibration state
  const [pixelsPerMm, setPixelsPerMm] = useState(null);
  const [screenPpi, setScreenPpi] = useState(null);
  const [referenceObject, setReferenceObject] = useState('credit-card');
  const [sliderValue, setSliderValue] = useState(300);
  const [referenceLength, setReferenceLength] = useState(85.6);
  
  const { register } = useAuth();
  const webcamRef = useRef(null);
  const ws = useRef(null);
  
  const referenceObjects = {
    'credit-card': { name: 'Credit Card', width: 85.6, height: 53.98, ratio: 1.586 },
    'a4-paper': { name: 'A4 Paper', width: 210, height: 297, ratio: 1.414 },
    'dollar-bill': { name: 'Dollar Bill', width: 155.96, height: 66.29, ratio: 2.35 },
    'custom': { name: 'Custom', width: 100, height: 100, ratio: 1 }
  };

  // WebSocket for focal length calibration - NO AUTH REQUIRED
  useEffect(() => {
    if (step !== 2) return;

    ws.current = new WebSocket(`ws://${window.location.host}/ws/calibration`);
    
    ws.current.onopen = () => {
      console.log("Calibration WebSocket connected");
      setCalibrationMessage("Connected to calibration service");
    };
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Calibration WebSocket message:", data);
      
      if (data.success && data.focal_length) {
        setFocalLength(data.focal_length);
        setIsCalibrating(false);
        setCalibrationMessage(" Focal length calibrated successfully!");
      } else if (data.error) {
        setCalibrationMessage(`Error: ${data.error}`);
        setIsCalibrating(false);
      } else if (data.message) {
        setCalibrationMessage(data.message);
      }
    };

    ws.current.onerror = (error) => {
      console.error("Calibration WebSocket error:", error);
      setCalibrationMessage("Connection error. Please try again.");
    };

    ws.current.onclose = () => {
      console.log("Calibration WebSocket closed");
    };
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [step]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleBasicInfoSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setStep(2);
  };

  const startFocalLengthCalibration = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ command: "start_calibration" }));
      setIsCalibrating(true);
      setCalibrationMessage("🧍 Stand at one-arm distance and click 'Capture'");
    } else {
      setCalibrationMessage("WebSocket not connected. Please wait...");
    }
  };

  const captureFocalLength = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc && ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ 
        command: "capture", 
        image: imageSrc 
      }));
    } else {
      setCalibrationMessage("Cannot capture image. Please try again.");
    }
  };

  const handleScreenCalibrationChange = (value) => {
    setSliderValue(parseInt(value));
    const objectWidth = referenceObject === 'custom' 
      ? referenceLength 
      : referenceObjects[referenceObject].width;
    const newPixelsPerMm = parseInt(value) / objectWidth;
    setPixelsPerMm(newPixelsPerMm);
    setScreenPpi(newPixelsPerMm * 25.4);
  };

  const handleCompleteSignup = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Completing signup with:', {
        email: formData.email,
        fullName: formData.fullName,
        focalLength,
        pixelsPerMm,
        screenPpi
      });

      const result = await register(
        formData.email, 
        formData.password, 
        formData.fullName,
        focalLength,
        pixelsPerMm,
        screenPpi
      );
      
      console.log('Registration result:', result);
      
      if (result.success) {
        setError('');
        onComplete();
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Create Account</h2>
      
      <form onSubmit={handleBasicInfoSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Confirm your password"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
        >
          Continue to Calibration
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={onBackToLogin}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to Login
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Focal Length Calibration</h2>
      <p className="text-gray-600 mb-6 text-center">
        This calibration helps measure distances accurately using your camera.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Camera Input</h3>
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
        </div>
        <div className="flex flex-col justify-center">
          <h3 className="text-lg font-semibold mb-3">Instructions</h3>
          <ol className="list-decimal pl-5 space-y-2 text-gray-700">
            <li>Stand at one arm's length (about 70cm) from your camera</li>
            <li>Make sure your face is clearly visible</li>
            <li>Click "Start Calibration" then "Capture"</li>
            <li>Wait for the calibration to complete</li>
          </ol>
          
          <div className="mt-6 space-y-4">
            {!focalLength ? (
              <>
                <button
                  onClick={startFocalLengthCalibration}
                  disabled={isCalibrating}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-md font-medium disabled:opacity-50"
                >
                  {isCalibrating ? 'Calibrating...' : 'Start Calibration'}
                </button>
                
                {isCalibrating && (
                  <button
                    onClick={captureFocalLength}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-md font-medium"
                  >
                    Capture
                  </button>
                )}
              </>
            ) : (
              <div className="text-center p-4 bg-green-100 text-green-800 rounded-md">
                <p className="font-semibold">Calibration Complete!</p>
                <p className="text-sm">Focal Length: {focalLength?.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {calibrationMessage && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-md text-center">
          {calibrationMessage}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => setStep(1)}
          className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-md"
        >
          Back
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={!focalLength}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md disabled:opacity-50"
        >
          Continue to Screen Calibration
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Screen Calibration</h2>
      <p className="text-gray-600 mb-6 text-center">
        This calibration ensures accurate visual acuity testing by measuring your screen's pixel density.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="mb-4">
            <p className="text-lg font-semibold mb-2">Step 1: Select Reference Object</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.keys(referenceObjects).map(key => (
                <button
                  key={key}
                  onClick={() => {
                    setReferenceObject(key);
                    if (key !== 'custom') {
                      setReferenceLength(referenceObjects[key].width);
                    }
                  }}
                  className={`px-3 py-1 rounded text-sm ${
                    referenceObject === key ? 'bg-blue-500 text-white' : 'bg-gray-300'
                  }`}
                >
                  {referenceObjects[key].name}
                </button>
              ))}
            </div>
            
            {referenceObject === 'custom' && (
              <div className="mb-4">
                <label className="block text-sm mb-1">Custom width (mm):</label>
                <input
                  type="number"
                  value={referenceLength}
                  onChange={(e) => setReferenceLength(parseFloat(e.target.value) || 100)}
                  className="w-full p-2 border rounded"
                  min="10"
                  max="1000"
                  step="0.1"
                />
              </div>
            )}
          </div>

          <div className="mb-4">
            <p className="text-lg font-semibold mb-2">Step 2: Adjust Size</p>
            <p className="text-sm text-gray-600 mb-2">
              Adjust the slider until the blue rectangle matches your reference object:
            </p>
            <input
              type="range"
              min="50"
              max="500"
              value={sliderValue}
              onChange={(e) => handleScreenCalibrationChange(e.target.value)}
              className="w-full mb-2"
            />
            <div className="text-center">
              <span className="text-sm text-gray-600">Size: {sliderValue} pixels</span>
            </div>
          </div>

          {pixelsPerMm && (
            <div className="bg-white p-3 rounded border">
              <p className="font-semibold">Calibration Results:</p>
              <p>Pixels per mm: {pixelsPerMm.toFixed(2)}</p>
              <p>Screen PPI: {screenPpi?.toFixed(0)}</p>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <p className="text-lg font-semibold mb-2">Reference Display</p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center">
            <div 
              className="bg-blue-500 opacity-50"
              style={{
                width: `${sliderValue}px`,
                height: `${sliderValue * (referenceObjects[referenceObject].height / referenceObjects[referenceObject].width)}px`
              }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-3 text-center">
            Place your {referenceObjects[referenceObject].name.toLowerCase()} over the blue rectangle and adjust the slider until they match exactly.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => setStep(2)}
          className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-md"
        >
          Back
        </button>
        <button
          onClick={handleCompleteSignup}
          disabled={loading || !pixelsPerMm}
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-md disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Complete Signup'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
};

export default SignupWithCalibration;