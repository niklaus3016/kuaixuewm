/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import LogoImage from '../kuaixu512.png';
import {
  Link,
  Type,
  Wifi,
  Contact,
  Settings,
  History,
  Palette,
  Image as ImageIcon,
  Check,
  ChevronRight,
  X,
  Home,
  User,
  ShieldCheck,
  Info,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { QRType, QRStyleOptions, HistoryItem, WIFIConfig, VCardConfig } from './types';
import { generateWiFiString, generateVCardString, downloadBlob } from './utils/qrHelpers';

const TAB_CONFIG = [
  { id: 'url' as QRType, label: '网址', icon: Link },
  { id: 'wifi' as QRType, label: 'WiFi', icon: Wifi },
  { id: 'vCard' as QRType, label: '名片', icon: Contact },
  { id: 'text' as QRType, label: '文本', icon: Type },
];

const DEFAULT_STYLE: QRStyleOptions = {
  fgColor: '#000000',
  bgColor: '#ffffff',
  level: 'H',
  renderAs: 'canvas',
  dotStyle: 'square',
  logoOpacity: 1,
  logoShape: 'square',
};

type Screen = 'home' | 'history' | 'profile';

export default function App() {
  // --- State ---
  const [activeScreen, setActiveScreen] = useState<Screen>('home');
  const [activeTab, setActiveTab] = useState<QRType>('url');
  const [content, setContent] = useState('');
  const [displayContent, setDisplayContent] = useState('');
  
  // Specific Form States
  const [urlContent, setUrlContent] = useState('');
  const [textContent, setTextContent] = useState('');
  const [wifiConfig, setWifiConfig] = useState<WIFIConfig>({ ssid: '', password: '', encryption: 'WPA' });
  const [vCardConfig, setVCardConfig] = useState<VCardConfig>({ 
    firstName: '', lastName: '', phone: '', email: '', company: '', title: '' 
  });

  const [qrStyle, setQrStyle] = useState<QRStyleOptions>(DEFAULT_STYLE);
  const [rawLogo, setRawLogo] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isBeautifyOpen, setIsBeautifyOpen] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  
  // History Selection States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  
  // Privacy Consent States
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(false);
  const [showAgreementDetail, setShowAgreementDetail] = useState<'privacy' | 'agreement' | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);
  const exportQrRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qr_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch {
      // 如果解析失败，清空历史记录
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    try {
      const agreed = localStorage.getItem('privacy_agreed');
      if (!agreed) {
        setShowPrivacyConsent(true);
      }
    } catch {
      // localStorage 不可用时，显示隐私同意弹窗
      setShowPrivacyConsent(true);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('qr_history', JSON.stringify(history));
    } catch {
      // localStorage 写入失败时静默处理
    }
  }, [history]);

  // Sync content based on tab - 使用 useMemo 优化性能
  const derivedContent = useMemo(() => {
    if (activeTab === 'wifi') {
      return generateWiFiString(wifiConfig);
    } else if (activeTab === 'vCard') {
      return generateVCardString(vCardConfig);
    } else if (activeTab === 'url') {
      return urlContent;
    } else if (activeTab === 'text') {
      return textContent;
    }
    return '';
  }, [activeTab, wifiConfig, vCardConfig, urlContent, textContent]);

  useEffect(() => {
    setContent(derivedContent);
  }, [derivedContent]);

  useEffect(() => {
    if (rawLogo) {
      const processLogo = async () => {
        const shaped = await getShapedImage(rawLogo, qrStyle.logoShape || 'square');
        setQrStyle(prev => ({ ...prev, logoImage: shaped }));
      };
      processLogo();
    }
  }, [rawLogo, qrStyle.logoShape]);

  const getShapedImage = (src: string, shape: 'square' | 'circle'): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Use the smaller dimension for the canvas to ensure a perfect square/circle
        const size = 512; // High resolution base for the logo
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(src); return; }

        ctx.clearRect(0, 0, size, size);
        ctx.save();
        
        if (shape === 'circle') {
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.clip();
        } else {
          const radius = size * 0.18; // Slightly more rounded for aesthetics
          ctx.beginPath();
          ctx.moveTo(radius, 0);
          ctx.lineTo(size - radius, 0);
          ctx.quadraticCurveTo(size, 0, size, radius);
          ctx.lineTo(size, size - radius);
          ctx.quadraticCurveTo(size, size, size - radius, size);
          ctx.lineTo(radius, size);
          ctx.quadraticCurveTo(0, size, 0, size - radius);
          ctx.lineTo(0, radius);
          ctx.quadraticCurveTo(0, 0, radius, 0);
          ctx.closePath();
          ctx.clip();
        }

        // Draw image with "cover" behavior
        const imgSize = Math.min(img.width, img.height);
        const sx = (img.width - imgSize) / 2;
        const sy = (img.height - imgSize) / 2;
        ctx.drawImage(img, sx, sy, imgSize, imgSize, 0, 0, size, size);
        
        ctx.restore();
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  };

  // --- Handlers ---
  const [exportSize, setExportSize] = useState<number>(1080);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  // Template Data
  const TEMPLATES = [
    { id: 'minimal', label: '极简白', fg: '#000000', bg: '#ffffff' },
    { id: 'business', label: '商务蓝', fg: '#1d4ed8', bg: '#ffffff' },
    { id: 'elegant', label: '典雅紫', fg: '#7c3aed', bg: '#ffffff' },
    { id: 'forest', label: '森林绿', fg: '#15803d', bg: '#ffffff' },
    { id: 'sunset', label: '落日橙', fg: '#ea580c', bg: '#ffffff' },
  ];

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setActiveTemplate(t.id);
    setQrStyle(prev => ({ ...prev, fgColor: t.fg, bgColor: t.bg }));
  };

  const handleGenerate = useCallback(() => {
    if (!content) return;
    setDisplayContent(content);
    // 自动在生成时添加一条记录，但不弹出保存成功提示
    addToHistory(content);
  }, [content]);

  const handleSave = () => {
    if (!displayContent) return;
    // Hidden high-res canvas for export
    const container = document.createElement('div');
    container.style.visibility = 'hidden';
    container.style.position = 'absolute';
    document.body.appendChild(container);

    const canvasId = 'export-canvas-target';
    
    // We render a larger temporary canvas for high-quality export
    const CanvasComp = (
      <QRCodeCanvas 
        id={canvasId}
        value={displayContent}
        size={exportSize}
        level={qrStyle.level}
        fgColor={qrStyle.fgColor}
        bgColor={qrStyle.bgColor}
        includeMargin={true}
        imageSettings={qrStyle.logoImage ? {
          src: qrStyle.logoImage,
          x: undefined,
          y: undefined,
          height: (exportSize / 220) * (qrStyle.logoHeight || 40),
          width: (exportSize / 220) * (qrStyle.logoWidth || 40),
          excavate: true,
          opacity: qrStyle.logoOpacity
        } : undefined}
      />
    );

    // This is a bit tricky in React to do imperatively without mounting. 
    // Standard approach: just use the currently visible canvas and scale it if possible, 
    // or use a hidden one. For V1, let's keep it simple and just export the current canvas at its native resolution 
    // but scale it up using high-res drawing logic if needed.
    
    const visibleCanvas = exportQrRef.current?.querySelector('canvas');
    if (!visibleCanvas) return;

    visibleCanvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `qrcraft-${exportSize}px-${Date.now()}.png`);
        addToHistory();
        setShowCopyFeedback(true); // Re-use for save success
        setTimeout(() => setShowCopyFeedback(false), 2000);
      }
    }, 'image/png');
  };

  const addToHistory = (targetContent: string = content) => {
    if (!targetContent) return;
    let label = targetContent.slice(0, 20);
    if (activeTab === 'wifi') label = `WiFi: ${wifiConfig.ssid}`;
    if (activeTab === 'vCard') label = `名片: ${vCardConfig.firstName}${vCardConfig.lastName}`;
    if (!label) label = '未命名内容';

    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      type: activeTab,
      content: targetContent,
      label,
      timestamp: Date.now(),
      style: { ...qrStyle }
    };
    setHistory([newItem, ...history.slice(0, 49)]);
  };

  const confirmDelete = useCallback(() => {
    if (selectedIds.length === 0 && history.length > 0 && !isSelectionMode) {
      setHistory([]);
    } else {
      setHistory(prev => prev.filter(item => !selectedIds.includes(item.id)));
    }
    setSelectedIds([]);
    setIsSelectionMode(false);
    setShowConfirmModal(false);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
  }, [selectedIds, history.length, isSelectionMode]);

  const toggleItemSelection = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === history.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(history.map(item => item.id));
    }
  }, [selectedIds.length, history]);

  const clearHistory = useCallback(() => {
    if (isSelectionMode) {
      if (selectedIds.length > 0) {
        setShowConfirmModal(true);
      } else {
        setIsSelectionMode(false);
      }
    } else {
      setIsSelectionMode(true);
    }
  }, [isSelectionMode, selectedIds.length]);

  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      console.warn('Web Share API not supported');
      return;
    }
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], "qrcode.png", { type: "image/png" });
        try {
          await navigator.share({
            files: [file],
            title: '快序二维码',
            text: '这是我用快序二维码生成的二维码'
          });
        } catch (err) {
          console.error('Share failed', err);
        }
      }
    });
  }, []);

  const handleCopyContent = useCallback(() => {
    navigator.clipboard.writeText(content).catch(() => {
      // 复制失败时静默处理
    });
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
  }, [content]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setRawLogo(result);
        setQrStyle(prev => ({ 
          ...prev, 
          logoWidth: 40,
          logoHeight: 40
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Privacy Consent Handlers
  const handleAcceptPrivacy = () => {
    localStorage.setItem('privacy_agreed', 'true');
    setShowPrivacyConsent(false);
  };

  const handleDeclinePrivacy = () => {
    setShowDeclineModal(true);
  };

  const handleDeclineCancel = () => {
    setShowDeclineModal(false);
  };

  const handleDeclineConfirm = () => {
    setShowDeclineModal(false);
    setShowPrivacyConsent(false);
    localStorage.setItem('privacy_agreed', 'declined');
  };

  const handleOpenAgreement = () => {
    setShowAgreementDetail('agreement');
  };

  const handleOpenPrivacy = () => {
    setShowAgreementDetail('privacy');
  };

  const handleCloseAgreementDetail = () => {
    setShowAgreementDetail(null);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#f2f2f7] overflow-hidden shadow-2xl relative md:my-8 md:h-[90vh] md:rounded-[50px] md:border-3 md:border-black pt-4">

      {/* --- Floating Toast --- */}
      <AnimatePresence>
        {showCopyFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 15, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="absolute top-10 left-0 right-0 flex justify-center z-100 pointer-events-none"
          >
            <div className="bg-black/80 backdrop-blur-xl text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 border border-white/10">
              <div className="bg-[#34C759] rounded-full p-1 text-white">
                <Check size={12} strokeWidth={4} />
              </div>
              <span className="text-xs font-bold tracking-tight">操作已完成</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Screen Content --- */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeScreen === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <header className="px-6 pt-4 pb-2 shrink-0 relative flex items-center justify-center">
                <h1 className="text-lg font-black tracking-tight text-black text-center">
                  {isBeautifyOpen ? "美化实验室" : "快序二维码"}
                </h1>
                <div className="absolute right-6">
                  {isBeautifyOpen ? (
                    <button 
                      onClick={() => setIsBeautifyOpen(false)}
                      className="px-3 py-1 bg-primary text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm"
                    >
                      完成
                    </button>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-200/80 flex items-center justify-center">
                      <span className="text-[9px] font-black">PRO</span>
                    </div>
                  )}
                </div>
              </header>

      {/* --- Main Content Area --- */}
      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scroll-smooth scrollbar-none">
        
        {!isBeautifyOpen && (
          <motion.section 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="flex bg-slate-200/50 p-1 rounded-2xl gap-1 backdrop-blur-md">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 py-1.5 text-[11px] font-bold transition-all duration-300 rounded-xl",
                    activeTab === tab.id 
                      ? "bg-white shadow-sm text-primary scale-100" 
                      : "text-slate-500 hover:text-slate-700 scale-95"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl p-4 shadow-sm border border-white"
              >
                {activeTab === 'url' && (
                  <div className="relative">
                    <textarea 
                      rows={2}
                      placeholder="在此输入网址..."
                      value={urlContent}
                      onChange={(e) => setUrlContent(e.target.value)}
                      className="w-full p-2 bg-transparent border-none text-sm focus:ring-0 outline-none transition-all resize-none placeholder:text-slate-400 font-medium"
                    />
                    {urlContent && (
                      <button 
                        onClick={() => setUrlContent('')}
                        className="absolute right-0 top-0 p-1 text-slate-300 hover:text-slate-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}

                {activeTab === 'text' && (
                  <textarea 
                    rows={3}
                    placeholder="输入想要转换的内容..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="w-full p-2 bg-transparent border-none text-sm focus:ring-0 outline-none transition-all resize-none placeholder:text-slate-400 font-medium"
                  />
                )}

                {activeTab === 'wifi' && (
                  <div className="space-y-3">
                    <input 
                      placeholder="WiFi 名称"
                      className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none text-sm outline-none font-medium text-black placeholder:text-slate-400"
                      value={wifiConfig.ssid}
                      onChange={e => setWifiConfig({...wifiConfig, ssid: e.target.value})}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="password"
                        placeholder="密码"
                        className="px-4 py-3 bg-slate-50 rounded-2xl border-none text-sm outline-none font-medium text-black placeholder:text-slate-400"
                        value={wifiConfig.password}
                        onChange={e => setWifiConfig({...wifiConfig, password: e.target.value})}
                      />
                      <select
                        className="px-4 py-3 bg-slate-50 rounded-2xl border-none text-sm outline-none appearance-none font-bold text-primary"
                        value={wifiConfig.encryption}
                        onChange={e => setWifiConfig({...wifiConfig, encryption: e.target.value as WIFIConfig['encryption']})}
                      >
                        <option value="WPA">WPA/WPA2</option>
                        <option value="WEP">WEP</option>
                        <option value="nopass">无密码</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeTab === 'vCard' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        placeholder="姓"
                        className="px-4 py-3 bg-slate-50 rounded-2xl border-none text-sm outline-none font-medium"
                        value={vCardConfig.lastName}
                        onChange={e => setVCardConfig({...vCardConfig, lastName: e.target.value})}
                      />
                      <input 
                        placeholder="名"
                        className="px-4 py-3 bg-slate-50 rounded-2xl border-none text-sm outline-none font-medium"
                        value={vCardConfig.firstName}
                        onChange={e => setVCardConfig({...vCardConfig, firstName: e.target.value})}
                      />
                    </div>
                    <input 
                      placeholder="手机号码"
                      className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none text-sm outline-none font-medium"
                      value={vCardConfig.phone}
                      onChange={e => setVCardConfig({...vCardConfig, phone: e.target.value})}
                    />
                    <input 
                      placeholder="公司"
                      className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none text-sm outline-none font-medium"
                      value={vCardConfig.company}
                      onChange={e => setVCardConfig({...vCardConfig, company: e.target.value})}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <button 
              onClick={handleGenerate}
              disabled={!content}
              className="w-full py-4 bg-[#34C759] text-white rounded-2xl font-black shadow-xl hover:bg-[#30B652] transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none active:scale-[0.98] text-sm tracking-widest flex items-center justify-center gap-2"
            >
              立即生成二维码
            </button>
          </motion.section>
        )}

        {/* Preview Section - Always visible but centered during beautify */}
        <section className={cn(
          "flex flex-col items-center gap-6 relative transition-all duration-500",
          isBeautifyOpen ? "py-2" : "py-4"
        )}>
          <div 
            className={cn(
              "bg-white rounded-3xl shadow-ios border border-white transition-all duration-500 relative z-10",
              isBeautifyOpen ? "p-2 scale-90" : "p-4 scale-100"
            )}
            ref={qrRef}
          >
            <div className="relative p-1 bg-white rounded-3xl overflow-hidden">
              {displayContent ? (
                <QRCodeCanvas 
                  value={displayContent}
                  size={512}
                  style={{ width: isBeautifyOpen ? 184 : 196, height: isBeautifyOpen ? 184 : 196 }}
                  level={qrStyle.level}
                  fgColor={qrStyle.fgColor} 
                  bgColor={qrStyle.bgColor}
                  includeMargin={true}
                  imageSettings={qrStyle.logoImage ? {
                    src: qrStyle.logoImage,
                    x: undefined,
                    y: undefined,
                    height: (512 / 196) * (qrStyle.logoHeight || 34),
                    width: (512 / 196) * (qrStyle.logoWidth || 34),
                    excavate: true,
                    opacity: qrStyle.logoOpacity
                  } : undefined}
                />
              ) : (
                <div className="w-[196px] h-[196px] flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                    <Smartphone className="text-slate-300" size={24} />
                  </div>
                  <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest">等待生成...</span>
                </div>
              )}
            </div>
          </div>


        </section>

        {isBeautifyOpen ? (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-32"
          >
            {/* Quick Templates */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">模版库</h3>
              <div className="grid grid-cols-5 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    style={{ backgroundColor: t.bg }}
                    className={cn(
                      "aspect-square rounded-2xl border-2 transition-all flex items-center justify-center",
                      activeTemplate === t.id ? "border-primary scale-110 shadow-lg" : "border-white shadow-sm"
                    )}
                  >
                    <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: t.fg }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Config */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">高级配色</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-3xl border border-white shadow-sm flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">码色</span>
                  <input type="color" value={qrStyle.fgColor} onChange={e => setQrStyle({...qrStyle, fgColor: e.target.value})} className="w-8 h-8 rounded-lg overflow-hidden border-none" />
                </div>
                <div className="bg-white p-4 rounded-3xl border border-white shadow-sm flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">背景</span>
                  <input type="color" value={qrStyle.bgColor} onChange={e => setQrStyle({...qrStyle, bgColor: e.target.value})} className="w-8 h-8 rounded-lg overflow-hidden border-none" />
                </div>
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">品牌 LOGO</h3>
                {qrStyle.logoImage && (
                  <button onClick={() => { setQrStyle({...qrStyle, logoImage: undefined}); setRawLogo(undefined); }} className="text-[10px] text-primary font-black uppercase">移除</button>
                )}
              </div>
              
              <div className="flex gap-3">
                <label className="flex-1 cursor-pointer group">
                  <div className="h-20 bg-white border border-white rounded-[15px] shadow-sm flex items-center justify-center transition-all group-active:scale-95 overflow-hidden">
                    {qrStyle.logoImage ? (
                      <div className={cn(
                        "h-14 w-14 overflow-hidden bg-white flex items-center justify-center border border-slate-100 transition-all duration-300",
                        qrStyle.logoShape === 'circle' ? "rounded-full shadow-[0_0_0_2px_rgba(52,199,89,0.1)]" : "rounded-[16px]"
                      )}>
                        <img 
                          src={qrStyle.logoImage} 
                          className={cn(
                            "h-full w-full object-cover transition-all duration-300",
                            qrStyle.logoShape === 'circle' ? "rounded-full" : "rounded-lg"
                          )} 
                          alt="logo" 
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <ImageIcon size={20} className="text-primary" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">选择图片</span>
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>

                <div className="w-28 flex flex-col gap-2">
                  {[
                    { id: 'square' as const, label: '圆角矩形', icon: 'rounded-sm' },
                    { id: 'circle' as const, label: '圆形', icon: 'rounded-full' }
                  ].map((shape) => (
                    <button
                      key={shape.id}
                      onClick={() => setQrStyle({...qrStyle, logoShape: shape.id})}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 rounded-2xl text-[9px] font-black uppercase tracking-tight transition-all border",
                        (qrStyle.logoShape || 'square') === shape.id
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-white text-slate-400 border-white hover:bg-slate-50"
                      )}
                    >
                      <div className={cn("w-2 h-2 bg-current", shape.icon)} />
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Level */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">容错率设置</h3>
              <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-white">
                {[
                  { id: 'L' as const, label: 'L (7%)' },
                  { id: 'M' as const, label: 'M (15%)' },
                  { id: 'Q' as const, label: 'Q (25%)' },
                  { id: 'H' as const, label: 'H (30%)' }
                ].map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setQrStyle({...qrStyle, level: level.id})}
                    className={cn(
                      "flex-1 py-2.5 rounded-[0.8rem] text-[10px] font-black transition-all",
                      qrStyle.level === level.id ? "bg-primary text-white shadow-lg" : "text-slate-400"
                    )}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
            
          </motion.section>
        ) : (
          <section className="pt-2 space-y-4">
            <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-white mb-2">
              {[1080, 2048, 4096].map((res) => (
                <button
                  key={res}
                  onClick={() => setExportSize(res)}
                  className={cn(
                    "flex-1 py-1.5 rounded-xl text-[9px] font-black transition-all",
                    exportSize === res ? "bg-white text-primary shadow-sm" : "text-slate-400"
                  )}
                >
                  {res}px
                </button>
              ))}
            </div>
            
            <button 
              onClick={handleSave}
              disabled={!displayContent}
              className="w-full py-4 bg-gradient-to-br from-primary to-blue-500 text-white rounded-[28px] font-black shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:grayscale disabled:opacity-50 active:scale-[0.96] text-sm tracking-tight"
            >
              保存并导出高清图 ({exportSize}px)
            </button>

            <div className="grid grid-cols-2 gap-3">
               <button onClick={() => setIsBeautifyOpen(true)} className="py-3 bg-white border border-white rounded-[20px] text-[11px] font-black text-slate-800 uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                 <Palette size={14} className="text-primary" /> 二维码美化
              </button>
              <button onClick={() => { setQrStyle(DEFAULT_STYLE); setActiveTemplate(null); }} className="py-3 bg-white border border-white rounded-[20px] text-[11px] font-black text-slate-800 uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                 <Settings size={14} className="text-slate-400" /> 重置样式
              </button>
            </div>
          </section>
        )}
      </main>
            </motion.div>
          )}


          {activeScreen === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col p-6"
            >
              <div className="flex items-center justify-between mb-6 px-2">
                <h2 className="text-3xl font-black tracking-tight">历史</h2>
                {history.length > 0 && (
                  <div className="flex items-center gap-3">
                    {isSelectionMode && (
                      <button 
                        onClick={() => { setIsSelectionMode(false); setSelectedIds([]); }}
                        className="text-xs font-black text-slate-400 uppercase tracking-widest"
                      >
                        取消
                      </button>
                    )}
                    <button 
                      onClick={clearHistory}
                      className={cn(
                        "text-sm font-black uppercase tracking-widest transition-colors",
                        isSelectionMode ? (selectedIds.length > 0 ? "text-red-500" : "text-slate-400") : "text-primary"
                      )}
                    >
                      {isSelectionMode ? (selectedIds.length > 0 ? "确认删除" : "退出") : "清除"}
                    </button>
                  </div>
                )}
              </div>

              {isSelectionMode && history.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between bg-white/50 backdrop-blur-md p-3 rounded-2xl border border-white mb-4"
                >
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    已选择 {selectedIds.length} 项
                  </span>
                  <button 
                    onClick={toggleSelectAll}
                    className="text-[10px] font-black text-primary uppercase tracking-widest px-3 py-1 bg-primary/10 rounded-full"
                  >
                    {selectedIds.length === history.length ? "取消全选" : "全选"}
                  </button>
                </motion.div>
              )}

              <div className="flex-1 overflow-y-auto space-y-3 scrollbar-none pb-10">
                {history.map((item) => (
                  <motion.div
                    layout
                    key={item.id}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleItemSelection(item.id);
                      } else {
                        setActiveTab(item.type);
                        setContent(item.content);
                        setDisplayContent(item.content);
                        setQrStyle(item.style);
                        setActiveScreen('home');
                      }
                    }}
                    className={cn(
                      "flex items-center gap-4 p-3 bg-white rounded-3xl shadow-sm border transition-all group cursor-pointer",
                      isSelectionMode && selectedIds.includes(item.id) ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-white hover:scale-[1.02] active:scale-95"
                    )}
                  >
                    {isSelectionMode && (
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-1",
                        selectedIds.includes(item.id) ? "bg-primary border-primary" : "border-slate-200"
                      )}>
                        {selectedIds.includes(item.id) && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 bg-white rounded-full" 
                          />
                        )}
                      </div>
                    )}
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center p-2 shrink-0">
                       <QRCodeCanvas value={item.content} size={40} level={item.style.level} fgColor={item.style.fgColor} bgColor={item.style.bgColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-primary/10 text-primary rounded-md uppercase tracking-wider">
                          {TAB_CONFIG.find(t => t.id === item.type)?.label || item.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 truncate tracking-tight">{item.label}</p>
                    </div>
                    {!isSelectionMode && <ChevronRight size={16} className="text-slate-300 group-hover:text-primary transition-colors mr-2" />}
                  </motion.div>
                ))}
                
                {history.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-200/50 rounded-full flex items-center justify-center text-slate-300">
                      <History size={40} strokeWidth={1.5} />
                    </div>
                    <p className="font-bold text-sm text-slate-400">还没有生成记录</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeScreen === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center p-6"
            >
              <div className="text-center">
                <div className="w-28 h-28 rounded-[3rem] shadow-ios mx-auto flex items-center justify-center mb-6 relative group overflow-hidden bg-white">
                   <img src={LogoImage} alt="Logo" className="w-20 h-20 object-contain" />
                </div>
                <h1 className="text-2xl font-black text-black tracking-tight mb-2">快序二维码</h1>
                <p className="text-xs text-slate-400 font-black tracking-[0.15em] uppercase">Version 1.0</p>
              </div>

              <div className="w-full max-w-xs mt-12 space-y-3">
                <div className="bg-white rounded-3xl p-1.5 shadow-sm border border-white">
                   {[
                     { 
                       icon: ShieldCheck, 
                       label: '隐私政策', 
                       value: '查看详情', 
                       color: '#34C759',
                       onClick: () => setShowAgreementDetail('privacy')
                     },
                   ].map((item, idx) => (
                      <button key={idx} onClick={item.onClick} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all group">
                        <div className="flex items-center gap-3.5">
                          <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${item.color}12`, color: item.color }}>
                            <item.icon size={20} strokeWidth={2.5} />
                          </div>
                          <span className="text-sm font-bold text-slate-800 tracking-tight">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-xs text-slate-400 font-bold">{item.value}</span>
                           <ChevronRight size={16} className="text-slate-300 group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                   ))}
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-black rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                   <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                   <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-3 relative z-10 text-center">关于产品</h3>
                   <p className="text-xs text-slate-300 font-medium leading-relaxed relative z-10 text-center tracking-tight">
                     快序二维码 采用先进的本地编码技术，所有数据处理均在您的设备上完成。我们尊重您的隐私，绝不收集或上传任何个人信息。
                   </p>
                </div>
              </div>
              

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- Bottom Navigation Bar --- */}
      <nav className="h-20 bg-white/80 backdrop-blur-2xl border-t border-black/5 flex items-center justify-around px-8 shrink-0 z-60 pb-4">
        {[
          { id: 'home' as Screen, label: '制作', icon: Home },
          { id: 'history' as Screen, label: '历史', icon: History },
          { id: 'profile' as Screen, label: '我的', icon: User },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveScreen(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 relative px-4",
              activeScreen === item.id ? "text-primary" : "text-slate-400"
            )}
          >
            <item.icon size={22} strokeWidth={activeScreen === item.id ? 2.5 : 2} />
            <span className={cn("text-[9px] font-black tracking-widest uppercase", activeScreen === item.id ? "opacity-100" : "opacity-70")}>
              {item.label}
            </span>
            {activeScreen === item.id && (
              <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* --- Side Panels --- */}
      
      {/* Beautify Panel removed - now integrated into home screen */}


      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[40px] p-8 w-full max-w-xs shadow-2xl space-y-6"
          >
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900">确认清除？</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {selectedIds.length === history.length ? "此操作将永久删除所有历史记录，无法撤销。" : `确认删除选中的 ${selectedIds.length} 条记录吗？`}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={confirmDelete}
                className="w-full py-4 bg-red-500 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-lg shadow-red-200"
              >
                确认删除
              </button>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="w-full py-4 text-slate-400 font-black text-sm uppercase tracking-widest"
              >
                继续保留
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Privacy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-8 w-full max-w-xs shadow-2xl space-y-4"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-[#34C759]/10 text-[#34C759] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900">隐私保障政策</h3>
              <div className="mt-4 text-[11px] text-slate-500 font-bold leading-relaxed text-left space-y-2">
                <p>• 100% 本地运行：所有二维码生成和解析逻辑均在您的浏览器中完成。</p>
                <p>• 无数据上传：我们不会保存、上传或共享您的任何输入内容（网址、文本、名片、WiFi等）。</p>
                <p>• 本地暂存：历史记录仅存储在您设备的浏览器 LocalStorage 中。</p>
              </div>
            </div>
            <button 
              onClick={() => setShowPrivacyModal(false)}
              className="w-full py-3.5 bg-primary text-white rounded-[1.25rem] font-black text-xs uppercase tracking-widest mt-2"
            >
              知道了
            </button>
          </motion.div>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-8 w-full max-w-xs shadow-2xl space-y-4"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Info size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900">关于产品</h3>
              <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase mt-1">快序二维码 v1.0.2</p>
              <div className="mt-4 text-[11px] text-slate-500 font-bold leading-relaxed text-left space-y-3">
                <p>快序二维码 是一款致力于提供极致简洁、安全体验的二维码工具。我们相信工具应该服务于用户，而不是收集用户数据。</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <span className="text-slate-400">开发者</span>
                  <span className="text-slate-900">快序团队</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setShowAboutModal(false)}
              className="w-full py-3.5 bg-primary text-white rounded-[1.25rem] font-black text-xs uppercase tracking-widest mt-2"
            >
              确定
            </button>
          </motion.div>
        </div>
      )}

      {/* Hidden Canvas for High-Res Export */}
      <div className="hidden" aria-hidden="true" ref={exportQrRef}>
        {displayContent && (
          <QRCodeCanvas 
            value={displayContent}
            size={exportSize}
            level={qrStyle.level}
            fgColor={qrStyle.fgColor} 
            bgColor={qrStyle.bgColor}
            includeMargin={true}
            imageSettings={qrStyle.logoImage ? {
              src: qrStyle.logoImage,
              x: undefined,
              y: undefined,
              height: (exportSize / 196) * (qrStyle.logoHeight || 34),
              width: (exportSize / 196) * (qrStyle.logoWidth || 34),
              excavate: true,
              opacity: qrStyle.logoOpacity
            } : undefined}
          />
        )}
      </div>

      {/* Privacy Consent Modal - Shows on first launch */}
      {showPrivacyConsent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-120">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-sm shadow-2xl max-h-[80vh] overflow-y-auto rounded-[28px]"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold text-[#1D1D1F] mb-6 text-center pt-4">
                用户协议与隐私政策
              </h3>
              <div className="mb-6">
                <p className="text-base text-[#1D1D1F] mb-3">(1)《隐私政策》中关于个人设备用户信息的收集和使用的说明。</p>
                <p className="text-base text-[#1D1D1F]">(2)《隐私政策》中与第三方SDK类服务商数据共享、相关信息收集和使用说明。</p>
              </div>
              <div className="mb-6">
                <p className="text-sm text-[#86868B] mb-2">用户协议和隐私政策说明：</p>
                <p className="text-sm text-[#424245]">
                  阅读完整的
                  <span
                    onClick={handleOpenAgreement}
                    className="text-[#0071E3] hover:underline cursor-pointer font-medium"
                  >
                    《用户服务协议》
                  </span>
                  和
                  <span
                    onClick={handleOpenPrivacy}
                    className="text-[#0071E3] hover:underline cursor-pointer font-medium"
                  >
                    《隐私政策》
                  </span>
                  了解详细内容。
                </p>
              </div>
            </div>
            <div className="flex border-t border-gray-200">
              <button
                onClick={handleDeclinePrivacy}
                className="flex-1 py-4 text-base font-medium text-[#1D1D1F] bg-white border-r border-gray-200 rounded-bl-[28px] hover:bg-gray-50 transition-colors"
              >
                不同意
              </button>
              <button
                onClick={handleAcceptPrivacy}
                className="flex-1 py-4 text-base font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-br-[28px] transition-colors"
              >
                同意并继续
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Agreement Detail Modal */}
      {showAgreementDetail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-130">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[28px] w-full max-w-3xl h-[85vh] overflow-hidden shadow-2xl border border-black/5 flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-[#0071E3] rounded-xl flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
                <h2 className="text-xl font-bold text-[#1D1D1F]">
                  {showAgreementDetail === 'privacy' ? '隐私政策' : '用户服务协议'}
                </h2>
              </div>
              <button
                onClick={handleCloseAgreementDetail}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-[#86868B] active:scale-90 transition-transform hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-[#F5F5F7] p-6">
              {showAgreementDetail === 'privacy' ? <PrivacyPolicyContent /> : <UserAgreementContent />}
            </div>
          </motion.div>
        </div>
      )}

      {/* Decline Confirm Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 z-140">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl border border-black/5 flex flex-col"
          >
            <div className="flex-1 p-6">
              <h2 className="text-xl font-bold text-[#1D1D1F] mb-4">确认拒绝</h2>
              <p className="text-gray-600 mb-6">您确定要拒绝隐私政策吗？拒绝后将无法使用我们的服务。</p>
            </div>
            <div className="flex border-t border-black/5">
              <button
                onClick={handleDeclineCancel}
                className="flex-1 py-4 text-center text-gray-600 font-medium hover:bg-gray-50"
              >
                取消
              </button>
              <div className="w-px bg-black/5"></div>
              <button
                onClick={handleDeclineConfirm}
                className="flex-1 py-4 text-center text-[#0071E3] font-medium hover:bg-gray-50"
              >
                确定
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Privacy Policy Content
const PrivacyPolicyContent = () => (
  <div className="max-w-none">
    <h1 className="text-2xl font-bold text-[#0071E3] text-center mb-2">🔒 隐私政策</h1>
    <p className="text-center text-gray-500 mb-6"><strong>生效日期</strong>：2026年05月20日</p>

    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border-l-4 border-blue-600 mb-6">
      <p className="text-gray-700">欢迎使用「快序二维码」（以下简称"本应用"）。本应用由<strong>光年跃迁（温州）科技有限公司</strong>（以下简称"我们"）开发并运营。我们深知个人信息对您的重要性，将严格遵守《中华人民共和国个人信息保护法》等相关法律法规，保护您的个人信息安全。</p>
    </div>

    <p className="mb-6 text-gray-700">本隐私政策旨在说明我们如何收集、使用、存储和保护您在使用本应用过程中提供的个人信息，以及您对这些信息所享有的权利。请您在使用本应用前仔细阅读并充分理解本政策的全部内容，尤其是加粗的条款。如您对本政策有任何疑问、意见或建议，可通过本政策末尾提供的联系方式与我们联系。</p>

    <h2 className="text-xl font-semibold mt-8 mb-4 border-b-2 border-gray-200 pb-2">一、我们收集的信息</h2>
    <p className="mb-4 text-gray-700">在您使用本应用的过程中，我们会收集以下信息，以提供、维护和改进我们的服务：</p>
    <ol className="list-decimal pl-6 mb-6">
      <li className="mb-3 text-gray-700"><strong>二维码数据</strong>：您在使用本应用过程中生成的所有<strong>网址、文本、WiFi信息、名片信息及相关二维码数据</strong>。这些数据是本应用的核心功能内容，用于为您提供二维码生成、美化和导出服务。</li>
      <li className="mb-3 text-gray-700"><strong>设备信息</strong>：为了保障应用的稳定运行和优化用户体验，我们会自动收集您的设备相关信息，包括但不限于<strong>设备型号、操作系统版本、设备标识符（如IMEI/Android ID）、IP地址</strong>等。</li>
    </ol>

    <h2 className="text-xl font-semibold mt-8 mb-4 border-b-2 border-gray-200 pb-2">二、我们如何使用收集的信息</h2>
    <p className="mb-4 text-gray-700">我们仅会在以下合法、正当、必要的范围内使用您的个人信息：</p>
    <ol className="list-decimal pl-6 mb-6">
      <li className="mb-3 text-gray-700"><strong>提供和改进服务</strong>：使用您的二维码数据来实现二维码生成、美化、导出等核心功能；通过分析设备信息和使用数据，优化应用性能，修复已知问题，提升用户体验。</li>
      <li className="mb-3 text-gray-700"><strong>数据分析和统计</strong>：在对您的个人信息进行匿名化或去标识化处理后，进行内部数据分析和统计，以了解用户群体的使用习惯和需求，从而更好地规划和改进产品功能。</li>
    </ol>

    <h2 className="text-xl font-semibold mt-8 mb-4 border-b-2 border-gray-200 pb-2">三、我们如何共享、转让和公开披露信息</h2>
    <p className="mb-4 text-gray-700">我们郑重承诺，严格保护您的个人信息，不会在以下情形之外向任何第三方共享、转让或公开披露您的信息：</p>
    <ol className="list-decimal pl-6 mb-6">
      <li className="mb-3 text-gray-700"><strong>法定情形</strong>：根据法律法规的规定、行政或司法机关的强制性要求，我们可能会向有关部门披露您的相关信息。</li>
      <li className="mb-3 text-gray-700"><strong>获得明确同意</strong>：在获得您的明确书面同意后，我们才会向第三方共享您的个人信息。</li>
      <li className="mb-3 text-gray-700"><strong>业务必要且合规</strong>：为了实现本政策第二条所述的目的，我们可能会与提供技术支持、支付服务或其他必要服务的合作伙伴共享必要的信息，但我们会要求其严格遵守本政策及相关法律法规，并对您的信息承担保密义务。</li>
    </ol>

    <h2 className="text-xl font-semibold mt-8 mb-4 border-b-2 border-gray-200 pb-2">四、我们如何存储和保护信息</h2>
    <ol className="list-decimal pl-6 mb-6">
      <li className="mb-3 text-gray-700"><strong>存储地点和期限</strong>：您的个人信息将存储于中华人民共和国境内的安全服务器上。我们会在实现本政策所述目的所必需的最短时间内保留您的信息，超出此期限后，我们将对您的信息进行删除或匿名化处理。</li>
      <li className="mb-3 text-gray-700"><strong>安全措施</strong>：我们采用符合行业标准的技术手段和安全管理措施来保护您的个人信息，包括但不限于数据加密、访问控制、安全审计等，以防止信息泄露、丢失、篡改或被未经授权的访问。</li>
    </ol>

    <h2 className="text-xl font-semibold mt-8 mb-4 border-b-2 border-gray-200 pb-2">五、您的权利</h2>
    <p className="mb-4 text-gray-700">根据相关法律法规，您对您的个人信息享有以下权利：</p>
    <ol className="list-decimal pl-6 mb-6">
      <li className="mb-3 text-gray-700"><strong>访问权</strong>：您可以随时在本应用中查看和管理您的二维码历史记录。</li>
      <li className="mb-3 text-gray-700"><strong>更正权</strong>：如您发现您的二维码数据存在错误，您可以在应用内进行修改和更正。</li>
      <li className="mb-3 text-gray-700"><strong>删除权</strong>：您可以随时删除单条或全部历史记录，应用将立即删除相关数据。</li>
      <li className="mb-3 text-gray-700"><strong>数据导出</strong>：本应用所有数据存储在您的设备本地，您可以通过设备备份等方式导出您的数据。</li>
    </ol>

    <h2 className="text-xl font-semibold mt-8 mb-4 border-b-2 border-gray-200 pb-2">六、未成年人保护</h2>
    <p className="mb-6 text-gray-700">我们非常重视对未成年人个人信息的保护。如您是未满14周岁的未成年人，在使用本应用前，应在监护人的指导下仔细阅读本政策，并征得监护人的同意。如我们发现自己在未事先获得监护人可验证同意的情况下收集了未成年人的个人信息，将立即删除相关数据。</p>

    <h2 className="text-xl font-semibold mt-8 mb-4 border-b-2 border-gray-200 pb-2">七、本政策的更新</h2>
    <p className="mb-6 text-gray-700">我们可能会根据法律法规的更新、业务的调整或技术的发展，适时对本隐私政策进行修订。修订后的政策将在本应用内显著位置公示，并在生效前通过合理方式通知您。如您继续使用本应用，即表示您同意接受修订后的政策。</p>

    <h2 className="text-xl font-semibold mt-8 mb-4 border-b-2 border-gray-200 pb-2">八、联系我们</h2>
    <p className="mb-4 text-gray-700">如您对本隐私政策有任何疑问、意见或建议，或需要行使您的相关权利，请通过以下方式与我们联系：</p>
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
      <p className="mb-2 text-gray-700"><strong>电子邮箱</strong>：Jp112022@163.com</p>
    </div>

    <div className="mt-8 pt-6 border-t border-gray-200 text-center">
      <p className="mb-2 text-gray-500">感谢您使用快序二维码！</p>
      <p className="mb-4 text-gray-500">我们致力于为您提供安全、便捷的二维码服务。</p>
      <p className="text-sm text-gray-400">© 2026 光年跃迁（温州）科技有限公司 版权所有</p>
    </div>
  </div>
);

// User Agreement Content
const UserAgreementContent = () => (
  <div className="prose max-w-none">
    <h1 className="text-2xl font-bold text-[#0071E3] text-center mb-4">用户服务协议</h1>
    <p className="text-center text-gray-500 mb-8">更新日期：2026年3月20日</p>
    
    <h2 className="text-xl font-semibold mt-8 mb-4">1. 协议的接受</h2>
    <p>欢迎使用「快序二维码」应用（以下简称「本应用」）。</p>
    <p>本协议是您与光年跃迁（温州）科技有限公司（以下简称「我们」）之间关于使用本应用的法律协议。</p>
    <p>通过下载、安装或使用本应用，您表示同意接受本协议的全部条款和条件。</p>
    
    <h2 className="text-xl font-semibold mt-8 mb-4">2. 服务内容</h2>
    <p>本应用提供以下服务：</p>
    <ul className="list-disc pl-6 space-y-2">
      <li>生成多种类型的二维码（网址、文本、WiFi、名片）</li>
      <li>自定义二维码样式和美化</li>
      <li>导出高分辨率二维码图片</li>
      <li>保存和管理二维码历史记录</li>
    </ul>
    
    <h2 className="text-xl font-semibold mt-8 mb-4">3. 用户义务</h2>
    <p>作为本应用的用户，您同意：</p>
    <ul className="list-disc pl-6 space-y-2">
      <li>遵守本协议的所有条款</li>
      <li>不使用本应用进行任何非法活动</li>
      <li>不干扰本应用的正常运行</li>
      <li>保护您的设备安全，防止未授权访问</li>
    </ul>
    
    <h2 className="text-xl font-semibold mt-8 mb-4">4. 知识产权</h2>
    <p>本应用的所有内容，包括但不限于文字、图像、音频、视频、软件等，均受知识产权法律保护。</p>
    <p>未经我们的书面许可，您不得复制、修改、分发或商业使用本应用的任何内容。</p>
    
    <h2 className="text-xl font-semibold mt-8 mb-4">5. 免责声明</h2>
    <p>本应用按「原样」提供，不做任何形式的保证。</p>
    <p>我们不保证：</p>
    <ul className="list-disc pl-6 space-y-2">
      <li>本应用将符合您的要求</li>
      <li>本应用将无中断、及时、安全或无错误地运行</li>
      <li>本应用的使用结果将是准确或可靠的</li>
    </ul>
    
    <h2 className="text-xl font-semibold mt-8 mb-4">6. 终止</h2>
    <p>我们有权在任何时候，出于任何原因，终止或暂停您对本应用的访问。</p>
    <p>您也可以随时停止使用本应用。</p>
    
    <h2 className="text-xl font-semibold mt-8 mb-4">7. 适用法律</h2>
    <p>本协议受中华人民共和国法律管辖。</p>
    <p>任何与本协议相关的争议，应通过友好协商解决；协商不成的，应提交至温州市有管辖权的人民法院诉讼解决。</p>
  </div>
);
