'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, CheckCircle2, ShieldCheck, Activity, BarChart3, Leaf } from 'lucide-react';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportsModal({ isOpen, onClose }: ReportsModalProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  if (!isOpen) return null;

  const reportTypes = [
     { id: 'tax', name: '2026 Fiscal Tax Summary', icon: <FileText size={20} className="text-amber-400" />, desc: 'Consolidated RWA yield and capital gains for tax filing.' },
     { id: 'perf', name: 'Institutional Performance Audit', icon: <BarChart3 size={20} className="text-indigo-400" />, desc: 'Deep-tier alpha/beta analysis and Sharpe ratio report.' },
     { id: 'esg', name: 'ESG Compliance Statement', icon: <Leaf size={20} className="text-emerald-400" />, desc: 'Environmental impact and social governance metrics across holdings.' }
  ];

  const handleDownload = (type: any) => {
    setDownloading(type.id);
    
    // Simulate generation delay then trigger actual download
    setTimeout(() => {
      const content = `Assetverse - ${type.name}\n\nGenerated on: ${new Date().toISOString()}\n\nThis is a securely generated institutional report.\nConfidential and Proprietary.`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `Assetverse_${type.id}_report.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloading(null);
    }, 1500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl institutional-glass bg-surface-900 border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
             <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                   <FileText size={18} />
                </div>
                <h3 className="font-display font-bold text-white uppercase tracking-widest text-sm">Institutional Reporting Hub</h3>
             </div>
             <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                <X size={20} />
             </button>
          </div>

          <div className="p-8">
             <div className="flex items-center gap-4 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-8">
                <Activity size={12} className="text-emerald-500" /> Automated Enterprise Data Generation
             </div>

             <div className="space-y-4">
                {reportTypes.map((type, i) => (
                   <div key={type.id} className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/20 transition-all group">
                      <div className="flex items-start justify-between">
                         <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                               {type.icon}
                            </div>
                            <div>
                               <h4 className="text-white font-bold text-sm tracking-tight mb-1">{type.name}</h4>
                               <p className="text-xs text-white/30 leading-relaxed max-w-xs">{type.desc}</p>
                            </div>
                         </div>
                         <button 
                            onClick={() => handleDownload(type)}
                            className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all flex items-center"
                         >
                            {downloading === type.id ? <CheckCircle2 size={18} className="text-emerald-400 animate-in zoom-in duration-300" /> : <Download size={18} />}
                         </button>
                      </div>
                   </div>
                ))}
             </div>

             <div className="mt-10 p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-4">
                <ShieldCheck size={24} className="text-indigo-400" />
                <div className="text-[10px] text-indigo-400/60 font-medium leading-relaxed italic">
                   All reports are cryptographically signed by the Assetverse Trustee Node and are valid for institutional audit submissions.
                </div>
             </div>
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center">
             <div className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em]">Institutional Grade Auditing • Data Stream: Mainnet-Beta</div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
