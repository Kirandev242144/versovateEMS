import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, CreditCard, Loader2, CheckCircle2, X } from 'lucide-react';
import DataError from '../../components/DataError';

interface Payment {
    id: string;
    invoice_id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_number: string | null;
    notes: string | null;
    invoices?: {
        invoice_number: string;
        total_amount: number;
        amount_paid: number;
        currency?: string;
        client?: { name: string; company_name: string | null };
    };
}

interface OutstandingInvoice {
    id: string;
    invoice_number: string;
    total_amount: number;
    amount_paid: number;
    currency?: string;
    client?: { name: string; company_name: string | null };
}

const BillingPayments = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        invoice_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Bank Transfer',
        reference_number: '',
        notes: ''
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const timeoutId = setTimeout(() => {
                if (loading) {
                    setLoading(false);
                }
            }, 15000);

            const [paymentsRes, invoicesRes]: any = await Promise.all([
                supabase.from('payments').select('*, invoices(invoice_number, total_amount, amount_paid, currency, client:clients(name, company_name))').order('payment_date', { ascending: false }),
                supabase.from('invoices').select('id, invoice_number, total_amount, amount_paid, currency, client:clients(name, company_name)').in('status', ['Sent', 'Partially Paid', 'Overdue']).order('issue_date', { ascending: false })
            ]);

            clearTimeout(timeoutId);

            if (paymentsRes.error) throw paymentsRes.error;
            if (invoicesRes.error) throw invoicesRes.error;

            setPayments(paymentsRes.data || []);
            setOutstandingInvoices((invoicesRes.data as any) || []);
            setError('');
        } catch (err: any) {
            console.error('Payments Fetch Error:', err);
            setError(err.message || 'Failed to fetch payments data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const handleFocusRefresh = () => {
            console.log('[BillingPayments] Auto-refreshing on window focus...');
            fetchData();
        };
        window.addEventListener('versovate:refresh', handleFocusRefresh);

        // WebSocket Subscription with unique channel ID to prevent remount deadlocks
        const channel = supabase.channel(`payments-sync-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            window.removeEventListener('versovate:refresh', handleFocusRefresh);
            supabase.removeChannel(channel);
        };
    }, []);

    const handleInvoiceSelect = (invId: string) => {
        const inv = outstandingInvoices.find(i => i.id === invId);
        if (inv) {
            const balance = inv.total_amount - (inv.amount_paid || 0);
            setFormData(prev => ({
                ...prev,
                invoice_id: invId,
                amount: balance.toString()
            }));
        } else {
            setFormData(prev => ({ ...prev, invoice_id: invId, amount: '' }));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.invoice_id) return alert('Please select an invoice');
        if (Number(formData.amount) <= 0) return alert('Payment amount must be greater than 0');

        setIsSaving(true);
        try {
            // 1. Record the Payment
            const { error: insertError } = await supabase
                .from('payments')
                .insert([{
                    invoice_id: formData.invoice_id,
                    amount: Number(formData.amount),
                    payment_date: formData.payment_date,
                    payment_method: formData.payment_method,
                    reference_number: formData.reference_number,
                    notes: formData.notes
                }]);

            if (insertError) throw insertError;

            // 2. Update the Invoice standing
            const invoice = outstandingInvoices.find(i => i.id === formData.invoice_id);
            if (invoice) {
                const newPaidAmount = (invoice.amount_paid || 0) + Number(formData.amount);
                const newStatus = newPaidAmount >= invoice.total_amount ? 'Paid' : 'Partially Paid';

                const { error: updateError } = await supabase
                    .from('invoices')
                    .update({
                        amount_paid: newPaidAmount,
                        status: newStatus
                    })
                    .eq('id', formData.invoice_id);

                if (updateError) throw updateError;
            }

            setIsModalOpen(false);
            setFormData({
                invoice_id: '',
                amount: '',
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: 'Bank Transfer',
                reference_number: '',
                notes: ''
            });
            fetchData();
        } catch (err: any) {
            alert(`Error recording payment: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredPayments = payments.filter(p =>
        p.invoices?.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.reference_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.invoices?.client?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.invoices?.client?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="employees-container">
            <div className="employees-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="header-left">
                    <h2 className="title-bold">Payments</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Record deposits and track invoice settlements.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary-v2"
                    style={{ backgroundColor: '#10B981' }}
                >
                    <Plus size={18} /> <span>Record Payment</span>
                </button>
            </div>

            <div className="employee-list-section card">
                <div className="list-header-bar">
                    <div className="search-bar-v2">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search payments by invoice or reference..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>{filteredPayments.length} recorded payments</span>
                </div>

                <div className="table-responsive">
                    <table className="employees-table">
                        <thead>
                            <tr>
                                <th style={{ width: '48px', textAlign: 'center' }}></th>
                                <th>DATE</th>
                                <th>INVOICE # & CLIENT</th>
                                <th>METHOD & REF</th>
                                <th>AMOUNT PAID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-primary)' }}>
                                        <Loader2 className="animate-spin" style={{ margin: '0 auto', marginBottom: '8px' }} />
                                        Loading payments...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '24px' }}>
                                        <DataError message={error} onRetry={fetchData} />
                                    </td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        <CreditCard size={48} style={{ margin: '0 auto', marginBottom: '12px', opacity: 0.5 }} />
                                        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>No payments found</p>
                                        <p style={{ fontSize: '14px', marginTop: '4px' }}>Click 'Record Payment' when a client settles a bill.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="row-hover">
                                        <td style={{ textAlign: 'center' }}>
                                            <CheckCircle2 color="#10B981" style={{ margin: '0 auto' }} size={20} />
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(payment.payment_date).toLocaleDateString()}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{payment.invoices?.invoice_number}</div>
                                            <div className="color-muted text-sm">{payment.invoices?.client?.company_name || payment.invoices?.client?.name}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{payment.payment_method}</div>
                                            <div className="color-muted text-sm uppercase">{payment.reference_number || 'No Ref'}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: '#10B981' }}>
                                                {new Intl.NumberFormat('en-IN', {
                                                    style: 'currency',
                                                    currency: payment.invoices?.currency || 'INR',
                                                }).format(payment.amount).replace('.00', '')}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Record Payment Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-v2" style={{ maxWidth: '640px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <CreditCard style={{ color: 'var(--color-primary)' }} />
                                Record Payment
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="close-btn">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body custom-scrollbar">
                            <form id="payment-form" onSubmit={handleSave} className="form-grid">

                                <div className="form-group grid-col-2">
                                    <label className="form-label">Apply Payment To Invoice *</label>
                                    <select required value={formData.invoice_id} onChange={e => handleInvoiceSelect(e.target.value)} className="form-input">
                                        <option value="">Select outstanding invoice...</option>
                                        {outstandingInvoices.map(inv => {
                                            const balance = inv.total_amount - (inv.amount_paid || 0);
                                            return (
                                                <option key={inv.id} value={inv.id}>
                                                    {inv.invoice_number} - {inv.client?.company_name || inv.client?.name} (Balance: ₹{balance.toLocaleString()})
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {outstandingInvoices.length === 0 && <p style={{ fontSize: '12px', color: '#FF9F1C', marginTop: '4px' }}>No outstanding invoices available to pay.</p>}
                                </div>

                                <div className="form-group grid-col-1">
                                    <label className="form-label">Payment Amount (₹) *</label>
                                    <input required type="number" min="1" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="form-input" style={{ fontWeight: 700, fontSize: '16px' }} />
                                </div>
                                <div className="form-group grid-col-1">
                                    <label className="form-label">Payment Date *</label>
                                    <input required type="date" value={formData.payment_date} onChange={e => setFormData({ ...formData, payment_date: e.target.value })} className="form-input" />
                                </div>

                                <div className="form-group grid-col-1">
                                    <label className="form-label">Payment Method *</label>
                                    <select required value={formData.payment_method} onChange={e => setFormData({ ...formData, payment_method: e.target.value })} className="form-input">
                                        <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Credit Card">Credit Card</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group grid-col-1">
                                    <label className="form-label">Reference Number</label>
                                    <input type="text" placeholder="Txn ID / UTR" value={formData.reference_number} onChange={e => setFormData({ ...formData, reference_number: e.target.value })} className="form-input" style={{ textTransform: 'uppercase' }} />
                                </div>

                                <div className="form-group grid-col-2">
                                    <label className="form-label">Internal Notes</label>
                                    <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="form-input" style={{ resize: 'none' }}></textarea>
                                </div>

                            </form>
                        </div>

                        <div className="modal-footer">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary-v2">
                                Cancel
                            </button>
                            <button type="submit" form="payment-form" disabled={isSaving || outstandingInvoices.length === 0} className="btn-primary-v2" style={{ backgroundColor: '#10B981' }}>
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
                                <span>Record Payment</span>
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingPayments;
