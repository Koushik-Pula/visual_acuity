import React, { useState, useEffect, useRef } from 'react';

// --- SVG Icons for Polished UI ---
const IconMicrophone = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const IconCheck = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const IconX = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// --- New Fullscreen Icons ---
const IconMaximize = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
  </svg>
);

const IconMinimize = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l-5 5m0 0v-4m0 4h4m11-11l-5 5m0 0v-4m0 4h4" />
  </svg>
);
// --- End Icons ---

const LandoltC = ({ onClose }) => {
  const canvasRef = useRef(null);
  const componentRef = useRef(null); // Ref for the main div to make fullscreen
  const [pixelsPerMm, setPixelsPerMm] = useState(null);
  const [viewingDistance, setViewingDistance] = useState(400); // 400cm = 4m
  
  const ACUITY_LEVELS = [
    '6/1.5', '6/2', '6/3', '6/4', '6/5', '6/6', '6/8', '6/10', 
    '6/12', '6/16', '6/18', '6/20', '6/24', '6/36', '6/60'
  ];
  
  const acuityToNumber = (acuity) => parseFloat(acuity.split('/')[1]);
  const startingIndex = ACUITY_LEVELS.indexOf('6/6');

  const [currentAcuityIndex, setCurrentAcuityIndex] = useState(startingIndex);
  const [testHistory, setTestHistory] = useState([]);
  const [testComplete, setTestComplete] = useState(false);
  const [finalAcuity, setFinalAcuity] = useState(null);
  
  const [voiceSocket, setVoiceSocket] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState('Initializing...');
  const [currentSymbolIndex, setCurrentSymbolIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [userResponses, setUserResponses] = useState([]);
  const [testStarted, setTestStarted] = useState(false);
  const [testStage, setTestStage] = useState('initial-prep');
  const [microphoneActive, setMicrophoneActive] = useState(false);
  
  const [currentPartial, setCurrentPartial] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  
  const dynamicCountForLevel = () => 5;

  const SYMBOLS_PER_ROW = dynamicCountForLevel();
  const [chartPattern, setChartPattern] = useState([]);
  
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioProcessorRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const audioStreamRef = useRef(null);
  
  const [searchBounds, setSearchBounds] = useState({ min: 0, max: ACUITY_LEVELS.length - 1 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- Fullscreen Controls ---
  const requestFullscreen = () => {
    if (componentRef.current) {
      if (componentRef.current.requestFullscreen) {
        componentRef.current.requestFullscreen();
      } else if (componentRef.current.webkitRequestFullscreen) { /* Safari */
        componentRef.current.webkitRequestFullscreen();
      } else if (componentRef.current.msRequestFullscreen) { /* IE11 */
        componentRef.current.msRequestFullscreen();
      }
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { /* Safari */
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE11 */
      document.msExitFullscreen();
    }
  };

  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 1. Fetch Screen PPI
  useEffect(() => {
    const fetchScreenPPI = async () => {
      try {
        setVoiceStatus('Loading screen configuration...');
        const token = localStorage.getItem('authToken');
        const apiUrl = `${window.location.protocol}//${window.location.host}/api/get-screen-ppi`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          const ppi = data.screen_ppi;
          if (!ppi || ppi <= 0) throw new Error('Invalid PPI received');
          setPixelsPerMm(ppi / 25.4);
          setVoiceStatus('Screen configured. Connecting...');
          setTestStarted(true);
        } else {
          throw new Error(`Failed to fetch PPI: ${response.statusText}`);
        }
      } catch (error) {
        console.error("[PPI Error]:", error);
        setPixelsPerMm(96 / 25.4); // Fallback PPI
        setVoiceStatus('Using default config. Connecting...');
        setTestStarted(true);
      }
    };
    fetchScreenPPI();
    return () => cleanup();
  }, []);

  // 2. Connect WebSocket
  useEffect(() => {
    if (testStarted && pixelsPerMm && !voiceSocket) {
      initializeVoiceWebSocket();
    }
  }, [testStarted, pixelsPerMm, voiceSocket]);

  // 3. Start Microphone
  useEffect(() => {
    if (microphoneActive) {
      initializeVoiceRecognition();
    }
  }, [microphoneActive]);

  const initializeVoiceWebSocket = () => {
    setVoiceStatus('Connecting to voice server...');
    const token = localStorage.getItem('authToken');
    if (!token) {
      setVoiceStatus('Authentication error. Please log in again.');
      return;
    }
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws_voice?token=${encodeURIComponent(token)}`;
    
    const ws = new WebSocket(wsUrl);
    let reconnectAttempts = 0;

    ws.onopen = () => {
      setVoiceStatus('Connected. Waiting for auth...');
      reconnectAttempts = 0;
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setVoiceStatus(`Error: ${data.message || data.error}`);
          return;
        }

        switch (data.status) {
          case 'authenticated':
            setVoiceStatus(`Authenticated. Preparing voice model...`);
            setVoiceSocket(ws);
            ws.send(JSON.stringify({ command: 'prepare_voice_model' }));
            break;
          case 'ready_for_test':
            setVoiceStatus("Voice model loaded!");
            setMicrophoneActive(true); // Triggers useEffect to get mic
            break;
          case 'CORRECT':
            handleCorrectResponse();
            break;
          case 'INCORRECT':
            handleIncorrectResponse();
            break;
          case 'UNRECOGNIZED':
            setVoiceStatus(`Heard "${data.text}", but it's not clear. Please repeat.`);
            break;
          case 'partial':
            setCurrentPartial(data.partial);
            break;
        }
      } catch (e) {
        console.error("[VOICE] Parse error:", e);
      }
    };
    
    ws.onerror = (error) => {
      console.error("[VOICE] WebSocket ERROR:", error);
      setVoiceStatus('Voice connection error.');
    };
    
    ws.onclose = (event) => {
      setVoiceStatus('Voice disconnected.');
      setMicrophoneActive(false);
      setVoiceSocket(null);
      setCurrentPartial('');
      
      if (event.code !== 1000 && testStarted && !testComplete && reconnectAttempts < 5) {
        reconnectAttempts++;
        setVoiceStatus(`Reconnecting... (${reconnectAttempts})`);
        reconnectTimeoutRef.current = setTimeout(initializeVoiceWebSocket, 3000);
      } else if (event.code !== 1000) {
        setVoiceStatus('Connection lost. Please restart test.');
      }
    };
  };

  const initializeVoiceRecognition = async () => {
    try {
      setVoiceStatus('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      audioStreamRef.current = stream;
      setVoiceStatus('Microphone ready.');
      await setupAudioProcessor(stream, voiceSocket);
      startInitialCountdownTimer();
    } catch (error) {
      console.error("[VOICE] Mic error:", error);
      if (error.name === 'NotAllowedError') setVoiceStatus('Microphone access denied.');
      else setVoiceStatus('No microphone found.');
    }
  };

  // const setupAudioProcessor = async (stream, ws) => {
  //   try {
  //     const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  //     audioContextRef.current = audioContext;
  //     if (audioContext.state === 'suspended') await audioContext.resume();
      
  //     const source = audioContext.createMediaStreamSource(stream);
  //     const processor = audioContext.createScriptProcessor(2048, 1, 1);
  //     audioProcessorRef.current = processor;
      
  //     source.connect(processor);
  //     processor.connect(audioContext.destination);
      
  //     processor.onaudioprocess = (event) => {
  //       const audioData = event.inputBuffer.getChannelData(0);
  //       let sum = 0;
  //       for (let i = 0; i < audioData.length; i++) sum += audioData[i] * audioData[i];
  //       setAudioLevel(Math.min(100, Math.max(0, Math.sqrt(sum / audioData.length) * 500)));
        
  //       if (ws.readyState === WebSocket.OPEN && testStage === 'testing') {
  //         const pcmData = new Int16Array(audioData.length);
  //         for (let i = 0; i < audioData.length; i++) {
  //           pcmData[i] = Math.max(-32768, Math.min(32767, audioData[i] * 0x7FFF));
  //         }
  //         ws.send(pcmData);
  //       }
  //     };
  //   } catch (error) {
  //     setVoiceStatus(`Audio setup error: ${error.message}`);
  //   }
  // };

  const setupAudioProcessor = async (stream, ws) => {
  try {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    await audioContext.audioWorklet.addModule("/audio-processor.js");

    const source = audioContext.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioContext, "pcm-processor");
    audioProcessorRef.current = workletNode;

    workletNode.port.onmessage = (event) => {
      const float32Data = event.data;

      // Show mic level visually
      let sum = 0;
      for (let i = 0; i < float32Data.length; i++) sum += float32Data[i] * float32Data[i];
      setAudioLevel(Math.min(100, Math.sqrt(sum / float32Data.length) * 200));

      const pcmData = new Int16Array(float32Data.length);
      for (let i = 0; i < float32Data.length; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, float32Data[i])) * 0x7FFF;
      }

      if (ws && ws.readyState === WebSocket.OPEN) ws.send(pcmData);
    };


    source.connect(workletNode);
    workletNode.connect(audioContext.destination);
    console.log("[AUDIO] Worklet microphone pipeline ready.");
  } catch (err) {
    console.error("[AUDIO] Error setting up audio worklet:", err);
  }
};



  // --- Test Flow Logic ---

  const startInitialCountdownTimer = () => {
    setTestStage('initial-prep');
    setTimeLeft(15);
    setVoiceStatus("Get ready! The test will begin shortly.");
    requestFullscreen(); // Request fullscreen when test starts
    clearTimers();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          startSymbolTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // const startSymbolTest = () => {
  //   setTestStage('testing');
  //   setCurrentSymbolIndex(0);
  //   setUserResponses([]);
  //   const newPattern = generateRowPattern();
  //   setChartPattern(newPattern);
  //   startSymbol(newPattern[0]);
  // };

  const startSymbolTest = () => {
    setTestStage('testing');

    const rowSize = dynamicCountForLevel();
    const newPattern = generateRowPattern();

    setChartPattern(newPattern);
    setUserResponses(Array(rowSize).fill(undefined));
    setCurrentSymbolIndex(0);

    // Wait for socket
    const start = () => {
      if (!voiceSocket || voiceSocket.readyState !== WebSocket.OPEN) {
        setTimeout(start, 200);
        return;
      }
      setCurrentPartial('');
      voiceSocket.send(JSON.stringify({
        command: "START_SYMBOL",
        orientation: newPattern[0]
      }));
      startSymbolTimer();
    };
    start();
  };

  
  const startSymbol = (orientation) => {
    if (!voiceSocket || voiceSocket.readyState !== WebSocket.OPEN) {
      setTimeout(() => startSymbol(orientation), 300);
      return;
    }
    voiceSocket.send(JSON.stringify({ command: "START_SYMBOL", orientation }));
    startSymbolTimer();
  };

  const startSymbolTimer = () => {
    clearTimers();
    setTimeLeft(10);
    setVoiceStatus(`Symbol ${currentSymbolIndex + 1} of ${dynamicCountForLevel()}. Speak the direction.`);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCorrectResponse = () => {
    clearTimers();
    const newResponses = [...userResponses];
    newResponses[currentSymbolIndex] = true;

    setUserResponses(newResponses);
    setVoiceStatus("Correct!");
    setTimeout(() => {
      if (currentSymbolIndex < dynamicCountForLevel() - 1) moveToNextSymbol();
      else evaluateLevel(newResponses, false);
    }, 1000);
  };

  const handleIncorrectResponse = () => {
    clearTimers();
    const newResponses = [...userResponses];
    newResponses[currentSymbolIndex] = false;

    setUserResponses(newResponses);
    setVoiceStatus("Incorrect.");
    setTimeout(() => evaluateLevel(newResponses, true), 1000);
  };

  const handleTimeout = () => {
    clearTimers();
    const newResponses = [...userResponses];
    newResponses[currentSymbolIndex] = false;

    setUserResponses(newResponses);
    setVoiceStatus("Time's up!");
    setTimeout(() => evaluateLevel(newResponses, true), 1000);
  };

  

  // const moveToNextSymbol = () => {
  //   const nextIndex = currentSymbolIndex + 1;
  //   const nextOrientation = chartPattern[nextIndex];
  //   setCurrentSymbolIndex(nextIndex);
  //   if (voiceSocket && voiceSocket.readyState === WebSocket.OPEN) {
  //     voiceSocket.send(JSON.stringify({ command: "NEXT_SYMBOL", orientation: nextOrientation }));
  //   }
  //   startSymbolTimer();
  // };

  const moveToNextSymbol = () => {
    const rowSize = dynamicCountForLevel();
    const nextIndex = currentSymbolIndex + 1;

    if (nextIndex >= rowSize) return;

    setCurrentSymbolIndex(nextIndex);

    const nextOrientation = chartPattern[nextIndex];

    if (voiceSocket && voiceSocket.readyState === WebSocket.OPEN) {
      setCurrentPartial('');
      voiceSocket.send(JSON.stringify({
        command: "NEXT_SYMBOL",
        orientation: nextOrientation
      }));
    }

    startSymbolTimer();
  };


  // const evaluateLevel = (responses, forceFail) => {
  //   clearTimers();
  //   setTestStage('evaluating');
  //   setVoiceStatus('Evaluating level...');
  //   const correctCount = responses.filter(r => r === true).length;
  //   const couldSee = !forceFail && correctCount === SYMBOLS_PER_ROW;
  //   setTestHistory(prev => [...prev, { acuity: ACUITY_LEVELS[currentAcuityIndex], couldSee }]);
  //   setTimeout(() => determineNextAcuityLevel(couldSee), 1500);
  // };

  const evaluateLevel = (responses, forceFail) => {
    clearTimers();
    setTestStage('evaluating');
    setVoiceStatus('Evaluating...');

    const rowSize = dynamicCountForLevel();
    const correctCount = responses.filter(r => r === true).length;
    const couldSee = (!forceFail && correctCount === rowSize);

    setTestHistory(prev => [
      ...prev,
      { acuity: ACUITY_LEVELS[currentAcuityIndex], couldSee }
    ]);

    setTimeout(() => determineNextAcuityLevel(couldSee), 1200);
  };


  const determineNextAcuityLevel = (couldSee) => {
    let newBounds = { ...searchBounds };
    if (couldSee) newBounds.max = currentAcuityIndex - 1;
    else newBounds.min = currentAcuityIndex + 1;

    if (newBounds.min > newBounds.max) {
      let finalLevel;
      if (couldSee) finalLevel = ACUITY_LEVELS[currentAcuityIndex];
      else {
        const lastSuccess = testHistory.findLast(h => h.couldSee);
        finalLevel = lastSuccess ? lastSuccess.acuity : ACUITY_LEVELS[ACUITY_LEVELS.length - 1];
      }
      setFinalAcuity(finalLevel);
      setTestComplete(true);
      setTestStage('completed');
      setVoiceStatus('Test completed!');
      if (voiceSocket && voiceSocket.readyState === WebSocket.OPEN) {
        voiceSocket.send(JSON.stringify({ command: "STOP_LISTENING" }));
      }
      return;
    }
    
    const nextIndex = Math.floor((newBounds.min + newBounds.max) / 2);
    setSearchBounds(newBounds);
    setCurrentAcuityIndex(nextIndex);
    setTimeout(startSymbolTest, 1000);
  };

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const cleanup = () => {
    if (voiceSocket && voiceSocket.readyState === WebSocket.OPEN) {
      voiceSocket.send(JSON.stringify({ command: "STOP_LISTENING" }));
      voiceSocket.close(1000, "Test ended");
    }
    if (audioProcessorRef.current) audioProcessorRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(track => track.stop());
    clearTimers();
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    setVoiceSocket(null);
    if (document.fullscreenElement) exitFullscreen(); // Exit fullscreen on close
  };

  // --- Canvas Drawing ---

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pixelsPerMm) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    ctx.fillStyle = '#111827'; // Dark background for canvas
    ctx.fillRect(0, 0, width, height);
    
    if (testComplete) drawFullChart(ctx, width, height);
    else if (chartPattern.length > 0) drawLandoltCRow(ctx, width, height);
    else drawLoadingScreen(ctx, width, height);

  }, [currentAcuityIndex, chartPattern, testComplete, finalAcuity, currentSymbolIndex, userResponses, timeLeft, pixelsPerMm, testStage]);

  const drawLoadingScreen = (ctx, width, height) => {
    ctx.font = '24px sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(voiceStatus, width / 2, height / 2);
  };

  const drawLandoltCRow = (ctx, width, height) => {
    const size = getLandoltCSize();
    const orientations = chartPattern;
    const rowY = height / 2;

    const minSpacing = size + 10;
    let spacing = Math.max(minSpacing, 40);
    const maxSpacing = (width - size) / (dynamicCountForLevel()- 1 || 1);
    if (spacing > maxSpacing) spacing = maxSpacing;
    if (spacing < 10) spacing = 10;

    for (let i = 0; i < dynamicCountForLevel(); i++) {
      const offset = i - Math.floor(dynamicCountForLevel() / 2);
      const x = (width / 2) + (offset * spacing);
      
      drawStandardLandoltC(ctx, x, rowY, size, orientations[i], 'white');
      
      if (i === currentSymbolIndex && testStage === 'testing') {
        drawArrow(ctx, x, rowY, size);
      }
      
      if (userResponses[i] !== undefined) {
        ctx.font = '24px sans-serif';
        ctx.fillStyle = userResponses[i] ? '#22c55e' : '#ef4444'; // Green / Red
        ctx.textAlign = 'center';
        ctx.fillText(userResponses[i] ? '✓' : '✗', x, rowY + (size / 2) + 40);
      }
    }
  };

  const drawArrow = (ctx, x, y, size) => {
    ctx.fillStyle = '#3b82f6'; // Blue
    ctx.beginPath();
    ctx.moveTo(x, y - (size / 2) - 30);
    ctx.lineTo(x - 10, y - (size / 2) - 15);
    ctx.lineTo(x + 10, y - (size / 2) - 15);
    ctx.closePath();
    ctx.fill();
  };

  const drawFullChart = (ctx, width, height) => {
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    
    ctx.font = '28px sans-serif';
    ctx.fillText('Visual Acuity Result', width / 2, height / 2 - 60);
    
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(finalAcuity, width / 2, height / 2);
    
    ctx.font = '18px sans-serif';
    const value = acuityToNumber(finalAcuity);
    let interpretation = '';
    if (value <= 6) interpretation = 'Normal or better';
    else if (value <= 12) interpretation = 'Mild impairment';
    else if (value <= 24) interpretation = 'Moderate impairment';
    else interpretation = 'Significant impairment';
    ctx.fillText(interpretation, width / 2, height / 2 + 40);
    
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('This is not a substitute for a professional examination.', width / 2, height / 2 + 80);
  };

  const drawStandardLandoltC = (ctx, x, y, size, orientation, color) => {
    const diameter = size;
    const strokeWidth = diameter / 5;
    const radius = diameter / 2;
    const gapAngleSize = Math.PI / 12;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    
    let startAngle, endAngle;
    switch (orientation) {
      case 'right': startAngle = -gapAngleSize; endAngle = gapAngleSize; break;
      case 'left': startAngle = Math.PI - gapAngleSize; endAngle = Math.PI + gapAngleSize; break;
      case 'up': startAngle = Math.PI * 3 / 2 - gapAngleSize; endAngle = Math.PI * 3 / 2 + gapAngleSize; break;
      case 'down': startAngle = Math.PI / 2 - gapAngleSize; endAngle = Math.PI / 2 + gapAngleSize; break;
      default: startAngle = 0; endAngle = Math.PI * 2;
    }
    
    ctx.arc(x, y, radius - strokeWidth / 2, endAngle, startAngle + Math.PI * 2, false);
    ctx.stroke();
  };

  const getAcuitySizeInMm = (acuityStr) => {
    const angleInRadians = (5 / 60) * (Math.PI / 180); // 5 arcmin
    const distanceInMm = viewingDistance * 10;
    const standardSize = 2 * distanceInMm * Math.tan(angleInRadians / 2);
    const acuityRatio = acuityToNumber(acuityStr) / 6.0;
    
    // --- THIS IS THE CRITICAL BUG FIX ---
    // The previous file had a typo "acuity." which crashed the component.
    // It is now correctly "acuityRatio".
    return standardSize * acuityRatio;
  };

  const getLandoltCSize = (acuityStr = null) => {
    if (!pixelsPerMm) return 60;
    const currentAcuity = acuityStr || ACUITY_LEVELS[currentAcuityIndex];
    const sizeInMm = getAcuitySizeInMm(currentAcuity);
    return sizeInMm * pixelsPerMm;
  };


  const generateRowPattern = () => {
    const orientations = ['right', 'left', 'up', 'down'];
    const count = dynamicCountForLevel();
    return Array(count).fill(0).map(() =>
      orientations[Math.floor(Math.random() * orientations.length)]
    );
  };


  const handleRestart = () => {
    cleanup();
    setCurrentAcuityIndex(startingIndex);
    setTestHistory([]);
    setTestComplete(false);
    setFinalAcuity(null);
    setChartPattern([]);
    setUserResponses([]);
    setCurrentSymbolIndex(0);
    setTimeLeft(15);
    setTestStage('initial-prep');
    setVoiceStatus('Restarting...');
    setMicrophoneActive(false);
    setSearchBounds({ min: 0, max: ACUITY_LEVELS.length - 1 });
    setTimeout(() => setTestStarted(true), 500);
  };

  // --- Polished UI Components ---
  const AudioLevelBar = () => (
    <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
      <div 
        className="bg-blue-500 h-2.5 rounded-full transition-all duration-100" 
        style={{ width: `${Math.min(audioLevel, 100)}%` }}
      />
    </div>
  );
  
  const StatusPill = ({ text, colorClass }) => (
    <span className={`text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full ${colorClass}`}>
      {text}
    </span>
  );

  return (
    // --- Fullscreen Fix ---
    // This div now takes up the entire screen
    <div ref={componentRef} className="fixed inset-0 bg-gray-800 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-white w-full h-full flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Landolt C Visual Acuity Test</h2>
          <div>
            <button
              onClick={isFullscreen ? exitFullscreen : requestFullscreen}
              className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-1.5 transition-colors mr-2"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <IconMinimize className="w-5 h-5" /> : <IconMaximize className="w-5 h-5" />}
            </button>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-1.5 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-grow p-6 flex flex-col md:flex-row gap-6 overflow-y-auto">
          
          {/* Left Panel - Canvas */}
          <div className="flex-grow md:w-2/3 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-lg">
                Level: {testComplete ? finalAcuity : ACUITY_LEVELS[currentAcuityIndex]}
              </span>
              <span className="text-lg text-gray-400">
                {testStage === 'testing' && `Time: ${timeLeft}s`}
              </span>
            </div>
            <div className="w-full aspect-[16/10] bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={500}
                className="w-full h-full"
              />
            </div>
          </div>
          
          {/* Right Panel - Status & Controls */}
          <div className="md:w-1/3 flex flex-col space-y-4">
            
            {/* Status Box */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Test Status</h3>
              
              <div className="flex items-center mb-3">
                {testStage === 'testing' ? <StatusPill text="ACTIVE" colorClass="bg-green-600 text-green-100" />
                  : testStage === 'initial-prep' ? <StatusPill text="PREPARING" colorClass="bg-yellow-600 text-yellow-100" />
                  : <StatusPill text="IDLE" colorClass="bg-gray-600 text-gray-100" />}
                <p className="text-gray-300 truncate">{voiceStatus}</p>
              </div>

              {microphoneActive && (
                <div>
                  <div className="flex items-center text-sm text-gray-400">
                    <IconMicrophone className="w-4 h-4 mr-1.5" />
                    <span>Mic Level</span>
                  </div>
                  <AudioLevelBar />
                  {/* --- THIS IS THE BUG FIX --- */}
                  {/* Changed </pre> to </p> */}
                  <p className="text-xs text-gray-500 mt-2 h-4">
                    {currentPartial || '...'}
                  </p>
                </div>
              )}
            </div>

            {/* Symbols Guide */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Directions</h3>
              <p className="text-sm text-gray-400">Speak the direction of the gap:</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-center text-sm">
                <span className="bg-gray-600 p-2 rounded">"UP"</span>
                <span className="bg-gray-600 p-2 rounded">"DOWN"</span>
                <span className="bg-gray-600 p-2 rounded">"LEFT"</span>
                <span className="bg-gray-600 p-2 rounded">"RIGHT"</span>
              </div>
            </div>

            {/* Result Symbols */}
            {userResponses.length > 0 && !testComplete && (
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Current Row</h3>
                <div className="flex space-x-2">
                  {Array(dynamicCountForLevel()).fill(0).map((_, i) => (
                    <div key={i} className={`w-1/5 h-12 flex items-center justify-center rounded
                      ${i > userResponses.length ? 'bg-gray-600' : 
                        i === userResponses.length ? 'bg-blue-600 animate-pulse' :
                        userResponses[i] ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                      {i < userResponses.length && (
                        userResponses[i] ? <IconCheck className="w-6 h-6" /> : <IconX className="w-6 h-6" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer Buttons */}
        <div className="p-4 bg-gray-900 border-t border-gray-700 flex justify-end">
          {!testComplete ? (
            <button 
              onClick={handleRestart}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
              disabled={testStage === 'initial-prep'}
            >
              Restart Test
            </button>
          ) : (
            <button 
              onClick={handleRestart}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              Test Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandoltC;