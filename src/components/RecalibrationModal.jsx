import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Webcam from 'react-webcam';

const RecalibrationModal = ({ onClose, onComplete }) => {
  const [step, setStep] = useState(1); // 1: Focal length, 2: Screen calibration
  const [focalLength, setFocalLength] = useState(null);
  const [pixelsPerMm, setPixelsPerMm] = useState(null);
  const [screenPpi, setScreenPpi] = useState(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationMessage, setCalibrationMessage] = useState('');
  const [referenceObject, setReferenceObject] = useState('credit-card');
  const [sliderValue, setSliderValue] = useState(300);
  const [referenceLength, setReferenceLength] = useState(85.6);
  const [loading, setLoading] = useState(false);

  const { updateCalibration, user } = useAuth();
  const webcamRef = useRef(null);
  const ws = useRef(null);

  const referenceObjects = {
    'credit-card': { name: 'Credit Card', width: 85.6, height: 53.98, ratio: 1.586 },
    'a4-paper': { name: 'A4 Paper', width: 210, height: 297, ratio: 1.414 },
    'dollar-bill': { name: 'Dollar Bill', width: 155.96, height: 66.29, ratio: 2.35 },
    'custom': { name: 'Custom', width: 100, height: 100, ratio: 1 }
  };

  useEffect(() => {
    if (step !== 1) return;

    ws.current = new WebSocket(`ws://${window.location.host}/ws/calibration`);
    
    ws.current.onopen = () => {
      console.log("Recalibration WebSocket connected");
      setCalibrationMessage("Connected to calibration service");
    };
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Recalibration WebSocket message:", data);
      
      if (data.success && data.focal_length) {
        setFocalLength(data.focal_length);
        setIsCalibrating(false);
        setCalibrationMessage("✅ Focal length calibrated successfully!");
      } else if (data.error) {
        setCalibrationMessage(`Error: ${data.error}`);
        setIsCalibrating(false);
      } else if (data.message) {
        setCalibrationMessage(data.message);
      }
    };

    ws.current.onerror = (error) => {
      console.error("Recalibration WebSocket error:", error);
      setCalibrationMessage("Connection error. Please try again.");
    };

    ws.current.onclose = () => {
      console.log("Recalibration WebSocket closed");
    };
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [step]);

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

  const handleSaveCalibration = async () => {
    setLoading(true);
    try {
      const result = await updateCalibration(focalLength, pixelsPerMm, screenPpi);
      
      if (result.success) {
        onComplete();
      } else {
        setCalibrationMessage(`Error: ${result.error}`);
      }
    } catch (err) {
      setCalibrationMessage('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderFocalLengthCalibration = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Focal Length Calibration</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
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
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="font-semibold mb-2">Instructions:</h4>
            <ol className="list-decimal pl-5 space-y-1 text-sm">
              <li>Stand at one arm's length (about 70cm) from camera</li>
              <li>Make sure your face is clearly visible</li>
              <li>Click "Start Calibration" then "Capture"</li>
            </ol>
          </div>
          
          <div className="space-y-3">
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
              <div className="text-center p-3 bg-green-100 text-green-800 rounded-md">
                <p className="font-semibold">Calibration Complete!</p>
                <p className="text-sm">Focal Length: {focalLength?.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {calibrationMessage && (
        <div className="p-3 bg-blue-100 text-blue-800 rounded-md text-center">
          {calibrationMessage}
        </div>
      )}
    </div>
  );

  const renderScreenCalibration = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Screen Calibration</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Reference Object:</label>
            <div className="flex flex-wrap gap-2">
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
                    referenceObject === key ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  {referenceObjects[key].name}
                </button>
              ))}
            </div>
          </div>
          
          {referenceObject === 'custom' && (
            <div>
              <label className="block text-sm font-medium mb-1">Custom Width (mm):</label>
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
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Adjust Size: {sliderValue} pixels
            </label>
            <input
              type="range"
              min="50"
              max="500"
              value={sliderValue}
              onChange={(e) => handleScreenCalibrationChange(e.target.value)}
              className="w-full"
            />
          </div>
          
          {pixelsPerMm && (
            <div className="bg-white p-3 rounded border">
              <p className="font-semibold">Calibration Results:</p>
              <p>Pixels per mm: {pixelsPerMm.toFixed(2)}</p>
              <p>Screen PPI: {screenPpi?.toFixed(0)}</p>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-center">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div 
              className="bg-blue-500 opacity-50"
              style={{
                width: `${sliderValue}px`,
                height: `${sliderValue * (referenceObjects[referenceObject].height / referenceObjects[referenceObject].width)}px`
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Recalibration</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex mb-6">
            <div className={`flex-1 text-center p-3 border-b-2 ${
              step === 1 ? 'border-blue-500 text-blue-500' : 'border-gray-300 text-gray-500'
            }`}>
              Focal Length
            </div>
            <div className={`flex-1 text-center p-3 border-b-2 ${
              step === 2 ? 'border-blue-500 text-blue-500' : 'border-gray-300 text-gray-500'
            }`}>
              Screen
            </div>
          </div>
          
          {step === 1 && renderFocalLengthCalibration()}
          {step === 2 && renderScreenCalibration()}
          
          <div className="flex justify-between mt-8">
            <button
              onClick={step === 1 ? onClose : () => setStep(1)}
              className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded-md"
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            
            {step === 1 ? (
              <button
                onClick={() => setStep(2)}
                disabled={!focalLength}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSaveCalibration}
                disabled={loading || !pixelsPerMm}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-md disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Calibration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecalibrationModal;