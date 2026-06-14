import React, { useState, useEffect, useRef } from "react";
import { 
  TrendingUp, 
  Search, 
  Settings, 
  Key, 
  User, 
  Bell, 
  Compass, 
  LogOut, 
  Send, 
  Sparkles, 
  Star, 
  RefreshCw, 
  Link as LinkIcon, 
  ChevronRight, 
  AlertCircle, 
  Activity, 
  Cpu, 
  DollarSign, 
  Layers, 
  Smartphone, 
  BadgeHelp,
  Copy,
  Check,
  Code
} from "lucide-react";
import FlutterExporter from "./components/FlutterExporter";
import QuotexChart from "./components/QuotexChart";
import { Asset, Signal, ScreenType, ChatMessage } from "./types";

export default function App() {
  // Mobile Simulator State
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("SPLASH");
  const [activationKey, setActivationKey] = useState("");
  const [isActivated, setIsActivated] = useState(true);
  const [activatedPlan, setActivatedPlan] = useState("Pro");
  const [deviceUUID] = useState("WOLF_DEVICE_8872_X");
  const [errorMessage, setErrorMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard signals & assets state
  const [signals, setSignals] = useState<Signal[]>([]);
  const [assets, setAssets] = useState<Record<string, Asset[]>>({ FOREX: [], METALS: [], CRYPTO: [], OTC: [] });
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [marketCategory, setMarketCategory] = useState<"ALL" | "FOREX" | "METALS" | "CRYPTO" | "OTC">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [favoritePairs, setFavoritePairs] = useState<string[]>([]);
  
  // Active Signal Sheet Context
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  
  // AI Coach Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Notifications Simulator State
  const [activeFCMNotification, setActiveFCMNotification] = useState<{
    pair: string;
    direction: string;
    price: number;
    duration: number;
    confidence: number;
  } | null>(null);
  const [notificationVisible, setNotificationVisible] = useState(false);

  // Admin Key Generator State
  const [adminKeysList, setAdminKeysList] = useState<{ key: string; status: string; plan?: string }[]>([]);
  const [dynamicKeys, setDynamicKeys] = useState<string[]>([]);
  const [newKeyGenerated, setNewKeyGenerated] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [activeTabPanel, setActiveTabPanel] = useState<"simulator" | "flutter">("simulator");

  // Load preferences, keys lists, and initialize
  useEffect(() => {
    // Check if activated before
    const savedFavorites = localStorage.getItem("wolf_favorites");

    setIsActivated(true);
    setActivatedPlan("pro");

    if (savedFavorites) {
      setFavoritePairs(JSON.parse(savedFavorites));
    }

    // Load admin key list & dynamic keys
    refreshKeysList();
  }, []);

  // Fetch admin keys list from Node Express API
  const refreshKeysList = async () => {
    try {
      const response = await fetch("/api/admin/keys");
      const data = await response.json();
      const combined = [
        ...data.hardcoded,
        ...data.dynamic.map((key: string) => ({ key, status: "valid", plan: "pro" }))
      ];
      setAdminKeysList(combined);
      setDynamicKeys(data.dynamic);
    } catch (_) {
      // Fallback keys if offline or loading is slow
      setAdminKeysList([
        { key: "WOLF-PRO-777", status: "valid", plan: "pro" },
        { key: "WOLF-VIP-999", status: "valid", plan: "pro" },
        { key: "WOLF-EXPIRED", status: "expired" },
        { key: "WOLF-MISMATCH", status: "device_mismatch" }
      ]);
    }
  };

  // Generate new testing activation key from our Express server API
  const handleGenerateTestingKey = async () => {
    try {
      const response = await fetch("/api/admin/generate-key", { method: "POST" });
      const data = await response.json();
      if (data.key) {
        setNewKeyGenerated(data.key);
        refreshKeysList();
        // Trigger short user alerts
        setCopiedKey(false);
      }
    } catch (_) {
      const fallbackKey = "WOLF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      setNewKeyGenerated(fallbackKey);
    }
  };

  const handleCopyNewKey = () => {
    if (newKeyGenerated) {
      navigator.clipboard.writeText(newKeyGenerated);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  // Load live trading signals & assets from server
  const loadSignalsAndAssets = async () => {
    setLoadingSignals(true);
    try {
      const sigResponse = await fetch("/signals");
      const sigData = await sigResponse.json();
      setSignals(sigData);

      const astResponse = await fetch("/assets");
      const astData = await astResponse.json();
      setAssets(astData);
    } catch (e) {
      console.error("Failed to load indicators", e);
    } finally {
      setLoadingSignals(false);
    }
  };

  // Auto handle Splash Transition Screen State
  useEffect(() => {
    if (currentScreen === "SPLASH") {
      const timer = setTimeout(() => {
        if (isActivated) {
          setCurrentScreen("HOME");
          loadSignalsAndAssets();
        } else {
          setCurrentScreen("ACTIVATION");
        }
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, isActivated]);

  // Request activation key verification securely from Express Backend
  const handleActivateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationKey.trim()) {
      setErrorMessage("⚠️ الرجاء إدخال مفتاح التفعيل أولاً");
      return;
    }

    setAuthLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: activationKey.trim(),
          device_id: deviceUUID
        })
      });

      const resData = await response.json();
      
      if (resData.status === "valid") {
        setIsActivated(true);
        setActivatedPlan(resData.plan || "pro");
        localStorage.setItem("wolf_activated", "true");
        localStorage.setItem("wolf_plan", resData.plan || "pro");
        setCurrentScreen("HOME");
        loadSignalsAndAssets();
      } else if (resData.status === "expired") {
        setErrorMessage("❌ انتهت صلاحية مفتاح التفعيل المدخل.");
      } else if (resData.status === "device_mismatch") {
        setErrorMessage("❌ المفتاح مستخدم بالفعل على جهاز آخر.");
      } else {
        setErrorMessage("❌ مفتاح التفعيل غير صحيح أو تم إدخاله بشكل خاطئ.");
      }
    } catch (err) {
      setErrorMessage("❌ خطأ بالاتصال بالخادم. يرجى مراجعة حالة المضيف.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout reset session
  const handleLogout = () => {
    setIsActivated(false);
    setActivatedPlan("");
    localStorage.removeItem("wolf_activated");
    localStorage.removeItem("wolf_plan");
    setCurrentScreen("ACTIVATION");
    // reset configurations
    setActivationKey("");
    setErrorMessage("");
    setSelectedSignal(null);
  };

  // Toggle Favorite
  const handleToggleFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (favoritePairs.includes(symbol)) {
      updated = favoritePairs.filter(p => p !== symbol);
    } else {
      updated = [...favoritePairs, symbol];
    }
    setFavoritePairs(updated);
    localStorage.setItem("wolf_favorites", JSON.stringify(updated));
  };

  // Send message to server-side AI Coach (Gemini)
  const handleSendMessageToAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: chatInput,
      timestamp: new Date().toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/gemini/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          chatHistory: chatMessages.slice(-8).map(m => ({ role: m.role, text: m.text }))
        })
      });

      const data = await response.json();
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: data.text || "عذراً، لم أستطع تحليل السوق في هذه اللحظة، يرجى تكرار المحاولة.",
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })
      };
      
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (_) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: "حدث خطأ أثناء الحصول على رد مستشار الذئب الذكي للتحليل الفني.",
        timestamp: "الآن"
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  // Scroll Chat to Bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle Signal click
  const handleInspectSignal = (signal: Signal) => {
    setSelectedSignal(signal);
    setCurrentScreen("AI_COACH");
    // Initialize AI Coach chat with a friendly trading prompt
    setChatMessages([
      {
        id: "intro",
        role: "model",
        text: `أهلاً بك في غرفة الذئب للتحليل الفني! لقد قمت باختيار زوج العملات **${signal.pair}**. 
We are now monitoring based on the technical algorithm. The current recommendation is **${signal.direction === "BUY" ? "شراء 🔥 BUY" : "بيع ❄️ SELL"}** with confidence **${signal.confidence}%**.
Feel free to ask any questions. 🐺📈`,
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Open dedicated Quotex screen
  const handleOpenQuotexChart = (signal: Signal, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedSignal(signal);
    setCurrentScreen("QUOTEX");
  };

  // Simulate Triggering FCM Remote Push Notification
  const handleTriggerFCM = () => {
    if (!isActivated) {
      alert("يرجى تفعيل التطبيق أولاً لاستلام الإشارات والإشعارات!");
      return;
    }

    // Generate random signal for notification
    const availablePairs = ["XAU/USD", "EUR/USD", "BTC/USD", "GBP/USD OTC", "SOL/USD"];
    const pair = availablePairs[Math.floor(Math.random() * availablePairs.length)];
    const direction = Math.random() < 0.55 ? "BUY" : "SELL";
    const price = pair.includes("BTC") ? 67450.50 : pair.includes("XAU") ? 2325.20 : 1.08320;
    
    const nextFCM = {
      pair,
      direction,
      price,
      duration: [5, 10, 15][Math.floor(Math.random() * 3)],
      confidence: Math.floor(Math.random() * 15) + 82
    };

    setActiveFCMNotification(nextFCM);
    setNotificationVisible(true);

    // Auto dismiss after 10 seconds if not clicked
    setTimeout(() => {
      setNotificationVisible(prev => {
        if (prev) return false;
        return prev;
      });
    }, 9000);
  };

  const handleTapNotification = () => {
    if (activeFCMNotification) {
      setNotificationVisible(false);
      const mappedSignal: Signal = {
        pair: activeFCMNotification.pair,
        direction: activeFCMNotification.direction as "BUY" | "SELL",
        price: activeFCMNotification.price,
        duration: activeFCMNotification.duration,
        confidence: activeFCMNotification.confidence,
        strength: activeFCMNotification.confidence >= 85 ? "STRONG" : "MEDIUM",
        technicalMetrics: {
          trendScore: 28,
          rsiScore: 22,
          candleScore: 21,
          momentumScore: 19,
          totalScore: activeFCMNotification.confidence
        }
      };
      
      handleInspectSignal(mappedSignal);
    }
  };

  // Filter signals list based on state config
  const filteredSignals = signals.filter((sig) => {
    // Search query
    if (searchQuery.trim()) {
      const matchSearch = sig.pair.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
    }

    // Category
    if (marketCategory !== "ALL") {
      let isCategory = false;
      // Resolve asset categories based on symbol names
      if (marketCategory === "CRYPTO") {
        isCategory = ["BTC", "ETH", "BNB", "XRP", "SOL", "ADA", "DOGE", "TRX"].some(token => sig.pair.includes(token));
      } else if (marketCategory === "METALS") {
        isCategory = ["XAU", "XAG"].some(m => sig.pair.includes(m));
      } else if (marketCategory === "OTC") {
        isCategory = sig.pair.includes("OTC");
      } else { // FOREX
        isCategory = !sig.pair.includes("OTC") && !["XAU", "XAG", "BTC", "ETH", "BNB", "XRP", "SOL", "ADA", "DOGE", "TRX"].some(token => sig.pair.includes(token));
      }
      if (!isCategory) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#030611] text-gray-100 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white" dir="rtl">
      
      {/* Dynamic Header */}
      <header className="border-b border-white/5 bg-[#070b18]/90 backdrop-blur-2xl sticky top-0 z-50 py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-700 to-indigo-600 p-2.5 rounded-2xl shadow-lg ring-1 ring-blue-500/20 shadow-blue-900/30">
              <span className="text-xl">🐺</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-400 bg-clip-text text-transparent">
                ذئب التداول Pro <span className="text-blue-500 font-sans text-xs align-super">v1.2</span>
              </h1>
              <p className="text-xs text-gray-400 font-medium">نظام توليد وتوصيل إشارات التداول السحابي الموثق ثنائياً</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTabPanel("simulator")}
              className={`px-4 py-2 text-xs rounded-xl font-bold transition-all flex items-center gap-2 ${
                activeTabPanel === "simulator"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/10 border border-blue-500/30"
                  : "bg-slate-900/90 hover:bg-slate-800 text-gray-300 border border-white/5"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>محاكاة نظام الأندرويد</span>
            </button>
            <button
              onClick={() => setActiveTabPanel("flutter")}
              className={`px-4 py-2 text-xs rounded-xl font-bold transition-all flex items-center gap-2 ${
                activeTabPanel === "flutter"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/10 border border-blue-500/30"
                  : "bg-slate-900/90 hover:bg-slate-800 text-gray-300 border border-white/5"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>كود مشروع الـ Flutter</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-grow">
        
        {/* Quick Alert Banner */}
        <div className="bg-gradient-to-r from-blue-950/20 via-indigo-950/20 to-slate-950/20 border border-blue-900/30 rounded-2xl p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/15 p-2 rounded-xl text-blue-400 shrink-0">
              <Sparkles className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-200">الإصدار الكامل والمعد للتثبيت الذاتي (APK Ready)</h4>
              <p className="text-xs text-gray-400 mt-0.5">توصيل حقيقي بنسبة 100% مع الخادم عبر بروتوكولات الأمان. يمكنك إضافة وتعديل الفلاتر بسهولة.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerFCM}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/20 border border-emerald-500/20 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>إرسال إشعار فوري (FCM) ⚡</span>
            </button>
          </div>
        </div>

        {activeTabPanel === "flutter" ? (
          <div className="grid grid-cols-1 gap-8">
            <FlutterExporter />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: The Interactive Phone Simulator Frame (span 5) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              
              <div className="relative w-full max-w-[390px] aspect-[9/19.5] bg-[#070913] rounded-[48px] border-[8px] border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] outline outline-1 outline-white/10 overflow-hidden ring-12 ring-slate-900/80">
                
                {/* Smartphone Speaker & Camera Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[26px] bg-slate-800 rounded-b-2xl z-50 flex items-center justify-center gap-2.5">
                  <div className="w-12 h-1 bg-black/60 rounded-full"></div>
                  <div className="w-2.5 h-2.5 bg-black rounded-full border border-slate-700/80"></div>
                </div>

                {/* Smartphone Native Status Bar */}
                <div className="absolute top-[26px] left-0 w-full h-[24px] px-6 text-[10px] text-gray-400 z-40 bg-[#070913] flex items-center justify-between font-sans">
                  <div>08:35</div>
                  <div className="flex items-center gap-1.5 opacity-90">
                    <Activity className="w-2.5 h-2.5 text-blue-400" />
                    <span>5G LTE</span>
                    <div className="w-5 h-2.5 bg-gray-700 rounded-sm p-0.5 border border-gray-600 flex items-center justify-start">
                      <div className="h-full w-4/5 bg-emerald-500 rounded-2xs"></div>
                    </div>
                  </div>
                </div>

                {/* Simulated SLIDE-IN Push Notification (FCM) */}
                {notificationVisible && activeFCMNotification && (
                  <div 
                    onClick={handleTapNotification}
                    className="absolute top-12 left-3 right-3 bg-slate-900/95 backdrop-blur border border-emerald-500/30 rounded-2xl p-3 z-50 shadow-xl cursor-pointer transition-all duration-300 transform translate-y-0 active:scale-95 animate-bounce"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base text-emerald-400">🐺</span>
                        <span className="font-extrabold text-[11px] text-gray-200">Wolf Trader Pro</span>
                      </div>
                      <span className="text-[9px] text-gray-400 font-sans">الآن</span>
                    </div>
                    <div className="mt-1.5 text-right font-sans">
                      <div className="font-bold text-xs text-white">
                        إشارة جديدة لـ <span className="text-blue-400 underline">{activeFCMNotification.pair}</span> 👉
                      </div>
                      <p className="text-[10px] text-emerald-400 mt-0.5 font-sans">
                        التوصية: <strong className="bg-emerald-500/10 px-1 rounded">{activeFCMNotification.direction} 🔥</strong> | السعر: {activeFCMNotification.price} | الثقة: {activeFCMNotification.confidence}%
                      </p>
                    </div>
                  </div>
                )}

                {/* SCREEN CONTAINER */}
                <div className="absolute top-[50px] bottom-0 left-0 w-full overflow-y-auto bg-gradient-to-b from-[#0b0f1d] to-[#04060b] flex flex-col justify-between pb-6 select-none leading-normal">
                  
                  {/* SPLASH SCREEN */}
                  {currentScreen === "SPLASH" && (
                    <div className="flex-grow flex flex-col justify-between items-center py-20 px-6 text-center animate-fade-in">
                      <div className="w-full"></div>
                      <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-gradient-to-tr from-blue-900 to-indigo-600 rounded-[30px] flex items-center justify-center shadow-2xl ring-1 ring-blue-400/30 wolf-glow mb-6">
                          <span className="text-5xl">🐺</span>
                        </div>
                        <h2 className="text-3xl font-black bg-gradient-to-r from-white via-blue-100 to-blue-500 bg-clip-text text-transparent">
                          ذئب التداول
                        </h2>
                        <span className="text-xs tracking-wider text-blue-400 uppercase font-sans mt-1">WOLF TRADER PRO</span>
                        <p className="text-xs text-semibold text-gray-400 mt-3 max-w-[200px]">المحرك الأول لتوليد إشارات الخوارزميات الفنية</p>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="animate-spin text-blue-500 w-6 h-6" />
                        <span className="text-[10px] text-gray-500 font-medium font-sans">تأكيد حالة الترخيص السحابي...</span>
                      </div>
                    </div>
                  )}

                  {/* ACTIVATION SCREEN */}
                  {currentScreen === "ACTIVATION" && (
                    <div className="flex-grow flex flex-col justify-between items-stretch py-8 px-5">
                      <div className="text-center mt-4">
                        <div className="w-16 h-16 mx-auto bg-[#0b0f1d] rounded-2xl flex items-center justify-center border border-white/5 mb-3 shadow overflow-hidden">
                          <span className="text-3xl">🐺</span>
                        </div>
                        <h3 className="font-extrabold text-xl text-white">تفعيل الترخيص</h3>
                        <p className="text-xs text-gray-400 mt-1">يتطلب هذا التطبيق مفتاح تفعيل نشط للاتصال عبر الخادم الموّثق</p>
                      </div>

                      <form onSubmit={handleActivateApp} className="my-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[11px] text-gray-400 mb-1.5 font-bold mr-1">مفتاح الترخيص السحابي (Key)</label>
                            <div className="relative">
                              <Key className="absolute right-3.5 top-3.5 w-4 h-4 text-blue-400" />
                              <input
                                type="text"
                                value={activationKey}
                                onChange={(e) => setActivationKey(e.target.value)}
                                placeholder="WOLF-..."
                                className="w-full bg-[#05060b] border border-blue-900/30 rounded-xl py-3 pl-3 pr-10 text-xs text-center text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono tracking-widest uppercase transition-all shadow-inner"
                              />
                            </div>
                          </div>

                          {errorMessage && (
                            <div className="p-3 bg-red-950/25 border border-red-900/40 rounded-xl flex items-start gap-2 animate-pulse">
                              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                              <span className="text-[10px] text-red-300 leading-normal">{errorMessage}</span>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold py-3.5 rounded-xl border border-blue-500/20 shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {authLoading ? (
                              <>
                                <RefreshCw className="animate-spin w-4 h-4" />
                                <span>جاري التحقق والتفعيل...</span>
                              </>
                            ) : (
                              <span>تفعيل الحساب الآن ⚡</span>
                            )}
                          </button>
                        </div>
                      </form>

                      <div className="bg-[#0b0f1d] border border-white/5 rounded-xl p-3.5">
                        <h5 className="text-[10px] text-gray-400 font-bold mb-2 flex items-center gap-1">
                          <BadgeHelp className="w-3.5 h-3.5 text-blue-400" />
                          <span>إرشادات الترخيص والاختبار:</span>
                        </h5>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          يمكنك اختيار ونسخ أي مفتاح من قائمة الاختبار الجانبية بالأسفل لمحاكاة استجابة الخادم الفورية لعملية التفعيل.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* HOME SCREEN */}
                  {currentScreen === "HOME" && (
                    <div className="flex-grow flex flex-col justify-between">
                      
                      {/* Sub-Header */}
                      <div className="p-4 bg-[#0b101e] border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">إشارات تداول حية نشطة</span>
                        </div>
                        <button 
                          onClick={loadSignalsAndAssets} 
                          disabled={loadingSignals}
                          className="bg-white/5 hover:bg-white/10 p-1.5 rounded-lg border border-white/10 text-gray-300 active:scale-95 transition-all"
                        >
                          <RefreshCw className={`w-3 h-3 ${loadingSignals ? "animate-spin text-blue-400" : ""}`} />
                        </button>
                      </div>

                      {/* Signals Category Filters */}
                      <div className="px-3 pt-3 flex gap-1 overflow-x-auto select-none font-sans">
                        {(["ALL", "FOREX", "METALS", "CRYPTO", "OTC"] as const).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setMarketCategory(cat)}
                            className={`px-2.5 py-1 text-[10px] rounded-lg border font-semibold shrink-0 transition-all ${
                              marketCategory === cat
                                ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                                : "bg-[#0b0f1d] text-gray-400 border-white/5 hover:text-white"
                            }`}
                          >
                            {cat === "ALL" ? "الكل" : cat}
                          </button>
                        ))}
                      </div>

                      {/* Signals List View */}
                      <div className="flex-grow p-3 space-y-3 overflow-y-auto max-h-[380px]">
                        {loadingSignals ? (
                          <div className="py-10 text-center flex flex-col items-center justify-center gap-3">
                            <RefreshCw className="animate-spin text-blue-500 w-6 h-6" />
                            <span className="text-[11px] text-gray-400 font-medium">جاري تحديث توصيات الخريطة الفنية...</span>
                          </div>
                        ) : filteredSignals.length === 0 ? (
                          <div className="text-center py-12 px-4">
                            <span className="text-2xl opacity-60">📈</span>
                            <p className="text-gray-400 text-xs mt-2">لا توجد إشارات نشطة تطابق فلتر البحث حالياً</p>
                          </div>
                        ) : (
                          filteredSignals.map((sig, idx) => {
                            const isBuy = sig.direction === "BUY";
                            const isFav = favoritePairs.includes(sig.pair);
                            
                            return (
                              <div
                                key={idx}
                                onClick={() => handleOpenQuotexChart(sig)}
                                className="bg-[#0f1424] hover:bg-[#121a30] border border-blue-900/10 hover:border-blue-500/20 rounded-xl p-3.5 transition-all cursor-pointer active:scale-98 flex flex-col justify-between relative group shadow-sm"
                              >
                                {/* Indicator side badge styling */}
                                <div className={`absolute top-0 right-0 h-full w-1 rounded-l-xl ${isBuy ? "bg-emerald-500" : "bg-red-500"}`}></div>
                                
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={(e) => handleToggleFavorite(sig.pair, e)}
                                      className="p-1 text-gray-500 hover:text-yellow-500 transition-all"
                                    >
                                      <Star className={`w-3.5 h-3.5 ${isFav ? "fill-yellow-500 text-yellow-500" : ""}`} />
                                    </button>
                                    <span className="font-extrabold text-xs text-white tracking-widest">{sig.pair}</span>
                                  </div>
                                  
                                  <div className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wide flex items-center gap-1 ${
                                    isBuy ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-red-500/15 text-red-400 border border-red-500/20"
                                  }`}>
                                    <span>{isBuy ? "BUY 🔥 شراء" : "SELL ❄️ بيع"}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-right">
                                  <div>
                                    <span className="block text-[9px] text-gray-500 font-bold mb-0.5">سعر الدخول</span>
                                    <span className="text-[11px] font-extrabold text-gray-250 font-mono">{sig.price}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[9px] text-gray-500 font-bold mb-0.5">مدة التثبيت</span>
                                    <span className="text-[11px] text-gray-300 font-sans">{sig.duration} د</span>
                                  </div>
                                  <div>
                                    <span className="block text-[9px] text-gray-500 font-bold mb-0.5">مؤشر الثقة</span>
                                    <span className="text-[11px] font-bold text-emerald-400 font-mono">{sig.confidence}%</span>
                                  </div>
                                </div>

                               <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2.5 gap-2">
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleInspectSignal(sig);
                                   }}
                                   className="flex-1 py-1.5 bg-blue-950/40 hover:bg-blue-900/30 text-blue-400 border border-blue-500/10 hover:border-blue-500/25 rounded-lg text-[9px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                 >
                                   <span>🤖 المستشار الذكي</span>
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleOpenQuotexChart(sig);
                                   }}
                                   className="flex-1 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/30 text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/25 rounded-lg text-[9px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                 >
                                   <span>📊 شارت كيوتكس</span>
                                 </button>
                                 <div className="flex items-center gap-1 text-[9px] hidden inline-block opacity-0">
                                   <span>المستشار الذكي</span>
                                   <ChevronRight className="w-3 h-3 rotate-180" />
                                 </div>
                               </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* MARKETS SCREEN */}
                  {currentScreen === "MARKETS" && (
                    <div className="flex-grow flex flex-col justify-between">
                      <div className="p-4 bg-[#0b101e] border-b border-white/5 flex flex-col gap-3">
                        <div className="relative">
                          <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="بحث عن زوج عملات أو أصول..."
                            className="w-full bg-[#05070d] border border-white/5 rounded-lg py-2 pl-3 pr-8 text-xs text-white focus:outline-none focus:border-blue-500 text-right font-sans"
                          />
                        </div>
                      </div>

                      <div className="flex-grow p-4 space-y-4 overflow-y-auto max-h-[350px]">
                        {(Object.entries(assets) as [string, Asset[]][]).map(([categoryName, assetItems]) => {
                          const matchingAssets = assetItems.filter(item => 
                            item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.name.toLowerCase().includes(searchQuery.toLowerCase())
                          );

                          if (matchingAssets.length === 0) return null;

                          return (
                            <div key={categoryName} className="space-y-2">
                              <h4 className="text-[10px] text-blue-400 font-bold tracking-wider border-r-2 border-blue-500 pr-1.5 uppercase font-sans">
                                {categoryName}
                              </h4>
                              
                              <div className="grid grid-cols-1 gap-2.5">
                                {matchingAssets.map((asset) => {
                                  // Find signal for this asset
                                  const matchingSignal = signals.find(s => s.pair === asset.symbol);
                                  const isFav = favoritePairs.includes(asset.symbol);

                                  return (
                                    <div
                                      key={asset.id}
                                      onClick={() => matchingSignal && handleInspectSignal(matchingSignal)}
                                      className={`p-3 bg-[#0a0f1e] hover:bg-[#0f1427] border border-white/5 rounded-xl flex items-center justify-between transition-all ${
                                        matchingSignal ? "cursor-pointer" : "opacity-70"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <button 
                                          onClick={(e) => handleToggleFavorite(asset.symbol, e)}
                                          className="p-0.5 text-gray-600 hover:text-yellow-500"
                                        >
                                          <Star className={`w-3.5 h-3.5 ${isFav ? "fill-yellow-500 text-yellow-500" : ""}`} />
                                        </button>
                                        <div>
                                          <span className="block font-bold text-xs font-mono text-white leading-tight">{asset.symbol}</span>
                                          <span className="block text-[8px] text-gray-500">{asset.name}</span>
                                        </div>
                                      </div>

                                      <div>
                                        {matchingSignal ? (
                                          <span className={`text-[9px] px-2 py-0.5 rounded-lg font-bold ${
                                            matchingSignal.direction === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                                          }`}>
                                            {matchingSignal.direction === "BUY" ? "BUY 🔥" : "SELL ❄️"}
                                          </span>
                                        ) : (
                                          <span className="text-[8px] text-gray-650 font-medium bg-slate-900 px-1.5 py-0.5 rounded font-sans">تذبذب عالي</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* AI COACH AND TECHNICAL Breakdown CHART SCREEN */}
                  {currentScreen === "AI_COACH" && selectedSignal && (
                    <div className="flex-grow flex flex-col justify-between bg-[#04060c] max-h-[460px] overflow-hidden">
                      
                      {/* Navigation bar inside phone */}
                      <div className="p-3 bg-[#0a0f1d] border-b border-white/5 flex items-center gap-2">
                        <button 
                          onClick={() => setCurrentScreen("HOME")}
                          className="p-1 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all"
                        >
                          <ChevronRight className="w-4 h-4 shrink-0" />
                        </button>
                        <div>
                          <span className="font-extrabold text-gray-200 text-xs ml-1">مؤشرات {selectedSignal.pair}</span>
                          <span className="text-[8px] text-emerald-400 font-sans">مستشار الذئب النشط</span>
                        </div>
                      </div>

                      {/* Signal technical details */}
                      <div className="p-3 bg-[#090d19] border-b border-white/5 space-y-2">
                        {/* High density dynamic chart */}
                        <div className="bg-[#05070d] rounded-lg p-2.5 relative border border-white/5 overflow-hidden">
                          <div className="flex items-center justify-between text-[9px] text-gray-400 mb-1">
                            <span>الرسم البياني الفني (المدى د5)</span>
                            <span className="text-blue-400 font-mono font-bold">100 Period SMA</span>
                          </div>
                          
                          {/* Animated SVG Path for random walk chart */}
                          <svg className="w-full h-14 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={selectedSignal.direction === "BUY" ? "#10b981" : "#ef4444"} stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            <path 
                              d={selectedSignal.direction === "BUY" 
                                ? "M 0 25 Q 20 28 40 18 T 80 5 T 100 2" 
                                : "M 0 5 Q 20 2 40 15 T 80 20 T 100 28"
                              } 
                              fill="none" 
                              stroke={selectedSignal.direction === "BUY" ? "#10b981" : "#ef4444"} 
                              strokeWidth="2"
                              className="animate-pulse"
                            />
                            <path 
                              d={selectedSignal.direction === "BUY" 
                                ? "M 0 25 Q 20 28 40 18 T 80 5 T 100 2 L 100 30 L 0 30 Z" 
                                : "M 0 5 Q 20 2 40 15 T 80 20 T 100 28 L 100 30 L 0 30 Z"
                              } 
                              fill="url(#chartGlow)" 
                            />
                            {/* Horizontal grid lines */}
                            <line x1="0" y1="15" x2="100" y2="15" stroke="rgba(255,255,255,0.05)" strokeDasharray="2,2" />
                          </svg>

                          <div className="absolute bottom-1 right-2 text-[8px] font-mono text-gray-500">
                            المدى الحالي: {selectedSignal.price}
                          </div>
                        </div>

                        {/* Metric Scores breakdown - adhering exactly to requested calculation rules */}
                        <div className="grid grid-cols-2 gap-2 text-[9px] bg-black/35 p-2 rounded-lg font-sans border border-white/5">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">تحليل الاتجاه (MA)</span>
                              <span className="font-bold text-white font-mono">{selectedSignal.technicalMetrics?.trendScore || 28}/30</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full rounded" style={{ width: `${((selectedSignal.technicalMetrics?.trendScore || 28)/30)*100}%` }}></div>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">مؤشر القوة (RSI)</span>
                              <span className="font-bold text-white font-mono">{selectedSignal.technicalMetrics?.rsiScore || 22}/25</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded" style={{ width: `${((selectedSignal.technicalMetrics?.rsiScore || 22)/25)*100}%` }}></div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">تأكيد الشموع</span>
                              <span className="font-bold text-white font-mono">{selectedSignal.technicalMetrics?.candleScore || 21}/25</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                              <div className="bg-yellow-500 h-full rounded" style={{ width: `${((selectedSignal.technicalMetrics?.candleScore || 21)/25)*100}%` }}></div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">فلتر التسارع</span>
                              <span className="font-bold text-white font-mono">{selectedSignal.technicalMetrics?.momentumScore || 19}/20</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                              <div className="bg-purple-500 h-full rounded" style={{ width: `${((selectedSignal.technicalMetrics?.momentumScore || 19)/20)*100}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Chat layout with Gemini */}
                      <div className="flex-grow flex flex-col justify-between overflow-hidden">
                        
                        {/* Messages Box */}
                        <div className="flex-grow p-3 space-y-2.5 overflow-y-auto max-h-[160px] text-[10px] leading-relaxed">
                          {chatMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`max-w-[85%] rounded-xl p-2.5 ${
                                msg.role === "user"
                                  ? "bg-blue-600 text-white self-start mr-auto text-left"
                                  : "bg-[#0c1223] text-gray-300 self-end ml-auto text-right border border-blue-900/10"
                              }`}
                            >
                              <p className="font-medium whitespace-pre-wrap">{msg.text}</p>
                              <span className="block text-[8px] text-gray-400 mt-1 font-sans">{msg.timestamp}</span>
                            </div>
                          ))}
                          <div ref={chatEndRef} />
                        </div>

                        {/* Message Input Box */}
                        <form onSubmit={handleSendMessageToAI} className="p-2 border-t border-white/5 bg-[#070b13] flex gap-1.5 items-center">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="اسأل الذئب للتحليل الفني..."
                            className="flex-grow bg-slate-950/80 border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-blue-500 text-right"
                          />
                          <button
                            type="submit"
                            disabled={chatLoading}
                            className="bg-blue-600 hover:bg-blue-500 p-2 rounded-lg text-white transition-all disabled:opacity-40"
                          >
                            {chatLoading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5 rotate-180" />
                            )}
                          </button>
                        </form>
                      </div>

                    </div>
                  )}

                  {/* SETTINGS SCREEN */}
                  {currentScreen === "SETTINGS" && (
                    <div className="flex-grow flex flex-col justify-between py-6 px-4">
                      <div className="space-y-4">
                        <div className="text-center pb-4 border-b border-white/5">
                          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto text-xl">
                            👤
                          </div>
                          <p className="text-white font-bold text-xs mt-2">مستخدم نشط (VIP Account)</p>
                          <span className="inline-block text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 mt-1 rounded font-bold uppercase tracking-wider">
                            خطة المحترفين {activatedPlan.toUpperCase()} PLAN
                          </span>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[10px] text-gray-500 font-bold mr-1">قنوات الدعم والتواصل المباشر</p>
                          
                          <a 
                            href="https://t.me/ThwolfTrader12345" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-[#0a0f1d] hover:bg-blue-900/10 border border-white/5 rounded-xl transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">📢</span>
                              <span className="text-[10px] font-bold text-white">قناة التوصيات العامة (Telegram)</span>
                            </div>
                            <LinkIcon className="w-3 h-3 text-blue-400" />
                          </a>

                          <a 
                            href="https://t.me/Thwolf12345" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-[#0a0f1d] hover:bg-blue-900/10 border border-white/5 rounded-xl transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">🔑</span>
                              <span className="text-[10px] font-bold text-white">شراء كود التفعيل (Telegram)</span>
                            </div>
                            <LinkIcon className="w-3 h-3 text-blue-400" />
                          </a>

                          <a 
                            href="https://t.me/XJ1KI" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-[#0a0f1d] hover:bg-blue-900/10 border border-white/5 rounded-xl transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">👨‍💻</span>
                              <span className="text-[10px] font-bold text-white">اتصل بالمطور المسؤول</span>
                            </div>
                            <LinkIcon className="w-3 h-3 text-blue-400" />
                          </a>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* QUOTEX LIVE CHART SCREEN */}
                  {currentScreen === "QUOTEX" && (
                    <QuotexChart
                      initialSymbol={selectedSignal?.pair || "EUR/USD"}
                      assets={assets}
                      signals={signals}
                      onBackToHome={() => setCurrentScreen("HOME")}
                    />
                  )}

                  {/* BOTTOM SIMULATOR TAB BAR (Hidden in Splash Screen) */}
                  {currentScreen !== "SPLASH" && isActivated && (
                    <div className="bg-[#0b0f1d] border-t border-white/5 h-[60px] grid grid-cols-4 items-center text-center font-sans">
                      <button
                        onClick={() => setCurrentScreen("SETTINGS")}
                        className={`flex flex-col items-center justify-center gap-1 py-1.5 ${
                          currentScreen === "SETTINGS" ? "text-blue-400" : "text-gray-500 hover:text-white"
                        }`}
                      >
                        <Settings className="w-4 h-4" />
                        <span className="text-[9px] font-medium">الإعدادات</span>
                      </button>

                      <button
                        onClick={() => {
                          setCurrentScreen("QUOTEX");
                        }}
                        className={`flex flex-col items-center justify-center gap-1 py-1.5 ${
                          currentScreen === "QUOTEX" ? "text-blue-400" : "text-gray-500 hover:text-white"
                        }`}
                      >
                        <Activity className="w-4 h-4" />
                        <span className="text-[9px] font-medium">شارت كيوتكس</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setCurrentScreen("MARKETS");
                          loadSignalsAndAssets();
                        }}
                        className={`flex flex-col items-center justify-center gap-1 py-1.5 ${
                          currentScreen === "MARKETS" ? "text-blue-400" : "text-gray-500 hover:text-white"
                        }`}
                      >
                        <Compass className="w-4 h-4" />
                        <span className="text-[9px] font-medium">الأسواق</span>
                      </button>

                      <button
                        onClick={() => {
                          setCurrentScreen("HOME");
                          loadSignalsAndAssets();
                        }}
                        className={`flex flex-col items-center justify-center gap-1 py-1.5 ${
                          currentScreen === "HOME" ? "text-blue-400" : "text-gray-500 hover:text-white"
                        }`}
                      >
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[9px] font-medium">الإشارات</span>
                      </button>
                    </div>
                  )}

                </div>

                {/* Smartphone Home Indicator bar */}
                <div className="absolute bottom-1 right-0 left-0 h-1 flex items-center justify-center z-50 pointer-events-none">
                  <div className="w-24 h-1 bg-gray-500 rounded-full opacity-60"></div>
                </div>

              </div>
            </div>

            {/* RIGHT COLUMN: Live Technical Analysis details (span 7) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Server indicator and response logic blueprint info */}
              <div className="cyber-glass rounded-2xl p-6 border border-blue-500/10 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <Activity className="text-blue-500 w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-base text-white">قوانين استخلاص الإشارات الفنية (Signal Rules)</h3>
                    <p className="text-gray-400 text-xs mt-0.5">نظام تجميع العلامات والتقييمات الرقمية</p>
                  </div>
                </div>

                <div className="text-xs text-gray-300 leading-relaxed space-y-2 font-sans">
                  <p>
                    مراعاة لتعليمات السلامة، <strong>ممنوع تماماً حساب المؤشرات داخل تطبيق الموبايل الكلاينت</strong> لتفادي بطء الجهاز وتسريب الأكواد. يقوم الخادم على مدار الساعة بتقييم الأصول:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 bg-black/40 p-3 rounded-xl border border-white/5 my-2">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">●</span>
                      <span>تحديد الاتجاه (MA): <strong>30 نقطة</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">●</span>
                      <span>مؤشر القوة (RSI): <strong>25 نقطة</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400">●</span>
                      <span>نماذج الشموع: <strong>25 نقطة</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400">●</span>
                      <span>فلتر التسارع: <strong>20 نقطة</strong></span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>مبدأ النقاء الفني: يتم إرسال الإشارة فقط عند إحراز <strong>70 نقطة أو أكثر</strong> لتجنب التذبذب.</span>
                  </div>
                </div>
              </div>

              {/* API Endpoints specifications info box */}
              <div className="slate-900 border border-white/5 rounded-2xl p-6 bg-[#040815]/85">
                <h4 className="font-bold text-sm text-white mb-3">تفاصيل الواجهة البرمجية المتوفرة (API Specifications):</h4>
                
                <div className="space-y-4 font-mono text-[11px]">
                  <div className="border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">GET</span>
                      <span className="text-gray-300 font-bold">/signals</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 font-sans">لاسترجاع الإشارات الفنية النشطة التي تفوق قوتها الـ 70 نقطة فنيًّا</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">GET</span>
                      <span className="text-gray-300 font-bold">/assets</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 font-sans font-sans font-sans">لجلب كافة قوائم الفوركس والعملات الرقمية والأصول الـ OTC الفعالة</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Footer Info */}
      <footer className="border-t border-white/5 bg-[#03060f] py-8 px-6 text-center text-xs text-gray-500 font-sans leading-relaxed">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="font-semibold text-gray-400">© 2026 ذئب التداول Pro - جميع الحقوق محفوظة لغرفة Quantitative Trading</p>
            <p className="text-gray-600 text-[10px] mt-0.5">تم تصميمه وبنائه لتجاوز عقبات CORS ودعم نظام التحزيم المباشر لأجهزة الأندرويد</p>
          </div>
          <div className="flex items-center gap-4 font-sans text-gray-400">
            <span className="text-[10px] text-blue-500 font-bold bg-[#0b0f1d] px-2 py-1 rounded">CORS ACTIVE</span>
            <span className="text-[10px] text-blue-500 font-bold bg-[#0b0f1d] px-2 py-1 rounded">GEMINI 3.5 POWERED</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
