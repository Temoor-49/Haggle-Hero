
import React, { useState, useRef, useEffect } from 'react';
import { Message, NegotiationState, ScorecardData, InternalMeters } from '../types';
import { GeminiService } from '../services/geminiService';

interface ChatInterfaceProps {
  negotiationState: NegotiationState;
  onFinish: (scorecard: ScorecardData) => void;
}

interface TacticalState {
  messages: Message[];
  meters: InternalMeters;
  leverage: string[];
}

const TacticalMeter: React.FC<{ label: string; value: number; color: string; accent: string }> = ({ label, value, color, accent }) => (
  <div className="flex-1 px-4 md:px-6 border-r border-white/5 last:border-0 relative group">
    <div className="flex justify-between items-end mb-1">
      <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-400 transition-colors">{label}</span>
      <span className={`text-[9px] md:text-[10px] font-mono font-black ${accent}`}>{value}%</span>
    </div>
    <div className="h-1 bg-brand-black/60 rounded-full overflow-hidden shadow-inner">
      <div className={`h-full transition-all duration-1000 ease-out ${color} rounded-full`} style={{ width: `${value}%` }}></div>
    </div>
  </div>
);

const MoodBadge: React.FC<{ mood: string }> = ({ mood }) => {
  const getMoodConfig = (m: string) => {
    const normalized = m.toLowerCase();
    if (normalized.includes('aggressive') || normalized.includes('angry') || normalized.includes('hostile')) {
      return { color: 'text-brand-accent bg-brand-accent/10 border-brand-accent/20', icon: '😡', label: 'Aggressive' };
    }
    if (normalized.includes('accommodating') || normalized.includes('friendly') || normalized.includes('happy')) {
      return { color: 'text-brand-success bg-brand-success/10 border-brand-success/20', icon: '😊', label: 'yielding' };
    }
    if (normalized.includes('suspicious') || normalized.includes('skeptical') || normalized.includes('cautious')) {
      return { color: 'text-brand-warning bg-brand-warning/10 border-brand-warning/20', icon: '🤨', label: 'Suspicious' };
    }
    if (normalized.includes('frustrated') || normalized.includes('annoyed') || normalized.includes('impatient')) {
      return { color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', icon: '😫', label: 'Frustrated' };
    }
    if (normalized.includes('cold') || normalized.includes('analytical') || normalized.includes('logical')) {
      return { color: 'text-brand-info bg-brand-info/10 border-brand-info/20', icon: '🧊', label: 'Clinical' };
    }
    return { color: 'text-slate-400 bg-white/5 border-white/10', icon: '😐', label: m || 'Neutral' };
  };

  const config = getMoodConfig(mood);
  
  return (
    <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest mb-2 animate-in fade-in slide-in-from-left-2 ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
};

const LeverageBadge: React.FC<{ type: string; text: string }> = ({ type, text }) => {
  const isFlaw = type.toUpperCase() === 'FLAW';
  return (
    <div className={`mt-3 flex items-center space-x-2 px-3 py-1.5 rounded-xl border animate-in slide-in-from-bottom-2 ${
      isFlaw 
      ? 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent' 
      : 'bg-brand-success/10 border-brand-success/20 text-brand-success'
    }`}>
      <div className="flex space-x-1">
        <div className={`w-1 h-1 rounded-full animate-ping ${isFlaw ? 'bg-brand-accent' : 'bg-brand-success'}`}></div>
        <div className={`w-1 h-1 rounded-full ${isFlaw ? 'bg-brand-accent' : 'bg-brand-success'}`}></div>
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest leading-none">
        {isFlaw ? 'Vulnerability spotted' : 'Asset confirmed'}: {text}
      </span>
    </div>
  );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ negotiationState, onFinish }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showThoughts, setShowThoughts] = useState(false);
  const [meters, setMeters] = useState<InternalMeters>({ stress: 0, patience: 100, logic: 0, mood: 'Neutral' });
  const [leverage, setLeverage] = useState<string[]>([]);
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Undo/Redo State
  const [timeline, setTimeline] = useState<TacticalState[]>([]);
  const [timelineIndex, setTimelineIndex] = useState(-1);
  
  // Counter offer state
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [counterValue, setCounterValue] = useState('');

  // Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const gemini = useRef(new GeminiService());

  const extractLeveragePoints = (thought: string) => {
    const points: Array<{ type: string; text: string }> = [];
    const leverageMatch = thought.matchAll(/\[LEVERAGE:(.*?):(.*?)\]/g);
    for (const m of Array.from(leverageMatch) as RegExpMatchArray[]) {
      if (m[1] && m[2]) {
        points.push({ type: m[1], text: m[2] });
      }
    }
    return points;
  };

  useEffect(() => {
    const init = async () => {
      setIsTyping(true);
      const res = await gemini.current.start(negotiationState, negotiationState.initialImage);
      
      const initialMsgs: Message[] = [{ role: 'model', content: res.text, thought: res.thought, meters: res.meters }];
      const points = extractLeveragePoints(res.thought);
      const initialLeverage = points.map(p => p.text);

      const initialState: TacticalState = {
        messages: initialMsgs,
        meters: res.meters,
        leverage: Array.from(new Set(initialLeverage))
      };

      setMessages(initialMsgs);
      setMeters(res.meters);
      setLeverage(initialState.leverage);
      setTimeline([initialState]);
      setTimelineIndex(0);

      setIsTyping(false);
    };
    init();

    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInput(prev => {
            const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + separator + finalTranscript;
          });
        }
        setInterimTranscript(currentInterim);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        setInterimTranscript('');
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [negotiationState]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        setInterimTranscript('');
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start speech recognition", err);
        setIsListening(true);
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const pushToTimeline = (msgs: Message[], mtrs: InternalMeters, levs: string[]) => {
    const newState: TacticalState = { messages: msgs, meters: mtrs, leverage: levs };
    const newTimeline = timeline.slice(0, timelineIndex + 1);
    newTimeline.push(newState);
    setTimeline(newTimeline);
    setTimelineIndex(newTimeline.length - 1);
  };

  const handleUndo = () => {
    if (timelineIndex > 0) {
      const prevIndex = timelineIndex - 1;
      const state = timeline[prevIndex];
      setMessages(state.messages);
      setMeters(state.meters);
      setLeverage(state.leverage);
      setTimelineIndex(prevIndex);
    }
  };

  const handleRedo = () => {
    if (timelineIndex < timeline.length - 1) {
      const nextIndex = timelineIndex + 1;
      const state = timeline[nextIndex];
      setMessages(state.messages);
      setMeters(state.meters);
      setLeverage(state.leverage);
      setTimelineIndex(nextIndex);
    }
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Camera access denied", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setSelectedImage(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }
    }
  };

  const sendMessage = async (content: string, image?: string | null) => {
    if ((!content.trim() && !image) || isTyping || isSimulating) return;

    if (isListening) {
      recognitionRef.current?.stop();
    }

    const userMsg: Message = { role: 'user', content, image: image || undefined };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setInterimTranscript('');
    setSelectedImage(null);
    setIsTyping(true);

    try {
      const res = await gemini.current.chat(nextMessages, negotiationState);
      
      const updatedMessages: Message[] = [...nextMessages, { role: 'model', content: res.text, thought: res.thought, meters: res.meters }];
      setMessages(updatedMessages);
      setMeters(res.meters);

      const points = extractLeveragePoints(res.thought);
      const found = points.map(p => p.text);
      const updatedLeverage = Array.from(new Set([...leverage, ...found]));
      setLeverage(updatedLeverage);

      pushToTimeline(updatedMessages, res.meters, updatedLeverage);

      if (res.scorecard) {
        setTimeout(() => onFinish({
          ...res.scorecard,
          reputation_gain: res.scorecard.deal_status?.toLowerCase().includes('success') ? 50 : -20
        }), 4000);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', content: "SYSTEM_ALERT: Neural bridge destabilized. Critical state failure." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAutoNegotiate = async () => {
    if (isTyping || isSimulating) return;
    setIsSimulating(true);
    setIsTyping(true);
    
    setMessages(prev => [...prev, { role: 'user', content: "[SYSTEM_COMMAND]: INITIATING_AUTO_NEGOTIATION_SIMULATION..." }]);

    try {
      const scorecard = await gemini.current.autoSimulate(negotiationState);
      if (scorecard) {
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: "Neural simulation complete. Synchronizing final outcome data...", 
          thought: "Calculated trajectory based on current tactical meters and industry standard benchmarks." 
        }]);
        setTimeout(() => onFinish({
          ...scorecard,
          reputation_gain: scorecard.deal_status?.toLowerCase().includes('success') ? 100 : -50
        }), 3000);
      } else {
        throw new Error("Scorecard generation failed");
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', content: "CRITICAL: Simulation sequence failed to resolve. Manual oversight required." }]);
      setIsSimulating(false);
      setIsTyping(false);
    }
  };

  const handleFinalOffer = () => sendMessage("This is my final offer. Take it or leave it.");
  const handleAcceptOffer = () => sendMessage("I accept your offer. Let's close the deal.");
  const handleBuyNow = () => sendMessage("I want to buy this now at your asking price.");
  const handleWalkAway = () => onFinish({ 
    deal_status: 'Failed', 
    final_price: 0, 
    skills_rating: { confidence: 1, logic: 1 }, 
    coach_tip: "Walking away is a valid tactical choice, but here it resulted in a failed acquisition. Review your leverage strategy.", 
    reputation_gain: -15 
  });

  const handleCounterOffer = () => {
    if (!counterValue) {
      setShowCounterInput(true);
      return;
    }
    sendMessage(`I want to make a counter offer. My new price is $${counterValue}.`);
    setCounterValue('');
    setShowCounterInput(false);
  };

  return (
    <div className="flex flex-col h-full w-full bg-brand-black shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden relative font-sans">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      {/* TACTICAL HUD */}
      <div className="bg-brand-black/95 border-b border-white/10 p-4 md:px-12 flex flex-col space-y-4 shrink-0 z-30 shadow-2xl backdrop-blur-3xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black italic shadow-[0_0_20px_rgba(0,0,0,0.5)] text-white text-[12px] transform transition-all ${isSimulating ? 'bg-brand-info animate-pulse' : 'accent-gradient'}`}>
              {isSimulating ? 'SIM' : 'LIVE'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-3">
                <h2 className="text-[14px] font-black uppercase tracking-[0.2em] text-white leading-none truncate">
                  {negotiationState.item}
                </h2>
                <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-brand-info animate-ping' : 'bg-brand-success shadow-[0_0_8px_var(--brand-success)]'}`}></div>
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-1.5 uppercase tracking-widest truncate">{negotiationState.persona}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 md:space-x-5">
            <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1.5 shadow-inner">
              <button 
                onClick={handleUndo} 
                disabled={timelineIndex <= 0 || isTyping || isSimulating}
                className="p-2 text-slate-500 hover:text-white disabled:opacity-20 transition-all rounded-lg hover:bg-white/10"
                title="Undo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <button 
                onClick={handleRedo} 
                disabled={timelineIndex >= timeline.length - 1 || isTyping || isSimulating}
                className="p-2 text-slate-500 hover:text-white disabled:opacity-20 transition-all rounded-lg hover:bg-white/10"
                title="Redo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                </svg>
              </button>
            </div>
            
            <button 
              onClick={() => setShowThoughts(!showThoughts)} 
              disabled={isSimulating}
              className={`px-5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                showThoughts ? 'bg-brand-info border-brand-info text-white shadow-lg' : 'border-white/10 text-slate-500 hover:text-white hover:border-white/30 disabled:opacity-20'
              }`}
            >
              Analyze
            </button>
            
            <button 
              onClick={handleWalkAway} 
              disabled={isSimulating}
              className="px-5 py-2.5 rounded-xl border border-brand-accent/30 text-brand-accent text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-accent hover:text-white transition-all disabled:opacity-20 shadow-lg shadow-brand-accent/5"
            >
              Abort
            </button>
          </div>
        </div>

        <div className="flex py-3.5 bg-brand-black/40 rounded-2xl border border-white/5 shadow-inner">
          <TacticalMeter label="Stress" value={meters.stress} color="bg-brand-accent" accent="text-brand-accent" />
          <TacticalMeter label="Patience" value={meters.patience} color="bg-brand-warning" accent="text-brand-warning" />
          <TacticalMeter label="Logic" value={meters.logic} color="bg-brand-info" accent="text-brand-info" />
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* SIDEBAR */}
        <div className="hidden xl:flex w-72 border-r border-white/10 bg-brand-black/40 p-8 flex-col shrink-0 overflow-y-auto custom-scrollbar z-20">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center">
              <span className="w-3 h-0.5 accent-gradient mr-3 rounded-full"></span>Leverage
            </h3>
            <span className="text-[8px] font-mono text-brand-info bg-brand-info/10 px-2 py-0.5 rounded border border-brand-info/20">LIVE_SCAN</span>
          </div>
          
          <div className="space-y-4">
            {negotiationState.initialImage && (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 group shadow-2xl">
                <img src={negotiationState.initialImage} alt="Initial" className="w-full h-auto object-cover max-h-40 transition-transform duration-700 group-hover:scale-110" />
              </div>
            )}

            {leverage.length === 0 ? (
              <div className="p-10 border border-dashed border-white/5 rounded-2xl text-center opacity-20 italic text-[9px] uppercase tracking-[0.4em]">
                Acquiring Points...
              </div>
            ) : (
              leverage.map((item, i) => (
                <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] hover:border-white/10 transition-all group animate-in slide-in-from-left-4 duration-500">
                  <p className="text-[11px] text-slate-300 font-bold leading-relaxed uppercase italic tracking-tight group-hover:text-brand-info transition-colors">{item}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MESSAGES LOG */}
        <div className="flex-1 flex flex-col min-w-0 bg-brand-black/20 z-10 relative">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 md:px-16 py-8 space-y-8 custom-scrollbar scroll-smooth">
            {messages.map((m, i) => {
              const points = m.role === 'model' && m.thought ? extractLeveragePoints(m.thought) : [];
              
              return (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  {m.role === 'model' && showThoughts && m.thought && (
                    <div className="mb-4 w-full max-w-[95%] bg-brand-info/[0.04] border border-brand-info/10 rounded-2xl p-5 text-[11px] font-mono text-brand-info leading-relaxed backdrop-blur-sm">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-1.5 h-1.5 bg-brand-info rounded-full animate-pulse"></div>
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-50">Deep Neural Analysis</span>
                      </div>
                      {m.thought}
                    </div>
                  )}
                  
                  <div className={`relative max-w-[90%] md:max-w-[80%] rounded-3xl p-5 md:p-6 border shadow-2xl ${
                    m.role === 'user' 
                      ? 'accent-gradient text-white rounded-tr-none border-white/20' 
                      : 'bg-brand-gray-light/90 backdrop-blur-xl text-slate-100 rounded-tl-none border-white/10'
                  }`}>
                    {m.role === 'model' && m.meters?.mood && (
                      <MoodBadge mood={m.meters.mood} />
                    )}
                    {m.image && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-white/10 max-h-60 bg-black shadow-inner">
                        <img src={m.image} alt="Evidence" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="text-[14px] md:text-[16px] leading-relaxed font-bold tracking-tight whitespace-pre-wrap">
                      {m.content}
                    </div>
                    {points.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {points.map((p, idx) => (
                          <LeverageBadge key={idx} type={p.type} text={p.text} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/5 rounded-2xl px-6 py-3 border border-white/5 backdrop-blur-md">
                  <div className="flex space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* COMMAND CENTER */}
          <div className="p-4 md:p-8 bg-brand-black/95 border-t border-white/10 shrink-0 z-30 backdrop-blur-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            {isSimulating && (
              <div className="absolute inset-0 bg-brand-black/95 z-40 flex flex-col items-center justify-center animate-in fade-in backdrop-blur-xl">
                <div className="w-16 h-16 border-4 border-brand-info/30 border-t-brand-info rounded-full animate-spin mb-6"></div>
                <span className="text-[12px] font-black uppercase tracking-[0.6em] text-brand-info animate-pulse">Running Simulation</span>
              </div>
            )}

            {isCameraOpen ? (
              <div className="mb-6 relative rounded-[2.5rem] overflow-hidden border border-brand-info/30 h-56 bg-black shadow-2xl animate-in zoom-in-95">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-70" />
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-4">
                  <button onClick={capturePhoto} className="px-8 py-3 bg-brand-success text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Capture Evidence</button>
                  <button onClick={stopCamera} className="px-8 py-3 bg-brand-black border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Abort Camera</button>
                </div>
              </div>
            ) : selectedImage && (
              <div className="mb-6 flex items-center bg-brand-info/10 p-4 rounded-2xl border border-brand-info/20 animate-in slide-in-from-top-4">
                <img src={selectedImage} alt="Preview" className="h-14 w-14 object-cover rounded-xl shadow-lg" />
                <div className="ml-5 flex-1">
                  <span className="text-[10px] font-black text-brand-info uppercase tracking-widest block">Payload Ready</span>
                </div>
                <button onClick={() => setSelectedImage(null)} className="p-3 text-slate-500 hover:text-brand-accent">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
            
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 flex flex-col space-y-4">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(input, selectedImage); }} className="flex space-x-3 items-center">
                  <div className="flex space-x-2">
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()} 
                      className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-brand-info transition-all shrink-0 shadow-lg"
                      title="Upload Image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button 
                      type="button" 
                      onClick={startCamera} 
                      className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-brand-accent transition-all shrink-0 shadow-lg"
                      title="Open Camera"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      </svg>
                    </button>
                    <button 
                      type="button" 
                      onClick={toggleListening} 
                      className={`p-4 border rounded-2xl transition-all shrink-0 shadow-lg ${
                        isListening 
                          ? 'bg-brand-accent/20 border-brand-accent text-brand-accent animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]' 
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-brand-info hover:border-brand-info/30'
                      }`}
                      title="Voice Transcription"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex-1 relative group">
                    <input
                      type="text" value={isListening ? (input + (input ? ' ' : '') + interimTranscript) : input} onChange={(e) => setInput(e.target.value)}
                      placeholder={isListening ? "Listening... (Talk now)" : "Enter tactical response..."}
                      className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[15px] font-bold text-white outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all placeholder:text-slate-700 shadow-inner ${isListening ? 'border-brand-accent/50 ring-1 ring-brand-accent/20 animate-pulse' : ''}`}
                      disabled={isTyping || isSimulating}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <button
                        type="submit" disabled={isTyping || isSimulating || (!input.trim() && !selectedImage)}
                        className="accent-gradient hover:opacity-90 disabled:opacity-20 text-white px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 italic"
                      >
                        Transmit
                      </button>
                    </div>
                  </div>
                </form>

                {showCounterInput && (
                  <div className="flex items-center space-x-4 bg-brand-info/10 border border-brand-info/30 p-3 rounded-2xl animate-in slide-in-from-bottom-2">
                    <div className="flex-1 flex items-center space-x-3">
                      <span className="text-[12px] font-black text-brand-info">SET_PRICE:</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-info font-black">$</span>
                        <input 
                          type="number" value={counterValue} onChange={(e) => setCounterValue(e.target.value)}
                          className="w-full bg-brand-black border border-brand-info/30 rounded-xl pl-8 pr-4 py-2 text-white text-[13px] font-mono font-bold outline-none"
                          autoFocus placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={handleCounterOffer} className="bg-brand-info text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Execute</button>
                      <button onClick={() => { setShowCounterInput(false); setCounterValue(''); }} className="p-2 text-slate-500 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 shrink-0">
                <button
                  onClick={handleAutoNegotiate} disabled={isTyping || isSimulating}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-brand-info/5 border border-brand-info/20 text-brand-info hover:bg-brand-info hover:text-white transition-all disabled:opacity-10 shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span className="text-[9px] font-black uppercase tracking-widest">Simulate</span>
                </button>

                <button
                  onClick={() => setShowCounterInput(true)} disabled={isTyping || isSimulating || showCounterInput}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:border-brand-info/50 hover:text-brand-info transition-all shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                  <span className="text-[9px] font-black uppercase tracking-widest">Counter</span>
                </button>

                <button
                  onClick={handleBuyNow} disabled={isTyping || isSimulating}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                  <span className="text-[9px] font-black uppercase tracking-widest">Buy Now</span>
                </button>

                <button
                  onClick={handleFinalOffer} disabled={isTyping || isSimulating}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-brand-warning/5 border border-brand-warning/20 text-brand-warning hover:bg-brand-warning transition-all shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-[9px] font-black uppercase tracking-widest">Ultimatum</span>
                </button>

                <button
                  onClick={handleAcceptOffer} disabled={isTyping || isSimulating}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-brand-success/10 border border-brand-success/30 text-brand-success hover:bg-brand-success transition-all shadow-lg col-span-2 sm:col-span-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className="text-[9px] font-black uppercase tracking-widest">Accept</span>
                </button>
              </div>
            </div>
            
            <input type="file" ref={fileInputRef} onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { const r = new FileReader(); r.onload = () => setSelectedImage(r.result as string); r.readAsDataURL(f); }
            }} accept="image/*" className="hidden" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
