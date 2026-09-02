import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Shield, UserCheck, Check, Clock, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MemberApprovals({ onShowToast }) {
  const { state, approveUser, rejectUser, deleteSupportMessage } = useStore();
  const currentUser = state.currentUser;
  const [activeSubTab, setActiveSubTab] = useState('pending');

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <Shield size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>You must be registered as a SCOT Admin to access this panel.</p>
      </div>
    );
  }

  const users = state.users || [];
  const pendingUsers = users.filter(u => u.status === 'PENDING_APPROVAL');
  const approvedUsers = users.filter(u => u.status !== 'PENDING_APPROVAL');
  const supportMessages = state.supportMessages || [];

  const handleApprove = (userId, name) => {
    approveUser(userId);
    onShowToast(`Verified flat contribution and approved account for ${name}!`, 'success');
  };

  const handleReject = (userId, name) => {
    if (window.confirm(`Are you sure you want to reject the registration request for ${name}?`)) {
      rejectUser(userId);
      onShowToast(`Rejected and removed signup request for ${name}.`, 'info');
    }
  };

  const handleDeleteMessage = (msgId) => {
    deleteSupportMessage(msgId);
    onShowToast('Support message cleared.', 'info');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
    >
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Member Approvals & Flat Dues</h1>
            <p className="page-subtitle">Verify annual housing flat contributions and approve resident profiles</p>
          </div>
        </div>
      </div>

      {/* Sub navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button 
          className={`btn btn-sm ${activeSubTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('pending')}
          style={{ borderRadius: '8px' }}
        >
          Pending Approvals ({pendingUsers.length})
        </button>
        <button 
          className={`btn btn-sm ${activeSubTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('directory')}
          style={{ borderRadius: '8px' }}
        >
          Approved Directory ({approvedUsers.length})
        </button>
        <button 
          className={`btn btn-sm ${activeSubTab === 'support' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('support')}
          style={{ borderRadius: '8px' }}
        >
          Resident Messages / Help Desk ({supportMessages.length})
        </button>
      </div>

      {/* Pending Approvals Sub-Tab */}
      {activeSubTab === 'pending' && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
              Pending Resident Registrations ({pendingUsers.length})
            </h2>
            <span className="badge badge-amber">Action Required</span>
          </div>

          {pendingUsers.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Resident Name</th>
                    <th>Wing & Flat</th>
                    <th>Mobile Phone</th>
                    <th>Requested Role</th>
                    <th>Flat Dues Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map(u => (
                    <tr key={u.id}>
                      <td><strong style={{ color: 'var(--color-text)' }}>{u.name}</strong></td>
                      <td>{u.wing} ({u.flat})</td>
                      <td>{u.phone}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-amber' : (u.role === 'wing_captain' ? 'badge-cyan' : 'badge-violet')}`}>
                          {u.role === 'admin' ? 'SCOT Admin' : (u.role === 'wing_captain' ? 'Wing Captain' : 'SCOT Member')}
                        </span>
                      </td>
                      <td><span className="badge badge-amber">Unverified / Unpaid</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleReject(u.id, u.name)}
                            style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', backgroundColor: 'transparent' }}
                          >
                            Reject
                          </button>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApprove(u.id, u.name)}
                          >
                            <Check size={14} style={{ marginRight: '4px' }} /> Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-text-secondary)' }}>
              <Clock size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p style={{ fontWeight: 600 }}>No pending resident approvals!</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>All resident profiles have been verified and approved.</p>
            </div>
          )}
        </div>
      )}

      {/* Approved Member Directory Sub-Tab */}
      {activeSubTab === 'directory' && (
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
            Approved Active Directory ({approvedUsers.length})
          </h2>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Wing & Flat</th>
                  <th>Phone Number</th>
                  <th>Role</th>
                  <th>Contribution Status</th>
                  <th>Account Status</th>
                </tr>
              </thead>
              <tbody>
                {approvedUsers.map(u => (
                  <tr key={u.id}>
                    <td><strong style={{ color: 'var(--color-text)' }}>{u.name}</strong></td>
                    <td>{u.wing} ({u.flat})</td>
                    <td>{u.phone}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-amber' : (u.role === 'wing_captain' ? 'badge-cyan' : 'badge-violet')}`}>
                        {u.role === 'admin' ? 'SCOT Admin' : (u.role === 'wing_captain' ? 'Wing Captain' : 'SCOT Member')}
                      </span>
                    </td>
                    <td><span className="badge badge-green">PAID</span></td>
                    <td><span className="badge badge-green">APPROVED</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resident Messages / Help Desk Sub-Tab */}
      {activeSubTab === 'support' && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
              Help Desk & Support Queries ({supportMessages.length})
            </h2>
            <span className="badge badge-green">Inbox</span>
          </div>

          {supportMessages.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {supportMessages.map(msg => (
                <div key={msg.id} style={{ border: '1px solid var(--color-border)', borderRadius: '10px', padding: '1.25rem', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {msg.message}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      <span><strong>From:</strong> {msg.senderDetail}</span>
                      <span>&bull;</span>
                      <span><strong>Received:</strong> {msg.timestamp}</span>
                    </div>
                  </div>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDeleteMessage(msg.id)}
                    style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', backgroundColor: 'transparent', flexShrink: 0 }}
                  >
                    Clear Query
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-text-secondary)' }}>
              <Inbox size={48} style={{ margin: '0 auto 0.75rem', opacity: 0.3, color: 'var(--color-primary)' }} />
              <h3>Help Desk Inbox is Empty!</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Messages submitted by residents on the login screen will show up here for you to action.
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
