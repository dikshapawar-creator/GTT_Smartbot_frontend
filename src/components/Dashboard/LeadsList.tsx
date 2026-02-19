'use client';
import { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface Lead {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    status: 'NEW' | 'CONTACTED' | 'CLOSED';
    created_at: string;
    website?: string;
    country_interested?: string;
}

export default function LeadsList() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/leads`);
            const data = await res.json();
            // Sort by latest first
            const sortedLeads = data.sort((a: Lead, b: Lead) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setLeads(sortedLeads);
        } catch (error) {
            console.error('Failed to fetch leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLeads = leads.filter(lead =>
        filter === 'ALL' ? true : lead.status === filter
    );

    const formatDate = (dateStr: string, isUTC = false) => {
        const date = new Date(dateStr);
        if (isUTC) return date.toUTCString().split(' ').slice(0, 4).join(' ');
        return date.toLocaleString();
    };

    return (
        <div className={styles.leadsContainer}>
            <div className={styles.pageTitle}>
                <div>
                    <h1 className={styles.pageTitleText}>Leads Management</h1>
                    <p className={styles.pageTitleSub}>Review and manage enterprise leads captured via SmartBot.</p>
                </div>
                <div className={styles.pageTitleActions}>
                    <button className="btn btn-outline btn-sm" onClick={fetchLeads}>Refresh</button>
                    <select
                        className={styles.filterSelect}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="NEW">New</option>
                        <option value="CONTACTED">Contacted</option>
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
                                <th>Email</th>
                                <th>Contact</th>
                                <th>Status</th>
                                <th>Created (Local)</th>
                                <th>Created (UTC)</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.map((lead) => (
                                <tr key={lead.id}>
                                    <td className={styles.tdStrong}>{lead.name}</td>
                                    <td>{lead.company}</td>
                                    <td>{lead.email}</td>
                                    <td>{lead.phone}</td>
                                    <td>
                                        <span className={`badge ${lead.status === 'NEW' ? 'badge-accent' :
                                            lead.status === 'CONTACTED' ? 'badge-warning' : 'badge-success'
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className={styles.tdMuted}>{formatDate(lead.created_at)}</td>
                                    <td className={styles.tdMuted}>{formatDate(lead.created_at, true)}</td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm" title="View Details">Details</button>
                                    </td>
                                </tr>
                            ))}
                            {filteredLeads.length === 0 && (
                                <tr>
                                    <td colSpan={8} className={styles.noData}>No leads found for the selected filter.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
