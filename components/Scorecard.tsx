import React, { useEffect, useState } from 'react';
import { ScorecardData, Reputation } from '../types';

interface ScorecardProps {
  data: ScorecardData;
  onReset: () => void;
}

const StatBox: React.FC<{ label: string; value: string | number; accent: string; icon: string }> = ({ label, value, accent, icon }) => (
  <div className="bg-brand-black/50 p-6 md:p-8 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center text-center group hover:bg-white/[0.04] transition-all hover:translate-y-[-4px] shadow-lg">
    <div className="text-2xl mb-4 group-hover:scale-125 transition-transform duration-500">{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">{label}</span>
    <div className={`text-2xl md:text-3xl font-black italic tracking-tighter ${accent} transition-colors uppercase truncate w-full`}>
      {value}
    </div>
  </div>
);

const Scorecard: React.FC<ScorecardProps> = ({ data, onReset }) => {
  const [rep, setRep] = useState<Reputation>({ score: 0, title: 'Novice', deals_closed: 0 });
  const isSuccess = data.deal_status?.toLowerCase().includes('success');

  useEffect(() => {
    const saved = localStorage.getItem('haggle_rep');
    let current = saved ? JSON.parse(saved) : { score: 1000, title: 'Beginner', deals_closed: 0 };
    
    current.score += data.reputation_gain;
    if (isSuccess) current.deals_closed += 1;
    
    if (current.score > 2000) current.title = 'Elite Trader';
    else if (current.score > 1500) current.title = 'Master Haggler';
    else if (current.score > 1200) current.title = 'Skillful Negotiator';
    else if (current.score < 800) current.title = 'Beginner';

    setRep(current);
    localStorage.setItem('haggle_rep', JSON.stringify(current));
  }, [data.reputation_gain, isSuccess]);

  const renderContentWithHighlights = (text: string) => {
    if (!text) return null;
    
    // Pattern to find quotes
    const parts = text.split(/("(?:[^"\\]|\\.)*")/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('"') && part.endsWith('"')) {
        return (
          <span key={i} className="text-brand-info font-black italic bg-brand-info/10 px-2 py-0.5 rounded border border-brand-info/20 shadow-sm mx-1 inline-block transform -skew-x-6">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderStructuredSummary = () => {
    const fullText = data.deal_summary || "";
    const splitKey = /KEY MOMENTS:/i;
    const hasKeyMoments = splitKey.test(fullText);

    if (!hasKeyMoments) {
      return (
        <div className="bg-brand-black/40 p-10 rounded-[2.5rem] border border-white/5 relative group overflow-hidden">
          <div className="flex items-center space-x-3 mb-6">
            <span className="w-2 h-2 bg-brand-info rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Narrative Analysis</span>
          </div>
          <div className="text-slate-300 text-sm font-semibold leading-relaxed tracking-tight italic uppercase">
            {renderContentWithHighlights(fullText)}
          </div>
        </div>
      );
    }

    const [narrative, moments] = fullText.split(splitKey);

    return (
      <div className="space-y-8">
        {/* Narrative Section */}
        <div className="bg-brand-black/40 p-10 rounded-[2.5rem] border border-white/5 relative group overflow-hidden">
          <div className="flex items-center space-x-3 mb-6">
            <span className="w-2 h-2 bg-brand-info rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Strategic Overview</span>
          </div>
          <div className="text-slate-300 text-sm font-semibold leading-relaxed tracking-tight italic uppercase">
            {renderContentWithHighlights(narrative.trim())}
          </div>
        </div>

        {/* Key Moments Section */}
        <div className="bg-brand-black/20 p-10 rounded-[2.5rem] border border-brand-info/10 relative group overflow-hidden">
          <div className="flex items-center space-x-3 mb-8">
             <div className="w-8 h-8 rounded-lg bg-brand-info/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-info" viewBox="0 0 20 20" fill="currentColor">
                   <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                   <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
             </div>
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-info">Tactical Intel Feed</span>
          </div>
          <div className="space-y-6">
            {moments.trim().split('\n').filter(line => line.trim().length > 0).map((moment, idx) => (
              <div key={idx} className="flex items-start space-x-4 group/moment">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-info/40 group-hover/moment:bg-brand-info transition-colors"></div>
                <div className="flex-1 text-[13px] text-slate-400 font-medium leading-relaxed border-b border-white/5 pb-4 group-last/moment:border-0">
                  {renderContentWithHighlights(moment.replace(/^-\s*/, ''))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl bg-brand-gray/90 border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-1000 relative glass flex flex-col max-h-[85vh]">
      <div className={`shrink-0 h-2 w-full ${isSuccess ? 'bg-brand-success shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'bg-brand-accent shadow-[0_0_20px_rgba(244,63,94,0.5)]'}`}></div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-10 md:p-14 lg:p-16">
        <div className="flex flex-col items-center text-center mb-14">
          <div className="relative group mb-8">
            <div className={`absolute -inset-10 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition duration-1000 ${isSuccess ? 'bg-brand-success' : 'bg-brand-accent'}`}></div>
            <div className="relative w-24 h-24 bg-brand-black border-2 border-white/10 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl transform transition-all duration-700 group-hover:rotate-[360deg] group-hover:scale-110">
              {isSuccess ? '🤝' : '⚔️'}
            </div>
          </div>
          
          <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white mb-4 leading-none">
            Deal <span className={isSuccess ? 'text-brand-success' : 'text-brand-accent'}>Results</span>
          </h2>
          
          <div className={`px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl border backdrop-blur-md ${
            isSuccess 
            ? 'bg-brand-success/10 border-brand-success/30 text-brand-success shadow-brand-success/10' 
            : 'bg-brand-accent/10 border-brand-accent/30 text-brand-accent shadow-brand-accent/10'
          }`}>
            {isSuccess ? 'Success' : 'Failed'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatBox label="Final Price" value={data.final_price && data.final_price !== 0 ? `$${data.final_price.toLocaleString()}` : 'None'} accent="text-white" icon="💵" />
          <StatBox label="Skills" value={`${(data.skills_rating?.logic || 0) + (data.skills_rating?.confidence || 0)}/20`} accent="text-brand-info" icon="🧬" />
          <StatBox label="Your Rank" value={rep.title} accent="text-brand-warning" icon="🎖️" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 items-start">
          {/* Summary Column */}
          <div className="space-y-8">
             {renderStructuredSummary()}
          </div>

          {/* Tips Column */}
          <div className="bg-brand-black/40 p-10 rounded-[2.5rem] border border-white/5 relative group overflow-hidden h-full">
            <div className="flex items-center space-x-3 mb-6">
              <span className="w-2 h-2 bg-brand-accent rounded-full"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Pro Coach Tip</span>
            </div>
            <p className="text-slate-400 text-[14px] italic font-bold leading-relaxed tracking-tight border-l-2 border-brand-accent/30 pl-6">
              "{data.coach_tip}"
            </p>
            <div className="mt-8 pt-8 border-t border-white/5">
               <div className="flex items-center justify-between mb-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Reputation Delta</span>
                  <span className={`text-[10px] font-mono font-bold ${data.reputation_gain >= 0 ? 'text-brand-success' : 'text-brand-accent'}`}>
                     {data.reputation_gain >= 0 ? '+' : ''}{data.reputation_gain}
                  </span>
               </div>
               <div className="h-1 w-full bg-brand-black rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${data.reputation_gain >= 0 ? 'bg-brand-success' : 'bg-brand-accent'}`} style={{ width: `${Math.abs(data.reputation_gain)}%` }}></div>
               </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-10 pt-10 border-t border-white/5">
          <div className="w-full md:w-3/5 p-8 bg-brand-black/30 rounded-3xl border border-dashed border-white/10 group">
            <div className="flex justify-between items-end mb-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600 mb-1">Reputation Progress</span>
                <span className="text-[11px] font-black text-brand-warning italic">{rep.score} Points</span>
              </div>
              <span className="text-[9px] font-mono text-slate-600 uppercase">Goal: 2500</span>
            </div>
            <div className="h-2 w-full bg-brand-black rounded-full overflow-hidden shadow-inner p-[1px]">
              <div 
                className="h-full bg-brand-warning transition-all duration-2000 ease-out shadow-[0_0_15px_rgba(245,158,11,0.4)] rounded-full" 
                style={{ width: `${Math.min(100, (rep.score / 2500) * 100)}%` }}
              ></div>
            </div>
          </div>

          <button
            onClick={onReset}
            className="group relative w-full md:w-auto px-12 h-20 overflow-hidden rounded-[1.8rem] transition-all transform active:scale-[0.98] shadow-2xl"
          >
            <div className="absolute inset-0 accent-gradient group-hover:scale-110 transition-transform duration-500"></div>
            <span className="relative flex items-center justify-center space-x-4 text-white font-black uppercase tracking-[0.3em] italic text-base">
              <span>Start Over</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-spin-slow" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Scorecard;
