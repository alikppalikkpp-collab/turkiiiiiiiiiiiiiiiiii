export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: "FOREX" | "METALS" | "CRYPTO" | "OTC";
}

export interface TechnicalMetrics {
  trendScore: number;
  rsiScore: number;
  candleScore: number;
  momentumScore: number;
  totalScore: number;
}

export interface Signal {
  pair: string;
  direction: "BUY" | "SELL";
  price: number;
  duration: number;
  confidence: number;
  strength: "STRONG" | "MEDIUM" | "WEAK";
  technicalMetrics?: TechnicalMetrics;
}

export interface ActivationResponse {
  status: "valid" | "invalid" | "expired" | "device_mismatch";
  plan?: string;
  message?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export type ScreenType = "SPLASH" | "ACTIVATION" | "HOME" | "MARKETS" | "SETTINGS" | "AI_COACH" | "QUOTEX";
