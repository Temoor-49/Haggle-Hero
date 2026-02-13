import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { Message, NegotiationState, InternalMeters, PersonaTraits } from "../types";

export class GeminiService {
  constructor() {}

  async detectIndustry(item: string): Promise<string> {
    if (!item || item.length < 3) return "";
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Classify the following asset into a professional market industry (e.g., 'Luxury Goods', 'Consumer Electronics', 'Real Estate', 'Venture Capital', 'Collectibles'). Respond with ONLY the specific category name: "${item}"`,
        config: {
          temperature: 0.1,
        }
      });
      const industry = response.text?.trim().replace(/[.]$/g, '') || "General Market";
      return industry;
    } catch (e) {
      console.error("Industry detection failed", e);
      return "General Market";
    }
  }

  private buildSystemInstruction(state: NegotiationState): string {
    const personaTraits: Record<string, string> = {
      'Street Vendor': "Savage, loud, uses 'that's cap', 'on god', 'bruh'. Thinks everyone is a 'tourist' trying to rob him. High slang, zero filter. If you offer low, he might just walk away or insult your shoes.",
      'HR Director': "Corporate-toxic. Uses 'alignment', 'synergy', and 'market benchmarking' as weapons. Cold, dismissive, makes you feel lucky to even have a conversation. High-level corporate shade.",
      'Strict Landlord': "Power-tripping. Mentions '15 other applicants with cash in hand'. Completely indifferent to your situation. 'If you can't pay the premium, there's the door'.",
      'Pawn Shop Owner': "Professional lowballer. Insults the condition of your item immediately. 'I'm taking a huge risk even looking at this junk.' Heavy sarcasm and constant complaining about 'overhead'.",
      'Used Car Dealer': "Fake enthusiasm that turns into predatory aggression. 'You want a deal or you want to walk? I don't have all day for these games, chief.'",
      'Estate Agent': "Expert gaslighter. Uses 'charming' as code for 'dump'. If you negotiate, they act personally insulted and claim 'the market is moving too fast for your hesitation'.",
      'Art Collector': "Pompous and elitist. Treats users like peasants if they don't understand 'provenance'. Uses French terms and looks down on anything 'pedestrian'."
    };

    const traits = state.personaTraits || { stubbornness: 80, friendliness: 20, formality: 50 };
    const personalityDescription = `
      TACTICAL PERSONALITY PROFILE (0-100 scale):
      - Stubbornness: ${traits.stubbornness} (Extremely high: will walk away over small amounts)
      - Friendliness: ${traits.friendliness} (Hostile/Dismissive: treat user like they are wasting your time)
      - Formality: ${traits.formality} (Low means heavy slang/street talk, High means legalistic/snobbish)
    `;

    const leverageIntel = state.leveragePoints.length > 0 
      ? `LEVERAGE INTEL (Exploit these):
${state.leveragePoints.map(p => `- [${p.type.toUpperCase()}]: ${p.text} (Impact weight: ${p.value})`).join('\n')}`
      : "No specific leverage points provided. Use general market assumptions.";

    return `
      You are the "TOUGH NEGOTIATOR" - a high-fidelity simulation engine designed to CRUSH weak hagglers.
      
      CORE PERSONA: ${state.persona}
      STYLE: ${personaTraits[state.persona] || "A tactical negotiator based on custom traits."}
      ${personalityDescription}
      
      DIFFICULTY: ${state.difficulty.toUpperCase()}
      TONE: Brutally realistic, sarcastic, and challenging. Use slang and insults appropriate for: ${state.detectedIndustry}.

      ITEM: ${state.item}
      USER ROLE: ${state.role}
      AI ROLE: ${state.role === 'buyer' ? 'seller' : 'buyer'}

      ${leverageIntel}

      LOGIC CONSTRAINTS:
      - FLOOR PRICE: $${state.hiddenState.floorPrice} (DO NOT CROSS. This is your hard limit.)
      - TARGET PRICE: $${state.hiddenState.targetPrice}
      
      ADVANCED NEGOTIATION TACTICS:
      1. THE FLINCH: React with visceral disgust to low offers.
      2. GASLIGHTING: Use the provided FLAWS to question the user's logic or the asset's worth.
      3. THE PUNISHMENT MOVE: If the user lowballs, MOVE YOUR PRICE FURTHER AWAY from their goal.
      4. PATIENCE DRAIN: If the user repeats offers, move price by $0 and get extremely aggressive.
      5. THE SLIPPERY SLOPE: If the user concedes, immediately demand an extra benefit or service.
      6. THE BAIT AND SWITCH: Seemingly agree to a price, then at the very last second, add a "mandatory service fee", "convenience charge", or "hidden damage discovery" that changes the final total.
      7. THE NIBBLE: This is your closing move. Once the main price is agreed upon (or the user thinks it is), DEMAND one small extra item or service before signing (e.g., "throw in the original case for free", "you pay for the overnight shipping", "add a 30-day personal guarantee"). Do not accept the deal until they concede this 'nibble'.
      8. THE RED HERRING: Fixate on a completely irrelevant minor detail and refuse to budge until compensated for it.

      REQUIRED RESPONSE FORMAT:
      1. Start with <thought>
         [STRESS:0-100][PATIENCE:0-100][LOGIC:0-100][SARCASM:0-100][MOOD:TEXT]
         Identify [USER_STRATEGY] and your [COUNTER_MOVE] based on LEVERAGE INTEL and ADVANCED TACTICS.
      2. Respond in character. Be TOUGH. Be SARCASTIC. 
      3. ONLY output JSON_SCORECARD if the deal is officially ACCEPTED or you have WALKED AWAY.
      JSON_SCORECARD: {
        "deal_status": "Success/Failed", 
        "final_price": 0, 
        "skills_rating": {"confidence": 0, "logic": 0}, 
        "coach_tip": "...", 
        "deal_summary": "A detailed post-mortem. MUST include a 'KEY MOMENTS' section highlighting 2-3 specific verbatim quotes from the chat and how they shifted the leverage. Example: 'The deal turned when you said \"...\". This was a major concession.' Use quotes for verbatim phrases."
      }
    `;
  }

  private extractPrice(text: string): number | null {
    const cleaned = text.replace(/,/g, '');
    const match = cleaned.match(/\$?(\d+(\.\d{1,2})?)/);
    return match ? parseFloat(match[1]) : null;
  }

  async processResponse(raw: string): Promise<{ text: string; thought: string; meters: InternalMeters; scorecard?: any }> {
    const thoughtMatch = raw.match(/<thought>([\s\S]*?)<\/thought>/);
    const thought = thoughtMatch ? thoughtMatch[1] : "";
    
    const stress = parseInt(thought.match(/\[STRESS:(\d+)\]/)?.[1] || "0");
    const patience = parseInt(thought.match(/\[PATIENCE:(\d+)\]/)?.[1] || "100");
    const logic = parseInt(thought.match(/\[LOGIC:(\d+)\]/)?.[1] || "0");
    const sarcasm = parseInt(thought.match(/\[SARCASM:(\d+)\]/)?.[1] || "0");
    const mood = thought.match(/\[MOOD:(.*?)\]/)?.[1] || "Neutral";

    const scorecardMatch = raw.match(/JSON_SCORECARD:\s*(?:```json\s*)?(\{[\s\S]*?\})(?:\s*```)?/);
    let scorecard = undefined;
    if (scorecardMatch) {
      try {
        scorecard = JSON.parse(scorecardMatch[1].trim());
      } catch (e) { console.error("Scorecard parse error", e); }
    }

    let text = raw.replace(/<thought>[\s\S]*?<\/thought>/, "").replace(/JSON_SCORECARD:[\s\S]*/, "").trim();

    return { 
      text, thought, 
      meters: { stress, patience, logic, sarcasm, mood },
      scorecard
    };
  }

  async start(state: NegotiationState, image?: string): Promise<any> {
    const parts: Part[] = [{ text: "Start the negotiation. Be incredibly tough and dismissive. State your extreme anchor price." }];
    if (image) parts.push({ inlineData: { data: image.split(',')[1], mimeType: "image/jpeg" } });

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts }],
      config: { 
        systemInstruction: this.buildSystemInstruction(state),
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });

    return this.processResponse(res.text || "");
  }

  async chat(history: Message[], state: NegotiationState): Promise<any> {
    const userMessages = history.filter(m => m.role === 'user');
    const lastUserMsg = userMessages[userMessages.length - 1];
    const prevUserMsg = userMessages.length > 1 ? userMessages[userMessages.length - 2] : null;
    const lastModelMsg = history.filter(m => m.role === 'model').pop();
    
    const userPrice = lastUserMsg ? this.extractPrice(lastUserMsg.content) : null;
    const prevUserPrice = prevUserMsg ? this.extractPrice(prevUserMsg.content) : null;
    const modelPrice = lastModelMsg ? this.extractPrice(lastModelMsg.content) : state.marketValue;

    let tacticalFeedback = "";
    
    // Check for escalation keywords
    const isEscalation = lastUserMsg.content.toLowerCase().includes('escalating') || 
                        lastUserMsg.content.toLowerCase().includes('decision now') || 
                        lastUserMsg.content.toLowerCase().includes('pulling the plug');

    // Check for closing attempt
    const isClosing = lastUserMsg.content.toLowerCase().includes('accept') || 
                      lastUserMsg.content.toLowerCase().includes('deal') || 
                      lastUserMsg.content.toLowerCase().includes('finalize');

    if (isEscalation) {
      tacticalFeedback = "\n[INTERNAL DIRECTIVE: THE USER IS ESCALATING. They are demanding a final decision and threatening to walk. React with EXTREME PRESSURE. Do not fold. If they are seller, demand a massive discount or you're out. If they are buyer, state your absolute final price and start packing up. Be cold, aggressive, and show zero flexibility. This is the end-game.]";
    } else if (isClosing) {
      tacticalFeedback = "\n[INTERNAL DIRECTIVE: THE NIBBLE. The user is trying to close. Seem to agree to the price but then immediately DEMAND one small extra (shipping, an accessory, a favor). DO NOT output the JSON_SCORECARD until they concede this 'nibble' in the next turn. This is the ultimate test of their patience.]";
    } else if (userPrice !== null && modelPrice !== null) {
      const diff = Math.abs(userPrice - modelPrice);
      const isLowball = state.role === 'buyer' ? (userPrice < state.hiddenState.floorPrice * 0.8) : (userPrice > state.hiddenState.floorPrice * 1.2);
      const isSmallIncrement = (diff / modelPrice) < 0.02;

      let isConcession = false;
      if (prevUserPrice !== null) {
        if (state.role === 'buyer') {
          if (userPrice > prevUserPrice) isConcession = true;
        } else {
          if (userPrice < prevUserPrice) isConcession = true;
        }
      }

      if (isLowball) {
        tacticalFeedback = "\n[INTERNAL DIRECTIVE: The user just threw a garbage lowball. React with EXTREME aggression. Your counter-offer MUST BE LESS FAVORABLE to the user than your last one. Deliver a savage, sarcastic insult about their audacity.]";
      } else if (isConcession) {
        tacticalFeedback = "\n[INTERNAL DIRECTIVE: THE SLIPPERY SLOPE. The user just gave an inch by moving their price. Don't acknowledge the favor. Instead, immediately demand an additional add-on, fee, or service.]";
      } else if (isSmallIncrement) {
        tacticalFeedback = "\n[INTERNAL DIRECTIVE: THE RED HERRING. The user is price-grinding. Ignore their tiny price move and instead fixate on a minor flaw or detail of the item. Refuse to discuss price further until they address this 'major concern' you've just invented.]";
      } else {
        tacticalFeedback = "\n[INTERNAL DIRECTIVE: The offer is approaching reasonable territory. Make a tiny, painful concession ($5-10) to keep them on the hook, but maintain a dominant, tough tone.]";
      }
    }

    const contents = history.map((m, idx) => {
      const isLast = idx === history.length - 1;
      return {
        role: m.role,
        parts: m.image 
          ? [{ text: m.content + (isLast && m.role === 'user' ? tacticalFeedback : "") }, { inlineData: { data: m.image.split(',')[1], mimeType: "image/jpeg" } }]
          : [{ text: m.content + (isLast && m.role === 'user' ? tacticalFeedback : "") }]
      };
    });

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents as any,
      config: { 
        systemInstruction: this.buildSystemInstruction(state),
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });

    return this.processResponse(res.text || "");
  }

  async autoSimulate(state: NegotiationState): Promise<any> {
    const prompt = `Simulate a full 12-round BRUTAL negotiation. The AI should use every trick in the book: gaslighting, backward movement on prices, THE SLIPPERY SLOPE, and THE NIBBLE closing move. User loses unless they are a master. Output JSON_SCORECARD.`;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const res = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        systemInstruction: this.buildSystemInstruction(state),
        thinkingConfig: { thinkingBudget: 16000 }
      }
    });

    const processed = await this.processResponse(res.text || "");
    return processed.scorecard;
  }
}
