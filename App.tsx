
import React, { useState, useEffect } from 'react';
import { AppStep, NegotiationState, ScorecardData, HistoryItem, AppTheme } from './types';
import Header from './components/Header';
import SetupForm from './components/SetupForm';
import ChatInterface from './components/ChatInterface';
import Scorecard from './components/Scorecard';
import HistoryView from './components/HistoryView';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('setup');
  const [theme, setTheme] = useState<AppTheme>('tactical');
  const [negotiationState, setNegotiationState] = useState<NegotiationState | null>(null);
  const [scorecard, setScorecard] = useState<ScorecardData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history and theme on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('haggle_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    const savedTheme = localStorage.getItem('haggle_theme') as AppTheme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Update document theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('haggle_theme', theme);
  }, [theme]);

  const handleStart = (state: NegotiationState) => {
    setNegotiationState(state);
    setStep('negotiate');
  };

  const handleFinish = (data: ScorecardData) => {
    setScorecard(data);
    
    // Save to history
    if (negotiationState) {
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        item: negotiationState.item,
        persona: negotiationState.persona,
        status: data.deal_status,
        finalPrice: data.final_price,
        summary: data.deal_summary || "Negotiation concluded.",
        industry: negotiationState.detectedIndustry
      };
      
      const updatedHistory = [...history, newHistoryItem];
      setHistory(updatedHistory);
      localStorage.setItem('haggle_history', JSON.stringify(updatedHistory));
    }

    setStep('coach');
  };

  const handleReset = () => {
    setStep('setup');
    setNegotiationState(null);
    setScorecard(null);
  };

  const handleClearHistory = () => {
    if (window.confirm("Delete all history? This cannot be undone.")) {
      setHistory([]);
      localStorage.removeItem('haggle_history');
    }
  };

  // Determine if we should use full-bleed layout
  const isNegotiating = step === 'negotiate';

  return (
    <div className="h-screen w-screen flex flex-col bg-brand-black text-slate-100 overflow-hidden relative font-sans">
      {/* Background Ambience - Layered for depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-brand-accent/5 blur-[120px] rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-[5%] right-[-5%] w-[40%] h-[40%] bg-brand-info/5 blur-[120px] rounded-full animate-float"></div>
        <div className="absolute top-[40%] right-[15%] w-[20%] h-[20%] bg-brand-success/5 blur-[100px] rounded-full"></div>
      </div>
      
      {/* Hide header during negotiation for full-screen immersion */}
      {step !== 'negotiate' && (
        <Header 
          currentStep={step} 
          onStepChange={setStep} 
          currentTheme={theme}
          onThemeChange={setTheme}
        />
      )}
      
      <main className={`flex-1 relative overflow-hidden flex flex-col z-10 ${isNegotiating ? '' : 'p-4 md:p-6 lg:p-8'}`}>
        <div className={`flex-1 w-full mx-auto flex flex-col h-full min-h-0 ${isNegotiating ? 'max-w-none' : 'max-w-[1500px]'}`}>
          <div className="flex-1 relative min-h-0 animate-in fade-in duration-700">
            {step === 'setup' && (
              <div className="absolute inset-0 flex items-center justify-center overflow-y-auto custom-scrollbar">
                <SetupForm onStart={handleStart} />
              </div>
            )}

            {step === 'negotiate' && negotiationState && (
              <div className="absolute inset-0 flex flex-col">
                <ChatInterface 
                  negotiationState={negotiationState} 
                  onFinish={handleFinish} 
                />
              </div>
            )}

            {step === 'coach' && scorecard && (
              <div className="absolute inset-0 flex items-center justify-center overflow-y-auto custom-scrollbar">
                <Scorecard data={scorecard} onReset={handleReset} />
              </div>
            )}

            {step === 'history' && (
              <div className="absolute inset-0 flex items-center justify-center overflow-y-auto custom-scrollbar">
                <HistoryView history={history} onClear={handleClearHistory} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Hide footer during negotiation for full-screen immersion */}
      {step !== 'negotiate' && (
        <footer className="py-2.5 px-8 border-t border-white/5 glass bg-brand-black/95 z-20 shadow-inner shrink-0">
          <div className="max-w-[1500px] mx-auto flex justify-between items-center text-[10px] font-bold tracking-[0.1em] text-slate-500 uppercase font-mono">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-success shadow-[0_0_8px_var(--brand-success)]"></span>
                <span className="text-slate-400">System Ready</span>
              </span>
              <span className="opacity-10 h-3 w-px bg-white"></span>
              <span className="text-slate-600">v3.9 Professional</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-slate-500">&copy; {new Date().getFullYear()} Haggle Hero</span>
              <span className="opacity-10 h-3 w-px bg-white"></span>
              <span className="text-brand-accent/50 flex items-center">
                <span className="w-1 h-1 bg-brand-accent rounded-full mr-2 animate-pulse"></span>
                Encrypted
              </span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
