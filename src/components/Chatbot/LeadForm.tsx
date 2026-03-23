'use client';
import { useState, useCallback, useRef } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import styles from './Chatbot.module.css';
import api from '@/config/api';

const NAME_REGEX = /^[A-Za-z\s\-'\.\u00C0-\u017F]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEBSITE_REGEX = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;

// ── Pure Logic Helpers ──

interface LeadFormProps {
    onClose: () => void;
    onSubmitSuccess: (message: string) => void;
    visitor_uuid?: string | null;
    initialData?: {
        full_name?: string;
        company_name?: string;
        business_email?: string;
        contact_number?: string;
        website?: string;
        status?: string;
    };
}

type FieldName = 'full_name' | 'company_name' | 'website' | 'business_email' | 'contact_number';

export default function LeadForm({ onSubmitSuccess, visitor_uuid, initialData }: LeadFormProps) {
    const [formData, setFormData] = useState({
        full_name: initialData?.full_name || '',
        company_name: initialData?.company_name || '',
        website: initialData?.website || '',
        business_email: initialData?.business_email || '',
        contact_number: initialData?.contact_number || '',
    });
    // const dialCode = '+91'; // Hardcoded for now, or you can use useState if you plan to update it later.
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
            case 'business_email':
                if (!v) return 'Business Email is required';
                if (!EMAIL_REGEX.test(v)) return 'Enter a valid email address';
                return '';
            case 'website':
                if (v && !WEBSITE_REGEX.test(v.replace(/^https?:\/\//, '').replace(/^www\./, ''))) {
                    return 'Please enter a valid domain (e.g. company.com)';
                }
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
    }, [formData.business_email]);

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

    const handlePhoneChange = (value: string) => {
        setFormData(prev => ({ ...prev, contact_number: value }));

        // Clear error when user changes phone
        if (errors.contact_number) {
            setErrors(prev => ({ ...prev, contact_number: '' }));
        }
    };

    // ── Check if form is submittable ──
    const isFormValid = (): boolean => {
        const requiredFields: FieldName[] = ['full_name', 'company_name', 'business_email', 'contact_number'];
        const hasEmptyFields = requiredFields.some(f => !formData[f].trim());
        const hasFieldErrors = Object.values(errors).some(err => !!err);

        return !hasEmptyFields && !hasFieldErrors && !loading;
    };

    // ── Handle change + live re-validation for ALL fields ──────────────
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        let newValue = value;
        // Numeric-only enforcement for phone
        if (name === 'contact_number') {
            newValue = value.replace(/[^0-9]/g, '');
        }


        setFormData(prev => ({ ...prev, [name]: newValue }));

        // Clear server-level states when user starts typing
        setServerError('');

        if (name === 'business_email') {
            setWarning('');
        }

        // Perform real-time validation
        const err = validateField(name as FieldName, newValue);
        setErrors(prev => ({ ...prev, [name]: err }));

        // If email changed, re-validate website because of conditional requirement
        if (name === 'business_email') {
            const webErr = validateField('website', formData.website);
            setErrors(prev => ({ ...prev, website: webErr }));
        }

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

        const e164Phone = formData.contact_number.startsWith('+')
            ? formData.contact_number
            : `+${formData.contact_number}`;

        // Trim all fields + add honeypot
        const payload = {
            full_name: formData.full_name.trim(),
            company_name: formData.company_name.trim(),
            website: formData.website.trim() || null,
            business_email: formData.business_email.trim().toLowerCase(),
            contact_number: e164Phone.trim(),
            visitor_uuid: visitor_uuid,
            hp_field: ((e.target as HTMLFormElement).elements.namedItem('hp_field') as HTMLInputElement)?.value || '',
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
                onSubmitSuccess(data.message);
                // We no longer call onClose() here because we want the form to stay in history
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
    if (success || initialData?.status === 'submitted') {
        return (
            <div className={styles.systemMessage}>
                <div className={styles.successIcon}>✓</div>
                <h3 className={styles.successTitle}>Lead Form Submitted</h3>
                <div className={styles.formSummaryDetails}>
                    <p><strong>Name:</strong> {formData.full_name}</p>
                    <p><strong>Email:</strong> {formData.business_email}</p>
                    <p><strong>Phone:</strong> {formData.contact_number}</p>
                    <p><strong>Company:</strong> {formData.company_name}</p>
                </div>
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

                {/* ── Business Website ───────────────────────────────────────── */}
                <div className={styles.formGroup}>
                    <label htmlFor="lead-website" className={styles.label}>
                        Business Website
                    </label>
                    <input
                        id="lead-website"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`${styles.input} ${touched.website && errors.website ? styles.inputError : ''}`}
                        placeholder="e.g. company.com"
                        maxLength={255}
                        aria-invalid={!!errors.website}
                        aria-describedby={errors.website ? 'err-website' : undefined}
                    />
                    {touched.website && errors.website && (
                        <span id="err-website" className={styles.errorHint} role="alert">{errors.website}</span>
                    )}
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

                {/* ── Phone Number ──────────────────── */}
                <div className={styles.formGroup}>
                    <label htmlFor="lead-phone" className={styles.label}>
                        Phone Number <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.phoneInputContainer}>
                        <PhoneInput
                            country={'in'}
                            value={formData.contact_number}
                            onChange={handlePhoneChange}
                            inputProps={{
                                id: 'lead-phone',
                                name: 'contact_number',
                                required: true,
                            }}
                            containerClass={styles.phoneContainer}
                            inputClass={styles.phoneControl}
                            buttonClass={styles.phoneButton}
                            dropdownClass={styles.phoneDropdown}
                            enableSearch={true}
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
