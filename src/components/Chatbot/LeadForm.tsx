'use client';
import { useState, useCallback, useRef } from 'react';
import styles from './Chatbot.module.css';
import api from '@/config/api';

// ── Top-20 international dial codes ─────────────────────────────────────────
const DIAL_CODES = [
    { code: '+91', country: 'IN', label: '🇮🇳 +91' },
    { code: '+1', country: 'US', label: '🇺🇸 +1' },
    { code: '+44', country: 'GB', label: '🇬🇧 +44' },
    { code: '+971', country: 'AE', label: '🇦🇪 +971' },
    { code: '+65', country: 'SG', label: '🇸🇬 +65' },
    { code: '+852', country: 'HK', label: '🇭🇰 +852' },
    { code: '+86', country: 'CN', label: '🇨🇳 +86' },
    { code: '+81', country: 'JP', label: '🇯🇵 +81' },
    { code: '+49', country: 'DE', label: '🇩🇪 +49' },
    { code: '+33', country: 'FR', label: '🇫🇷 +33' },
    { code: '+61', country: 'AU', label: '🇦🇺 +61' },
    { code: '+55', country: 'BR', label: '🇧🇷 +55' },
    { code: '+27', country: 'ZA', label: '🇿🇦 +27' },
    { code: '+82', country: 'KR', label: '🇰🇷 +82' },
    { code: '+7', country: 'RU', label: '🇷🇺 +7' },
    { code: '+966', country: 'SA', label: '🇸🇦 +966' },
    { code: '+234', country: 'NG', label: '🇳🇬 +234' },
    { code: '+62', country: 'ID', label: '🇮🇩 +62' },
    { code: '+60', country: 'MY', label: '🇲🇾 +60' },
    { code: '+39', country: 'IT', label: '🇮🇹 +39' },
] as const;

// ── Validation helpers ──────────────────────────────────────────────────────
const NAME_REGEX = /^[A-Za-z\s]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LeadFormProps {
    onClose: () => void;
    onSubmitSuccess: (message: string) => void;
}

type FieldName = 'full_name' | 'company_name' | 'website' | 'business_email' | 'contact_number';

export default function LeadForm({ onClose, onSubmitSuccess }: LeadFormProps) {
    const [formData, setFormData] = useState({
        full_name: '',
        company_name: '',
        website: '',
        business_email: '',
        contact_number: '',
    });
    const [dialCode, setDialCode] = useState('+91');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [serverError, setServerError] = useState('');
    const [warning, setWarning] = useState('');
    const isSubmitting = useRef(false);  // Double-submit lock

    // ── Per-field validation (called on blur + on change after touch) ────
    const validateField = useCallback((name: FieldName, value: string): string => {
        const v = value.trim();
        switch (name) {
            case 'full_name':
                if (!v) return 'Full Name is required';
                if (v.length < 2) return 'Minimum 2 characters';
                if (v.length > 100) return 'Maximum 100 characters';
                if (!NAME_REGEX.test(v)) return 'Only letters, spaces, hyphens, and apostrophes';
                return '';
            case 'company_name':
                if (!v) return 'Company Name is required';
                if (v.length < 2) return 'Minimum 2 characters';
                if (v.length > 150) return 'Maximum 150 characters';
                return '';
            case 'website':
                // Optional field
                return '';
            case 'business_email':
                if (!v) return 'Business Email is required';
                if (!EMAIL_REGEX.test(v)) return 'Enter a valid email address';
                return '';
            case 'contact_number': {
                if (!v) return 'Phone number is required';
                const digitsOnly = v.replace(/[\s\-()]/g, '');
                if (digitsOnly.length < 6 || digitsOnly.length > 15)
                    return 'Please enter 6–15 digits';
                return '';
            }
            default:
                return '';
        }
    }, []);

    // ── Validate all fields at once (for submit) ────────────────────────
    const validateAll = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};
        (Object.keys(formData) as FieldName[]).forEach(key => {
            const err = validateField(key, formData[key]);
            if (err) newErrors[key] = err;
        });
        setErrors(newErrors);
        // Mark all as touched
        const allTouched: Record<string, boolean> = {};
        Object.keys(formData).forEach(k => { allTouched[k] = true; });
        setTouched(allTouched);
        return Object.keys(newErrors).length === 0;
    }, [formData, validateField]);

    // ── Check if form is submittable (ONLY checks field errors + non-empty required) ──
    const isFormValid = (): boolean => {
        const requiredFields: FieldName[] = ['full_name', 'company_name', 'business_email', 'contact_number'];
        const hasEmptyFields = requiredFields.some(f => !formData[f].trim());
        const hasFieldErrors = Object.values(errors).some(err => !!err);

        return !hasEmptyFields && !hasFieldErrors && !loading;
    };

    // ── Handle change + live re-validation for ALL fields ──────────────
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'dialCode') {
            setDialCode(value);
            return;
        }

        let newValue = value;
        // Numeric-only enforcement for phone
        if (name === 'contact_number') {
            newValue = value.replace(/[^0-9]/g, '');
        }


        setFormData(prev => ({ ...prev, [name]: newValue }));

        // Clear server-level states when user starts typing
        setServerError('');
        if (name === 'business_email') setWarning('');

        // Perform real-time validation
        const err = validateField(name as FieldName, newValue);
        setErrors(prev => ({ ...prev, [name]: err }));

        // Mark as touched on change for immediate feedback
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    // ── Handle blur triggers validation (if not already handled) ────────
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (!touched[name]) {
            setTouched(prev => ({ ...prev, [name]: true }));
            const err = validateField(name as FieldName, value);
            setErrors(prev => ({ ...prev, [name]: err }));
        }
    };

    // ── Submit → trim, compose E.164, send ──────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Double-submit lock
        if (isSubmitting.current) return;
        if (!validateAll()) return;

        isSubmitting.current = true;
        setLoading(true);

        // Compose E.164 phone: dialCode + local digits
        // Smart strip: if user includes + or dialCode in the input, remove it
        let localDigits = formData.contact_number.replace(/[\s\-()+]/g, '');
        const cleanDialCode = dialCode.replace('+', '');
        if (localDigits.startsWith(cleanDialCode)) {
            localDigits = localDigits.substring(cleanDialCode.length);
        }

        const e164Phone = `${dialCode}${localDigits}`;

        // Trim all fields + add honeypot
        const payload = {
            full_name: formData.full_name.trim(),
            company_name: formData.company_name.trim(),
            website: formData.website.trim() || null,
            business_email: formData.business_email.trim().toLowerCase(),
            contact_number: e164Phone.trim(),
            hp_field: '',  // Honeypot — always empty from real users
        };

        try {
            const res = await api.post('/leads/submit', payload);
            const data = res.data;

            if (data.success) {
                // Handle soft warning from backend
                if (data.warning) {
                    setWarning(data.warning);
                    setLoading(false);
                    isSubmitting.current = false;
                    return;
                }

                setSuccess(true);
                setServerError('');
                setTimeout(() => {
                    onSubmitSuccess(data.message);
                    onClose();
                }, 2000);
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { status?: number; data?: { detail?: { message?: string } | Array<{ loc?: string[]; msg?: string }> } } };
            const status = axiosErr.response?.status;
            const data = axiosErr.response?.data;

            if (status === 409) {
                const detail = data?.detail;
                const detailMsg = !Array.isArray(detail) && typeof detail === 'object' && detail !== null
                    ? (detail as { message?: string }).message
                    : undefined;
                setServerError(detailMsg || 'This email has already been submitted.');
            } else if (status === 422) {
                const detail = data?.detail;
                if (Array.isArray(detail)) {
                    const fieldErrors: Record<string, string> = {};
                    detail.forEach((e: { loc?: string[]; msg?: string }) => {
                        const field = e.loc?.[e.loc.length - 1];
                        if (field && e.msg) fieldErrors[field] = e.msg;
                    });
                    setErrors(prev => ({ ...prev, ...fieldErrors }));
                } else {
                    const detailObj = typeof detail === 'object' && detail !== null
                        ? (detail as { message?: string }).message
                        : undefined;
                    setServerError(detailObj || 'Validation failed. Please check your inputs.');
                }
            } else if (status === 429) {
                setServerError('Too many requests. Please wait a moment and try again.');
            } else {
                console.error('[LeadSubmit] Submission error:', err);
                setServerError(err instanceof Error ? err.message : 'Submission failed');
            }
        } finally {
            setLoading(false);
            isSubmitting.current = false;
        }
    };

    // ── Success state ───────────────────────────────────────────────────
    if (success) {
        return (
            <div className={styles.systemMessage}>
                <div className={styles.successIcon}>✓</div>
                <h3 className={styles.successTitle}>Demo Request Submitted</h3>
                <p className={styles.successMsg}>
                    Thank you. Our team will contact you soon.
                </p>
            </div>
        );
    }

    // ── Form ────────────────────────────────────────────────────────────
    return (
        <div className={styles.inlineFormContainer}>
            <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>Book a Live Demo</h3>
            </div>

            <form onSubmit={handleSubmit} noValidate>
                {/* ── Honeypot (invisible to humans, traps bots) ─────────── */}
                <input
                    type="text"
                    name="hp_field"
                    style={{ display: 'none' }}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                />

                {/* ── Full Name ──────────────────────────────────────────── */}
                <div className={styles.formGroup}>
                    <label htmlFor="lead-full-name" className={styles.label}>
                        Full Name <span className={styles.required}>*</span>
                    </label>
                    <input
                        id="lead-full-name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`${styles.input} ${touched.full_name && errors.full_name ? styles.inputError : ''}`}
                        placeholder="e.g. John Doe"
                        maxLength={100}
                        aria-invalid={!!errors.full_name}
                        aria-describedby={errors.full_name ? 'err-full-name' : undefined}
                    />
                    {touched.full_name && errors.full_name && (
                        <span id="err-full-name" className={styles.errorHint} role="alert">{errors.full_name}</span>
                    )}
                </div>

                {/* ── Company Name ───────────────────────────────────────── */}
                <div className={styles.formGroup}>
                    <label htmlFor="lead-company" className={styles.label}>
                        Company Name <span className={styles.required}>*</span>
                    </label>
                    <input
                        id="lead-company"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`${styles.input} ${touched.company_name && errors.company_name ? styles.inputError : ''}`}
                        placeholder="Your Company"
                        maxLength={150}
                        aria-invalid={!!errors.company_name}
                        aria-describedby={errors.company_name ? 'err-company' : undefined}
                    />
                    {touched.company_name && errors.company_name && (
                        <span id="err-company" className={styles.errorHint} role="alert">{errors.company_name}</span>
                    )}
                </div>

                {/* ── Business Website (optional) ───────────────────────── */}
                <div className={styles.formGroup}>
                    <label htmlFor="lead-website" className={styles.label}>Business Website</label>
                    <input
                        id="lead-website"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="example.com"
                        maxLength={255}
                    />
                </div>

                {/* ── Business Email ─────────────────────────────────────── */}
                <div className={styles.formGroup}>
                    <label htmlFor="lead-email" className={styles.label}>
                        Business Email <span className={styles.required}>*</span>
                    </label>
                    <input
                        id="lead-email"
                        name="business_email"
                        type="email"
                        value={formData.business_email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`${styles.input} ${touched.business_email && errors.business_email ? styles.inputError : (warning ? styles.warningInput : '')}`}
                        placeholder="you@company.com"
                        maxLength={255}
                        aria-invalid={!!errors.business_email}
                        aria-describedby={errors.business_email ? 'err-email' : (warning ? 'warn-email' : undefined)}
                    />
                    {touched.business_email && errors.business_email && (
                        <span id="err-email" className={styles.errorHint} role="alert">{errors.business_email}</span>
                    )}
                    {warning && !errors.business_email && (
                        <span id="warn-email" className={styles.warningHint} role="alert">{warning}</span>
                    )}
                </div>

                {/* ── Phone Number (dial code + local) ──────────────────── */}
                <div className={styles.formGroup}>
                    <label htmlFor="lead-phone" className={styles.label}>
                        Phone Number <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.phoneRow}>
                        <select
                            name="dialCode"
                            value={dialCode}
                            onChange={handleChange}
                            className={styles.dialSelect}
                            aria-label="Country dial code"
                        >
                            {DIAL_CODES.map(dc => (
                                <option key={dc.code} value={dc.code}>{dc.label}</option>
                            ))}
                        </select>
                        <input
                            id="lead-phone"
                            name="contact_number"
                            type="tel"
                            value={formData.contact_number}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`${styles.input} ${styles.phoneInput} ${touched.contact_number && errors.contact_number ? styles.inputError : ''}`}
                            placeholder="9876543210"
                            maxLength={15}
                            aria-invalid={!!errors.contact_number}
                            aria-describedby={errors.contact_number ? 'err-phone' : undefined}
                        />
                    </div>
                    {touched.contact_number && errors.contact_number && (
                        <span id="err-phone" className={styles.errorHint} role="alert">{errors.contact_number}</span>
                    )}
                </div>

                {/* ── Server-level error ─────────────────────────────────── */}
                {serverError && (
                    <div className={styles.serverError} role="alert">{serverError}</div>
                )}

                {/* ── Submit Button ──────────────────────────────────────── */}
                <div className={styles.formFooter} style={{ marginTop: 16 }}>
                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={loading || !isFormValid()}
                        aria-busy={loading}
                    >
                        {loading ? (
                            <>
                                <span className={styles.spinner} aria-hidden="true" />
                                Submitting…
                            </>
                        ) : (
                            'Schedule Demo'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
