import React, { useState, useRef, useEffect } from 'react';
import { NegotiationState, CustomPersona, PersonaTraits } from '../types';
import { GeminiService } from '../services/geminiService';

interface SetupFormProps {
  onStart: (state: NegotiationState) => void;
}

const DEFAULT_PERSONAS = [
  { id: 'vendor', name: 'Street Vendor', icon: '🏪', bg: 'from-orange-500/10' },
  { id: 'hr', name: 'HR Director', icon: '🏢', bg: 'from-blue-500/10' },
  { id: 'landlord', name: 'Strict Landlord', icon: '🏠', bg: 'from-emerald-500/10' },
  { id: 'pawn', name: 'Pawn Shop Owner', icon: '💎', bg: 'from-purple-500/10' },
  { id: 'car_dealer', name: 'Used Car Dealer', icon: '🚗', bg: 'from-rose-500/10' },
  { id: 'estate_agent', name: 'Estate Agent', icon: '🏘️', bg: 'from-cyan-500/10' },
  { id: 'art_collector', name: 'Art Collector', icon: '🖼️', bg: 'from-amber-500/10' },
];

const ICON_OPTIONS = ['👤', '🤖', '🤵', '👩‍💼', '🕵️', '🤴', '🦁', '🐍', '🧙'];
const COLOR_OPTIONS = [
  { id: 'blue', class: 'from-blue-500/20', color: 'bg-blue-500' },
  { id: 'emerald', class: 'from-emerald-500/20', color: 'bg-emerald-500' },
  { id: 'rose', class: 'from-rose-500/20', color: 'bg-rose-500' },
  { id: 'amber', class: 'from-amber-500/20', color: 'bg-amber-500' },
  { id: 'indigo', class: 'from-indigo-500/20', color: 'bg-indigo-500' },
];

const TraitSlider: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  accent: string;
}> = ({ label, value, onChange, accent }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      <span className={`text-[10px] font-mono font-bold ${accent}`}>{value}%</span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-1 bg-brand-black rounded-lg appearance-none cursor-pointer accent-brand-accent"
    />
  </div>
);

const SetupForm: React.FC<SetupFormProps> = ({ onStart }) => {
  const [item, setItem] = useState('Classic Watch');
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [selectedPersonaId, setSelectedPersonaId] = useState(DEFAULT_PERSONAS[0].id);
  const [basePrice, setBasePrice] = useState('5000');
  const [targetPrice, setTargetPrice] = useState('4200');
  const [difficulty, setDifficulty] = useState<'easy' | 'pro' | 'insane'>('pro');
  const [initialImage, setInitialImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [detectedIndustry, setDetectedIndustry] = useState<string>("Luxury Goods");
  const [isDetecting, setIsDetecting] = useState(false);

  // Leverage Points
  const [leveragePoints, setLeveragePoints] = useState<Array<{ id: string; type: 'flaw' | 'strength'; text: string; value: number }>>([]);
  const [newPointText, setNewPointText] = useState('');
  const [newPointType, setNewPointType] = useState<'flaw' | 'strength'>('strength');

  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>([]);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newPersonaIcon, setNewPersonaIcon] = useState(ICON_OPTIONS[0]);
  const [newPersonaBg, setNewPersonaBg] = useState(COLOR_OPTIONS[0].class);
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
      try { setCustomPersonas(JSON.parse(saved)); } catch (e) {}
    }
    return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
  }, [stream]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (item.trim().length > 2) {
        setIsDetecting(true);
        const industry = await gemini.current.detectIndustry(item);
        setDetectedIndustry(industry);
        setIsDetecting(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [item]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setIsCameraOpen(true);
    } catch (err) {}
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
        if (stream) stream.getTracks().forEach(t => t.stop());
        setIsCameraOpen(false);
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

  const handleAddLeveragePoint = () => {
    if (!newPointText.trim()) return;
    const newPoint = {
      id: crypto.randomUUID(),
      type: newPointType,
      text: newPointText,
      value: newPointType === 'strength' ? 20 : -20
    };
    setLeveragePoints([...leveragePoints, newPoint]);
    setNewPointText('');
  };

  const removeLeveragePoint = (id: string) => {
    setLeveragePoints(leveragePoints.filter(p => p.id !== id));
  };

  const handleSaveCustomPersona = () => {
    if (!newPersonaName.trim()) return;
    const newPersona: CustomPersona = {
      id: `custom_${Date.now()}`,
      name: newPersonaName,
      traits: { ...newPersonaTraits },
      icon: newPersonaIcon,
      bg: newPersonaBg,
    };
    const updated = [...customPersonas, newPersona];
    setCustomPersonas(updated);
    localStorage.setItem('custom_personas', JSON.stringify(updated));
    setSelectedPersonaId(newPersona.id);
    setIsCreatingCustom(false);
    setNewPersonaName('');
    setNewPersonaTraits({ stubbornness: 50, friendliness: 50, formality: 50 });
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
      personaTraits = { stubbornness: 50, friendliness: 50, formality: 50 };
    } else {
      const matchedCustom = customPersonas.find(p => p.id === selectedPersonaId);
      if (matchedCustom) {
        personaName = matchedCustom.name;
        personaTraits = matchedCustom.traits;
      }
    }

    if (!personaTraits) personaTraits = { stubbornness: 50, friendliness: 50, formality: 50 };
    
    const state: NegotiationState = {
      item, role, persona: personaName, personaTraits, difficulty,
      initialImage: initialImage || undefined,
      detectedIndustry,
      marketValue: marketVal,
      targetDealPrice: targetVal,
      hiddenState: {
        targetPrice: role === 'buyer' ? marketVal * 1.2 : marketVal * 0.8,
        floorPrice: role === 'buyer' ? targetVal * 1.05 : targetVal * 0.95,
        patienceMeter: 100,
        logicScore: 0
      },
      leveragePoints
    };
    onStart(state);
  };

  const allPersonas = [...DEFAULT_PERSONAS, ...customPersonas];

  return (
    <div className="w-full max-w-7xl bg-brand-gray border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-full max-h-[92vh]">
      {/* FORM SECTION */}
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar border-r border-white/5">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Setup Your Deal</h2>
            <p className="text-sm text-slate-400">Configure what you're negotiating and with whom.</p>
          </div>
          
          {/* MICRO INITIATE BUTTON */}
          <button 
            type="submit" 
            form="setup-form"
            className="accent-gradient p-3 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all group flex items-center justify-center"
            title="Initiate Negotiation"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
             </svg>
          </button>
        </div>

        <form id="setup-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-6">
            <div className="shrink-0">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Item Image</label>
              <div className="w-24 h-24 bg-brand-black border border-white/10 rounded-2xl overflow-hidden relative group">
                {initialImage ? (
                  <img src={initialImage} className="w-full h-full object-cover" />
                ) : isCameraOpen ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col">
                    <button type="button" onClick={startCamera} className="flex-1 hover:bg-white/5 flex items-center justify-center text-xl" title="Take Photo">📸</button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 border-t border-white/5 hover:bg-white/5 flex items-center justify-center text-xl" title="Upload Image">📁</button>
                  </div>
                )}
                {isCameraOpen && <button type="button" onClick={capturePhoto} className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-brand-success text-white text-[8px] font-bold px-2 py-1 rounded-full">SNAP</button>}
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">What are you trading?</label>
                <div className="relative">
                  <input 
                    type="text" value={item} onChange={(e) => setItem(e.target.value)} 
                    className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-brand-accent/50 outline-none"
                    placeholder="e.g., Rare Collectible"
                  />
                  {isDetecting && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                       <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Scanning</span>
                       <div className="w-3 h-3 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                {detectedIndustry && (
                   <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                      <div className="inline-flex items-center space-x-2 bg-brand-info/10 border border-brand-info/20 px-3 py-1 rounded-full">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-brand-info" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a3 3 0 01-3-3V6zm3 1a1 1 0 000 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                         </svg>
                         <span className="text-[9px] font-bold text-brand-info uppercase tracking-widest">Market Industry: {detectedIndustry}</span>
                      </div>
                   </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Market Value ($)</label>
                  <input type="number" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-sm font-mono text-white outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Your Goal ($)</label>
                  <input type="number" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="w-full bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-sm font-mono text-white outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Your Role</label>
              <div className="flex p-1 bg-brand-black rounded-xl border border-white/10">
                <button type="button" onClick={() => setRole('buyer')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${role === 'buyer' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Buyer</button>
                <button type="button" onClick={() => setRole('seller')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${role === 'seller' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Seller</button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Difficulty</label>
              <div className="flex p-1 bg-brand-black rounded-xl border border-white/10">
                {(['easy', 'pro', 'insane'] as const).map(d => (
                  <button key={d} type="button" onClick={() => setDifficulty(d)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${difficulty === d ? 'bg-brand-accent/20 text-brand-accent' : 'text-slate-500 hover:text-slate-300'}`}>{d}</button>
                ))}
              </div>
            </div>
          </div>

          {/* LEVERAGE POINTS */}
          <div className="bg-brand-black/30 border border-white/5 rounded-2xl p-6 space-y-4">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tactical Leverage (Strengths & Flaws)</label>
            <div className="flex gap-2">
              <select 
                value={newPointType} 
                onChange={(e) => setNewPointType(e.target.value as 'flaw' | 'strength')}
                className="bg-brand-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="strength">Strength</option>
                <option value="flaw">Flaw</option>
              </select>
              <input 
                type="text" 
                value={newPointText} 
                onChange={(e) => setNewPointText(e.target.value)}
                placeholder="e.g. Rare edition, Missing box..."
                className="flex-1 bg-brand-black border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none"
              />
              <button 
                type="button" 
                onClick={handleAddLeveragePoint}
                className="bg-brand-info/20 text-brand-info border border-brand-info/30 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-info hover:text-white transition-all"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {leveragePoints.map(point => (
                <div 
                  key={point.id} 
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                    point.type === 'strength' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  }`}
                >
                  <span>{point.type === 'strength' ? '↑' : '↓'} {point.text}</span>
                  <button onClick={() => removeLeveragePoint(point.id)} className="hover:scale-125 transition-transform">×</button>
                </div>
              ))}
              {leveragePoints.length === 0 && <p className="text-[9px] text-slate-600 italic">No leverage points defined.</p>}
            </div>
          </div>

          <div className="bg-brand-black/30 border border-white/5 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Negotiator Profiles</span>
              <button 
                type="button" 
                onClick={() => setIsCreatingCustom(!isCreatingCustom)} 
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${
                  isCreatingCustom ? 'border-brand-accent text-brand-accent hover:bg-brand-accent/10' : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20'
                }`}
              >
                {isCreatingCustom ? 'Cancel Customization' : 'Create Custom Negotiator'}
              </button>
            </div>

            {isCreatingCustom ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profile Name</label>
                      <input 
                        type="text" 
                        value={newPersonaName} 
                        onChange={e => setNewPersonaName(e.target.value)} 
                        placeholder="e.g. The Shark" 
                        className="w-full bg-brand-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-brand-accent/40" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Icon</label>
                      <div className="grid grid-cols-5 gap-2">
                        {ICON_OPTIONS.map(icon => (
                          <button 
                            key={icon} 
                            type="button" 
                            onClick={() => setNewPersonaIcon(icon)} 
                            className={`w-full aspect-square rounded-lg flex items-center justify-center text-lg transition-all ${
                              newPersonaIcon === icon ? 'bg-brand-accent/20 border border-brand-accent shadow-lg shadow-brand-accent/10' : 'bg-brand-black border border-white/5 hover:bg-white/5'
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 bg-brand-black/40 p-4 rounded-xl border border-white/5">
                    <TraitSlider 
                      label="Stubbornness" 
                      value={newPersonaTraits.stubbornness} 
                      onChange={(v) => setNewPersonaTraits(prev => ({...prev, stubbornness: v}))} 
                      accent="text-rose-500"
                    />
                    <TraitSlider 
                      label="Friendliness" 
                      value={newPersonaTraits.friendliness} 
                      onChange={(v) => setNewPersonaTraits(prev => ({...prev, friendliness: v}))} 
                      accent="text-emerald-500"
                    />
                    <TraitSlider 
                      label="Formality" 
                      value={newPersonaTraits.formality} 
                      onChange={(v) => setNewPersonaTraits(prev => ({...prev, formality: v}))} 
                      accent="text-blue-500"
                    />
                  </div>
                </div>
                
                <button 
                  type="button" 
                  onClick={handleSaveCustomPersona} 
                  disabled={!newPersonaName.trim()}
                  className="w-full py-3 bg-brand-accent/10 hover:bg-brand-accent text-brand-accent hover:text-white border border-brand-accent/30 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  Save Tactical Profile
                </button>
              </div>
            ) : (
              <div className="text-center py-4 bg-brand-black/20 rounded-xl border border-dashed border-white/10">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Select an opponent from the sidebar to continue</p>
              </div>
            )}
          </div>
          
          <button type="submit" className="w-full py-4 accent-gradient text-white font-black italic uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:translate-y-[-2px] active:translate-y-[1px] transition-all">
            Initiate Negotiation
          </button>
        </form>
      </div>

      {/* PERSONA LIST */}
      <div className="w-full md:w-[320px] bg-brand-black/20 p-6 overflow-y-auto custom-scrollbar flex flex-col">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 border-b border-white/5 pb-2">Available Opponents</label>
        <div className="space-y-3 flex-1">
          {allPersonas.map(p => (
            <button
              key={p.id} onClick={() => setSelectedPersonaId(p.id)}
              className={`w-full flex items-center space-x-4 p-4 rounded-2xl border transition-all group ${
                selectedPersonaId === p.id 
                ? 'bg-white/5 border-brand-accent/50 shadow-lg shadow-brand-accent/5' 
                : 'border-transparent hover:bg-white/5'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.bg} flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition-transform`}>
                {p.icon}
              </div>
              <div className="text-left overflow-hidden">
                <span className={`block text-xs font-black uppercase tracking-wider truncate ${selectedPersonaId === p.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {p.name}
                </span>
                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
                  {p.id.startsWith('custom_') ? 'Custom Profile' : 'System Native'}
                </span>
              </div>
            </button>
          ))}
        </div>
        
        {selectedPersonaId.startsWith('custom_') && (
           <div className="mt-6 pt-6 border-t border-white/5">
              <button 
                onClick={() => {
                  const updated = customPersonas.filter(p => p.id !== selectedPersonaId);
                  setCustomPersonas(updated);
                  localStorage.setItem('custom_personas', JSON.stringify(updated));
                  setSelectedPersonaId(DEFAULT_PERSONAS[0].id);
                }}
                className="w-full py-2 text-[8px] font-black text-rose-500/60 hover:text-rose-500 uppercase tracking-[0.2em] transition-colors"
              >
                Delete Custom Profile
              </button>
           </div>
        )}
      </div>
    </div>
  );
};

export default SetupForm;