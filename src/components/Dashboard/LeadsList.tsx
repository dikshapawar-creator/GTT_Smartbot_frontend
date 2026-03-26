'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
    RefreshCw, History, Trash2, CheckCircle2, Clock, MapPin,
    Package, Building2, Search, ChevronLeft, ChevronRight,
    ArrowUpDown, ArrowUp, ArrowDown, Phone, Mail, Monitor
} from 'lucide-react';
import styles from './Dashboard.module.css';

import api from '@/config/api';
import { formatToIST } from '@/lib/time';
import { auth } from '@/lib/auth';
import { useCRMUpdates, CRMUpdateEvent } from '@/hooks/useCRMUpdates';
import { useTenant } from '@/context/TenantContext';

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
    source: string;
    version: number;
    // Visitor Metadata
    ip_address?: string;
    country?: string;
    city?: string;
    browser?: string;
    os?: string;
    device_type?: string;
    visitor_uuid?: string;
}

interface PaginatedResponse {
    total: number;
    page: number;
    limit: number;
    data: Lead[];
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
    'COMPLETE': ['IN_PROGRESS', 'CLOSED']
};

export default function LeadsList() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [totalLeads, setTotalLeads] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    // CRM Filter State
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('ALL');
    const [country] = useState('');
    const [tradeType, setTradeType] = useState('ALL');
    const [product] = useState('');
    const [source, setSource] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const { selectedTenantId, setSelectedTenantId } = useTenant();
    const [tenants, setTenants] = useState<{ id: number, name: string }[]>([]);

    // Pagination & Sorting State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // UI Overlay State
    const [historyLead, setHistoryLead] = useState<Lead | null>(null);
    const [historyData, setHistoryData] = useState<StatusHistory[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const isSuperAdmin = auth.getUser()?.is_super_admin || false;

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = {
                page,
                limit,
                sort_by: sortBy,
                sort_order: sortOrder
            };

            if (search) params.search = search;
            if (status !== 'ALL') params.status = status;
            if (country) params.country = country;
            if (tradeType !== 'ALL') params.trade_type = tradeType;
            if (product) params.product = product;
            if (source !== 'ALL') params.source = source;
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;
            if (isSuperAdmin && selectedTenantId) {
                params.target_tenant_id = selectedTenantId;
            }

            const response = await api.get<PaginatedResponse>('/leads/', { params });
            setLeads(response.data.data);
            setTotalLeads(response.data.total);
        } catch (error) {
            console.error('CRM Fetch Failed:', error);
        } finally {
            setLoading(false);
        }
    }, [page, limit, sortBy, sortOrder, search, status, country, tradeType, product, source, startDate, endDate, selectedTenantId, isSuperAdmin]);

    useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(() => {
            fetchLeads();
        }, 300); // Debounce search/filters
        return () => clearTimeout(timer);
    }, [fetchLeads]);

    // Fetch tenants for superadmin dropdown
    useEffect(() => {
        if (isSuperAdmin) {
            api.get('/admin/tenants').then(res => {
                // Adjust based on actual API response structure
                const data = Array.isArray(res.data) ? res.data : (res.data as { data: { id: number, name: string }[] }).data || [];
                setTenants(data);
            }).catch(err => console.error("Failed to fetch tenants:", err));
        }
    }, [isSuperAdmin]);

    // 🔄 Real-time lead updates
    useCRMUpdates((event: CRMUpdateEvent) => {
        if (['LEAD_CREATED', 'LEAD_UPDATED', 'LEAD_DELETED'].includes(event.type)) {
            console.log('📈 LeadsList received sync event:', event);
            fetchLeads();
        }
    });

    const handleStatusUpdate = async (lead: Lead, newStatus: string) => {
        if (lead.status === newStatus) return;
        try {
            await api.patch(`/leads/${lead.id}/status`, {
                status: newStatus,
                changed_by: 'crm_user',
                source: 'crm',
                version: lead.version
            });
            fetchLeads();
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Status update failed');
            fetchLeads();
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this lead? This action is permanent in the CRM.')) return;

        try {
            await api.delete(`/leads/${id}`);
            // Optimistic update
            setLeads(prev => prev.filter(l => l.id !== id));
            setTotalLeads(prev => prev - 1);
        } catch (error) {
            console.error('Delete Failed:', error);
            // @ts-expect-error: Axios error type is not explicitly imported or available
            const msg = error?.response?.data?.detail || 'Failed to delete lead. You may not have permission.';
            alert(msg);
            fetchLeads(); // Sync back
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

    const toggleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setPage(1); // Reset to first page on sort
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className={styles.leadsContainer}>
            <div className={styles.pageTitle}>
                <div>
                    <h1 className={styles.pageTitleText}>Enterprise Leads Management</h1>
                    <p className={styles.pageTitleSub}>Scalable CRM module for managing trade data and customer inquiries.</p>
                </div>
                <div className={styles.pageTitleActions}>
                    <Button variant="outline" size="sm" onClick={fetchLeads} className="gap-2">
                        <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} />
                        Sync Data
                    </Button>
                </div>
            </div>

            {/* ── Advanced Filter Bar ───────────────────────────────────── */}
            <div className={styles.filterBar}>
                <div className={`${styles.filterGroup} ${styles.searchBar}`}>
                    <label className={styles.filterLabel}>Global Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            className={`${styles.filterInput} pl-9`}
                            placeholder="Name, email, company, phone..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Lead Status</label>
                    <select className={styles.filterSelect} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                        <option value="ALL">All Status</option>
                        <option value="NEW">New</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="QUALIFIED">Qualified</option>
                        <option value="COMPLETE">Complete</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Trade Type</label>
                    <select className={styles.filterSelect} value={tradeType} onChange={(e) => { setTradeType(e.target.value); setPage(1); }}>
                        <option value="ALL">All Types</option>
                        <option value="IMPORT">Import</option>
                        <option value="EXPORT">Export</option>
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>Source</label>
                    <select className={styles.filterSelect} value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
                        <option value="ALL">All Sources</option>
                        <option value="chatbot">Chatbot</option>
                        <option value="website">Website</option>
                        <option value="api">API</option>
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>From Date</label>
                    <input type="date" className={styles.filterInput} value={startDate} max={today} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>To Date</label>
                    <input type="date" className={styles.filterInput} value={endDate} max={today} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
                </div>

                {isMounted && isSuperAdmin && (
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>Filter by Website</label>
                        <select
                            className={styles.filterSelect}
                            value={selectedTenantId || 'ALL'}
                            onChange={(e) => {
                                const val = e.target.value === 'ALL' ? null : parseInt(e.target.value, 10);
                                setSelectedTenantId(val);
                                setPage(1);
                            }}
                            style={{ borderColor: '#6366f1', borderWidth: '2px' }}
                        >
                            <option value="ALL">All Websites (Global)</option>
                            {tenants.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* ── Leads Table ─────────────────────────────────────────── */}
            <div className={styles.leadsCard}>
                <div className="overflow-x-auto">
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th onClick={() => toggleSort('name')} className={styles.sortableHeader}>
                                    Name/Company {sortBy === 'name' ? (sortOrder === 'asc' ? <ArrowUp size={12} className={styles.sortIcon} /> : <ArrowDown size={12} className={styles.sortIcon} />) : <ArrowUpDown size={12} className={styles.sortIcon} />}
                                </th>
                                <th>Contact Details</th>
                                <th>Trade Info</th>
                                <th>Location / Tech</th>
                                <th>Source</th>
                                <th>Status</th>
                                <th onClick={() => toggleSort('created_at')} className={styles.sortableHeader}>
                                    Created {sortBy === 'created_at' ? (sortOrder === 'asc' ? <ArrowUp size={12} className={styles.sortIcon} /> : <ArrowDown size={12} className={styles.sortIcon} />) : <ArrowUpDown size={12} className={styles.sortIcon} />}
                                </th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-20 text-slate-400">Loading enterprise data...</td></tr>
                            ) : leads.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-20 text-slate-400">No leads found matching your filters.</td></tr>
                            ) : leads.map((lead) => (
                                <tr key={lead.id}>
                                    <td>
                                        <div className={styles.tdStrong}>{lead.name || 'Anonymous'}</div>
                                        <div className={styles.tdSmall}><Building2 size={10} className="inline mr-1" /> {lead.company || '--'}</div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-1">
                                            <div className={styles.tdSmall}><Mail size={10} className="inline mr-1" /> {lead.email || 'N/A'}</div>
                                            <div className={styles.tdSmall}><Phone size={10} className="inline mr-1" /> {lead.phone || 'N/A'}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-1">
                                            <div className={styles.tdTagGroup}>
                                                {lead.trade_type && <span className={styles.tdTag}>{lead.trade_type}</span>}
                                                {lead.country_interested && <span className={styles.tdTag}><MapPin size={10} className="inline" /> {lead.country_interested}</span>}
                                            </div>
                                            <div className={styles.tdSmall}>{lead.product && <span><Package size={10} className="inline mr-1" /> {lead.product}</span>}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-1">
                                            <div className={styles.tdSmall}><MapPin size={10} className="inline mr-1" /> {lead.country || 'Unknown'}, {lead.city || ''}</div>
                                            <div className={styles.tdSmall} style={{ fontSize: '10px', color: '#64748b' }}>
                                                <Monitor size={10} className="inline mr-1" /> {lead.browser || 'Unknown'} / {lead.os || 'Unknown'}
                                            </div>
                                            <div className={styles.tdSmall} style={{ fontSize: '9px', opacity: 0.6 }}>{lead.ip_address}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 bg-slate-100 rounded-md">
                                            {lead.source}
                                        </span>
                                    </td>
                                    <td>
                                        <select
                                            className={`${styles.statusDropdown} ${styles[`status${lead.status}`] || styles.statusProgress}`}
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
                                        <div className={styles.tdSmall}>{formatToIST(lead.created_at)}</div>
                                    </td>
                                    <td>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => fetchHistory(lead)} title="View Audit Trail">
                                                <History size={15} />
                                            </Button>
                                            {(auth.getUser()?.role_level ?? 0) >= 2 && (
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(lead.id)} className="text-red-500 hover:bg-red-50" title="Delete">
                                                    <Trash2 size={15} />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination Footer ────────────────────────────────────── */}
                <div className={styles.pagination}>
                    <div className={styles.paginationInfo}>
                        Showing <b>{(page - 1) * limit + 1}</b> to <b>{Math.min(page * limit, totalLeads)}</b> of <b>{totalLeads}</b> leads
                    </div>
                    <div className={styles.paginationActions}>
                        <div className="flex items-center gap-2 mr-6">
                            <span className="text-xs text-slate-500">Rows per page:</span>
                            <select
                                className="text-xs border rounded p-1 bg-white"
                                value={limit}
                                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <button
                            className={styles.pageBtn}
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex gap-1">
                            {[...Array(Math.ceil(totalLeads / limit))].slice(0, 5).map((_, i) => (
                                <button
                                    key={i}
                                    className={`${styles.pageBtn} ${page === i + 1 ? styles.pageBtnActive : ''}`}
                                    onClick={() => setPage(i + 1)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            {Math.ceil(totalLeads / limit) > 5 && <span className="px-2">...</span>}
                        </div>
                        <button
                            className={styles.pageBtn}
                            disabled={page >= Math.ceil(totalLeads / limit)}
                            onClick={() => setPage(page + 1)}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
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
                                        Changed by {item.changed_by} via {item.source} • {formatToIST(item.changed_at)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
}
