'use client';
import { useState } from 'react';
import styles from './Chatbot.module.css';

interface LeadFormProps {
    onClose: () => void;
    onSubmitSuccess: (message: string) => void;
    apiBase: string;
}

export default function LeadForm({ onClose, onSubmitSuccess, apiBase }: LeadFormProps) {
    const [formData, setFormData] = useState({
        full_name: '',
        company_name: '',
        website: '',
        business_email: '',
        contact_number: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [serverMessage, setServerMessage] = useState('');

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.full_name.trim()) newErrors.full_name = 'Full Name is required';
        if (!formData.company_name.trim()) newErrors.company_name = 'Company Name is required';
        if (!formData.website.trim()) newErrors.website = 'Business Website is required';
        if (!formData.business_email.trim()) {
            newErrors.business_email = 'Business Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.business_email)) {
            newErrors.business_email = 'Invalid email format';
        }
        if (!formData.contact_number.trim()) {
            newErrors.contact_number = 'Contact Number is required';
        } else if (!/^\d{10,}$/.test(formData.contact_number.replace(/\s/g, ''))) {
            newErrors.contact_number = 'Minimum 10 digits required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const res = await fetch(`${apiBase}/leads/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setSuccess(true);
                setServerMessage(data.message);
                setTimeout(() => {
                    onSubmitSuccess(data.message);
                    onClose();
                }, 2000);
            } else {
                throw new Error(data.message || 'Submission failed');
            }
        } catch (err: unknown) {
            setErrors({ server: err instanceof Error ? err.message : 'Submission failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (errors[e.target.name]) {
            setErrors(prev => {
                const updated = { ...prev };
                delete updated[e.target.name];
                return updated;
            });
        }
    };

    if (success) {
        return (
            <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                    <div className={styles.successState}>
                        <div className={styles.successIcon}>✓</div>
                        <h2 className={styles.successTitle}>Request Sent</h2>
                        <p className={styles.successMsg}>{serverMessage}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Book a Live Demo</h2>
                    <button className={styles.modalClose} onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
                <div className={styles.modalBody}>
                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Full Name <span className={styles.required}>*</span></label>
                            <input
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                                className={`${styles.input} ${errors.full_name ? styles.inputError : ''}`}
                                placeholder="e.g. John Doe"
                            />
                            {errors.full_name && <span className={styles.errorHint}>{errors.full_name}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Company / Business Profile <span className={styles.required}>*</span></label>
                            <input
                                name="company_name"
                                value={formData.company_name}
                                onChange={handleChange}
                                className={`${styles.input} ${errors.company_name ? styles.inputError : ''}`}
                                placeholder="Your Company Name"
                            />
                            {errors.company_name && <span className={styles.errorHint}>{errors.company_name}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Business Website <span className={styles.required}>*</span></label>
                            <input
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                className={`${styles.input} ${errors.website ? styles.inputError : ''}`}
                                placeholder="https://example.com"
                            />
                            {errors.website && <span className={styles.errorHint}>{errors.website}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Business Email <span className={styles.required}>*</span></label>
                            <input
                                name="business_email"
                                type="email"
                                value={formData.business_email}
                                onChange={handleChange}
                                className={`${styles.input} ${errors.business_email ? styles.inputError : ''}`}
                                placeholder="john@company.com"
                            />
                            {errors.business_email && <span className={styles.errorHint}>{errors.business_email}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Business Contact Number <span className={styles.required}>*</span></label>
                            <input
                                name="contact_number"
                                value={formData.contact_number}
                                onChange={handleChange}
                                className={`${styles.input} ${errors.contact_number ? styles.inputError : ''}`}
                                placeholder="+1 (555) 000-0000"
                            />
                            {errors.contact_number && <span className={styles.errorHint}>{errors.contact_number}</span>}
                        </div>

                        {errors.server && <div className={styles.errorHint} style={{ marginBottom: 12 }}>{errors.server}</div>}

                        <div className={styles.formFooter}>
                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={loading}
                            >
                                {loading ? 'Submitting...' : 'Schedule Demo'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
