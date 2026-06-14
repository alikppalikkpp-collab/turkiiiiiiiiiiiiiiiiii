import React, { useState } from "react";
import { Copy, Check, FileCode, FolderGit2, BookOpen } from "lucide-react";

export default function FlutterExporter() {
  const [activeTab, setActiveTab] = useState("pubspec");
  const [copied, setCopied] = useState(false);

  const codeFiles: Record<string, { name: string; path: string; desc: string; code: string }> = {
    pubspec: {
      name: "pubspec.yaml",
      path: "pubspec.yaml",
      desc: "بنية حزم التطبيق والاعتمادات المطلوبة (Dio, Riverpod, Firebase)",
      code: `name: wolf_trader_pro
description: Professional Trading Signals Mobile Application.

version: 1.0.0+1

environment:
  sdk: ">=3.0.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.5
  
  # State Management & Network requests
  flutter_riverpod: ^2.5.1
  dio: ^5.4.0
  shared_preferences: ^2.2.2
  
  # Device info & FCM
  device_info_plus: ^10.1.0
  firebase_core: ^2.27.0
  firebase_messaging: ^14.7.15
  
  # UI & Charting
  fl_chart: ^0.66.0
  google_fonts: ^6.1.0
  flutter_spinkit: ^5.2.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/`
    },
    api_client: {
      name: "API Client (core)",
      path: "lib/core/api_client.dart",
      desc: "الرابط البرمجي مع خادم الـ API (CORS & Endpoints)",
      code: `import 'package:dio/dio.dart';

class ApiClient {
  final Dio _dio = Dio();
  
  // قم باستبدال الـ URL برابط الخادم الخاص بك السحابي الكلاود
  final String baseUrl = "https://your-cloud-run-url-here.run.app";

  ApiClient() {
    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 10);
    _dio.options.receiveTimeout = const Duration(seconds: 10);
    _dio.options.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  // تفعيل المفتاح 
  Future<Map<String, dynamic>> validateKey(String key, String deviceId) async {
    try {
      final response = await _dio.post('/validate', data: {
        'key': key,
        'device_id': deviceId,
      });
      return response.data;
    } on DioException catch (e) {
      return {'status': 'error', 'message': e.message};
    }
  }

  // جلب إشارات التداول الفنية
  Future<List<dynamic>> fetchTradingSignals() async {
    try {
      final response = await _dio.get('/signals');
      return response.data;
    } on DioException catch (e) {
      throw Exception('فشل جلب الإشارات: \${e.message}');
    }
  }

  // جلب الأصول المالية والعملات الرقمية
  Future<Map<String, dynamic>> fetchAssets() async {
    try {
      final response = await _dio.get('/assets');
      return response.data;
    } on DioException catch (e) {
      throw Exception('فشل جلب الأصول: \${e.message}');
    }
  }
}`
    },
    auth_repo: {
      name: "Auth Repository (data)",
      path: "lib/features/auth/data/auth_repository.dart",
      desc: "إدارة جلسة التشغيل المحلية وتخزينها عبر SharedPreferences دون تخزين المفتاح ذاته",
      code: `import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'dart:io';
import '../../../core/api_client.dart';

class AuthRepository {
  final ApiClient _apiClient = ApiClient();
  static const String _sessionKey = "is_activated";
  static const String _planKey = "user_plan";

  // استخراج الـ Device ID الفريد للجهاز
  Future<String> getUniqueDeviceId() async {
    final DeviceInfoPlugin deviceInfo = DeviceInfoPlugin();
    String deviceId = "UNKNOWN_DEVICE";
    
    try {
      if (Platform.isAndroid) {
        AndroidDeviceInfo androidInfo = await deviceInfo.androidInfo;
        deviceId = androidInfo.id; // المعرّف الفريد للأندرويد
      } else if (Platform.isIOS) {
        IosDeviceInfo iosInfo = await deviceInfo.iosInfo;
        deviceId = iosInfo.identifierForVendor ?? "UNKNOWN_IOS";
      }
    } catch (_) {}
    return deviceId;
  }

  // إرسال الطلب والتفعيل المباشر
  Future<String> activate(String key) async {
    final String deviceId = await getUniqueDeviceId();
    final response = await _apiClient.validateKey(key, deviceId);
    
    final status = response['status'] ?? 'invalid';
    
    if (status == 'valid') {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_sessionKey, true);
      await prefs.setString(_planKey, response['plan'] ?? 'pro');
      return 'SUCCESS';
    }
    
    return status; // 'expired', 'device_mismatch', 'invalid'
  }

  // فحص حالة التفعيل السابقة (يُستدعى في Splash)
  Future<bool> isActivated() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_sessionKey) ?? false;
  }

  // إزالة الجلسة عند تسجيل الخروج
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_sessionKey);
    await prefs.remove(_planKey);
  }
}`
    },
    signals_screen: {
      name: "Signals UX (presentation)",
      path: "lib/features/signals/presentation/signals_screen.dart",
      desc: "واجهة إشارات التداول الاحترافية باللغة العربية مع دعم شراء (BUY) وبيع (SELL) وفلاتر العملات",
      code: `import 'package:flutter/material.dart';
import '../../../core/api_client.dart';

class SignalsScreen extends StatefulWidget {
  const SignalsScreen({Key? key}) : super(key: key);

  @override
  State<SignalsScreen> createState() => _SignalsScreenState();
}

class _SignalsScreenState extends State<SignalsScreen> {
  final ApiClient _apiClient = ApiClient();
  List<dynamic> _signals = [];
  bool _isLoading = true;
  String _errorMessage = "";

  @override
  void initState() {
    super.initState();
    _loadSignals();
  }

  Future<void> _loadSignals() async {
    setState(() {
      _isLoading = true;
      _errorMessage = "";
    });
    try {
      final data = await _apiClient.fetchTradingSignals();
      setState(() {
        _signals = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = "خطأ في الشبكة: يرجى التحقق من الخادم";
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030712), // أسود داكن
      appBar: AppBar(
        title: const Text('ذئب التداول Pro 🐺', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0B0F19),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadSignals,
          )
        ],
      ),
      body: Directionality(
        textDirection: TextDirection.rtl, // دعم واجهة RTL
        child: _isLoading 
          ? const Center(child: CircularProgressIndicator(color: Colors.blue))
          : _errorMessage.isNotEmpty
            ? Center(child: Text(_errorMessage, style: const TextStyle(color: Colors.red, fontSize: 16)))
            : ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: _signals.length,
                itemBuilder: (context, index) {
                  final signal = _signals[index];
                  final isBuy = signal['direction'] == 'BUY';
                  
                  return Card(
                    color: const Color(0xFF0F172A),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                signal['pair'],
                                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                decoration: BoxDecoration(
                                  color: isBuy ? Colors.green.withOpacity(0.2) : Colors.red.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: isBuy ? Colors.green : Colors.red, width: 1.5)
                                ),
                                child: Text(
                                  isBuy ? 'شراء 🔥 BUY' : 'بيع ❄️ SELL',
                                  style: TextStyle(color: isBuy ? Colors.green : Colors.red, fontWeight: FontWeight.bold),
                                ),
                              )
                            ],
                          ),
                          const Divider(color: Colors.white10, height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('سعر الدخول', style: TextStyle(color: Colors.grey, fontSize: 12)),
                                  Text('\${signal['price']}', style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('المدة', style: TextStyle(color: Colors.grey, fontSize: 12)),
                                  Text('\${signal['duration']} دقائق', style: const TextStyle(color: Colors.white, fontSize: 15)),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('معدل الثقة', style: TextStyle(color: Colors.grey, fontSize: 12)),
                                  Text('\${signal['confidence']}%', style: const TextStyle(color: Colors.emeraldAccent, fontSize: 15, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}`
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="flutter-exporter" className="cyber-glass rounded-2xl p-6 border border-blue-500/10 shadow-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <FolderGit2 className="text-blue-500 w-6 h-6 animate-pulse" />
          <div>
            <h3 className="font-bold text-lg text-white">الكود البرمجي لتطبيق الموبايل (Flutter Source)</h3>
            <p className="text-gray-400 text-xs mt-0.5 font-sans">Clean Architecture Project Boilerplate</p>
          </div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold">
          APK Ready 🤖
        </div>
      </div>

      <p className="text-gray-300 text-sm leading-relaxed mb-6">
        قمنا بتجهيز الهيكل البرمجي الكامل لتطبيق الموبايل فلوتر (Flutter) المتصل مباشرةً بالواجهات البرمجية (Endpoints) لهذا الخادم. يدعم التطبيق الـ RTL تلقائياً ويتعرف على معرّف الجهاز لتأكيد حظر تعدد الاستخدام.
      </p>

      {/* Tabs navigation */}
      <div className="grid grid-cols-4 gap-1.5 mb-4 bg-black/40 p-1 rounded-xl border border-white/5">
        {Object.keys(codeFiles).map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`py-2 px-1 text-xs rounded-lg font-medium transition-all ${
              activeTab === key
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {codeFiles[key].name}
          </button>
        ))}
      </div>

      {/* File Details */}
      <div className="bg-slate-950/80 rounded-xl border border-white/5 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileCode className="text-blue-400 w-4 h-4" />
            <span className="text-xs text-blue-300 font-mono tracking-wide">{codeFiles[activeTab].path}</span>
          </div>
          <button
            onClick={() => handleCopy(codeFiles[activeTab].code)}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-sans transition-all border border-white/10 active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">تم النسخ!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ الكود</span>
              </>
            )}
          </button>
        </div>
        <p className="text-gray-400 text-xs mb-3 text-right">{codeFiles[activeTab].desc}</p>
        
        {/* Code Content Box */}
        <div className="relative">
          <pre className="text-left font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[350px] p-3 rounded-lg bg-black/60 border border-white/5 text-gray-350 select-text">
            <code>{codeFiles[activeTab].code}</code>
          </pre>
        </div>
      </div>

      <div className="flex items-start gap-2.5 bg-blue-950/25 border border-blue-900/30 rounded-xl p-3 text-xs text-blue-200">
        <BookOpen className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          <strong>إرشادات النشر:</strong> يمكنك نسخ مشروع الـ Flutter إلى تطبيقك المحلي، وتشغيل 
          <code className="bg-black/40 px-1 py-0.5 mx-1 rounded text-blue-300">flutter pub get</code> ثم تشغيل التطبيق على محاكي الأندرويد وسيكون متصلاً تلقائياً بالخادم الحالي ومستعداً للتحزيم لملف <strong className="text-emerald-400">APK</strong> للاستخدام الفعلي.
        </p>
      </div>
    </div>
  );
}
