
import React, { useState, useRef, useEffect } from 'react';
import { NegotiationState, CustomPersona, PersonaTraits } from '../types';
import { GeminiService } from '../services/geminiService';

interface SetupFormProps {
  onStart: (state: NegotiationState) => void;
}

const DEFAULT_PERSONAS = [
  { id: 'vendor', name: 'Stubborn Street Vendor', icon: '🏪', bg: 'from-orange-500/10' },
  { id: 'hr', name: 'Ice-Cold HR Director', icon: '🏢', bg: 'from-blue-500/10' },
  { id: 'landlord', name: 'Greedy Landlord', icon: '🏠', bg: 'from-green-500/10' },
  { id: 'pawn', name: 'Skeptic Pawn Shop Owner', icon: '💎', bg: 'from-purple-500/10' },
  { id: 'car_dealer', name: 'Shady Used Car Dealer', icon: '🚗', bg: 'from-red-500/10' },
  { id: 'estate_agent', name: 'Calculating Estate Agent', icon: '🏘️', bg: 'from-cyan-500/10' },
  { id: 'art_collector', name: 'Demanding Art Collector', icon: '🖼️', bg: 'from-amber-500/10' },
];

const SetupForm: React.FC<SetupFormProps> = ({ onStart }) => {
  const [item, setItem] = useState('Vintage Rolex Watch');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [selectedPersonaId, setSelectedPersonaId] = useState(DEFAULT_PERSONAS[0].id);
  const [basePrice, setBasePrice] = useState('12000');
  const [targetPrice, setTargetPrice] = useState('10000');
  const [difficulty, setDifficulty] = useState<'easy' | 'pro' | 'insane'>('pro');
  const [initialImage, setInitialImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [detectedIndustry, setDetectedIndustry] = useState<string>("");
  const [isDetecting, setIsDetecting] = useState(false);

  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>([]);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newPersonaTraits, setNewPersonaTraits] = useState<PersonaTraits>({
    stubbornness: 50,
    friendliness: 50,
    formality: 50,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gemini = useRef(new GeminiService());

  useEffect(() => {
    const saved = localStorage.getItem('custom_personas');
    if (saved) {
      try {
        setCustomPersonas(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load custom personas", e);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (item.trim().length > 3) {
        setIsDetecting(true);
        const industry = await gemini.current.detectIndustry(item);
        setDetectedIndustry(industry);
        setIsDetecting(false);

        if (!isCreatingCustom && !customPersonas.find(p => p.id === selectedPersonaId)) {
          const indLower = industry.toLowerCase();
          if (indLower.includes('car') || indLower.includes('automotive')) {
            setSelectedPersonaId('car_dealer');
          } else if (indLower.includes('jewelry') || indLower.includes('gold') || indLower.includes('pawn')) {
            setSelectedPersonaId('pawn');
          } else if (indLower.includes('real estate') || indLower.includes('property')) {
            setSelectedPersonaId('landlord');
          } else if (indLower.includes('art')) {
            setSelectedPersonaId('art_collector');
          }
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [item, isCreatingCustom, customPersonas, selectedPersonaId]);

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
        setInitialImage(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setInitialImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCustomPersona = () => {
    if (!newPersonaName.trim()) return;
    const newPersona: CustomPersona = {
      id: `custom_${Date.now()}`,
      name: newPersonaName,
      traits: { ...newPersonaTraits },
      icon: '👤',
      bg: 'from-brand-accent/10',
    };
    const updated = [...customPersonas, newPersona];
    setCustomPersonas(updated);
    localStorage.setItem('custom_personas', JSON.stringify(updated));
    setSelectedPersonaId(newPersona.id);
    setIsCreatingCustom(false);
    setNewPersonaName('');
  };

  const handleDeleteCustomPersona = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = customPersonas.filter(p => p.id !== id);
    setCustomPersonas(updated);
    localStorage.setItem('custom_personas', JSON.stringify(updated));
    if (selectedPersonaId === id) setSelectedPersonaId(DEFAULT_PERSONAS[0].id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const marketVal = parseFloat(basePrice) || 1000;
    const targetVal = parseFloat(targetPrice) || marketVal;
    
    let personaName = '';
    let personaTraits: PersonaTraits | undefined = undefined;

    const matchedDefault = DEFAULT_PERSONAS.find(p => p.id === selectedPersonaId);
    if (matchedDefault) {
      personaName = matchedDefault.name;
    } else {
      const matchedCustom = customPersonas.find(p => p.id === selectedPersonaId);
      if (matchedCustom) {
        personaName = matchedCustom.name;
        personaTraits = matchedCustom.traits;
      }
    }

    if (!personaTraits) {
      personaTraits = { stubbornness: 50, friendliness: 50, formality: 50 };
    }
    
    let aiTarget: number;
    let aiFloor: number;

    if (role === 'buyer') {
      aiTarget = marketVal * 1.25;
      aiFloor = Math.max(targetVal * 1.05, marketVal * 0.9);
    } else {
      aiTarget = marketVal * 0.75;
      aiFloor = Math.min(targetVal * 0.95, marketVal * 1.1);
    }

    const state: NegotiationState = {
      item, role, persona: personaName, personaTraits, difficulty,
      initialImage: initialImage || undefined,
      detectedIndustry,
      marketValue: marketVal,
      targetDealPrice: targetVal,
      hiddenState: {
        targetPrice: aiTarget,
        floorPrice: aiFloor,
        patienceMeter: 100,
        logicScore: 0
      },
      leveragePoints: []
    };
    onStart(state);
  };

  const allPersonas = [...DEFAULT_PERSONAS, ...customPersonas];

  return (
    <div className="w-full max-w-[1240px] flex flex-col lg:flex-row h-full max-h-[90vh] bg-brand-gray/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-8 duration-700 glass relative">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      
      {/* LEFT SECTION: MAIN FORM */}
      <div className="flex-1 flex flex-col p-5 md:p-7 lg:p-8 border-b lg:border-b-0 lg:border-r border-white/5 min-h-0 overflow-hidden z-10">
        <div className="shrink-0 mb-4">
          <div className="flex items-center space-x-3 mb-1.5">
            <span className="w-6 h-1 accent-gradient rounded-full"></span>
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-accent">Mission Parameters</span>
          </div>
          <h2 className="text-2xl font-black tracking-tighter text-white leading-tight uppercase italic">
            New <span className="text-slate-500">Operation</span>
          </h2>
        </div>
        
        <form id="negotiation-setup" onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-2">
          {/* ITEM NAME */}
          <div className="space-y-1.5 relative">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Negotiation Subject</label>
            <div className="relative">
              <input
                type="text" value={item} onChange={(e) => setItem(e.target.value)}
                className="w-full bg-brand-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all placeholder:text-slate-700 shadow-inner group"
                placeholder="Item or Service Name" required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {isDetecting ? (
                  <div className="w-3.5 h-3.5 border-2 border-brand-info/30 border-t-brand-info rounded-full animate-spin"></div>
                ) : detectedIndustry ? (
                  <div className="flex items-center space-x-1.5 bg-brand-info/10 border border-brand-info/20 px-2.5 py-1 rounded-full">
                    <span className="w-1 h-1 bg-brand-info rounded-full"></span>
                    <span className="text-[8px] font-black text-brand-info uppercase tracking-widest">{detectedIndustry}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* PRICING GRID */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Market Val ($)</label>
              <input 
                type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} 
                className="w-full bg-brand-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono font-bold focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all shadow-inner" 
                required 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Target Price ($)</label>
              <input 
                type="number" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} 
                className="w-full bg-brand-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono font-bold focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all shadow-inner" 
                required 
              />
            </div>
          </div>

          {/* ROLE & DIFFICULTY GRID */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Perspective</label>
              <div className="flex p-1 bg-brand-black/60 rounded-xl border border-white/10 shadow-inner">
                <button type="button" onClick={() => setRole('buyer')} className={`flex-1 py-2 rounded-lg font-black uppercase text-[9px] tracking-[0.2em] transition-all ${role === 'buyer' ? 'accent-gradient text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Buyer</button>
                <button type="button" onClick={() => setRole('seller')} className={`flex-1 py-2 rounded-lg font-black uppercase text-[9px] tracking-[0.2em] transition-all ${role === 'seller' ? 'accent-gradient text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Seller</button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Difficulty</label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-brand-black/60 rounded-xl border border-white/10 shadow-inner">
                {(['easy', 'pro', 'insane'] as const).map(d => (
                  <button 
                    key={d} type="button" onClick={() => setDifficulty(d)} 
                    className={`py-2 rounded-lg text-[8px] font-black uppercase tracking-[0.1em] transition-all ${
                      difficulty === d ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PERSONA LAB - Tightened Card */}
          <div className="bg-brand-black/30 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-info">Psychological Profile</h3>
              <button 
                type="button" 
                onClick={() => setIsCreatingCustom(!isCreatingCustom)}
                className="px-2 py-1 bg-brand-info/10 border border-brand-info/20 rounded-md text-[8px] font-black uppercase text-brand-info hover:bg-brand-info hover:text-white transition-all"
              >
                {isCreatingCustom ? 'Cancel' : 'Tweak Personality'}
              </button>
            </div>

            {isCreatingCustom ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <input 
                  type="text" 
                  value={newPersonaName} 
                  onChange={e => setNewPersonaName(e.target.value)}
                  className="w-full bg-brand-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  placeholder="Persona Identity Name"
                />
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'stubbornness' as keyof PersonaTraits, label: 'Stubborn' },
                    { key: 'friendliness' as keyof PersonaTraits, label: 'Friendly' },
                    { key: 'formality' as keyof PersonaTraits, label: 'Formal' },
                  ].map(trait => (
                    <div key={trait.key} className="space-y-1">
                      <div className="flex justify-between">
                        <label className="text-[7px] font-bold uppercase text-slate-500">{trait.label}</label>
                        <span className="text-[7px] font-mono text-brand-info">{newPersonaTraits[trait.key]}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={newPersonaTraits[trait.key]} 
                        onChange={e => setNewPersonaTraits({...newPersonaTraits, [trait.key]: parseInt(e.target.value)})}
                        className="w-full h-1 bg-brand-black rounded-lg appearance-none cursor-pointer accent-brand-info"
                      />
                    </div>
                  ))}
                </div>
                <button 
                  type="button" 
                  onClick={handleSaveCustomPersona}
                  disabled={!newPersonaName.trim()}
                  className="w-full py-2 bg-brand-info/20 border border-brand-info/40 rounded-lg text-[8px] font-black uppercase text-brand-info hover:bg-brand-info hover:text-white transition-all disabled:opacity-30"
                >
                  Confirm Profile
                </button>
              </div>
            ) : (
              <div className="py-2 border border-dashed border-white/5 rounded-xl opacity-30 italic text-[8px] text-slate-500 text-center">
                Select an adversary from the database or create custom logic.
              </div>
            )}
          </div>

          {/* PHOTO EVIDENCE - More compact grid */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Tactical Imagery (Visual Logic)</label>
            <div className="relative">
              {initialImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-brand-accent/20 bg-brand-black/40 h-32 shadow-lg group">
                  <img src={initialImage} alt="Preview" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-brand-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <button type="button" onClick={() => setInitialImage(null)} className="px-4 py-2 bg-brand-accent text-white rounded-lg font-black text-[8px] uppercase tracking-widest">Remove Image</button>
                  </div>
                </div>
              ) : isCameraOpen ? (
                <div className="relative rounded-2xl overflow-hidden border border-brand-info/30 h-36 bg-black shadow-xl">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2">
                    <button type="button" onClick={capturePhoto} className="px-4 py-2 bg-brand-success text-white rounded-lg font-black text-[8px] uppercase tracking-widest">Capture</button>
                    <button type="button" onClick={stopCamera} className="px-4 py-2 bg-brand-black/80 text-white rounded-lg font-black text-[8px] uppercase tracking-widest border border-white/10">Exit</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button" onClick={startCamera}
                    className="flex flex-col items-center justify-center py-4 bg-brand-black/40 rounded-xl border border-dashed border-white/5 hover:border-brand-accent/40 transition-all group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 group-hover:text-brand-accent mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white">Camera</span>
                  </button>
                  <button 
                    type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center py-4 bg-brand-black/40 rounded-xl border border-dashed border-white/5 hover:border-brand-info/40 transition-all group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 group-hover:text-brand-info mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white">Upload</span>
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                </div>
              )}
            </div>
          </div>
        </form>

        {/* START BUTTON */}
        <div className="shrink-0 pt-4">
          <button form="negotiation-setup" type="submit" className="relative group w-full">
            <div className="absolute -inset-1 bg-brand-accent rounded-xl blur-md opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative w-full accent-gradient py-3.5 rounded-xl font-black uppercase text-sm italic tracking-tight text-white flex items-center justify-center space-x-3 shadow-lg transform transition-all group-hover:translate-y-[-2px] group-active:translate-y-[1px]">
              <span className="tracking-[0.1em]">Engage Adversary</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: PERSONA SELECTION */}
      <div className="w-full lg:w-[380px] bg-brand-black/40 flex flex-col shrink-0 min-h-0 relative z-20">
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
        <div className="p-6 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Adversary Database</label>
              <span className="text-[7px] font-mono text-brand-accent mt-0.5 tracking-widest">v5.2 ACTIVE_SCAN</span>
            </div>
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-brand-accent rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-brand-accent/30 rounded-full"></div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-5 pb-8 custom-scrollbar space-y-2">
          {allPersonas.map((p) => {
            const isCustom = 'traits' in p;
            return (
              <button
                key={p.id} type="button" onClick={() => setSelectedPersonaId(p.id)}
                className={`w-full p-3.5 rounded-xl border transition-all duration-200 flex items-center space-x-3 text-left group relative overflow-hidden ${
                  selectedPersonaId === p.id 
                  ? 'bg-white/5 border-brand-accent/40 shadow-inner' 
                  : 'bg-transparent border-white/5 hover:bg-white/[0.02]'
                }`}
              >
                <div className={`shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${p.bg} flex items-center justify-center text-lg shadow-xl border border-white/5 transform group-hover:scale-105 transition-transform`}>{p.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className={`font-black text-[10px] uppercase tracking-wider truncate transition-colors ${selectedPersonaId === p.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{p.name}</div>
                  <div className="text-[7px] font-mono text-slate-600 mt-0.5 uppercase tracking-tighter">
                    {isCustom ? 'Modified Logic' : 'Standard Profile'}
                  </div>
                </div>
                {isCustom && (
                  <button 
                    onClick={(e) => handleDeleteCustomPersona(e, p.id)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:text-brand-accent transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SetupForm;
