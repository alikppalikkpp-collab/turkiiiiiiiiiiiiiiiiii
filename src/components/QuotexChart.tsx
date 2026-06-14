import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, Clock, Play, CheckCircle2, AlertTriangle, ShieldCheck, ChevronDown, RefreshCw } from "lucide-react";
import { Asset, Signal } from "../types";

interface QuotexChartProps {
  initialSymbol?: string;
  assets: Record<string, Asset[]>;
  signals: Signal[];
  onBackToHome?: () => void;
}

export default function QuotexChart({ initialSymbol = "EUR/USD", assets, signals, onBackToHome }: QuotexChartProps) {
  const [selectedPair, setSelectedPair] = useState(initialSymbol);
  const [investAmount, setInvestAmount] = useState(50);
  const [tradeDurationSec, setTradeDurationSec] = useState(60); // default 1 minute (60s)
  const [payoutPercentage] = useState(92); // Quotex high payout simulation
  
  // Find active signal for selected pair
  const activeSignal = signals.find(s => s.pair === selectedPair);

  // Entry price modes
  const [entryPriceMode, setEntryPriceMode] = useState<"MARKET" | "SIGNAL" | "CUSTOM">(
    activeSignal ? "SIGNAL" : "MARKET"
  );
  const [customEntryPrice, setCustomEntryPrice] = useState<string>(
    activeSignal ? activeSignal.price.toString() : "1.08250"
  );

  // Sync state when pair or signals update
  useEffect(() => {
    const matchingSig = signals.find(s => s.pair === selectedPair);
    if (matchingSig) {
      setEntryPriceMode("SIGNAL");
      setCustomEntryPrice(matchingSig.price.toString());
    } else {
      setEntryPriceMode("MARKET");
    }
  }, [selectedPair, signals]);

  // Active trade simulation state
  const [activeTrade, setActiveTrade] = useState<{
    id: string;
    pair: string;
    direction: "UP" | "DOWN";
    entryPrice: number;
    amount: number;
    remainingTime: number;
    payout: number;
  } | null>(null);

  const [tradeHistory, setTradeHistory] = useState<{
    id: string;
    pair: string;
    direction: "UP" | "DOWN";
    amount: number;
    result: "WIN" | "LOSS";
    payout: number;
    timestamp: string;
  }[]>(() => {
    try {
      const saved = localStorage.getItem("quotex_trade_history");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  // Keep trade history synced with localStorage
  useEffect(() => {
    try {
      localStorage.setItem("quotex_trade_history", JSON.stringify(tradeHistory));
    } catch (_) {}
  }, [tradeHistory]);

  // Sound generator parameters
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play micro simulated audio frequencies using Web Audio API
  const playBeep = (type: "click" | "win" | "loss" | "tick") => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === "click") {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === "tick") {
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === "win") {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "loss") {
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (_) {}
  };

  // Helper to map UI symbols dynamically to appropriate TradingView symbols
  const getTradingViewSymbol = (uiSymbol: string) => {
    const clean = uiSymbol.replace(" OTC", "").trim();
    if (clean === "EUR/USD") return "FX:EURUSD";
    if (clean === "GBP/USD") return "FX:GBPUSD";
    if (clean === "USD/JPY") return "FX:USDJPY";
    if (clean === "USD/CHF") return "FX:USDCHF";
    if (clean === "USD/CAD") return "FX:USDCAD";
    if (clean === "AUD/USD") return "FX:AUDUSD";
    if (clean === "NZD/USD") return "FX:NZDUSD";
    if (clean === "EUR/GBP") return "FX:EURGBP";
    if (clean === "EUR/JPY") return "FX:EURJPY";
    if (clean === "GBP/JPY") return "FX:GBPJPY";
    if (clean === "XAU/USD") return "OANDA:XAUUSD";
    if (clean === "XAG/USD") return "OANDA:XAGUSD";
    if (clean === "BTC/USD") return "BINANCE:BTCUSDT";
    if (clean === "ETH/USD") return "BINANCE:ETHUSDT";
    if (clean === "SOL/USD") return "BINANCE:SOLUSDT";
    if (clean === "BNB/USD") return "BINANCE:BNBUSDT";
    if (clean === "XRP/USD") return "BINANCE:XRPUSDT";
    if (clean === "ADA/USD") return "BINANCE:ADAUSDT";
    if (clean === "DOGE/USD") return "BINANCE:DOGEUSDT";
    if (clean === "TRX/USD") return "BINANCE:TRXUSDT";
    return `FX:${clean.replace("/", "")}`;
  };

  const tvSymbol = getTradingViewSymbol(selectedPair);

  // Simulated countdown clock for active trade
  useEffect(() => {
    if (!activeTrade) return;

    const interval = setInterval(() => {
      setActiveTrade(prev => {
        if (!prev) return null;
        if (prev.remainingTime <= 1) {
          clearInterval(interval);
          // Resolve trade outcome deterministically with a bias towards winning if matching signal direction!
          setTimeout(() => {
            handleResolveTrade(prev);
          }, 100);
          return null;
        }
        playBeep("tick");
        return {
          ...prev,
          remainingTime: prev.remainingTime - 1
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTrade]);

  // Execute binary option trade
  const handlePlaceTrade = (direction: "UP" | "DOWN", forcedPrice?: number) => {
    if (activeTrade) return; // limit to 1 concurrent position inside mobile simulator
    playBeep("click");

    const matchingSignal = signals.find(s => s.pair === selectedPair);
    let finalEntryPrice = 1.08250;

    if (forcedPrice !== undefined) {
      finalEntryPrice = forcedPrice;
    } else if (entryPriceMode === "SIGNAL" && matchingSignal) {
      finalEntryPrice = matchingSignal.price;
    } else if (entryPriceMode === "CUSTOM") {
      finalEntryPrice = parseFloat(customEntryPrice) || (matchingSignal?.price ?? 1.08250);
    } else {
      finalEntryPrice = matchingSignal ? matchingSignal.price : 1.08250;
    }

    const trade = {
      id: Date.now().toString(),
      pair: selectedPair,
      direction,
      entryPrice: finalEntryPrice,
      amount: investAmount,
      remainingTime: tradeDurationSec,
      payout: parseFloat((investAmount * (payoutPercentage / 100)).toFixed(2))
    };

    setActiveTrade(trade);
  };

  // Resolve trade outcome in simulation
  const handleResolveTrade = (endedTrade: typeof activeTrade & { remainingTime: number }) => {
    if (!endedTrade) return;

    // Check if user placed in alignment with our expert signals direction
    const signalForThisPair = signals.find(s => s.pair === endedTrade.pair);
    let winChance = 0.5; // default 50/50

    if (signalForThisPair) {
      const isCorrectDirection = 
        (endedTrade.direction === "UP" && signalForThisPair.direction === "BUY") ||
        (endedTrade.direction === "DOWN" && signalForThisPair.direction === "SELL");
      
      // If user followed the Wolf signal direction, they have a massive boost to mimic successful analysis!
      winChance = isCorrectDirection ? 0.85 : 0.20;
    }

    const isWin = Math.random() < winChance;

    if (isWin) {
      playBeep("win");
      const profit = parseFloat((endedTrade.amount * (payoutPercentage / 100)).toFixed(2));
      const newHistoryItem = {
        id: endedTrade.id,
        pair: endedTrade.pair,
        direction: endedTrade.direction,
        amount: endedTrade.amount,
        result: "WIN" as const,
        payout: profit,
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
      };
      setTradeHistory(prev => [newHistoryItem, ...prev]);
    } else {
      playBeep("loss");
      const newHistoryItem = {
        id: endedTrade.id,
        pair: endedTrade.pair,
        direction: endedTrade.direction,
        amount: endedTrade.amount,
        result: "LOSS" as const,
        payout: -endedTrade.amount,
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
      };
      setTradeHistory(prev => [newHistoryItem, ...prev]);
    }
  };

  // Flatten assets array for dropdown pair selection
  const flatAssets: string[] = [];
  Object.values(assets).forEach(cat => {
    cat.forEach(item => {
      if (!flatAssets.includes(item.symbol)) {
        flatAssets.push(item.symbol);
      }
    });
  });

  return (
    <div className="flex flex-col h-full bg-[#05070f] text-gray-100 flex-grow animate-fade-in font-sans">
      
      {/* Quotex Screen Header */}
      <div className="p-3 bg-[#0b0f1d] border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBackToHome && (
            <button 
              onClick={onBackToHome}
              className="p-1 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all"
            >
              <ChevronDown className="w-4 h-4 rotate-90 shrink-0" />
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-sm">📊</span>
            <div>
              <span className="font-extrabold text-white text-xs block leading-none">شارت كيوتكس الاحترافي</span>
              <span className="text-[8px] text-gray-450 font-sans tracking-tight">Quotex Live Widget API</span>
            </div>
          </div>
        </div>

        {/* Audio feedback toggle */}
        <button 
          onClick={() => setSoundEnabled(prev => !prev)}
          className={`px-2 py-1 rounded text-[8px] font-bold border transition-all ${
            soundEnabled ? "bg-blue-600/10 text-blue-400 border-blue-500/20" : "bg-slate-900 text-gray-500 border-white/5"
          }`}
        >
          {soundEnabled ? "🔊 الصوت مفعل" : "🔇 حظر الصوت"}
        </button>
      </div>

      {/* Symbol selector bar */}
      <div className="p-2 bg-[#080b15] border-b border-white/5 flex items-center gap-2 justify-between">
        <div className="flex items-center gap-1.5 flex-grow">
          <label className="text-[9px] text-gray-400 font-bold shrink-0">الزوج:</label>
          <select
            value={selectedPair}
            onChange={(e) => {
              setSelectedPair(e.target.value);
              playBeep("click");
            }}
            className="flex-grow bg-slate-950/90 border border-white/10 rounded-lg py-1 px-1.5 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[130px] font-mono font-bold"
          >
            {flatAssets.length > 0 ? (
              flatAssets.map(sym => (
                <option key={sym} value={sym}>{sym}</option>
              ))
            ) : (
              <option value="EUR/USD">EUR/USD</option>
            )}
          </select>
        </div>

        {/* Dynamic active signals matching alert */}
        {signals.find(s => s.pair === selectedPair) && (
          <div className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg px-2 py-0.5 text-[8px] font-bold animate-pulse">
            <TrendingUp className="w-2.5 h-2.5" />
            <span>توصية نشطة</span>
          </div>
        )}
      </div>

      {/* GRAPH CONTAINER */}
      <div className="flex-grow relative h-[180px] bg-black">
        {/* Iframe TradingView embed specifically configured for high speed, dark theme and modern tech UI */}
        <iframe
          id="tv-frame"
          key={selectedPair}
          title="Quotex Live Realtime Widget"
          src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${tvSymbol}&interval=1&hidesidetoolbar=1&symboledit=0&saveimage=1&toolbarbg=070913&studies=%5B%7B%22id%22%3A%22RSI%40tv-basicstudies%22%2C%22inputs%22%3A%7B%22length%22%3A14%7D%7D%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=ar`}
          className="w-full h-full border-0 absolute inset-0"
          style={{ background: "#05070d" }}
        />

        {/* Visual active deal overlay on the chart displaying the correct entry price */}
        {activeTrade && (
          <div className="absolute top-3 left-3 right-3 bg-slate-950/90 backdrop-blur-md border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs animate-slide-in shadow-2xl select-none z-10">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${activeTrade.direction === "UP" ? "bg-emerald-500 animate-ping" : "bg-red-500 animate-ping"}`} />
              <span className="font-extrabold text-[10px] text-white">صفقة محاكاة نشطة: {activeTrade.pair}</span>
            </div>
            <div className="text-[10px] space-x-1 flex items-center text-gray-300">
              <span className="text-gray-450">سعر الدخول:</span>
              <strong className="font-mono text-emerald-400 font-extrabold">{activeTrade.entryPrice}</strong>
              <span className="text-gray-600 px-1">|</span>
              <span className="font-mono text-blue-400 font-black bg-blue-950/50 px-2 py-0.5 rounded-lg border border-blue-500/20">{activeTrade.remainingTime} ث</span>
            </div>
          </div>
        )}
      </div>

      {/* QUICK BINARY OPTIONS CONTROLS (Exactly like Quotex platform) */}
      <div className="p-3 bg-[#0a0f1d] border-t border-white/5 space-y-3 shrink-0">
        
        {/* Dynamic active signals matching alert & click to prefill */}
        {activeSignal && !activeTrade && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 px-2.5 flex items-center justify-between gap-1.5 transition-all">
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[9px] font-extrabold text-emerald-400">توصية الذئب نشطة:</span>
              </div>
              <p className="text-[8px] text-gray-450 font-sans">
                دخول <span className="font-bold text-white pr-0.5">{selectedPair}</span> {activeSignal.direction === "BUY" ? "صعود" : "هبوط"} بسعر <span className="font-mono text-emerald-300 font-bold">{activeSignal.price}</span>
              </p>
            </div>
            <button
              onClick={() => {
                setEntryPriceMode("SIGNAL");
                handlePlaceTrade(activeSignal.direction === "BUY" ? "UP" : "DOWN", activeSignal.price);
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[9px] py-1 px-2 rounded-lg transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>دخول صفقة التوصية 🎯</span>
            </button>
          </div>
        )}

        {/* Amount & timeframe toggles */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#05060b] border border-white/5 rounded-xl p-2 flex flex-col justify-between">
            <span className="text-[8px] text-gray-500 block font-bold mb-1">الاستثمار (المبلغ)</span>
            <div className="flex items-center justify-between gap-1.5">
              <button 
                onClick={() => {
                  setInvestAmount(p => Math.max(10, p - 10));
                  playBeep("click");
                }}
                className="w-5 h-5 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 text-xs font-bold transition-all"
              >
                -
              </button>
              <span className="text-xs font-mono font-extrabold text-blue-400">${investAmount}</span>
              <button 
                onClick={() => {
                  setInvestAmount(p => p + 10);
                  playBeep("click");
                }}
                className="w-5 h-5 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 text-xs font-bold transition-all"
              >
                +
              </button>
            </div>
          </div>

          <div className="bg-[#05060b] border border-white/5 rounded-xl p-2 flex flex-col justify-between">
            <span className="text-[8px] text-gray-500 block font-bold mb-1">مدة الصفقة (دقيقة/ثواني)</span>
            <div className="flex items-center justify-between gap-1">
              <button 
                onClick={() => {
                  setTradeDurationSec(p => Math.max(30, p - 30));
                  playBeep("click");
                }}
                className="w-5 h-5 rounded bg-white/5 text-gray-400 hover:text-white text-xs font-bold transition-all"
              >
                -
              </button>
              <span className="text-xs font-mono font-bold text-gray-200">
                {tradeDurationSec >= 60 ? `${tradeDurationSec / 60} د` : `${tradeDurationSec} ث`}
              </span>
              <button 
                onClick={() => {
                  setTradeDurationSec(p => p + 30);
                  playBeep("click");
                }}
                className="w-5 h-5 rounded bg-white/5 text-gray-400 hover:text-white text-xs font-bold transition-all"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Entry Price Configuration Section */}
        <div className="bg-[#05060b] border border-white/5 rounded-xl p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[8px] text-gray-400 font-bold">نمط سعر فتح الصفقة:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setEntryPriceMode("MARKET");
                  playBeep("click");
                }}
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all ${
                  entryPriceMode === "MARKET" ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                سعر السوق
              </button>
              {activeSignal && (
                <button
                  type="button"
                  onClick={() => {
                    setEntryPriceMode("SIGNAL");
                    setCustomEntryPrice(activeSignal.price.toString());
                    playBeep("click");
                  }}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all ${
                    entryPriceMode === "SIGNAL" ? "bg-emerald-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  التوصية ({activeSignal.price})
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEntryPriceMode("CUSTOM");
                  playBeep("click");
                }}
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all ${
                  entryPriceMode === "CUSTOM" ? "bg-orange-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                سعر مخصص
              </button>
            </div>
          </div>

          {/* Render input field if Custom Entry is selected */}
          {entryPriceMode === "CUSTOM" && (
            <div className="flex items-center gap-1.5 bg-[#0a0f1d] border border-white/10 rounded-lg px-2 py-1">
              <span className="text-[8px] text-gray-500 font-mono font-bold">السعر المستهدف:</span>
              <input
                type="number"
                step="0.00001"
                value={customEntryPrice}
                onChange={(e) => setCustomEntryPrice(e.target.value)}
                className="bg-transparent text-[10px] text-white font-mono font-bold focus:outline-none flex-grow"
                placeholder="1.08250"
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[8px] text-gray-500 border-t border-white/5 pt-1.5">
            <span>سعر دخول الصفقة النشطة حالياً:</span>
            <span className="font-mono text-emerald-400 font-bold">
              {entryPriceMode === "SIGNAL" && activeSignal ? activeSignal.price : (entryPriceMode === "CUSTOM" ? customEntryPrice : "سعر السوق التلقائي")}
            </span>
          </div>
        </div>

        {/* Payout % label display */}
        <div className="flex items-center justify-between text-[9px] text-gray-450 bg-[#05070d] px-2.5 py-1.5 rounded-lg border border-white/5">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>معدل العائد التقريبي:</span>
          </span>
          <span className="text-emerald-400 font-extrabold font-mono text-[10px]">{payoutPercentage}% payout</span>
        </div>

        {/* ACTIVE POSITION PANEL */}
        {activeTrade ? (
          <div className="p-2.5 bg-blue-950/25 border border-blue-500/20 rounded-xl relative overflow-hidden animate-pulse">
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${activeTrade.direction === "UP" ? "bg-emerald-500" : "bg-red-500"}`}></span>
                <span className="font-bold text-white text-[9px]">{activeTrade.direction === "UP" ? "صعود" : "هبوط"} - {activeTrade.pair}</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-emerald-300 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded">
                <Clock className="w-3 h-3" />
                <span>{activeTrade.remainingTime} ثانية</span>
              </div>
            </div>
            <div className="flex justify-between items-center mt-1.5 text-[9px]">
              <span className="text-gray-400">سعر الدخول: <strong className="font-mono text-white pr-0.5">{activeTrade.entryPrice}</strong></span>
              <span className="text-blue-300">الربح المتوقع: <strong className="font-mono font-bold text-emerald-400">${activeTrade.payout}</strong></span>
            </div>
          </div>
        ) : (
          /* TRADING BUTTONS Up/Down */
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handlePlaceTrade("UP")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-xl border border-emerald-500/20 shadow-lg shadow-emerald-900/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>صعود {payoutPercentage}% 🚀</span>
            </button>
            <button
              type="button"
              onClick={() => handlePlaceTrade("DOWN")}
              className="bg-red-650 hover:bg-red-600 text-white font-extrabold py-3.5 rounded-xl border border-red-500/20 shadow-lg shadow-red-900/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <TrendingDown className="w-4 h-4 shrink-0" />
              <span>هبوط {payoutPercentage}% ❄️</span>
            </button>
          </div>
        )}

        {/* DETAILED WALLET & TRADE HISTORY PANEL */}
        <div className="space-y-2 bg-[#05060b] border border-white/5 rounded-xl p-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[10px] text-white font-extrabold flex items-center gap-1">
              <span>📋</span>
              <span>سجل صفقات محاكي كيوتكس</span>
            </span>
            <div className="flex items-center gap-2">
              {tradeHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("هل أنت متأكد من مسح كافة سجل الصفقات؟")) {
                      setTradeHistory([]);
                      playBeep("click");
                    }
                  }}
                  className="text-[8px] text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-500/15 transition-all text-[8px]"
                >
                  مسح السجل 🗑️
                </button>
              )}
              <span className="text-[8px] text-gray-500 font-mono bg-white/5 px-2 py-0.5 rounded">
                {tradeHistory.length} صفقات
              </span>
            </div>
          </div>

          {/* Dynamic Statistics Block */}
          {tradeHistory.length > 0 && (
            <div className="grid grid-cols-4 gap-1 pt-1 pb-2 border-b border-white/5 text-[8px] md:text-[9px] text-center">
              <div className="bg-[#0a0f1d] p-1 rounded border border-white/5">
                <span className="text-gray-500 block">الرابحة</span>
                <strong className="text-emerald-400 font-extrabold text-[10px] font-mono">
                  {tradeHistory.filter((t) => t.result === "WIN").length}
                </strong>
              </div>
              <div className="bg-[#0a0f1d] p-1 rounded border border-white/5">
                <span className="text-gray-500 block">الخاسرة</span>
                <strong className="text-red-400 font-extrabold text-[10px] font-mono">
                  {tradeHistory.filter((t) => t.result === "LOSS").length}
                </strong>
              </div>
              <div className="bg-[#0a0f1d] p-1 rounded border border-white/5">
                <span className="text-gray-500 block">نسبة النجاح</span>
                <strong className="text-blue-400 font-extrabold text-[10px] font-mono">
                  {(
                    (tradeHistory.filter((t) => t.result === "WIN").length /
                      tradeHistory.length) *
                    100
                  ).toFixed(0)}
                  %
                </strong>
              </div>
              <div className="bg-[#0a0f1d] p-1 rounded border border-white/5">
                <span className="text-gray-500 block">صافي الأرباح</span>
                <strong className={`font-extrabold text-[10px] font-mono ${
                  tradeHistory.reduce((sum, h) => sum + h.payout, 0) >= 0 
                    ? "text-emerald-400" 
                    : "text-red-400"
                }`}>
                  {tradeHistory.reduce((sum, h) => sum + h.payout, 0) >= 0 ? "+" : ""}
                  ${tradeHistory.reduce((sum, h) => sum + h.payout, 0).toFixed(2)}
                </strong>
              </div>
            </div>
          )}

          {tradeHistory.length > 0 ? (
            <div className="max-h-[110px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {tradeHistory.map((hist) => {
                const isWin = hist.result === "WIN";
                return (
                  <div 
                    key={hist.id} 
                    className={`flex items-center justify-between gap-1.5 p-2 rounded-lg text-[9px] transition-all bg-[#0a0f1d] border border-white/5`}
                  >
                    {/* Pair, Timestamp & Direction */}
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${hist.direction === "UP" ? "bg-emerald-400" : "bg-red-400"}`}></span>
                      <div>
                        <span className="font-mono font-bold text-white block leading-none">{hist.pair}</span>
                        <span className="text-[7px] text-gray-500 font-sans mt-0.5 block">
                          {hist.direction === "UP" ? "📈 صعود" : "📉 هبوط"} • {hist.timestamp}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge & Value */}
                    <div className="flex items-center gap-2 text-left">
                      <div className="flex flex-col items-end">
                        <span className={`font-mono font-extrabold ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                          {isWin ? `+$${hist.payout}` : `-$${hist.amount}`}
                        </span>
                        <span className="text-[7px] text-gray-500 font-sans">القيمة: ${hist.amount}</span>
                      </div>

                      {/* Explicit Arabic Status Label as requested ("رابحة" or "خاسرة") */}
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold border shrink-0 ${
                        isWin 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-red-500/15 text-red-400 border-red-500/20"
                      }`}>
                        {isWin ? "صفقة رابحة ✨" : "صفقة خاسرة ❄️"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-4 text-center text-gray-500 text-[8px] flex flex-col items-center justify-center gap-1">
              <span>📭 لا توجد صفقات منفذة حتى الآن.</span>
              <span>انقر فوق "صعود" أو "هبوط" لبدء محاكاة التداول الفوري.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
