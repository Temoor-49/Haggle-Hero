export type AppStep = 'setup' | 'negotiate' | 'coach' | 'history';
export type AppTheme = 'tactical' | 'pro-blue' | 'emerald' | 'luxury';

export interface InternalMeters {
  stress: number;
  patience: number;
  logic: number;
  sarcasm: number;
  mood: string;
}

export interface PersonaTraits {
  stubbornness: number;
  friendliness: number;
  formality: number;
}

export interface CustomPersona {
  id: string;
  name: string;
  traits: PersonaTraits;
  icon: string;
  bg: string;
}

export interface NegotiationState {
  item: string;
  role: 'buyer' | 'seller';
  persona: string;
  personaTraits?: PersonaTraits;
  difficulty: 'easy' | 'pro' | 'insane';
  initialImage?: string;
  detectedIndustry?: string;
  marketValue: number;
  targetDealPrice: number;
  hiddenState: {
    targetPrice: number;
    floorPrice: number;
    patienceMeter: number;
    logicScore: number;
  };
  leveragePoints: Array<{ id: string; type: 'flaw' | 'strength'; text: string; value: number }>;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  image?: string; 
  thought?: string; 
  meters?: InternalMeters;
}

export interface ScorecardData {
  deal_status: string;
  final_price: number | string;
  skills_rating: {
    confidence: number;
    logic: number;
  };
  coach_tip: string;
  deal_summary?: string;
  reputation_gain: number;
}

export interface Reputation {
  score: number;
  title: string;
  deals_closed: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  item: string;
  persona: string;
  status: string;
  finalPrice: string | number;
  summary: string;
  industry?: string;
}