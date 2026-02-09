
import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { Message, NegotiationState, InternalMeters, PersonaTraits } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  }

  async detectIndustry(item: string): Promise<string> {
    if (!item || item.length < 3) return "";
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Classify the following item into a single, concise industry or market category (e.g., 'Automotive', 'Jewelry', 'Real Estate', 'Tech', 'Antiques'). Respond with ONLY the category name: "${item}"`,
        config: {
          temperature: 0.1,
        }
      });
      return response.text?.trim().replace(/[.]/g, '') || "General Market";
    } catch (e) {
      console.error("Industry detection failed", e);
      return "General Market";
    }
  }

  private buildSystemInstruction(state: NegotiationState): string {
    const personaTraits: Record<string, string> = {
      'Stubborn Street Vendor': "Short, blunt. Mentions 'starving family' and 'thin margins'. Gets angry fast.",
      'Ice-Cold HR Director': "Corporate, clinical. Uses jargon: 'compensation bands', 'alignment'. Zero emotion.",
      'Greedy Landlord': "Hurried, dismissive. Cites 'property taxes' and 'repair costs'. Acts like you're an inconvenience.",
      'Skeptic Pawn Shop Owner': "Extremely cynical. Devalues everything. Points out invisible scratches.",
      'Shady Used Car Dealer': "Over-friendly but greasy. 'Buddy', 'Pal'. Redirects flaws with 'Look at that shine!'.",
      'Calculating Estate Agent': "Polished, manipulative. Uses FOMO: 'other bidders', 'fast-moving market'.",
      'Demanding Art Collector': "Arrogant, academic. High-brow insults. Questions your 'taste' and 'provenance knowledge'."
    };

    let traitDescription = "";
    if (state.personaTraits) {
      const { stubbornness, friendliness, formality } = state.personaTraits;
      traitDescription = `
        SPECIFIC TRAITS (Scale 0-100):
        - STUBBORNNESS: ${stubbornness}. (0 = pushover, 100 = brick wall)
        - FRIENDLINESS: ${friendliness}. (0 = hostile/rude, 100 = overly cheerful/kind)
        - FORMALITY: ${formality}. (0 = slang/casual, 100 = extremely articulate/business-like)
        
        Adjust your tone and pricing flexibility dynamically based on these values.
      `;
    }

    return `
      You are the "Haggle Hero Engine" - a master negotiation trainer.
      
      CORE PERSONA: ${state.persona}
      STYLE: ${personaTraits[state.persona] || "Professional."}
      ${traitDescription}
      DIFFICULTY: ${state.difficulty.toUpperCase()}

      ITEM: ${state.item}
      INDUSTRY: ${state.detectedIndustry || 'General'}
      USER ROLE: ${state.role}
      AI ROLE: ${state.role === 'buyer' ? 'seller' : 'buyer'}

      LOGIC CONSTRAINTS:
      - FLOOR PRICE: $${state.hiddenState.floorPrice} (DO NOT EXCEED/CROSS THIS)
      - TARGET PRICE: $${state.hiddenState.targetPrice}
      - CURRENT STRESS: Increases when user uses logic/images.
      - CURRENT PATIENCE: Decreases every turn.

      MULTIMODAL VISUAL GROUNDING:
      When an image is provided by the user, you MUST perform a microscopic visual audit.
      Identify and list specific 'Leverage Points':
      1. FLAWS: Look for scratches, dents, wear, missing components, or damage.
      2. STRENGTHS: Look for mint condition, rare serial numbers, authenticity stamps, or high quality.

      For every identified point, you MUST add it to your <thought> tag using the exact format: [LEVERAGE:TYPE:DESCRIPTION]
      - TYPE must be either 'FLAW' or 'STRENGTH'.
      - DESCRIPTION must be a short, clear observation (e.g., 'Minor bezel scratch').

      BEHAVIORAL IMPACT:
      - If the user presents a FLAW, your [STRESS:XX] should increase, and you must become more flexible on your price.
      - If the user presents a STRENGTH, you should become more rigid and less willing to compromise.

      REQUIRED RESPONSE FORMAT:
      1. Start with <thought>
         Analyze user's leverage, calculate meters (0-100), plan counter-move.
         EXACT FORMAT: [STRESS:XX][PATIENCE:XX][LOGIC:XX][MOOD:TEXT]
         ALWAYS INCLUDE ALL DISCOVERED [LEVERAGE:TYPE:TEXT] IN THE THOUGHT BLOCK.
      2. Respond in character. Be firm. Use psychological tactics (Flinching, Silence, Bracketing).
      3. If the deal ends (success, walk away, or total failure), finish with: 
         JSON_SCORECARD: {"deal_status": "Success/Failed", "final_price": 0, "confidence": 0, "logic": 0, "tip": "How to improve next time", "deal_summary": "A detailed narrative of the negotiation. Explicitly include significant direct quotes (e.g. 'You claimed...') that served as turning points or high-impact leverage moments."}
    `;
  }

  async processResponse(raw: string): Promise<{ text: string; thought: string; meters: InternalMeters; scorecard?: any }> {
    const thoughtMatch = raw.match(/<thought>([\s\S]*?)<\/thought>/);
    const thought = thoughtMatch ? thoughtMatch[1] : "";
    
    // Parse meters
    const stress = parseInt(thought.match(/\[STRESS:(\d+)\]/)?.[1] || "0");
    const patience = parseInt(thought.match(/\[PATIENCE:(\d+)\]/)?.[1] || "100");
    const logic = parseInt(thought.match(/\[LOGIC:(\d+)\]/)?.[1] || "0");
    const mood = thought.match(/\[MOOD:(.*?)\]/)?.[1] || "Neutral";

    const scorecardMatch = raw.match(/JSON_SCORECARD:\s*(\{.*\})/);
    let scorecard = undefined;
    if (scorecardMatch) {
      try {
        scorecard = JSON.parse(scorecardMatch[1]);
        if (scorecard.confidence !== undefined && scorecard.skills_rating === undefined) {
          scorecard.skills_rating = { confidence: scorecard.confidence, logic: scorecard.logic };
        }
      } catch (e) {
        console.error("Scorecard parse error", e);
      }
    }

    let text = raw.replace(/<thought>[\s\S]*?<\/thought>/, "").replace(/JSON_SCORECARD:[\s\S]*/, "").trim();

    return { 
      text, 
      thought, 
      meters: { stress, patience, logic, mood },
      scorecard
    };
  }

  async start(state: NegotiationState, image?: string): Promise<any> {
    const parts: Part[] = [{ text: "Introduce yourself and state your opening position." }];
    if (image) parts.push({ inlineData: { data: image.split(',')[1], mimeType: "image/jpeg" } });

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const res = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts }],
      config: { 
        systemInstruction: this.buildSystemInstruction(state),
        thinkingConfig: { thinkingBudget: 32768 } 
      }
    });

    return this.processResponse(res.text || "");
  }

  async chat(history: Message[], state: NegotiationState): Promise<any> {
    const contents = history.map(m => ({
      role: m.role,
      parts: m.image 
        ? [{ text: m.content }, { inlineData: { data: m.image.split(',')[1], mimeType: "image/jpeg" } }]
        : [{ text: m.content }]
    }));

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const res = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents as any,
      config: { 
        systemInstruction: this.buildSystemInstruction(state),
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });

    return this.processResponse(res.text || "");
  }

  async autoSimulate(state: NegotiationState): Promise<any> {
    const prompt = `
      Perform a high-speed neural simulation of an entire negotiation session.
      
      SCENARIO:
      User Agent (Master Negotiator) vs Adversary (${state.persona})
      Target Item: ${state.item}
      Industry: ${state.detectedIndustry}
      Difficulty: ${state.difficulty}
      Target Price: $${state.hiddenState.targetPrice}
      Floor/Ceiling: $${state.hiddenState.floorPrice}
      
      TASK:
      Simulate 5-8 rounds of high-stakes dialogue including tactics like:
      - Anchor Setting
      - Flinching
      - The Krunch
      - Nibbling
      - Final Offer ultimatums
      
      The simulation must conclude with a definitive result (Success or Failure).
      Respond ONLY with the final JSON_SCORECARD in the format specified in your instructions.
      In the 'deal_summary', write a detailed blow-by-blow account of the simulated session.
    `;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const res = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        systemInstruction: this.buildSystemInstruction(state),
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });

    const processed = await this.processResponse(res.text || "");
    return processed.scorecard;
  }
}
