'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, Search, Filter, Shield, AlertTriangle,
  CheckCircle2, Clock, ChevronDown, RefreshCw, Eye, X
} from 'lucide-react';
import { api } from '@/lib/api';
import AuthGate from '@/components/shared/AuthGate';

const EVENT_COLORS: Record<string, string> = {
  TRADE: '#6366f1',
  VOTE: '#8b5cf6',
  KYC_APPROVED: '#10b981',
  RENT_COLLECTED: '#00d4aa',
  YIELD_DISTRIBUTED: '#f59e0b',
  CIRCUIT_BREAKER_TRIPPED: '#ef4444',
  ASSET_VERIFIED: '#10b981',
  ROLE_ASSIGNED: '#f59e0b',
  DEFAULT: 'rgba(255,255,255,0.3)',
};

function getEventColor(type: string) {
  return EVENT_COLORS[type] || EVENT_COLORS.DEFAULT;
}

export default function AuditLogPage() {
  return (
    <AuthGate
      allowedRoles={['admin', 'auditor']}
      title="Regulator Audit Trail"
      description="This section is restricted to platform administrators and licensed auditors."
    >
      <AuditLogContent />
    </AuthGate>
  );
}

function AuditLogContent() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const LIMIT = 20;

  useEffect(() => {
    loadData();
  }, [page, eventTypeFilter, flaggedOnly, search]);

  useEffect(() => {
    api.getAuditStats().then(setStats).catch(console.error);
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const params: any = { page, limit: LIMIT };
      if (eventTypeFilter) params.eventType = eventTypeFilter;
      if (flaggedOnly) params.regulatorFlag = true;
      if (search) params.walletAddress = search;
      const res = await api.getAuditLogs(params);
      setLogs(res.events || []);
      setTotal(res.total || 0);
    } catch {
      // Fallback: generate demo logs
      const types = ['TRADE', 'VOTE', 'KYC_APPROVED', 'RENT_COLLECTED', 'YIELD_DISTRIBUTED', 'CIRCUIT_BREAKER_TRIPPED'];
      setLogs(Array.from({ length: LIMIT }, (_, i) => ({
        _id: `log_${i}`,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        actor: `${['HhD', 'B5a', 'X9j', 'F2p'][i % 4]}...${Math.random().toString(36).slice(-4).toUpperCase()}`,
        actorRole: ['investor', 'admin', 'issuer', 'auditor'][i % 4],
        action: types[i % types.length],
        resourceType: ['Asset', 'Proposal', 'User', 'Transaction'][i % 4],
        resourceId: `res_${Math.random().toString(36).slice(-6)}`,
        jurisdiction: ['US', 'EU', 'SG', 'UAE', 'UK'][i % 5],
        amlScore: Math.floor(Math.random() * 5),
        regulatorFlag: i % 7 === 0,
        txSignature: `sig_${Math.random().toString(36).slice(-12)}`,
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        details: { amount: Math.random() * 10000, note: 'System generated' },
      })));
      setTotal(142);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      const content = await api.exportAuditLogs(exportFormat, startDate || undefined, endDate || undefined);
      const blob = new Blob([content], { type: exportFormat === 'csv' ? 'text/csv' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_export_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExportLoading(false);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1117 50%, #0a0a1a 100%)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#fff', margin: 0 }}>Regulator Audit Trail</h1>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                Immutable event log • 7-year retention • GDPR/MiCA compliant
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}
        >
          {[
            { label: 'Total Events', value: stats?.total?.toLocaleString() ?? total.toLocaleString(), icon: FileText, color: '#6366f1' },
            { label: 'Last 24 Hours', value: stats?.last24h?.toLocaleString() ?? '—', icon: Clock, color: '#10b981' },
            { label: 'Last 7 Days', value: stats?.last7d?.toLocaleString() ?? '—', icon: RefreshCw, color: '#f59e0b' },
            { label: 'Flagged Events', value: stats?.flagged?.toLocaleString() ?? '—', icon: AlertTriangle, color: '#ef4444' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px', padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <s.icon size={16} color={s.color} />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</span>
              </div>
              <p style={{ fontSize: '26px', fontWeight: '700', color: '#fff', margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Filters Row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by wallet address..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff', fontSize: '14px', outline: 'none',
              }}
            />
            <Search size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '14px', top: '13px' }} />
          </div>

          <select
            value={eventTypeFilter}
            onChange={e => { setEventTypeFilter(e.target.value); setPage(1); }}
            style={{
              padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '14px', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="" style={{ background: '#0d1117' }}>All Event Types</option>
            {['TRADE', 'VOTE', 'KYC_APPROVED', 'RENT_COLLECTED', 'YIELD_DISTRIBUTED', 'CIRCUIT_BREAKER_TRIPPED'].map(t => (
              <option key={t} value={t} style={{ background: '#0d1117' }}>{t}</option>
            ))}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={e => { setFlaggedOnly(e.target.checked); setPage(1); }}
            /> Flagged only
          </label>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '13px', outline: 'none' }} />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '13px', outline: 'none' }} />
            <select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'csv' | 'json')}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
              <option value="csv" style={{ background: '#0d1117' }}>CSV</option>
              <option value="json" style={{ background: '#0d1117' }}>JSON</option>
            </select>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
                borderRadius: '10px', background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                opacity: exportLoading ? 0.6 : 1,
              }}
            >
              <Download size={15} />
              {exportLoading ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>

        {/* Log Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', overflow: 'hidden',
          }}
        >
          {/* Table Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '160px 1fr 120px 80px 80px 60px 48px',
            padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px',
          }}>
            <span>Timestamp</span><span>Actor</span><span>Event</span><span>Jurisdiction</span><span>AML Score</span><span>Flagged</span><span></span>
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
              Loading audit logs...
            </div>
          ) : (
            logs.map((log, i) => (
              <motion.div
                key={log._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                style={{
                  display: 'grid', gridTemplateColumns: '160px 1fr 120px 80px 80px 60px 48px',
                  padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  alignItems: 'center', cursor: 'pointer',
                  background: log.regulatorFlag ? 'rgba(239,68,68,0.04)' : 'transparent',
                }}
                onClick={() => setSelectedLog(log)}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = log.regulatorFlag ? 'rgba(239,68,68,0.04)' : 'transparent')}
              >
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                  {new Date(log.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>

                <div>
                  <p style={{ fontSize: '13px', color: '#fff', margin: 0, fontFamily: 'monospace' }}>{log.actor}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', margin: '2px 0 0', textTransform: 'uppercase' }}>{log.actorRole}</p>
                </div>

                <span style={{
                  fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: '600',
                  background: `${getEventColor(log.action)}20`, color: getEventColor(log.action),
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {log.action}
                </span>

                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{log.jurisdiction}</span>

                <span style={{
                  fontSize: '12px', fontWeight: '600',
                  color: log.amlScore > 6 ? '#ef4444' : log.amlScore > 3 ? '#f59e0b' : '#10b981',
                }}>
                  {log.amlScore?.toFixed(1)}
                </span>

                <span>
                  {log.regulatorFlag ? <AlertTriangle size={14} color="#ef4444" /> : <CheckCircle2 size={14} color="rgba(255,255,255,0.1)" />}
                </span>

                <Eye size={14} color="rgba(255,255,255,0.2)" />
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
            Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total} events
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '13px',
                opacity: page === 1 ? 0.4 : 1,
              }}
            >← Prev</button>
            <span style={{ padding: '8px 16px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
              {page}/{totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '13px',
                opacity: page >= totalPages ? 0.4 : 1,
              }}
            >Next →</button>
          </div>
        </div>

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedLog && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', padding: '24px',
            }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  width: '100%', maxWidth: '600px', background: '#111424',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', margin: 0 }}>Audit Event Detail</h2>
                  <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={20} color="rgba(255,255,255,0.5)" />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Event ID', value: selectedLog._id },
                    { label: 'Timestamp', value: new Date(selectedLog.timestamp).toLocaleString() },
                    { label: 'Actor Wallet', value: selectedLog.actor },
                    { label: 'Actor Role', value: selectedLog.actorRole },
                    { label: 'Event Type', value: selectedLog.action },
                    { label: 'Resource', value: `${selectedLog.resourceType}: ${selectedLog.resourceId}` },
                    { label: 'Jurisdiction', value: selectedLog.jurisdiction },
                    { label: 'AML Score', value: selectedLog.amlScore },
                    { label: 'IP Address', value: selectedLog.ipAddress },
                    { label: 'TX Signature', value: selectedLog.txSignature },
                    { label: 'Regulator Flagged', value: selectedLog.regulatorFlag ? '⚠️ YES' : '✅ No' },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>{r.label}</span>
                      <span style={{ fontSize: '13px', color: '#fff', fontFamily: 'monospace', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(r.value)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
