'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RefreshCw, History, Trash2, CheckCircle2, Clock, MapPin, Package, Building2 } from 'lucide-react';
import styles from './Dashboard.module.css';

import api from '@/config/api';

// ── Types ────────────────────────────────────────────────────────────────

interface Lead {
    id: string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    status: string;
    created_at: string;
    website?: string;
    trade_type?: string;
    country_interested?: string;
    product?: string;
    requirement_type?: string;
    version: number; // For Optimistic Locking
}

interface StatusHistory {
    id: string;
    old_status: string;
    new_status: string;
    changed_by: string;
    source: string;
    changed_at: string;
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    'NEW': ['IN_PROGRESS', 'CLOSED'],
    'IN_PROGRESS': ['QUALIFIED', 'CLOSED'],
    'QUALIFIED': ['CLOSED'],
    'CLOSED': ['IN_PROGRESS'],
    'COMPLETE': ['IN_PROGRESS', 'CLOSED'] // Handling legacy
};

// ── Component ────────────────────────────────────────────────────────────

export default function LeadsList() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    // UI State
    const [historyLead, setHistoryLead] = useState<Lead | null>(null);
    const [historyData, setHistoryData] = useState<StatusHistory[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const response = await api.get<Lead[]>('/leads/');
            const sortedLeads = [...response.data].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setLeads(sortedLeads);
        } catch (error) {
            console.error('Failed to fetch leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (lead: Lead, newStatus: string) => {
        if (lead.status === newStatus) return;

        try {
            await api.patch(`/leads/${lead.id}/status`, {
                status: newStatus,
                changed_by: 'crm_user',
                source: 'crm',
                version: lead.version // Optimistic locking
            });
            await fetchLeads(); // Refresh to get new version and status
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Status update failed');
            fetchLeads(); // Refresh on conflict
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/leads/${id}`);
            setLeads(prev => prev.filter(l => l.id !== id));
            setIsDeleting(null);
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Delete failed');
        }
    };

    const fetchHistory = async (lead: Lead) => {
        setHistoryLead(lead);
        setHistoryLoading(true);
        setHistoryData([]);
        try {
            const res = await api.get<StatusHistory[]>(`/leads/${lead.id}/history`);
            setHistoryData(res.data);
        } catch (error) {
            console.error('History failed:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const filteredLeads = leads.filter(lead =>
        filter === 'ALL' ? true : lead.status === filter
    );

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div className={styles.leadsContainer}>
            <div className={styles.pageTitle}>
                <div>
                    <h1 className={styles.pageTitleText}>Leads Management</h1>
                    <p className={styles.pageTitleSub}>Review and manage enterprise leads captured via SmartBot.</p>
                </div>
                <div className={styles.pageTitleActions}>
                    <Button variant="outline" size="sm" onClick={fetchLeads} className="gap-2">
                        <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} />
                        Refresh
                    </Button>
                    <select
                        className={styles.filterSelect}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="NEW">New</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="QUALIFIED">Qualified</option>
                        <option value="COMPLETE">Complete</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                </div>
            </div>

            <div className={styles.leadsCard}>
                {loading ? (
                    <div className={styles.loader}>Loading leads...</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Full Name</th>
                                <th>Company</th>
                                <th>Email/Contact</th>
                                <th>Trade Info</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.map((lead) => (
                                <tr key={lead.id}>
                                    <td className={styles.tdStrong}>{lead.name || 'Anonymous'}</td>
                                    <td>
                                        <div className={styles.tdText}><Building2 size={12} className="inline mr-1" /> {lead.company || '--'}</div>
                                        {lead.website && (
                                            <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className={styles.tdLink}>
                                                {lead.website}
                                            </a>
                                        )}
                                    </td>
                                    <td>
                                        <div className={styles.tdMuted}>{lead.email || 'No Email'}</div>
                                        <div className={styles.tdMuted}>{lead.phone || 'No Phone'}</div>
                                    </td>
                                    <td>
                                        <div className={styles.tdTagGroup}>
                                            {lead.trade_type && <span className={styles.tdTag}>{lead.trade_type}</span>}
                                            {lead.country_interested && <span className={styles.tdTag}><MapPin size={10} className="inline" /> {lead.country_interested}</span>}
                                        </div>
                                        <div className={styles.tdSmall}>
                                            {lead.product && <span><Package size={12} className="inline" /> {lead.product}</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <select
                                            className={`${styles.statusDropdown} ${lead.status === 'NEW' ? styles.statusNew :
                                                lead.status === 'QUALIFIED' ? styles.statusQualified :
                                                    lead.status === 'CLOSED' ? styles.statusClosed :
                                                        styles.statusProgress
                                                }`}
                                            value={lead.status}
                                            onChange={(e) => handleStatusUpdate(lead, e.target.value)}
                                        >
                                            <option value={lead.status}>{lead.status}</option>
                                            {ALLOWED_TRANSITIONS[lead.status]?.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className={styles.tdMuted}>
                                        <div className={styles.tdSmall}>{formatDate(lead.created_at)}</div>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => fetchHistory(lead)} title="View History">
                                                <History size={16} />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setIsDeleting(lead.id)} className="text-red-500 hover:text-red-700" title="Delete">
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Status History Modal ────────────────────────────────────── */}
            <Modal
                isOpen={!!historyLead}
                onClose={() => setHistoryLead(null)}
                title={`Audit Log: ${historyLead?.name}`}
            >
                {historyLoading ? (
                    <div className="p-8 text-center"><RefreshCw className="animate-spin inline mr-2" /> Loading history...</div>
                ) : historyData.length === 0 ? (
                    <div className="p-8 text-center text-text-muted">No history found for this lead.</div>
                ) : (
                    <div className={styles.historyTimeline}>
                        {historyData.map((item, idx) => (
                            <div key={item.id} className={styles.historyItem}>
                                <div className={styles.historyIcon}>
                                    {idx === 0 ? <CheckCircle2 size={16} className="text-green-500" /> : <Clock size={16} />}
                                </div>
                                <div className={styles.historyContent}>
                                    <div className={styles.historyTitle}>
                                        <span className="font-bold">{item.old_status}</span>
                                        <span className="mx-2">→</span>
                                        <span className="font-bold text-primary">{item.new_status}</span>
                                    </div>
                                    <div className={styles.historyMeta}>
                                        Changed by {item.changed_by} via {item.source} • {formatDate(item.changed_at)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            {/* ── Delete Confirmation ─────────────────────────────────────── */}
            <Modal
                isOpen={!!isDeleting}
                onClose={() => setIsDeleting(null)}
                title="Confirm Deletion"
            >
                <div className="p-4 text-center">
                    <Trash2 size={48} className="text-red-500 mx-auto mb-4" />
                    <p className="text-lg mb-6 text-text-primary">Are you sure you want to delete this lead? This action is reversible by administrators but will hide the lead from the dashboard.</p>
                    <div className="flex justify-center gap-4">
                        <Button variant="outline" onClick={() => setIsDeleting(null)}>Cancel</Button>
                        <Button variant="outline" className="bg-red-500 text-white border-red-500 hover:bg-red-600" onClick={() => isDeleting && handleDelete(isDeleting)}>Delete Lead</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
