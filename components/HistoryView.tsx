
import React, { useState } from 'react';
import { HistoryItem } from '../types';

interface HistoryViewProps {
  history: HistoryItem[];
  onClear: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onClear }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderSummaryWithQuotes = (text: string) => {
    if (!text) return "No details available.";
    const parts = text.split(/("(?:[^"\\]|\\.)*")/g);
    return parts.map((part, i) => {
      if (part.startsWith('"') && part.endsWith('"')) {
        return (
          <span key={i} className="text-brand-info font-bold italic bg-brand-info/5 px-1 rounded">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (history.length === 0) {
    return (
      <div className="w-full max-w-4xl bg-brand-gray/80 border border-white/10 rounded-[2.5rem] p-12 text-center glass animate-in fade-in zoom-in-95">
        <div className="w-20 h-20 bg-brand-black/40 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-black uppercase tracking-widest text-white mb-2">No History</h3>
        <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto">Complete a deal to see it here.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl flex flex-col h-full max-h-[90vh] bg-brand-gray/80 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 glass">
      <div className="shrink-0 p-8 md:px-12 border-b border-white/5 flex justify-between items-end">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <span className="w-6 h-1 bg-brand-info rounded-full"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-info">Record</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white leading-tight">
            Past <span className="text-slate-500">Deals</span>
          </h2>
        </div>
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClear();
          }}
          className="group flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-accent transition-all pb-1 px-4 py-2 rounded-xl hover:bg-brand-accent/5 border border-transparent hover:border-brand-accent/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Purge Logs</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 lg:p-12 space-y-6">
        {[...history].reverse().map((item) => {
          const isExpanded = expandedId === item.id;
          const isSuccess = item.status.toLowerCase().includes('success');
          
          return (
            <div key={item.id} className="group relative bg-brand-black/40 border border-white/5 rounded-3xl p-6 hover:bg-white/[0.02] transition-all overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full ${
                isSuccess ? 'bg-brand-success shadow-[0_0_10px_var(--brand-success)]' : 'bg-brand-accent shadow-[0_0_10px_var(--brand-accent)]'
              }`}></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-brand-black/60 rounded-xl flex items-center justify-center border border-white/5 shadow-inner">
                    <span className="text-xl">{isSuccess ? '🤝' : '⚔️'}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white uppercase tracking-tight leading-none mb-1">{item.item}</h4>
                    <div className="flex items-center space-x-3">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                      <span className="w-1 h-1 bg-white/10 rounded-full"></span>
                      <span className="text-[9px] font-black text-brand-info uppercase tracking-widest">{item.industry || 'Market'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 md:space-x-8">
                  <div className="text-right hidden sm:block">
                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Settlement</div>
                    <div className={`text-xl font-black italic ${isSuccess ? 'text-brand-success' : 'text-slate-400'}`}>
                      {item.finalPrice && item.finalPrice !== 0 ? `$${Number(item.finalPrice).toLocaleString()}` : 'FAILED'}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      isExpanded 
                        ? 'bg-brand-info/20 border-brand-info/40 text-brand-info' 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span>{isExpanded ? 'Hide Intel' : 'View Intel'}</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-3 w-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 bg-brand-black/20 rounded-2xl p-5 border border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2 opacity-50">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tactical Summary</span>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                          isSuccess 
                          ? 'bg-brand-success/10 border-brand-success/20 text-brand-success' 
                          : 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent'
                        }`}>
                          {item.status}
                        </div>
                      </div>
                      <p className="text-slate-300 text-[13px] leading-relaxed font-semibold italic">
                        {renderSummaryWithQuotes(item.summary)}
                      </p>
                    </div>
                    
                    <div className="w-full md:w-64 bg-brand-black/30 rounded-2xl p-5 border border-white/5 space-y-4">
                       <div className="space-y-1">
                         <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Adversary</span>
                         <p className="text-[11px] font-bold text-white uppercase">{item.persona}</p>
                       </div>
                       <div className="space-y-1">
                         <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Market Value</span>
                         <p className="text-[11px] font-mono font-bold text-brand-info">SYSTEM_CALCULATED</p>
                       </div>
                       <div className="pt-2 border-t border-white/5">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Trace ID</span>
                          <p className="text-[7px] font-mono text-slate-600 truncate uppercase">{item.id}</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryView;