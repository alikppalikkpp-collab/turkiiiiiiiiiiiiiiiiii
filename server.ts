import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dns from "dns";
import { GoogleGenAI } from "@google/genai";

// Ensure Node standard URL/network works smoothly
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

// Middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable global CORS headers for anyone trying to hit this API from mobile devices/Flutter apps
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Mock Activation Keys Database
// Let's create some predefined keys that map to specific activation responses
const ACTIVATION_KEYS: Record<string, { status: string; plan?: string }> = {
  "WOLF-PRO-777": { status: "valid", plan: "pro" },
  "WOLF-VIP-999": { status: "valid", plan: "pro" },
  "WOLF-EXPIRED": { status: "expired" },
  "WOLF-MISMATCH": { status: "device_mismatch" },
  "WOLF-TRIAL-123": { status: "valid", plan: "pro" },
};

// Also keep a list of dynamically generated keys in memory (so users can create keys in the web dashboard)
const DYNAMIC_KEYS = new Set<string>(["WOLF-PRO-2026"]);

// 1. Activation validation endpoint
app.post("/validate", (req, res) => {
  const { key, device_id } = req.body;
  
  console.log(`[AUTH] Validate requested key: "${key}" for device: "${device_id}"`);

  if (!key) {
    return res.status(400).json({ status: "invalid" });
  }

  const trimmedKey = key.trim().toUpperCase();

  // Check hardcoded mocks
  if (ACTIVATION_KEYS[trimmedKey]) {
    const info = ACTIVATION_KEYS[trimmedKey];
    return res.json(info);
  }

  // Check dynamically created keys in memory
  if (DYNAMIC_KEYS.has(trimmedKey)) {
    return res.json({ status: "valid", plan: "pro" });
  }

  // Otherwise, treat as invalid
  return res.json({ status: "invalid" });
});

// Admin endpoint to generate keys (useful for testing and showing in the simulator helper)
app.post("/api/admin/generate-key", (req, res) => {
  const customKey = "WOLF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  DYNAMIC_KEYS.add(customKey);
  res.json({ success: true, key: customKey });
});

// List all active keys in memory (for convenience)
app.get("/api/admin/keys", (req, res) => {
  res.json({
    hardcoded: Object.keys(ACTIVATION_KEYS).map(k => ({ key: k, ...ACTIVATION_KEYS[k] })),
    dynamic: Array.from(DYNAMIC_KEYS)
  });
});

// 2. Market assets endpoint
const ASSETS_LIST = {
  FOREX: [
    { id: "EUR_USD", symbol: "EUR/USD", name: "Euro / US Dollar", type: "FOREX" },
    { id: "GBP_USD", symbol: "GBP/USD", name: "British Pound / US Dollar", type: "FOREX" },
    { id: "USD_JPY", symbol: "USD/JPY", name: "US Dollar / Japanese Yen", type: "FOREX" },
    { id: "USD_CHF", symbol: "USD/CHF", name: "US Dollar / Swiss Franc", type: "FOREX" },
    { id: "USD_CAD", symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", type: "FOREX" },
    { id: "AUD_USD", symbol: "AUD/USD", name: "Australian Dollar / US Dollar", type: "FOREX" },
    { id: "NZD_USD", symbol: "NZD/USD", name: "New Zealand Dollar / US Dollar", type: "FOREX" },
    { id: "EUR_GBP", symbol: "EUR/GBP", name: "Euro / British Pound", type: "FOREX" },
    { id: "EUR_JPY", symbol: "EUR/JPY", name: "Euro / Japanese Yen", type: "FOREX" },
    { id: "GBP_JPY", symbol: "GBP/JPY", name: "British Pound / Japanese Yen", type: "FOREX" }
  ],
  METALS: [
    { id: "XAU_USD", symbol: "XAU/USD", name: "Gold / US Dollar", type: "METALS" },
    { id: "XAG_USD", symbol: "XAG/USD", name: "Silver / US Dollar", type: "METALS" }
  ],
  CRYPTO: [
    { id: "BTC_USD", symbol: "BTC/USD", name: "Bitcoin / US Dollar", type: "CRYPTO" },
    { id: "ETH_USD", symbol: "ETH/USD", name: "Ethereum / US Dollar", type: "CRYPTO" },
    { id: "BNB_USD", symbol: "BNB/USD", name: "BNB / US Dollar", type: "CRYPTO" },
    { id: "XRP_USD", symbol: "XRP/USD", name: "Ripple / US Dollar", type: "CRYPTO" },
    { id: "SOL_USD", symbol: "SOL_USD", name: "Solana / US Dollar", type: "CRYPTO" },
    { id: "ADA_USD", symbol: "ADA/USD", name: "Cardano / US Dollar", type: "CRYPTO" },
    { id: "DOGE_USD", symbol: "DOGE/USD", name: "Dogecoin / US Dollar", type: "CRYPTO" },
    { id: "TRX_USD", symbol: "TRX/USD", name: "TRON / US Dollar", type: "CRYPTO" }
  ],
  OTC: [
    { id: "EUR_USD_OTC", symbol: "EUR/USD OTC", name: "Euro / US Dollar (Over-the-Counter)", type: "OTC" },
    { id: "GBP_USD_OTC", symbol: "GBP/USD OTC", name: "British Pound / US Dollar (Over-the-Counter)", type: "OTC" },
    { id: "USD_JPY_OTC", symbol: "USD/JPY OTC", name: "US Dollar / Japanese Yen (Over-the-Counter)", type: "OTC" }
  ]
};

app.get("/assets", (req, res) => {
  res.json(ASSETS_LIST);
});

// Helper for generating deterministic parameters based on current time (min increment) + asset name
// This creates realistic, live-changing but stable-over-minutes signals.
function calculateDeterministicTechnicalScore(symbol: string) {
  // Simple hashing of timestamp to preserve signal for 3 minutes
  const timestampMinutes = Math.floor(Date.now() / (1000 * 60 * 3)); // changes every 3 mins
  
  // Create a pseudo-random hash from symbol + timestampMinutes
  let hash = 0;
  const hashString = symbol + "-" + timestampMinutes;
  for (let i = 0; i < hashString.length; i++) {
    hash = (hash << 5) - hash + hashString.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  const seed = Math.abs(hash);

  // Indicators mapping
  // Trend indicator score (0 to 30)
  const trendScore = (seed % 31); 
  // RSI score (0 to 25)
  const rsiScore = (seed % 26);
  // Candlestick confirmations (0 to 25)
  const candleScore = ((seed >> 2) % 26);
  // Momentum scorecard (0 to 20)
  const momentumScore = ((seed >> 4) % 21);

  const totalScore = trendScore + rsiScore + candleScore + momentumScore;

  // Directions
  const direction = (seed % 2 === 0) ? "BUY" : "SELL";

  // Strength categorisation
  let strength = "WEAK";
  if (totalScore >= 85) {
    strength = "STRONG";
  } else if (totalScore >= 70) {
    strength = "MEDIUM";
  }

  // Base prices
  let basePrice = 1.0;
  if (symbol.includes("BTC")) basePrice = 67250.0 + (seed % 1500) - 750;
  else if (symbol.includes("ETH")) basePrice = 3450.0 + (seed % 100) - 50;
  else if (symbol.includes("SOL")) basePrice = 145.5 + (seed % 10) - 5;
  else if (symbol.includes("XAU")) basePrice = 2320.5 + (seed % 40) - 20;
  else if (symbol.includes("XAG")) basePrice = 29.2 + ((seed % 100) / 100);
  else if (symbol.includes("JPY")) basePrice = 157.2 + ((seed % 200) / 100);
  else if (symbol.includes("GBP")) basePrice = 1.27 + ((seed % 100) / 5000);
  else basePrice = 1.08 + ((seed % 100) / 5000); // Standard EUR base

  // Format decimal place
  const decimals = (symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("XAU")) ? 2 : 5;
  const price = parseFloat(basePrice.toFixed(decimals));

  // Durations (min)
  const durations = [5, 10, 15, 30];
  const duration = durations[seed % durations.length];

  return {
    pair: symbol,
    direction,
    price,
    duration,
    confidence: Math.min(98, Math.max(62, totalScore)), // confidence binds to total score percentage
    strength,
    technicalMetrics: {
      trendScore,
      rsiScore,
      candleScore,
      momentumScore,
      totalScore
    }
  };
}

// 3. Live trading signals endpoint
app.get("/signals", (req, res) => {
  // Merge all symbols into a single flat array to run through the indicator scorer
  const allSymbols: string[] = [];
  Object.values(ASSETS_LIST).forEach((category) => {
    category.forEach((asset) => {
      allSymbols.push(asset.symbol);
    });
  });

  // Calculate scores and apply rule: "Only send signals if score >= 70" (i.e. Ignore WEAK signals. Only show STRONG/MEDIUM)
  const signals = allSymbols
    .map((symbol) => calculateDeterministicTechnicalScore(symbol))
    .filter((sig) => sig.strength === "STRONG" || sig.strength === "MEDIUM"); // Ignore WEAK

  res.json(signals);
});

// 4. Server-Side Gemini endpoint for AI Coach (مستشار التداول الذكي)
// Expose this for the interactive chat feature in the web simulator
app.post("/api/gemini/coach", async (req, res) => {
  const { message, chatHistory } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    // Return a default mock Arabic response if API is not set
    return res.json({
      text: "أهلاً بك! أنا مستشار الذئب الذكي للتحليل الفني 🐺. الرجاء تفعيل مفتاح Gemini في الإعدادات للاستفادة الكاملة من الذكاء الاصطناعي. حالياً، بناءً على التحليل الفني لزوج **EUR/USD**، نلاحظ تشبع بيع على مؤشر RSI وهو يدعم خيار الشراء (BUY 🔥) بهدف 1.08750."
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Provide complete trading parameters context to Gemini
    const systemPrompt = `You are "The Wise Trading Wolf Assistant (مستشار الذئب الذكي) 🐺", an expert quantitative developer and full-time trading signal mentor specializing in algorithmic trading, Forex, Metals, Cryptocurrencies, and OTC binary options.
Your personality is highly confident, professional, and razor-sharp. You guide traders with accurate risk indicators.
ALWAYS speak and answer in elegant Arabic (اللغة العربية الفصحى) optimized for traders in the MENA region.
Explain indicators like RSI (مؤشر القوة النسبية), Moving Averages (المتوسطات المتحركة), and Candlestick patterns in a friendly, elite, technical manner.
Give structured, professional answers with bold headings, clean bullet points, and appropriate emojis like 🔥, 📈, 📉, 🐺.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        ...((chatHistory || []).map((h: any) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        }))),
        {
          role: "user",
          parts: [{ text: message }]
        }
      ],
      config: {
        systemInstruction: systemPrompt,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Failed to generate AI response. Pls check key format.", details: error.message });
  }
});

// Setup Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve index.html for all non-api SPA paths
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[WOLF SERVER] Running live at http://0.0.0.0:${PORT}`);
    console.log(`[WOLF API] Available endpoints:`);
    console.log(` - POST http://localhost:${PORT}/validate`);
    console.log(` - GET  http://localhost:${PORT}/signals`);
    console.log(` - GET  http://localhost:${PORT}/assets`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
