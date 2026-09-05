import React, { useMemo, useState } from 'react';
import {
  Search,
  UserCheck,
  Phone,
  Mail,
  FolderOpen,
  MessageSquare,
  Archive,
  UserPlus,
  Briefcase,
  CheckCircle,
  X,
  Send,
  Globe,
  Clock,
  MoreHorizontal,
  Filter,
  IndianRupee
} from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency.js';

const STATUS_BADGES = {
  pending_review: 'badge-warning',
  assigned: 'badge-info',
  converted_client: 'badge-success',
  converted_project: 'badge-success',
  archived: 'badge-gray'
};

function StatusBadge({ status }) {
  const cls = STATUS_BADGES[status] || 'badge-gray';
  return <span className={`badge ${cls}`} style={{ fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>{(status || '—').replace(/_/g, ' ')}</span>;
}

export default function EnquiriesPage({
  enquiries, user,
  enqSearch, setEnqSearch,
  enqStatusFilter, setEnqStatusFilter,
  enqCategoryFilter, setEnqCategoryFilter,
  enqReferralFilter, setEnqReferralFilter,
  noteText, setNoteText,
  activeEnquiryForNote, setActiveEnquiryForNote,
  handleAssignManager,
  handleConvertClient,
  handleConvertProject,
  handleArchiveEnquiry,
  handleAddEnquiryNote,
  staff
}) {
  const selectedEnquiry = useMemo(() => enquiries.find(e => e._id === activeEnquiryForNote), [enquiries, activeEnquiryForNote]);
  const [openMenuId, setOpenMenuId] = useState(null);

  const counts = useMemo(() => {
    const total = enquiries.length;
    const pending = enquiries.filter(e => e.status === 'pending_review').length;
    const assigned = enquiries.filter(e => e.status === 'assigned').length;
    const converted = enquiries.filter(e => ['converted_client','converted_project'].includes(e.status)).length;
    return { total, pending, assigned, converted };
  }, [enquiries]);

  return (
    <div className="animate-fade-in enq-page">
      <div className="enq-header">
        <div>
          <h2 className="section-title">Inbound Leads</h2>
          <p className="section-subtitle">Review new enquiries, route to managers and convert to clients or projects.</p>
        </div>
        <div className="enq-metrics">
          <span className="enq-metric"><strong>{counts.total}</strong> total</span>
          <span className="enq-metric enq-metric--pending"><strong>{counts.pending}</strong> pending</span>
          <span className="enq-metric"><strong>{counts.assigned}</strong> assigned</span>
          <span className="enq-metric enq-metric--ok"><strong>{counts.converted}</strong> converted</span>
        </div>
      </div>

      <div className="enq-filters">
        <div className="enq-search">
          <Search size={14} />
          <input type="text" placeholder="Search name, phone, ID…" value={enqSearch} onChange={e => setEnqSearch(e.target.value)} />
        </div>
        <select value={enqStatusFilter} onChange={e => setEnqStatusFilter(e.target.value)} className="enq-select">
          <option value="all">All statuses</option>
          <option value="pending_review">Pending review</option>
          <option value="assigned">Assigned</option>
          <option value="converted_client">Converted — client</option>
          <option value="converted_project">Converted — project</option>
          <option value="archived">Archived</option>
        </select>
        <select value={enqCategoryFilter} onChange={e => setEnqCategoryFilter(e.target.value)} className="enq-select">
          <option value="all">All services</option>
          <option value="Clip Editing">Clip Editing</option>
          <option value="Podcast Editing">Podcast Editing</option>
          <option value="Social Media Marketing">Social Media Marketing</option>
          <option value="Website Design & Development">Website Design & Development</option>
        </select>
        <select value={enqReferralFilter} onChange={e => setEnqReferralFilter(e.target.value)} className="enq-select enq-select--narrow">
          <option value="all">All sources</option>
          <option value="referral">Referral</option>
          <option value="organic">Organic</option>
          <option value="direct">Direct</option>
          <option value="website">Website</option>
          <option value="partner">Partner</option>
        </select>
      </div>

      {enquiries.length === 0 ? (
        <div className="enq-empty">
          <UserCheck size={20} />
          <div>
            <strong>No leads found</strong>
            <span>No enquiries match the current filters. Adjust search or filters.</span>
          </div>
        </div>
      ) : (
        <div className="enq-layout">
          <div className="enq-list">
            {/* Desktop table */}
            <div className="enq-table-wrap">
              <table className="enq-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Contact</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Value</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enquiries.map(enq => (
                    <tr key={enq._id} className={activeEnquiryForNote === enq._id ? 'is-selected' : ''}>
                      <td>
                        <div className="enq-lead">
                          <span className="enq-avatar">{(enq.name || '?').slice(0,1).toUpperCase()}</span>
                          <span>
                            <strong className="enq-name">{enq.name}</strong>
                            <span className="enq-id">{enq.enquiryId}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="enq-contact"><Phone size={12} /> +{enq.phone || '—'}</span>
                        {enq.email && <span className="enq-contact enq-contact--muted"><Mail size={12} /> {enq.email}</span>}
                      </td>
                      <td>
                        <span className="enq-service"><FolderOpen size={12} /> {enq.serviceCategory || '—'}</span>
                        {enq.referral?.isReferral && <span className="enq-referral">Referral · {enq.referral.referralCode || '—'}</span>}
                      </td>
                      <td><StatusBadge status={enq.status} /></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 }}>{enq.budget > 0 ? formatCurrency(enq.budget) : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'var(--gray-500)' }}>{enq.createdAt ? new Date(enq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                      <td>
                        <div className="enq-row-actions">
                          <select value={enq.assignedManager?._id || ''} onChange={e => handleAssignManager(enq._id, e.target.value)} className="enq-inline-select" aria-label="Assign manager">
                            <option value="">Assign</option>
                            {staff?.filter(s => s.role === 'MANAGER').map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                          </select>
                          <button onClick={() => handleConvertProject(enq._id)} disabled={enq.status === 'converted_project'} className="btn btn-primary btn-xs">Project</button>
                          <button onClick={() => handleConvertClient(enq._id)} disabled={['converted_client','converted_project'].includes(enq.status)} className="btn btn-secondary btn-xs">Client</button>
                          <span className="enq-menu-anchor">
                            <button onClick={() => setOpenMenuId(openMenuId === enq._id ? null : enq._id)} className="btn btn-ghost btn-xs" aria-label="More actions"><MoreHorizontal size={14} /></button>
                            {openMenuId === enq._id && (
                              <span className="enq-menu" onMouseLeave={() => setOpenMenuId(null)}>
                                <button onClick={() => { setActiveEnquiryForNote(enq._id); setOpenMenuId(null); }}><MessageSquare size={12} /> Notes</button>
                                <button onClick={() => { handleArchiveEnquiry(enq._id); setOpenMenuId(null); }}><Archive size={12} /> Archive</button>
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="enq-cards">
              {enquiries.map(enq => (
                <div key={enq._id} className={`enq-card ${activeEnquiryForNote === enq._id ? 'is-selected' : ''}`}>
                  <div className="enq-card-head">
                    <span className="enq-card-name">{enq.name}</span>
                    <StatusBadge status={enq.status} />
                  </div>
                  <div className="enq-card-service"><FolderOpen size={12} /> {enq.serviceCategory || '—'}</div>
                  <div className="enq-card-contact"><Phone size={12} /> +{enq.phone || '—'} <span className="enq-dot">·</span> {enq.createdAt ? new Date(enq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</div>
                  {enq.budget > 0 && <div className="enq-card-value"><IndianRupee size={12} /> {new Intl.NumberFormat('en-IN').format(enq.budget)}</div>}
                  {enq.referral?.isReferral && <div className="enq-card-referral">Referral · {enq.referral.referralCode}</div>}
                  <div className="enq-card-actions">
                    <button onClick={() => handleConvertProject(enq._id)} disabled={enq.status === 'converted_project'} className="btn btn-primary btn-xs">Project</button>
                    <button onClick={() => handleConvertClient(enq._id)} disabled={['converted_client','converted_project'].includes(enq.status)} className="btn btn-secondary btn-xs">Client</button>
                    <button onClick={() => setActiveEnquiryForNote(activeEnquiryForNote === enq._id ? null : enq._id)} className="btn btn-ghost btn-xs"><MessageSquare size={12} /></button>
                    <button onClick={() => handleArchiveEnquiry(enq._id)} className="btn btn-ghost btn-xs"><Archive size={12} /></button>
                  </div>
                  <div className="enq-card-assign">
                    <select value={enq.assignedManager?._id || ''} onChange={e => handleAssignManager(enq._id, e.target.value)} className="enq-inline-select enq-inline-select--full">
                      <option value="">Assign manager…</option>
                      {staff?.filter(s => s.role === 'MANAGER').map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="enq-detail">
            {!selectedEnquiry ? (
              <div className="enq-detail-empty">
                <MessageSquare size={18} />
                <strong>Select a lead</strong>
                <span>Choose a lead’s note action to view its timeline and add follow-ups.</span>
              </div>
            ) : (
              <div className="enq-detail-card">
                <div className="enq-detail-head">
                  <div>
                    <strong>{selectedEnquiry.name}</strong>
                    <span>{selectedEnquiry.enquiryId} · {selectedEnquiry.serviceCategory}</span>
                  </div>
                  <button onClick={() => setActiveEnquiryForNote(null)} className="btn btn-ghost btn-xs"><X size={14} /></button>
                </div>
                {selectedEnquiry.referral?.isReferral && (
                  <div className="enq-detail-referral">
                    <strong>Referral</strong>
                    <span>{selectedEnquiry.referral.partnerAgency || '—'} · {selectedEnquiry.referral.campaignName || '—'} · {selectedEnquiry.referral.referralCode || '—'}</span>
                  </div>
                )}
                <div className="enq-detail-meta">
                  <span><Phone size={12} /> +{selectedEnquiry.phone}</span>
                  {selectedEnquiry.email && <span><Mail size={12} /> {selectedEnquiry.email}</span>}
                  {selectedEnquiry.source && <span><Globe size={12} /> {selectedEnquiry.source}</span>}
                  <span><Clock size={12} /> {new Date(selectedEnquiry.createdAt).toLocaleString('en-IN')}</span>
                  {selectedEnquiry.budget > 0 && <span><IndianRupee size={12} /> {formatCurrency(selectedEnquiry.budget)}</span>}
                </div>
                {selectedEnquiry.description && <p className="enq-detail-desc">“{selectedEnquiry.description}”</p>}
                <div className="enq-detail-notes">
                  {(!selectedEnquiry.notes || selectedEnquiry.notes.length === 0) ? (
                    <span className="enq-detail-empty-note">No notes yet — add a follow-up below.</span>
                  ) : selectedEnquiry.notes.map((n,i) => (
                    <div key={i} className="enq-note">
                      <span className="enq-note-avatar">{(n.author || '?')[0]}</span>
                      <span><strong>{n.author}</strong> <em>{n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN') : ''}</em><br />{n.text}</span>
                    </div>
                  ))}
                </div>
                <div className="enq-detail-compose">
                  <textarea rows={2} placeholder="Write a note…" value={noteText} onChange={e => setNoteText(e.target.value)} />
                  <button onClick={() => handleAddEnquiryNote(selectedEnquiry._id)} className="btn btn-primary btn-sm"><Send size={12} /> Add</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .enq-page { display:flex; flex-direction:column; gap:14px; }
        .enq-header { display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap; align-items:flex-start; }
        .enq-metrics { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .enq-metric { font-size:0.75rem; color:var(--gray-600); background:var(--white); border:1px solid var(--gray-200); padding:6px 10px; border-radius:999px; }
        .enq-metric strong { color:var(--gray-900); }
        .enq-metric--pending strong { color:var(--warning); }
        .enq-metric--ok strong { color:var(--success); }
        .enq-filters { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .enq-search { position:relative; flex:1 1 220px; min-width:180px; }
        .enq-search svg { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--gray-400); pointer-events:none; }
        .enq-search input { width:100%; height:36px; padding:0 12px 0 32px; border:1px solid var(--gray-200); border-radius:8px; font-size:0.8125rem; background:var(--white); }
        .enq-select { height:36px; border:1px solid var(--gray-200); border-radius:8px; padding:0 28px 0 10px; font-size:0.8125rem; background:var(--white); min-width:140px; }
        .enq-select--narrow { min-width:120px; }
        .enq-empty { display:flex; gap:12px; align-items:center; padding:20px; border:1px solid var(--gray-200); border-radius:12px; background:var(--white); color:var(--gray-600); }
        .enq-empty strong { display:block; color:var(--gray-900); }
        .enq-layout { display:grid; grid-template-columns: 1fr 360px; gap:16px; align-items:start; }
        .enq-list { min-width:0; }
        .enq-table-wrap { overflow:auto; border:1px solid var(--gray-200); border-radius:12px; background:var(--white); }
        .enq-table { width:100%; border-collapse:collapse; font-size:0.8125rem; }
        .enq-table th { text-align:left; font-size:0.6875rem; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; color:var(--gray-500); padding:10px 12px; border-bottom:1px solid var(--gray-200); background:var(--gray-50); white-space:nowrap; }
        .enq-table td { padding:10px 12px; border-bottom:1px solid var(--gray-100); vertical-align:top; }
        .enq-table tr.is-selected td { background:rgba(255,106,0,0.04); }
        .enq-lead { display:flex; gap:10px; align-items:center; }
        .enq-avatar { width:28px; height:28px; border-radius:999px; background:var(--gray-900); color:var(--white); display:inline-flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:700; flex-shrink:0; }
        .enq-name { display:block; font-weight:600; color:var(--gray-900); }
        .enq-id { display:block; font-size:0.6875rem; color:var(--gray-500); font-family:var(--font-mono); }
        .enq-contact { display:flex; gap:6px; align-items:center; font-size:0.75rem; color:var(--gray-700); }
        .enq-contact--muted { color:var(--gray-500); }
        .enq-service { display:inline-flex; gap:6px; align-items:center; font-size:0.75rem; font-weight:600; color:var(--gray-700); }
        .enq-referral { display:block; font-size:0.6875rem; color:var(--warning); margin-top:2px; }
        .enq-row-actions { display:flex; gap:6px; align-items:center; justify-content:flex-end; }
        .enq-inline-select { height:28px; border:1px solid var(--gray-200); border-radius:6px; font-size:0.75rem; padding:0 6px; background:var(--white); }
        .enq-inline-select--full { width:100%; }
        .enq-menu-anchor { position:relative; }
        .enq-menu { position:absolute; right:0; top:32px; background:var(--white); border:1px solid var(--gray-200); border-radius:8px; padding:4px; display:flex; flex-direction:column; gap:2px; box-shadow:var(--shadow-lg); z-index:10; min-width:140px; }
        .enq-menu button { display:flex; gap:8px; align-items:center; padding:7px 10px; border:0; background:transparent; font-size:0.8125rem; text-align:left; border-radius:6px; cursor:pointer; }
        .enq-menu button:hover { background:var(--gray-50); }
        .enq-cards { display:none; flex-direction:column; gap:10px; }
        .enq-card { border:1px solid var(--gray-200); border-radius:12px; background:var(--white); padding:12px; display:flex; flex-direction:column; gap:6px; }
        .enq-card.is-selected { border-color:var(--accent); }
        .enq-card-head { display:flex; justify-content:space-between; gap:8px; align-items:center; }
        .enq-card-name { font-weight:600; color:var(--gray-900); font-size:0.875rem; }
        .enq-card-service, .enq-card-contact { display:flex; gap:6px; align-items:center; font-size:0.75rem; color:var(--gray-600); }
        .enq-card-value { font-size:0.8125rem; font-weight:600; display:flex; gap:4px; align-items:center; }
        .enq-card-referral { font-size:0.6875rem; color:var(--warning); }
        .enq-card-actions { display:flex; gap:6px; flex-wrap:wrap; margin-top:4px; }
        .enq-card-assign { margin-top:4px; }
        .enq-dot { color:var(--gray-300); }
        .enq-detail { position:sticky; top:64px; }
        .enq-detail-empty { border:1px dashed var(--gray-200); border-radius:12px; padding:24px; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; color:var(--gray-500); background:var(--white); }
        .enq-detail-card { border:1px solid var(--gray-200); border-radius:12px; background:var(--white); overflow:hidden; }
        .enq-detail-head { display:flex; justify-content:space-between; gap:12px; padding:12px 14px; border-bottom:1px solid var(--gray-100); }
        .enq-detail-head strong { display:block; font-size:0.875rem; color:var(--gray-900); }
        .enq-detail-head span { font-size:0.75rem; color:var(--gray-500); }
        .enq-detail-referral { padding:10px 14px; background:rgba(255,106,0,0.04); border-bottom:1px solid var(--gray-100); }
        .enq-detail-referral strong { display:block; font-size:0.6875rem; letter-spacing:0.06em; text-transform:uppercase; color:var(--warning); }
        .enq-detail-referral span { font-size:0.75rem; color:var(--gray-700); }
        .enq-detail-meta { display:flex; flex-wrap:wrap; gap:8px 14px; padding:12px 14px; border-bottom:1px solid var(--gray-100); font-size:0.75rem; color:var(--gray-600); }
        .enq-detail-meta span { display:inline-flex; gap:6px; align-items:center; }
        .enq-detail-desc { font-size:0.8125rem; color:var(--gray-600); font-style:italic; padding:12px 14px; margin:0; border-bottom:1px solid var(--gray-100); }
        .enq-detail-notes { max-height:320px; overflow:auto; padding:10px 14px; display:flex; flex-direction:column; gap:10px; }
        .enq-detail-empty-note { font-size:0.75rem; color:var(--gray-500); }
        .enq-note { display:flex; gap:10px; font-size:0.8125rem; }
        .enq-note-avatar { width:24px; height:24px; border-radius:999px; background:var(--gray-900); color:var(--white); display:inline-flex; align-items:center; justify-content:center; font-size:0.6875rem; flex-shrink:0; }
        .enq-note strong { color:var(--gray-900); }
        .enq-note em { color:var(--gray-500); font-style:normal; font-size:0.6875rem; }
        .enq-detail-compose { display:flex; gap:8px; padding:10px 14px; border-top:1px solid var(--gray-100); }
        .enq-detail-compose textarea { flex:1; border:1px solid var(--gray-200); border-radius:8px; padding:8px 10px; font-size:0.8125rem; resize:vertical; }
        @media (max-width: 1024px) { .enq-layout { grid-template-columns: 1fr; } .enq-detail { position:static; } }
        @media (max-width: 768px) {
          .enq-table-wrap { display:none; }
          .enq-cards { display:flex; }
          .enq-header { flex-direction:column; }
          .enq-filters { flex-direction:column; align-items:stretch; }
          .enq-search, .enq-select { width:100%; min-width:0; }
        }
      `}</style>
    </div>
  );
}
