import React, { useState, useRef, useEffect } from 'react';
import { Message, NegotiationState, ScorecardData, InternalMeters } from '../types';
import { GeminiService } from '../services/geminiService';

interface ChatInterfaceProps {
  negotiationState: NegotiationState;
  onFinish: (scorecard: ScorecardData) => void;
}

const ProMeter: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex-1 px-4 border-r border-white/5 last:border-0 group">
    <div className="flex justify-between items-center mb-1.5">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-[10px] font-mono font-bold text-slate-300">{value}%</span>
    </div>
    <div className="h-1 bg-brand-black/40 rounded-full overflow-hidden">
      <div className={`h-full transition-all duration-1000 ease-out ${color}`} style={{ width: `${value}%` }}></div>
    </div>
  </div>
);

const ChatInterface: React.FC<ChatInterfaceProps> = ({ negotiationState, onFinish }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [autoSimStatus, setAutoSimStatus] = useState('Initializing Simulation');
  const [meters, setMeters] = useState<InternalMeters>({ stress: 0, patience: 100, logic: 0, sarcasm: 0, mood: 'Steady' });
  const [isFlinching, setIsFlinching] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(negotiationState.marketValue);
  const [lastPrice, setLastPrice] = useState<number>(negotiationState.marketValue);
  const [pulseProximity, setPulseProximity] = useState(false);
  
  // Tactical Timer State
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(false);

  // Multimodal states
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Counter offer states
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gemini = useRef(new GeminiService());
  const recognition = useRef<any>(null);

  const simMessages = [
    "Analyzing Market Sentiment...",
    "Executing Counter-Strategies...",
    "Evaluating Floor Limits...",
    "Predicting Adversary Logic...",
    "Finalizing Settlement Terms..."
  ];

  const extractPrice = (text: string): number | null => {
    const cleaned = text.replace(/,/g, '');
    const match = cleaned.match(/\$?(\d+(\.\d{1,2})?)/);
    return match ? parseFloat(match[1]) : null;
  };

  useEffect(() => {
    const init = async () => {
      setIsTyping(true);
      const res = await gemini.current.start(negotiationState, negotiationState.initialImage);
      setMessages([{ role: 'model', content: res.text, thought: res.thought, meters: res.meters }]);
      if (res.meters) {
        setMeters(res.meters);
        resetTimer();
      }
      
      const price = extractPrice(res.text);
      if (price !== null) {
        setLastPrice(currentPrice);
        setCurrentPrice(price);
        triggerProximityPulse();
      }
      setIsTyping(false);
    };
    init();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsRecording(false);
      };
      recognition.current.onerror = () => setIsRecording(false);
      recognition.current.onend = () => setIsRecording(false);
    }
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (timerActive && timeLeft > 0 && !isTyping && !isAutoSimulating) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      handleTimerExpire();
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, isTyping, isAutoSimulating]);

  const resetTimer = () => {
    setTimeLeft(30);
    setTimerActive(true);
  };

  const handleTimerExpire = () => {
    setTimerActive(false);
    sendMessage("... (The user hesitated, wasting your time)");
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const triggerProximityPulse = () => {
    setPulseProximity(true);
    setTimeout(() => setPulseProximity(false), 1000);
  };

  const toggleRecording = () => {
    if (!recognition.current) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    if (isRecording) {
      recognition.current.stop();
    } else {
      recognition.current.start();
      setIsRecording(true);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      setPendingImage(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPendingImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const sendMessage = async (content: string) => {
    if ((!content.trim() && !pendingImage) || isTyping || isAutoSimulating) return;
    
    setTimerActive(false);
    const userMsg: Message = { 
      role: 'user', 
      content,
      image: pendingImage || undefined
    };
    
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput('');
    setPendingImage(null);
    setIsTyping(true);
    setShowCounterInput(false);

    const userPrice = extractPrice(content);
    if (userPrice !== null) {
      setLastPrice(currentPrice);
      setCurrentPrice(userPrice);
      triggerProximityPulse();
    }

    if (content.match(/\d+/) && parseInt(content.match(/\d+/)![0]) < negotiationState.marketValue * 0.4) {
      setIsFlinching(true);
      setTimeout(() => setIsFlinching(false), 500);
    }

    try {
      const res = await gemini.current.chat(nextMsgs, negotiationState);
      setMessages([...nextMsgs, { role: 'model', content: res.text, thought: res.thought, meters: res.meters }]);
      if (res.meters) setMeters(res.meters);
      resetTimer();
      
      const modelPrice = extractPrice(res.text);
      if (modelPrice !== null) {
        setLastPrice(currentPrice);
        setCurrentPrice(modelPrice);
        triggerProximityPulse();
      }

      if (res.scorecard) onFinish(res.scorecard);
    } catch (err) {} finally {
      setIsTyping(false);
    }
  };

  const handleAutoNegotiate = async () => {
    if (isAutoSimulating || isTyping) return;
    setIsAutoSimulating(true);
    setTimerActive(false);
    
    let msgIdx = 0;
    const interval = setInterval(() => {
      setAutoSimStatus(simMessages[msgIdx % simMessages.length]);
      msgIdx++;
    }, 2000);

    try {
      const scorecard = await gemini.current.autoSimulate(negotiationState);
      if (scorecard) {
        onFinish(scorecard);
      } else {
        onFinish({
          deal_status: "Simulation Failed",
          final_price: 0,
          skills_rating: { confidence: 0, logic: 0 },
          coach_tip: "The simulation engine encountered a data corruption. Try manual negotiation.",
          deal_summary: "Internal error during automated simulation.",
          reputation_gain: 0
        });
      }
    } catch (err) {
      setIsAutoSimulating(false);
      clearInterval(interval);
    }
  };

  const handleCounterOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterPrice.trim()) return;
    sendMessage(`My counter-offer is $${counterPrice}.`);
    setCounterPrice('');
  };

  const handleWalkAway = () => {
    onFinish({
      deal_status: 'Failed (Walked Away)',
      final_price: 0,
      skills_rating: { confidence: 5, logic: 5 },
      coach_tip: "Sometimes walking away is the strongest move, but you leave with nothing today.",
      deal_summary: "You chose to terminate the negotiation before a settlement was reached.",
      reputation_gain: -15
    });
  };

  const handleEscalate = () => {
    sendMessage("I'm escalating this. I need a decision now or I'm pulling the plug. Give me your absolute best number.");
  };

  const getDealProgress = () => {
    const start = negotiationState.marketValue;
    const goal = negotiationState.targetDealPrice;
    const range = Math.abs(goal - start);
    if (range === 0) return 100;
    const distanceCovered = Math.abs(currentPrice - start);
    const progress = (distanceCovered / range) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const getSentiment = (progress: number) => {
    if (progress >= 95) return { label: 'Settlement Near', color: 'text-brand-success' };
    if (progress >= 80) return { label: 'Strike Zone', color: 'text-brand-success/80' };
    if (progress >= 60) return { label: 'Hot', color: 'text-brand-warning' };
    if (progress >= 30) return { label: 'Warm', color: 'text-brand-info' };
    return { label: 'Cold', color: 'text-slate-500' };
  };

  const getMoodConfig = (mood?: string) => {
    const m = mood?.toLowerCase() || 'steady';
    if (m.includes('aggressive') || m.includes('hostile') || m.includes('savage') || m.includes('angry')) {
      return { color: 'text-brand-accent bg-brand-accent/10 border-brand-accent/20', icon: '⚡' };
    }
    if (m.includes('sarcastic') || m.includes('amused') || m.includes('mocking') || m.includes('sassy')) {
      return { color: 'text-brand-warning bg-brand-warning/10 border-brand-warning/20', icon: '😏' };
    }
    if (m.includes('friendly') || m.includes('accommodating') || m.includes('relieved') || m.includes('pleased')) {
      return { color: 'text-brand-success bg-brand-success/10 border-brand-success/20', icon: '🤝' };
    }
    if (m.includes('dismissive') || m.includes('bored') || m.includes('annoyed')) {
      return { color: 'text-slate-400 bg-white/5 border-white/10', icon: '🙄' };
    }
    return { color: 'text-brand-info bg-brand-info/10 border-brand-info/20', icon: '🧐' };
  };

  const progress = getDealProgress();
  const sentiment = getSentiment(progress);
  const priceDelta = currentPrice - lastPrice;
  const priceGap = Math.abs(currentPrice - negotiationState.targetDealPrice);

  // Pressure visual effects
  const stressLevel = meters.stress;
  const isHighPressure = stressLevel > 70;

  return (
    <div className={`flex flex-col h-full bg-brand-black transition-all duration-500 
      ${isFlinching ? 'scale-95 blur-[1px]' : ''} 
      ${isHighPressure ? 'shadow-[inset_0_0_100px_rgba(244,63,94,0.15)] ring-4 ring-brand-accent/20' : ''}`}>
      
      {/* AUTO-SIM OVERLAY */}
      {isAutoSimulating && (
        <div className="absolute inset-0 z-50 glass flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-brand-info/20 border-t-brand-info rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-brand-info animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-black italic uppercase tracking-[0.3em] text-white mb-2">Automated Simulation</h2>
          <p className="text-[10px] font-mono font-bold text-brand-info uppercase animate-pulse">{autoSimStatus}</p>
        </div>
      )}

      {/* CAMERA OVERLAY */}
      {isCameraActive && (
        <div className="absolute inset-0 z-50 glass flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-300">
          <div className="relative w-full max-w-2xl bg-brand-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <video ref={videoRef} autoPlay playsInline className="w-full aspect-video object-cover" />
            <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-4">
              <button onClick={captureImage} className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg transform active:scale-95 transition-transform">
                <div className="w-12 h-12 border-2 border-brand-black rounded-full" />
              </button>
              <button onClick={stopCamera} className="w-16 h-16 bg-brand-accent/20 border border-brand-accent/50 rounded-full flex items-center justify-center text-brand-accent">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS HUD */}
      <div className="bg-brand-gray/90 border-b border-white/5 px-8 py-4 backdrop-blur-xl z-20 shadow-lg shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 accent-gradient rounded-lg flex items-center justify-center font-bold text-white text-[10px]">HN</div>
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider leading-none">{negotiationState.item}</h2>
              <span className="text-[10px] text-slate-500 mt-1 font-mono uppercase">Difficulty: {negotiationState.difficulty}</span>
            </div>
          </div>

          {/* DYNAMIC DEAL PROXIMITY HUD */}
          <div className={`flex-1 max-w-lg mx-8 flex flex-col justify-center transition-all duration-300 ${pulseProximity ? 'scale-[1.01]' : ''}`}>
            <div className="flex justify-between items-end mb-2 px-1">
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Deal Velocity</span>
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${sentiment.color}`}>
                    {sentiment.label}
                  </span>
                </div>
                {priceDelta !== 0 && (
                   <span className={`text-[8px] font-mono font-bold uppercase mt-0.5 ${priceDelta > 0 ? 'text-brand-success' : 'text-brand-accent'}`}>
                      {priceDelta > 0 ? '▲' : '▼'} ${Math.abs(priceDelta).toLocaleString()} move
                   </span>
                )}
              </div>
              
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-mono font-bold text-white">
                  Current: <span className="text-brand-info">${currentPrice.toLocaleString()}</span>
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-0.5">
                  Gap to Goal: <span className="text-slate-300">${priceGap.toLocaleString()}</span>
                </span>
              </div>
            </div>
            
            <div className="h-3 bg-brand-black/60 rounded-full border border-white/5 p-[1.5px] relative group cursor-help overflow-visible" title={`Target Goal: $${negotiationState.targetDealPrice.toLocaleString()}`}>
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-700 ease-out rounded-full shadow-[0_0_15px_rgba(var(--brand-info-rgb),0.2)] ${
                    progress >= 95 ? 'bg-brand-success' : progress >= 80 ? 'bg-brand-success/60' : progress >= 60 ? 'bg-brand-warning' : 'bg-brand-info'
                  }`} 
                  style={{ width: `${progress}%` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent w-20 h-full animate-[shimmer_2s_infinite]" style={{ left: '-50px' }}></div>
              </div>
              
              {/* TARGET ANCHOR MARKER */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                style={{ left: '100%' }}
              >
                <div className="w-1.5 h-6 bg-brand-success rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)] relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[7px] font-black text-brand-success uppercase tracking-widest whitespace-nowrap bg-brand-success/10 border border-brand-success/20 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    GOAL $${negotiationState.targetDealPrice.toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* PROGRESS TICKS */}
              <div className="absolute inset-0 flex justify-between px-4 pointer-events-none opacity-20">
                {[25, 50, 75].map(tick => (
                  <div key={tick} className="h-full w-px bg-white/40"></div>
                ))}
              </div>
            </div>
          </div>

          {/* TIMER HUD */}
          <div className="flex flex-col items-center justify-center min-w-[80px]">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Decision Clock</span>
            <div className={`text-xl font-mono font-black ${timeLeft < 10 ? 'text-brand-accent animate-pulse' : 'text-white'}`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-white/5 px-3 py-1 rounded-full border border-white/5 ml-4">
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${meters.patience < 30 ? 'bg-brand-accent' : 'bg-brand-success'}`}></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{meters.mood}</span>
          </div>
        </div>
        <div className="flex items-center">
          <ProMeter label="Patience" value={meters.patience} color="bg-emerald-500" />
          <ProMeter label="Stress" value={meters.stress} color="bg-rose-500" />
          <ProMeter label="Analysis" value={meters.logic} color="bg-blue-500" />
          <ProMeter label="Toughness" value={meters.sarcasm} color="bg-amber-500" />
        </div>
      </div>

      {/* CHAT LOG */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar relative">
        {isHighPressure && (
          <div className="absolute inset-0 pointer-events-none z-10 opacity-30">
            <div className="w-full h-full border-[12px] border-brand-accent/20 animate-pulse"></div>
          </div>
        )}
        {messages.map((m, i) => {
          const moodConfig = m.role === 'model' ? getMoodConfig(m.meters?.mood) : null;
          
          return (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[80%] flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                {m.role === 'model' && m.meters?.mood && (
                  <div className={`mb-2 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] flex items-center space-x-2 ${moodConfig?.color}`}>
                    <span>{moodConfig?.icon}</span>
                    <span>Stance: {m.meters.mood}</span>
                  </div>
                )}
                
                <div className={`p-5 rounded-2xl border ${m.role === 'user' ? 'bg-brand-accent/10 border-brand-accent/30 text-white shadow-lg shadow-brand-accent/5' : 'bg-brand-gray-light border-white/5 text-slate-200 shadow-xl'}`}>
                  {m.image && <img src={m.image} className="w-full max-w-[240px] rounded-xl mb-4 border border-white/10" />}
                  <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex items-center space-x-2 p-2">
            <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Opponent processing leverage...</span>
          </div>
        )}
      </div>

      {/* CONTROLS */}
      <div className="p-8 bg-brand-gray/95 border-t border-white/5 shadow-2xl relative z-30 shrink-0">
        
        {/* PENDING IMAGE PREVIEW */}
        {pendingImage && (
          <div className="absolute bottom-full left-8 mb-4 animate-in slide-in-from-bottom-2 duration-300">
            <div className="relative group">
              <img src={pendingImage} className="w-32 h-32 object-cover rounded-2xl border-2 border-brand-accent shadow-2xl" />
              <button 
                onClick={() => setPendingImage(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-brand-accent text-white rounded-full flex items-center justify-center shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {showCounterInput && (
          <div className="absolute bottom-full left-0 right-0 p-8 bg-brand-gray border-t border-white/5 animate-in slide-in-from-bottom-4 duration-300 z-40">
            <form onSubmit={handleCounterOffer} className="flex space-x-4 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold">$</span>
                <input
                  type="number"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  placeholder="Enter tactical counter..."
                  className="w-full bg-brand-black border border-brand-info/30 rounded-xl pl-8 pr-4 py-3 text-sm text-white font-mono outline-none focus:ring-1 focus:ring-brand-info/50"
                  autoFocus
                />
              </div>
              <button type="submit" className="bg-brand-info/20 hover:bg-brand-info text-brand-info hover:text-white border border-brand-info/30 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">
                Submit Strategy
              </button>
              <button type="button" onClick={() => setShowCounterInput(false)} className="px-4 py-3 text-slate-500 hover:text-white text-xs uppercase font-bold tracking-widest">
                Cancel
              </button>
            </form>
          </div>
        )}

        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center space-x-2 bg-brand-black/50 p-1.5 rounded-2xl border border-white/5">
            <button 
              onClick={toggleRecording} 
              className={`p-2.5 rounded-xl transition-all ${isRecording ? 'bg-brand-accent text-white animate-pulse' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              title="Voice Input"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              onClick={startCamera} 
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              title="Take Photo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              title="Attach File"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
              </svg>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex-1 flex space-x-4">
            <input
              type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? "Listening..." : "Enter your argument or proposal..."}
              className="flex-1 bg-brand-black border border-white/10 rounded-2xl px-6 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-brand-accent/40 disabled:opacity-50"
              disabled={isAutoSimulating}
            />
            <button 
              type="submit" 
              disabled={isTyping || isAutoSimulating || (!input.trim() && !pendingImage)} 
              className="accent-gradient px-10 py-3.5 rounded-2xl font-bold uppercase text-xs tracking-widest text-white shadow-xl hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-50 disabled:grayscale transition-all"
            >
              Negotiate
            </button>
          </form>
        </div>

        {/* UNIFIED TACTICAL ACTION BAR */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar whitespace-nowrap">
          {/* PHRASES: DISCOVERY & DEFENSE */}
          {[
            { label: "Best price?", icon: "💰", content: "What is your absolute best price for this?" },
            { label: "Too expensive.", icon: "💸", content: "That is way too expensive for me. You'll need to do better." },
            { label: "Middle ground?", icon: "⚖️", content: "Is there a middle ground we can both agree on?" },
          ].map(p => (
            <button key={p.label} onClick={() => sendMessage(p.content)} disabled={isTyping || isAutoSimulating} className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 bg-white/5 border border-white/5 px-4 py-2.5 rounded-xl hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest disabled:opacity-30 shrink-0">
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}

          <div className="h-8 w-px bg-white/10 mx-2 shrink-0"></div>

          {/* STRATEGIC MOVES */}
          <button 
            type="button" 
            onClick={() => setShowCounterInput(!showCounterInput)} 
            disabled={isTyping || isAutoSimulating}
            className={`flex items-center space-x-2 text-[10px] font-bold px-4 py-2.5 rounded-xl border transition-all uppercase tracking-widest shrink-0 ${
              showCounterInput 
              ? 'bg-brand-info border-brand-info text-white shadow-lg shadow-brand-info/20' 
              : 'bg-brand-info/10 border-brand-info/20 text-brand-info hover:bg-brand-info/20'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.242.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.692C6.603 6.262 6 7.066 6 8s.603 1.738 1.324 2.216A4.535 4.535 0 009 10.908V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.692c.72-.478 1.324-1.282 1.324-2.216s-.603-1.738-1.324-2.216A4.535 4.535 0 0011 9.092V5z" clipRule="evenodd" />
            </svg>
            <span>Counter Move</span>
          </button>

          <button 
            type="button" 
            onClick={() => sendMessage("This is my final offer. Take it or leave it.")} 
            disabled={isTyping || isAutoSimulating}
            className="flex items-center space-x-2 text-[10px] font-bold px-4 py-2.5 rounded-xl border border-brand-warning/20 bg-brand-warning/10 text-brand-warning hover:bg-brand-warning/20 transition-all uppercase tracking-widest shrink-0 disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a3 3 0 01-3-3V6zm3 1a1 1 0 000 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            <span>Final Anchor</span>
          </button>

          <div className="h-8 w-px bg-white/10 mx-2 shrink-0"></div>

          {/* ESCALATION & THREATS */}
          <button 
            type="button" 
            onClick={handleEscalate} 
            disabled={isTyping || isAutoSimulating}
            className="flex items-center space-x-2 text-[10px] font-bold px-4 py-2.5 rounded-xl border border-brand-accent/20 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-all uppercase tracking-widest shrink-0 disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span>Escalate</span>
          </button>

          <button 
            type="button" 
            onClick={() => sendMessage("I'm serious. This is not a drill. If we don't fix this price right now, I'm walking away immediately.")} 
            disabled={isTyping || isAutoSimulating}
            className="flex items-center space-x-2 text-[10px] font-bold text-brand-warning/80 border border-brand-warning/10 px-4 py-2.5 rounded-xl hover:bg-brand-warning/5 hover:text-brand-warning transition-all uppercase tracking-widest disabled:opacity-30 shrink-0"
          >
            <span>👣</span>
            <span>I'll walk away.</span>
          </button>

          <div className="h-8 w-px bg-white/10 mx-2 shrink-0"></div>

          {/* AI AUTOMATION */}
          <button 
            type="button" 
            onClick={handleAutoNegotiate} 
            disabled={isTyping || isAutoSimulating}
            className="flex items-center space-x-2 text-[10px] font-bold px-4 py-2.5 rounded-xl border border-brand-info/20 bg-brand-info/10 text-brand-info hover:bg-brand-info/20 transition-all uppercase tracking-widest shrink-0 disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            <span>Simulate AI</span>
          </button>

          <div className="flex-1 shrink-0"></div>

          {/* FINAL CONCLUSION */}
          <button 
            onClick={handleWalkAway} 
            disabled={isAutoSimulating}
            className="flex items-center space-x-2 text-[10px] font-bold text-rose-500 border border-rose-500/20 px-4 py-2.5 rounded-xl hover:bg-rose-500/10 transition-all uppercase tracking-widest shrink-0 disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            <span>Walk Away</span>
          </button>

          <button 
            type="button" 
            onClick={() => sendMessage("I accept your offer. Let's finalize this deal.")} 
            disabled={isTyping || isAutoSimulating}
            className="flex items-center space-x-2 text-[10px] font-bold px-6 py-2.5 rounded-xl border border-brand-success/40 bg-brand-success/10 text-brand-success hover:bg-brand-success/20 shadow-lg shadow-brand-success/5 transition-all uppercase tracking-widest shrink-0 disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Accept Deal</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;