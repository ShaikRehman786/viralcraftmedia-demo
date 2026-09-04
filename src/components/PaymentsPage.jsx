import React, { useMemo } from 'react';
import {
  CreditCard,
  Clock,
  CheckCircle,
  TrendingUp,
  FileText,
  Download,
  Receipt,
  IndianRupee,
  BarChart3,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PaymentsPage({ user, projects, triggerDownload }) {
  const {
    confirmedTotal,
    pendingTotal,
    failedTotal,
    refundedTotal,
    confirmedCount,
    pendingCount,
    failedCount,
    refundedCount,
    collectionRate,
    chartData,
    invoicedProjects
  } = useMemo(() => {
    const by = (status) => projects.filter(p => (p.order?.paymentStatus || '').toLowerCase() === status);
    const sum = (arr) => arr.reduce((s, p) => s + (p.order?.amount || 0), 0);
    const confirmed = by('success');
    const pending = projects.filter(p => ['pending','enquiry'].includes((p.order?.paymentStatus||'').toLowerCase()));
    const failed = by('failed');
    const refunded = by('refunded');
    const confirmedTotal = sum(confirmed);
    const pendingTotal = sum(pending);
    const failedTotal = sum(failed);
    const refundedTotal = sum(refunded);
    const totalOrders = confirmed.length + pending.length + failed.length + refunded.length;
    const rate = totalOrders > 0 ? (confirmed.length / totalOrders) * 100 : 0;

    // Chart: confirmed only, grouped by IST month of order creation/verification
    const revenueByMonth = {};
    projects.forEach(p => {
      if ((p.order?.paymentStatus || '').toLowerCase() !== 'success') return;
      if (!p.order?.amount) return;
      // Use order.createdAt if available via project, else orderDate string
      const raw = p.order?.createdAt || p.createdAt || p.order?.orderDate;
      if (!raw) return;
      const date = new Date(raw);
      if (isNaN(date.getTime())) return;
      const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const key = `${ist.getFullYear()}-${ist.getMonth()}`;
      revenueByMonth[key] = (revenueByMonth[key] || 0) + p.order.amount;
    });

    const data = MONTHS.map(month => {
      const idx = MONTHS.indexOf(month);
      const key = `${new Date().getFullYear()}-${idx}`;
      return { month, revenue: revenueByMonth[key] || 0 };
    });

    const invoiced = projects.filter(p => p.order?.amount);

    return {
      confirmedTotal, pendingTotal, failedTotal, refundedTotal,
      confirmedCount: confirmed.length, pendingCount: pending.length, failedCount: failed.length, refundedCount: refunded.length,
      collectionRate: rate,
      chartData: data,
      invoicedProjects: invoiced.sort((a,b) => new Date(b.order?.createdAt || b.createdAt || 0) - new Date(a.order?.createdAt || a.createdAt || 0))
    };
  }, [projects]);

  const badgeFor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'success') return 'badge-success';
    if (s === 'pending' || s === 'enquiry') return 'badge-warning';
    if (s === 'failed') return 'badge-error';
    if (s === 'refunded') return 'badge-gray';
    return 'badge-gray';
  };
  const labelFor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'success') return 'Confirmed';
    if (s === 'pending') return 'Pending';
    if (s === 'enquiry') return 'Pending';
    if (s === 'failed') return 'Failed';
    if (s === 'refunded') return 'Refunded';
    return s || '—';
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ minWidth: 0 }}>
          <h2 className="section-title">Invoices & Billing</h2>
          <p className="section-subtitle">INR · Confirmed only after verified payment · Pending is not revenue</p>
        </div>
        <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>{invoicedProjects.length} records</span>
      </div>

      <div className="kpi-grid mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="kpi-card" style={{ borderLeft: '3px solid var(--success)' }}>
          <div className="kpi-icon kpi-icon-green"><IndianRupee size={18} /></div>
          <div className="kpi-content">
            <div className="kpi-label">Confirmed Revenue</div>
            <div className="kpi-value" style={{ fontSize: '1.1rem' }}>₹{confirmedTotal.toLocaleString('en-IN')}</div>
            <div className="kpi-trend up"><CheckCircle size={11} /><span>{confirmedCount} verified</span></div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-orange"><Clock size={18} /></div>
          <div className="kpi-content">
            <div className="kpi-label">Pending</div>
            <div className="kpi-value" style={{ fontSize: '1.1rem' }}>₹{pendingTotal.toLocaleString('en-IN')}</div>
            <div className="kpi-trend text-warning"><Clock size={11} /><span>{pendingCount} awaiting</span></div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}><AlertTriangle size={18} /></div>
          <div className="kpi-content">
            <div className="kpi-label">Failed</div>
            <div className="kpi-value" style={{ fontSize: '1.1rem', color: 'var(--error)' }}>₹{failedTotal.toLocaleString('en-IN')}</div>
            <div className="kpi-trend" style={{ color: 'var(--error)' }}><AlertTriangle size={11} /><span>{failedCount} not revenue</span></div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-purple"><BarChart3 size={18} /></div>
          <div className="kpi-content">
            <div className="kpi-label">Collection Rate</div>
            <div className="kpi-value">{collectionRate.toFixed(1)}%</div>
            <div className="kpi-trend" style={{ color: collectionRate >= 50 ? '#10B981' : '#EF4444' }}><TrendingUp size={11} /><span>Confirmed / Total</span></div>
          </div>
        </div>
      </div>

      {refundedTotal > 0 && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', background: 'var(--gray-50)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}><span className="badge badge-gray">Refunded</span> ₹{refundedTotal.toLocaleString('en-IN')} across {refundedCount} orders — excluded from confirmed</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>Not counted as revenue</span>
        </div>
      )}

      <div className="card mb-6">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 className="section-title">Revenue Overview</h3>
            <p className="section-subtitle">Confirmed only · IST month buckets</p>
          </div>
          <span className="badge badge-success flex-row gap-1">
            <TrendingUp size={12} />
            ₹{confirmedTotal.toLocaleString('en-IN')} confirmed
          </span>
        </div>
        <div className="card-body h-300" style={{ position: 'relative', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="paymentsRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} interval={0} />
              <YAxis stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} width={48} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid var(--gray-200)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                  background: 'var(--white)'
                }}
                formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Confirmed']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#paymentsRevenueGrad)" strokeWidth={2.5} dot={{ r: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
          {chartData.every(d => d.revenue === 0) && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', padding: '16px', textAlign: 'center' }}>
              <BarChart3 size={28} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No confirmed revenue in this period</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: '4px' }}>Failed/pending are not counted here</p>
            </div>
          )}
        </div>
      </div>

      <div className="section-header">
        <h3 className="section-title">Invoice History</h3>
        <span className="text-xs text-muted font-semibold">{invoicedProjects.length} record{invoicedProjects.length !== 1 ? 's' : ''}</span>
      </div>

      {invoicedProjects.length === 0 ? (
        <div className="card">
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            border: '1px solid var(--border)'
          }}>
            <Receipt size={48} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
              No invoices yet
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
              Invoices appear after verified payment. Failed and pending are listed below with their correct status.
            </p>
          </div>
        </div>
      ) : (
        <div className="data-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {invoicedProjects.map(p => {
            const order = p.order || {};
            const hasInvoice = !!order.invoiceUrl;
            const status = (order.paymentStatus || (hasInvoice ? 'success' : 'pending')).toLowerCase();

            return (
              <div key={p._id} className="data-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', minWidth: 0, padding: '14px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--gray-500)' }}>
                      {order.orderId || '—'}
                    </span>
                    <span className={`badge ${badgeFor(status)}`} style={{ fontSize: '0.68rem' }}>
                      {labelFor(status)}
                    </span>
                    {status === 'success' && !hasInvoice && <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>Invoice pending</span>}
                  </div>
                  <div className="data-card-title" style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.clientName || p.name}</div>
                  <div className="data-card-desc" style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    {(order.createdAt ? new Date(order.createdAt) : (order.orderDate ? new Date(order.orderDate) : null))?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) || '—'}
                    {' · '}{order.serviceType || p.category || 'Service'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: status === 'failed' ? 'var(--error)' : 'var(--gray-900)' }}>
                    ₹{(order.amount || 0).toLocaleString('en-IN')}
                  </div>
                  {status === 'success' && hasInvoice ? (
                    <button onClick={() => triggerDownload(order.invoiceUrl, order.orderId)} className="btn btn-primary btn-sm" style={{ minHeight: '32px' }}>
                      <Download size={12} /> PDF
                    </button>
                  ) : status === 'success' && !hasInvoice ? (
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} /> Generating…
                    </span>
                  ) : status === 'failed' ? (
                    <span style={{ fontSize: '0.72rem', color: 'var(--error)', fontWeight: 600 }}>Not collected</span>
                  ) : status === 'refunded' ? (
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Refunded</span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--warning)', fontWeight: 600 }}>Awaiting payment</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
