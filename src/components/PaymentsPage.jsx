import React, { useMemo } from 'react';
import {
  CreditCard,
  Clock,
  CheckCircle,
  TrendingUp,
  FileText,
  Download,
  ArrowUpRight,
  Receipt,
  IndianRupee,
  BarChart3,
  DollarSign
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
    totalRevenue,
    pendingCount,
    completedCount,
    collectionRate,
    chartData,
    invoicedProjects
  } = useMemo(() => {
    const total = projects.reduce((sum, p) => sum + (p.order?.amount || 0), 0);
    const pending = projects.filter(p => p.order && !p.order?.invoiceUrl).length;
    const completed = projects.filter(p => p.order?.invoiceUrl).length;
    const rate = (pending + completed) > 0 ? (completed / (pending + completed)) * 100 : 0;

    const revenueByMonth = {};
    projects.forEach(p => {
      if (p.order?.amount && p.order?.orderDate) {
        const date = new Date(p.order.orderDate);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        revenueByMonth[key] = (revenueByMonth[key] || 0) + p.order.amount;
      }
    });

    const data = MONTHS.map(month => {
      const idx = MONTHS.indexOf(month);
      const key = `${new Date().getFullYear()}-${idx}`;
      return {
        month,
        revenue: revenueByMonth[key] || 0
      };
    });

    const invoiced = projects.filter(p => p.order?.amount);

    return {
      totalRevenue: total,
      pendingCount: pending,
      completedCount: completed,
      collectionRate: rate,
      chartData: data,
      invoicedProjects: invoiced
    };
  }, [projects]);

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h2 className="section-title">Invoices & Billing</h2>
          <p className="section-subtitle">Track revenue, payment status, and download invoices</p>
        </div>
      </div>

      <div className="kpi-grid mb-6">
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-green">
            <IndianRupee size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total Revenue</div>
            <div className="kpi-value">₹{totalRevenue.toLocaleString('en-IN')}</div>
            <div className="kpi-trend up">
              <TrendingUp size={12} />
              <span>Lifetime earnings</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-orange">
            <Clock size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Pending Payments</div>
            <div className="kpi-value">{pendingCount}</div>
            <div className="kpi-trend text-warning">
              <Clock size={12} />
              <span>Awaiting invoice generation</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-blue">
            <CheckCircle size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Completed</div>
            <div className="kpi-value">{completedCount}</div>
            <div className="kpi-trend text-info">
              <ArrowUpRight size={12} />
              <span>Invoices generated</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-purple">
            <BarChart3 size={20} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Collection Rate</div>
            <div className="kpi-value">{collectionRate.toFixed(1)}%</div>
            <div className="kpi-trend" style={{ color: collectionRate >= 50 ? '#10B981' : '#EF4444' }}>
              <TrendingUp size={12} />
              <span>{completedCount} of {pendingCount + completedCount} invoiced</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <div>
            <h3 className="section-title">Revenue Overview</h3>
            <p className="section-subtitle">Monthly billing trajectory</p>
          </div>
          <span className="badge badge-success flex-row gap-1">
            <TrendingUp size={12} />
            ₹{totalRevenue.toLocaleString('en-IN')} total
          </span>
        </div>
        <div className="card-body h-300" style={{ position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="paymentsRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid var(--gray-200)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                  background: 'var(--white)'
                }}
                formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#paymentsRevenueGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
          {chartData.every(d => d.revenue === 0) && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <BarChart3 size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No revenue data recorded yet</p>
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
              Invoices will appear here once orders are placed and payment is processed.
            </p>
          </div>
        </div>
      ) : (
        <div className="data-grid">
          {invoicedProjects.map(p => {
            const order = p.order || {};
            const hasInvoice = !!order.invoiceUrl;

            return (
              <div key={p._id} className="data-card flex-row items-center">
                <div className="flex-1">
                  <div className="flex-row gap-2 items-center mb-1">
                    <span className="text-xs font-mono font-semibold text-muted">
                      {order.orderId || 'N/A'}
                    </span>
                    <span className={`badge ${hasInvoice ? 'badge-success' : 'badge-warning'}`}>
                      {hasInvoice ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                  <div className="data-card-title">{order.clientName || p.name}</div>
                  <div className="data-card-desc">
                    {order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </div>
                </div>
                <div className="flex-col items-end gap-2">
                  <div className="kpi-value text-sm">
                    ₹{(order.amount || 0).toLocaleString('en-IN')}
                  </div>
                  {hasInvoice ? (
                    <button
                      onClick={() => triggerDownload(order.invoiceUrl, order.orderId)}
                      className="btn btn-primary btn-sm"
                    >
                      <Download size={12} />
                      PDF
                    </button>
                  ) : (
                    <span className="text-xs text-muted flex-row gap-1 items-center">
                      <Clock size={11} />
                      Generating...
                    </span>
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
