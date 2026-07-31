import React from 'react';
import {
  Search,
  UserCheck,
  Phone,
  Mail,
  FolderOpen,
  MessageSquare,
  Plus,
  Archive,
  UserPlus,
  Briefcase,
  CheckCircle,
  X,
  Send,
  DollarSign,
  Globe,
  User
} from 'lucide-react';

const STATUS_BADGES = {
  pending_review: 'badge-accent',
  assigned: 'badge-warning',
  converted_client: 'badge-info',
  converted_project: 'badge-success',
  archived: 'badge-gray'
};

const CATEGORY_ICONS = {
  'Clip Editing': '🎬',
  'Podcast Editing': '🎙',
  'Social Media Marketing': '📈',
  'Website Design & Development': '🌐'
};

export default function EnquiriesPage({
  enquiries, user,
  enqSearch, setEnqSearch,
  enqStatusFilter, setEnqStatusFilter,
  enqCategoryFilter, setEnqCategoryFilter,
  noteText, setNoteText,
  activeEnquiryForNote, setActiveEnquiryForNote,
  handleAssignManager,
  handleConvertClient,
  handleConvertProject,
  handleArchiveEnquiry,
  handleAddEnquiryNote,
  addToast,
  staff
}) {
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
  const selectedEnquiry = enquiries.find(e => e._id === activeEnquiryForNote);

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <div>
          <h2 className="section-title">Inbound CRM Service Leads</h2>
          <p className="section-subtitle">Manage lead pipeline, assign managers, add notes, and convert to active projects</p>
        </div>
      </div>

      <div className="flex-row gap-2 mb-4 flex-wrap">
        <div className="header-search flex-1 min-w-200">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by name, phone, or ID..."
            value={enqSearch}
            onChange={e => setEnqSearch(e.target.value)}
            className="input"
          />
        </div>
        <select value={enqStatusFilter} onChange={e => setEnqStatusFilter(e.target.value)} className="select w-160">
          <option value="all">All Statuses</option>
          <option value="pending_review">Pending Review</option>
          <option value="assigned">Assigned</option>
          <option value="converted_client">Converted Client</option>
          <option value="converted_project">Converted Project</option>
          <option value="archived">Archived</option>
        </select>
        <select value={enqCategoryFilter} onChange={e => setEnqCategoryFilter(e.target.value)} className="select w-200">
          <option value="all">All Services</option>
          <option value="Clip Editing">Clip Editing</option>
          <option value="Podcast Editing">Podcast Editing</option>
          <option value="Social Media Marketing">Social Media Marketing</option>
          <option value="Website Design & Development">Website Design & Development</option>
        </select>
      </div>

      {enquiries.length === 0 ? (
        <div className="card">
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            border: '1px solid var(--border)'
          }}>
            <UserCheck size={48} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
              No leads found
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
              No inbound CRM service leads match the current filters. Try adjusting your search criteria.
            </p>
          </div>
        </div>
      ) : (
        <div className="section-grid">
          <div className="flex-col gap-3">
            {enquiries.map(enq => (
              <div key={enq._id} className="data-card">
                <div className="data-card-header">
                  <div className="flex-row gap-2 items-center">
                    <span className="text-xs text-muted font-semibold font-mono">{enq.enquiryId}</span>
                    <span className={`badge ${STATUS_BADGES[enq.status] || 'badge-gray'}`}>
                      {enq.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {enq.budget > 0 && (
                    <span className="badge badge-success flex-row gap-1">
                      <DollarSign size={10} />
                      ₹{enq.budget}
                    </span>
                  )}
                </div>

                <div className="flex-row gap-3 items-start">
                  <div className="avatar avatar-lg bg-accent">
                    {(enq.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="data-card-title text-lg">{enq.name}</div>
                    <div className="flex-col gap-1 mt-1">
                      {enq.phone && (
                        <div className="flex-row gap-1 items-center text-xs text-muted">
                          <Phone size={11} />
                          <span>+{enq.phone}</span>
                        </div>
                      )}
                      {enq.email && (
                        <div className="flex-row gap-1 items-center text-xs text-muted">
                          <Mail size={11} />
                          <span>{enq.email}</span>
                        </div>
                      )}
                      <div className="flex-row gap-1 items-center text-xs text-muted">
                        <FolderOpen size={11} />
                        <span><strong>{enq.serviceCategory || 'N/A'}</strong></span>
                      </div>
                      {enq.source && (
                        <div className="flex-row gap-1 items-center text-xs text-muted">
                          <Globe size={11} />
                          <span>Source: {enq.source}</span>
                        </div>
                      )}
                    </div>
                    {enq.description && (
                      <p className="text-xs text-muted mt-2 italic leading-normal">
                        "{enq.description.length > 100 ? enq.description.slice(0, 100) + '...' : enq.description}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-top pt-2 mt-2">
                  {activeEnquiryForNote === enq._id && (
                    <div className="flex-row gap-2 mb-2">
                      <textarea
                        rows={2}
                        placeholder="Add a note or observation..."
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        className="textarea flex-1"
                      />
                      <div className="flex-col gap-1">
                        <button onClick={() => handleAddEnquiryNote(enq._id)} className="btn btn-primary btn-sm">
                          <Send size={12} /> Submit
                        </button>
                        <button onClick={() => { setActiveEnquiryForNote(null); setNoteText(''); }} className="btn btn-ghost btn-sm">
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {enq.notes && enq.notes.length > 0 && (
                    <div className="flex-col gap-2 mb-2">
                      {enq.notes.map((n, i) => (
                        <div key={i} className="flex-row gap-2 items-start text-xs note-item">
                          <div className="avatar avatar-sm bg-blue-500">
                            {(n.author || '?')[0]}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">{n.author}</div>
                            <div className="text-muted">{n.text}</div>
                            <div className="text-muted text-2xs mt-1">
                              {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex-row gap-2 items-center w-full">
                    <select
                    value={enq.assignedManager?._id || ''}
                    onChange={e => handleAssignManager(enq._id, e.target.value)}
                    className="select select-sm flex-1"
                  >
                    <option value="">Unassigned</option>
                    {staff && staff.filter(s => s.role === 'MANAGER').map(mgr => (
                      <option key={mgr._id} value={mgr._id}>{mgr.name}</option>
                    ))}
                  </select>
                    <button
                      onClick={() => handleConvertClient(enq._id)}
                      disabled={enq.status === 'converted_client' || enq.status === 'converted_project'}
                      className="btn btn-secondary btn-sm"
                    >
                      <UserPlus size={12} /> Client
                    </button>
                    <button
                      onClick={() => handleConvertProject(enq._id)}
                      disabled={enq.status === 'converted_project'}
                      className="btn btn-primary btn-sm"
                    >
                      <Briefcase size={12} /> Project
                    </button>
                    <button
                      onClick={() => handleArchiveEnquiry(enq._id)}
                      className="btn btn-ghost btn-sm text-error"
                    >
                      <Archive size={12} />
                    </button>
                    <button
                      onClick={() => setActiveEnquiryForNote(activeEnquiryForNote === enq._id ? null : enq._id)}
                      className="btn btn-ghost btn-sm"
                    >
                      <MessageSquare size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-col gap-3">
            {selectedEnquiry ? (
              <div className="card card-glass">
                <div className="card-header">
                  <div>
                    <h3 className="section-title">Notes — {selectedEnquiry.name}</h3>
                    <p className="section-subtitle font-mono text-xs">{selectedEnquiry.enquiryId}</p>
                  </div>
                  <button onClick={() => { setActiveEnquiryForNote(null); setNoteText(''); }} className="btn btn-ghost btn-icon">
                    <X size={16} />
                  </button>
                </div>
                <div className="card-body p-0">
                  {(!selectedEnquiry.notes || selectedEnquiry.notes.length === 0) ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1.5rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 12,
                      border: '1px solid var(--border)'
                    }}>
                      <MessageSquare size={48} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '1rem' }} />
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
                        No notes yet
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
                        Use the note input to add observations, follow-ups, or internal instructions for this lead.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-col p-4 gap-2">
                      {selectedEnquiry.notes.map((n, i) => (
                        <div key={i} className="flex-row gap-3 items-start">
                          <div className="avatar avatar-sm bg-purple-500">
                            {(n.author || '?')[0]}
                          </div>
                          <div className="flex-1">
                            <div className="flex-row gap-2 items-center mb-1">
                              <span className="font-semibold text-sm">{n.author}</span>
                              <span className="text-xs text-muted">
                                {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <p className="text-sm text-muted leading-normal">{n.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="card-footer">
                  <div className="flex-row gap-2 w-full">
                    <textarea
                      rows={2}
                      placeholder="Write a new note..."
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      className="textarea flex-1"
                    />
                    <button onClick={() => handleAddEnquiryNote(selectedEnquiry._id)} className="btn btn-primary">
                      <Send size={14} /> Add
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div style={{
                  textAlign: 'center',
                  padding: '3rem 1.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 12,
                  border: '1px solid var(--border)'
                }}>
                  <MessageSquare size={48} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
                    Select a lead
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
                    Click the notes button on any lead card to view and manage its audit trail here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
