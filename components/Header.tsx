
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
    { id: 'tactical', label: 'Tactical', color: 'bg-brand-accent' },
    { id: 'corporate', label: 'Corporate', color: 'bg-blue-500' },
    { id: 'midnight', label: 'Midnight', color: 'bg-purple-500' },
    { id: 'cyber', label: 'Cyber', color: 'bg-green-500' },
  ];

  return (
    <header className="glass border-b border-white/5 py-4 px-8 z-40 flex items-center justify-between shadow-2xl relative overflow-visible">
      {/* Decorative top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-accent/40 to-transparent"></div>
      
      {/* Left Section: Logo & Status */}
      <div className="flex items-center space-x-6">
        <div className="relative group cursor-pointer" onClick={() => onStepChange('setup')}>
          <div className="absolute -inset-2 bg-brand-accent opacity-0 group-hover:opacity-20 blur-xl rounded-full transition-opacity duration-500"></div>
          <div className="relative w-10 h-10 accent-gradient rounded-xl flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-105 active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.5 3c1.557 0 3.046.711 4 1.99C12.454 3.711 13.943 3 15.5 3c2.786 0 5.25 2.322 5.25 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001z" />
            </svg>
          </div>
        </div>

        <div className="cursor-pointer select-none" onClick={() => onStepChange('setup')}>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black tracking-tighter text-white flex items-center uppercase italic">
              Haggle<span className="text-brand-accent ml-0.5">Hero</span>
            </h1>
            <span className="h-4 w-px bg-white/10 mx-1"></span>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] pt-0.5">
                {themes.find(t => t.id === currentTheme)?.label} Mode
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-brand-success shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">System Status: Online</span>
          </div>
        </div>
      </div>

      {/* Right Section: Navigation, Theme & Connection */}
      <div className="flex items-center space-x-8">
        <nav className="hidden lg:flex items-center space-x-10">
          {[
            { id: 'setup', label: 'New Deal' },
            { id: 'history', label: 'History' }
          ].map((item) => {
            const isActive = currentStep === item.id || (item.id === 'setup' && (currentStep === 'negotiate' || currentStep === 'coach'));
            return (
              <button 
                key={item.id} 
                onClick={() => onStepChange(item.id as AppStep)}
                className="group relative flex flex-col items-center py-1"
              >
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                }`}>
                  {item.label}
                </span>
                <span className={`absolute -bottom-1 h-[2px] transition-all duration-500 rounded-full ${
                  isActive ? 'w-full bg-brand-accent' : 'w-0 bg-brand-accent/20 group-hover:w-full'
                }`}></span>
              </button>
            );
          })}
        </nav>
        
        <div className="h-6 w-px bg-white/10"></div>

        <div className="flex items-center space-x-6">
          {/* Theme Switcher */}
          <div className="relative">
            <button 
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="flex flex-col items-end group"
            >
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black text-slate-300 leading-none uppercase tracking-widest">Theme</span>
                <div className={`w-3 h-3 rounded-full ${themes.find(t => t.id === currentTheme)?.color} shadow-[0_0_8px_currentColor]`}></div>
              </div>
              <span className="text-[8px] font-mono text-slate-600 uppercase mt-1 group-hover:text-brand-accent transition-colors">Switch Style</span>
            </button>

            {showThemePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowThemePicker(false)}></div>
                <div className="absolute top-full right-0 mt-4 w-48 bg-brand-black/95 border border-white/10 rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 mb-1 border-b border-white/5">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Visual Settings</span>
                  </div>
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        onThemeChange(theme.id);
                        setShowThemePicker(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 ${
                        currentTheme === theme.id 
                        ? 'bg-white/10 text-white' 
                        : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest">{theme.label}</span>
                      <div className={`w-2 h-2 rounded-full ${theme.color}`}></div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="h-6 w-px bg-white/10"></div>

          {/* Connection Status: Fixed overlap by using a structured flex container and defined spacing */}
          <div className="hidden sm:flex flex-col justify-center items-end min-w-[100px]">
            <div className="flex items-center justify-end space-x-2">
              <span className="text-[10px] font-black text-slate-300 leading-none uppercase tracking-widest">Connection</span>
              <div className="flex space-x-0.5">
                <div className="w-1 h-3 bg-brand-success/40 rounded-sm"></div>
                <div className="w-1 h-3 bg-brand-success/40 rounded-sm"></div>
                <div className="w-1 h-3 bg-brand-success rounded-sm shadow-[0_0_5px_var(--brand-success)]"></div>
              </div>
            </div>
            <span className="text-[8px] font-mono text-brand-success font-bold uppercase mt-1 tracking-tighter">Secure & Ready</span>
          </div>
          
          {/* User Profile / HN Tab */}
          <div className="relative group pl-2">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-accent to-brand-info opacity-30 blur rounded-full group-hover:opacity-60 transition duration-500"></div>
            <div className="relative w-10 h-10 rounded-full border border-white/20 p-0.5 overflow-hidden flex items-center justify-center bg-brand-black shadow-2xl transform transition-transform group-hover:scale-105">
               <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center font-black text-xs text-brand-accent italic border border-white/5">HN</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
