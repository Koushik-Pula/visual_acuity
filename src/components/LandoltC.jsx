import React, { useState, useEffect, useRef } from 'react';

// --- Report Component ---
const IconRefresh = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const IconHome = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const Report = ({ finalAcuity, history, onRestart, onClose }) => {
  const getDecimalAcuity = (acuity) => {
    if (!acuity) return 0;
    const parts = acuity.split('/');
    if (parts.length !== 2) return 0;
    return (parseFloat(parts[0]) / parseFloat(parts[1])).toFixed(2);
  };

  const getInterpretation = (acuity) => {
    if (!acuity) return { text: "Unknown", color: "text-gray-400" };
    const val = parseFloat(acuity.split('/')[1]);
    if (val <= 6) return { text: "Normal Vision or Better", color: "text-green-400" };
    if (val <= 12) return { text: "Mild Vision Loss", color: "text-yellow-400" };
    if (val <= 24) return { text: "Moderate Vision Loss", color: "text-orange-400" };
    return { text: "Significant Vision Loss", color: "text-red-400" };
  };

  const interpretation = getInterpretation(finalAcuity);
  const decimalScore = getDecimalAcuity(finalAcuity);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gray-900 overflow-y-auto">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        
        <div className="bg-gray-900 p-6 border-b border-gray-700 text-center">
          <h2 className="text-3xl font-bold text-white mb-1">Test Results</h2>
          <p className="text-gray-400 text-sm">Landolt C Visual Acuity Test</p>
        </div>

        <div className="p-8 text-center bg-gray-800">
          <div className="mb-2 text-gray-400 uppercase tracking-widest text-xs font-semibold">Final Acuity</div>
          <div className="text-6xl font-extrabold text-white mb-2">{finalAcuity}</div>
          <div className={`text-xl font-medium ${interpretation.color}`}>
            {interpretation.text}
          </div>
          <div className="mt-4 inline-block bg-gray-700 rounded-lg px-4 py-2 text-sm text-gray-300">
            Decimal: <span className="text-white font-bold">{decimalScore}</span>
          </div>
        </div>

        <div className="px-8 pb-8">
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-2">Attempt History</h3>
          <div className="max-h-48 overflow-y-auto pr-2">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-4 py-2 rounded-tl-lg">Level</th>
                  <th className="px-4 py-2 rounded-tr-lg text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {history.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-200">{item.acuity}</td>
                    <td className="px-4 py-3 text-right">
                      {item.couldSee ? (
                        <span className="bg-green-900 text-green-300 py-1 px-2 rounded text-xs">Passed</span>
                      ) : (
                        <span className="bg-red-900 text-red-300 py-1 px-2 rounded text-xs">Failed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-900 p-6 flex justify-between gap-4 border-t border-gray-700">
          <button 
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all font-semibold"
          >
            <IconHome className="w-5 h-5" />
            Home
          </button>
          <button 
            onClick={onRestart}
            className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-500/20 transition-all font-bold"
          >
            <IconRefresh className="w-5 h-5" />
            Retake Test
          </button>
        </div>
      </div>
      
      <p className="mt-6 text-xs text-gray-500 max-w-md text-center">
        Disclaimer: This test is for screening purposes only and does not replace a professional eye examination.
      </p>
    </div>
  );
};

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
  const voiceSocketRef = useRef(null);
  const recognitionRef = useRef(null);
  const canvasRef = useRef(null);
  const componentRef = useRef(null); 
  const [pixelsPerMm, setPixelsPerMm] = useState(null);
  const [viewingDistance, setViewingDistance] = useState(400); // 400cm = 4m
  
  const ACUITY_LEVELS = [
    "6/3",   // 0
    "6/4",   // 1
    "6/5",   // 2
    "6/6",   // 3  <-- starting point
    "6/8",   // 4
    "6/9",   // 5
    "6/12",  // 6
    "6/18",  // 7
    "6/24"   // 8
  ];
  
  const acuityToNumber = (acuity) => parseFloat(acuity.split('/')[1]);
  const startingIndex = ACUITY_LEVELS.indexOf('6/6');

  const [currentAcuityIndex, setCurrentAcuityIndex] = useState(startingIndex);
  const [testHistory, setTestHistory] = useState([]);
  const [testComplete, setTestComplete] = useState(false);
  const [finalAcuity, setFinalAcuity] = useState(null);
  const [showReport, setShowReport] = useState(false);
  
  const [voiceSocket, setVoiceSocket] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState('Initializing...');
  
  // Game State
  const [currentSymbolIndex, setCurrentSymbolIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [userResponses, setUserResponses] = useState([]);
  const [testStarted, setTestStarted] = useState(false);
  const [testStage, setTestStage] = useState('initial-prep');
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false); 
  
  const [currentPartial, setCurrentPartial] = useState('');
  
  const dynamicCountForLevel = () => 5;

  const SYMBOLS_PER_ROW = dynamicCountForLevel();
  const [chartPattern, setChartPattern] = useState([]);
  
  const timerRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- CRITICAL FIX START: Added currentAcuityIndex to Ref ---
  const testStateRef = useRef({
    currentSymbolIndex: 0,
    userResponses: [],
    chartPattern: [],
    testStage: 'initial-prep',
    isPaused: false,
    currentAcuityIndex: startingIndex // Initialize with starting index
  });

  // Keep ref synced with state on every render
  useEffect(() => {
    testStateRef.current = {
      currentSymbolIndex,
      userResponses,
      chartPattern,
      testStage,
      isPaused,
      currentAcuityIndex // Update ref when state changes
    };
  }, [currentSymbolIndex, userResponses, chartPattern, testStage, isPaused, currentAcuityIndex]);
  // --- CRITICAL FIX END ---

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

  // 3. Start Web Speech API
  useEffect(() => {
    if (microphoneActive && !recognitionRef.current) {
      startWebSpeech();
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
            setVoiceStatus(`Authenticated.`);
            setVoiceSocket(ws);
            voiceSocketRef.current = ws;
            ws.send(JSON.stringify({ command: 'prepare_voice_model' }));
            break;
          case 'ready_for_test':
            setVoiceStatus("Ready! Say 'Start' or wait.");
            setMicrophoneActive(true);
            break;
          case 'PAUSE_REQUESTED':
            handlePause();
            break;
          case 'CORRECT': {
            const state = testStateRef.current;
            if (state.testStage !== 'testing' || state.isPaused) {
              console.log("[VOICE] Ignoring CORRECT in stage:", state.testStage);
              break;
            }
            setCurrentPartial(`Heard: ${data.text}`);
            processResponse(true, state);
            break;
          }

        case 'INCORRECT': {
          const state = testStateRef.current;
          if (state.testStage !== 'testing' || state.isPaused) {
            console.log("[VOICE] Ignoring INCORRECT in stage:", state.testStage);
            break;
          }
          setCurrentPartial(`Heard: ${data.text}`);
          processResponse(false, state);
          break;
        }

          case 'UNRECOGNIZED':
             setCurrentPartial(`Unsure: "${data.text}"`);
             setTimeout(() => setCurrentPartial(''), 1500);
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
      
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      
      if (event.code !== 1000 && testStarted && !testComplete && reconnectAttempts < 5) {
        reconnectAttempts++;
        setVoiceStatus(`Reconnecting... (${reconnectAttempts})`);
        reconnectTimeoutRef.current = setTimeout(initializeVoiceWebSocket, 3000);
      }
    };
  };

  const startWebSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus("Browser incompatible. Use Chrome/Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                setCurrentPartial(event.results[i][0].transcript);
            }
        }

        if (finalTranscript) {
            if (voiceSocketRef.current && voiceSocketRef.current.readyState === WebSocket.OPEN) {
                voiceSocketRef.current.send(JSON.stringify({
                    command: "VOICE_INPUT",
                    text: finalTranscript
                }));
            }
            setCurrentPartial('');
        }
    };
    
    recognition.onend = () => {
        if (microphoneActive && !testComplete) {
            try { recognition.start(); } catch(e){}
        }
    };

    try {
        recognition.start();
        recognitionRef.current = recognition;
        startInitialCountdownTimer();
    } catch (e) {
        console.error("Speech API Error:", e);
    }
  };

  // --- Logic Helpers ---
  const processResponse = (isCorrect, currentState) => {
    clearTimers();

    const stage = testStateRef.current.testStage;
    if (stage === "evaluating" || stage === "transition") {
      console.log("Ignoring voice during:", stage);
      return;
    }

    const { currentSymbolIndex, userResponses } = currentState;
    const newResponses = [...userResponses];
    newResponses[currentSymbolIndex] = isCorrect;

    setUserResponses(newResponses);
    setVoiceStatus(isCorrect ? "Correct!" : "Incorrect.");

    setTimeout(() => {
      const rowSize = dynamicCountForLevel();

      if (currentSymbolIndex < rowSize - 1) {
        moveToNextSymbol(currentSymbolIndex + 1);
      } else {
        const forceFail = newResponses.includes(false);
        evaluateLevel(newResponses, forceFail);
      }
    }, 700);
  };

  // --- Test Flow Logic ---
  const startInitialCountdownTimer = () => {
    setTestStage('initial-prep');
    setTimeLeft(15);
    setVoiceStatus("Get ready! Test begins soon.");
    requestFullscreen(); 
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

  const startSymbolTest = () => {
    clearTimers();
    setTestStage("testing");

    const size = dynamicCountForLevel();
    setUserResponses(Array(size).fill(null));
    setCurrentSymbolIndex(0);

    try {
      if (recognitionRef.current) {
        recognitionRef.current.onend = () => {
          try { recognitionRef.current.start(); } catch(e){}
        };
        try { recognitionRef.current.start(); } catch(e){}
      }
    } catch (e) { console.log("Speech error:", e); }

    loadNextSymbol();
  };

  const loadNextSymbol = () => {
    const newPattern = generateRowPattern();
    setChartPattern(newPattern);
    
    setTimeout(() => {
        if (voiceSocketRef.current && voiceSocketRef.current.readyState === WebSocket.OPEN) {
            voiceSocketRef.current.send(JSON.stringify({
                command: "NEXT_SYMBOL",
                orientation: newPattern[0]
            }));
        }
        startSymbolTimer(0);
    }, 100);
  };

  const startSymbolTimer = (indexOverride) => {
    clearTimers();
    setTimeLeft(12);
    
    const idx = indexOverride !== undefined ? indexOverride : currentSymbolIndex;
    setVoiceStatus(`Symbol ${idx + 1} of ${dynamicCountForLevel()}. Speak direction.`);
    
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

  const handleTimeout = () => {
    const { currentSymbolIndex, userResponses } = testStateRef.current;
    clearTimers();
    const newResponses = [...userResponses];
    newResponses[currentSymbolIndex] = false;

    setUserResponses(newResponses);
    setVoiceStatus("Time's up!");
    setTimeout(() => evaluateLevel(newResponses, true), 1000);
  };

  const moveToNextSymbol = async (nextIndex) => {
    const rowSize = dynamicCountForLevel();

    if (nextIndex >= rowSize) return;

    setCurrentSymbolIndex(nextIndex);
    setCurrentPartial('');

    const pattern = testStateRef.current.chartPattern;
    const nextOrientation = pattern[nextIndex];

    await new Promise(r => setTimeout(r, 50));

    if (voiceSocketRef.current && voiceSocketRef.current.readyState === WebSocket.OPEN) {
      voiceSocketRef.current.send(JSON.stringify({
        command: "NEXT_SYMBOL",
        orientation: nextOrientation
      }));
    }

    startSymbolTimer(nextIndex);
  };

  const evaluateLevel = (responses, forceFail) => {
    clearTimers();
    setTestStage("evaluating");

    try {
      if (recognitionRef.current) recognitionRef.current.stop();
    } catch (e) {}

    const rowSize = dynamicCountForLevel();
    const correctCount = responses.filter(r => r === true).length;
    const couldSee = (!forceFail && correctCount === rowSize);

    setTestHistory(prev => [
      ...prev,
      { acuity: ACUITY_LEVELS[currentAcuityIndex], couldSee }
    ]);

    setTimeout(() => {
      decideNextStep(couldSee);
    }, 300);
  };

  // --- CRITICAL FIX START: Read currentAcuityIndex from Ref ---
  const decideNextStep = (couldSee) => {
    // Read from Ref to ensure we have the latest value in the closure
    const curr = testStateRef.current.currentAcuityIndex;

    console.log("DECIDE:", curr, ACUITY_LEVELS[curr], "couldSee:", couldSee);

    if (curr === 3) { // 6/6
      if (couldSee) setFinalLogic(1); // Go to 6/4
      else setFinalLogic(5);          // Go to 6/9
      return;
    }

    if (curr === 1) { // 6/4
      if (couldSee) setFinalLogic(0); // Go to 6/3
      else setFinalLogic(2);          // Go to 6/5 (Corrected flow)
      return;
    }

    if (curr === 0) { // 6/3
      setFinalAcuity(couldSee ? "6/3" : "6/4");
      finishTest();
      return;
    }

    if (curr === 2) { // 6/5
      setFinalAcuity(couldSee ? "6/5" : "6/6");
      finishTest();
      return;
    }

    if (curr === 5) { // 6/9
      if (couldSee) setFinalLogic(4);
      else setFinalLogic(7);
      return;
    }

    if (curr === 4) { // 6/8
      setFinalAcuity(couldSee ? "6/8" : "6/9");
      finishTest();
      return;
    }

    if (curr === 7) { // 6/18
      if (couldSee) setFinalLogic(6);
      else setFinalLogic(8);
      return;
    }

    if (curr === 6) { // 6/12
      setFinalAcuity(couldSee ? "6/12" : "6/18");
      finishTest();
      return;
    }

    if (curr === 8) { // 6/24
      setFinalAcuity("6/24");
      finishTest();
      return;
    }
  };
  // --- CRITICAL FIX END ---

  const setFinalLogic = (nextIndex) => {
    setTestStage("transition");
    setCurrentAcuityIndex(nextIndex); // Updates State (for UI)
    // Ref update is handled by the useEffect logic automatically
    setTimeout(() => {
      startSymbolTest();
    }, 200);
  };

  const finishTest = () => {
    setTestComplete(true);
    setTestStage("completed");
    setShowReport(true);

    if (voiceSocketRef.current) {
      voiceSocketRef.current.send(
        JSON.stringify({ command: "STOP_LISTENING" })
      );
    }
  };

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };
  
  const handlePause = () => {
      if (isPaused) {
          setIsPaused(false);
          startSymbolTimer(); 
      } else {
          setIsPaused(true);
          clearTimers();
          setVoiceStatus("PAUSED. Say 'Resume' or Click Resume.");
      }
  };

  const cleanup = () => {
    if (voiceSocketRef.current) {
      if (voiceSocketRef.current.readyState === WebSocket.OPEN) {
          voiceSocketRef.current.send(JSON.stringify({ command: "STOP_LISTENING" }));
          voiceSocketRef.current.close(1000, "Clean restart");
      }
      voiceSocketRef.current = null;
    }
    
    if (recognitionRef.current) {
        recognitionRef.current.onend = null; 
        recognitionRef.current.abort(); 
        recognitionRef.current = null;
    }
    
    setMicrophoneActive(false);
    clearTimers();
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    setVoiceSocket(null);
    if (document.fullscreenElement) exitFullscreen(); 
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
    setIsPaused(false);
    setShowReport(false); 
    
    // --- CRITICAL FIX: Reset Ref fully including acuity index ---
    testStateRef.current = {
        currentSymbolIndex: 0,
        userResponses: [],
        chartPattern: [],
        testStage: 'initial-prep',
        isPaused: false,
        currentAcuityIndex: startingIndex 
    };

    setTimeout(() => {
        setTestStarted(true);
    }, 500);
  };

  // --- Canvas Drawing ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pixelsPerMm) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    ctx.fillStyle = '#111827'; 
    ctx.fillRect(0, 0, width, height);
    
    if (testComplete && !showReport) drawFullChart(ctx, width, height);
    else if (chartPattern.length > 0) drawLandoltCRow(ctx, width, height);
    else drawLoadingScreen(ctx, width, height);

  }, [currentAcuityIndex, chartPattern, testComplete, finalAcuity, currentSymbolIndex, userResponses, timeLeft, pixelsPerMm, testStage, showReport]);

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
      
      if (i === currentSymbolIndex && testStage === 'testing' && !isPaused) {
        drawArrow(ctx, x, rowY, size);
      }
      
      if (userResponses[i] !== undefined) {
        ctx.font = '24px sans-serif';
        ctx.fillStyle = userResponses[i] ? '#22c55e' : '#ef4444'; 
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

  const StatusPill = ({ text, colorClass }) => (
    <span className={`text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full ${colorClass}`}>
      {text}
    </span>
  );

  return (
    <div ref={componentRef} className="fixed inset-0 bg-gray-800 flex items-center justify-center z-50">
      {showReport ? (
        <Report 
          finalAcuity={finalAcuity}
          history={testHistory}
          onRestart={handleRestart}
          onClose={onClose}
        />
      ) : (
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
                {testStage === 'testing' && !isPaused && `Time: ${timeLeft}s`}
                {isPaused && "PAUSED"}
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
                    <span>Live Transcript</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded mt-2 p-2 h-16 flex items-center justify-center overflow-hidden">
                      <p className="text-blue-300 font-mono text-center leading-tight">
                         {currentPartial || 'Listening...'}
                      </p>
                  </div>
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
              <p className="text-xs text-gray-500 mt-2 text-center">Say "Pause" or "Stop" to take a break.</p>
            </div>

            {/* Result Symbols */}
            {userResponses.length > 0 && !testComplete && (
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Current Row</h3>
                <div className="flex space-x-2">
                  {Array(dynamicCountForLevel()).fill(0).map((_, i) => (
                    <div key={i} className={`w-1/5 h-12 flex items-center justify-center rounded
                      ${i > currentSymbolIndex ? 'bg-gray-600' : 
                        i === currentSymbolIndex ? 'bg-blue-600 animate-pulse' :
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
            
            {/* Pause Button (Manual) */}
            {testStage === 'testing' && (
                <button 
                  onClick={() => handlePause()}
                  className={`w-full py-2 rounded font-bold transition-colors ${isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
                >
                    {isPaused ? "RESUME TEST" : "PAUSE TEST"}
                </button>
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
      )}
    </div>
  );
};

export default LandoltC;