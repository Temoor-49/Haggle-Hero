import React, { useState } from 'react';
import { AppStep, AppTheme } from '../types';

interface HeaderProps {
  currentStep: AppStep;
  onStepChange: (step: AppStep) => void;
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

const Header: React.FC<HeaderProps> = ({ currentStep, onStepChange, currentTheme, onThemeChange }) => {
  const [showThemePicker, setShowThemePicker] = useState(false);

  const themes: { id: AppTheme; label: string; color: string }[] = [
    { id: 'tactical', label: 'Tactical Red', color: 'bg-rose-500' },
    { id: 'pro-blue', label: 'Professional Blue', color: 'bg-blue-500' },
    { id: 'emerald', label: 'Emerald Green', color: 'bg-emerald-500' },
    { id: 'luxury', label: 'Luxury Gold', color: 'bg-amber-500' },
  ];

  return (
    <header className="glass border-b border-white/5 py-3 px-6 md:px-12 z-40 flex items-center justify-between shrink-0 shadow-lg">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => onStepChange('setup')}>
          <div className="w-8 h-8 accent-gradient rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center">
            Haggle<span className="text-brand-accent">Hero</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-8">
        <nav className="hidden md:flex items-center space-x-8">
          {[
            { id: 'setup', label: 'New Deal' },
            { id: 'history', label: 'Past Deals' }
          ].map((item) => {
            const isActive = currentStep === item.id || (item.id === 'setup' && (currentStep === 'negotiate' || currentStep === 'coach'));
            return (
              <button 
                key={item.id} 
                onClick={() => onStepChange(item.id as AppStep)}
                className={`text-sm font-semibold transition-colors ${
                  isActive ? 'text-brand-accent' : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center space-x-6 border-l border-white/10 pl-6">
          <div className="relative">
            <button 
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <span>{themes.find(t => t.id === currentTheme)?.label}</span>
              <div className={`w-2.5 h-2.5 rounded-full ${themes.find(t => t.id === currentTheme)?.color} border border-white/10`}></div>
            </button>

            {showThemePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowThemePicker(false)}></div>
                <div className="absolute top-full right-0 mt-4 w-56 bg-brand-gray border border-white/10 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        onThemeChange(theme.id);
                        setShowThemePicker(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                        currentTheme === theme.id 
                        ? 'bg-white/10 text-white' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-medium">{theme.label}</span>
                      <div className={`w-3 h-3 rounded-full ${theme.color}`}></div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-3 border-l border-white/10 pl-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System</span>
              <span className="text-[10px] font-bold text-brand-success uppercase">Active</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-brand-accent border border-white/10 shadow-sm">
               HN
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;