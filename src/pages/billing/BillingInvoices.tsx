import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, FileText, Loader2, Download, Trash2, X, Eye } from 'lucide-react';
import DataError from '../../components/DataError';

interface Client {
    id: string;
    name: string;
    company_name: string | null;
    email?: string;
    phone?: string;
    address?: string;
    state_code: string | null;
    country?: string;
    currency?: string;
}

interface InvoiceItem {
    id?: string;
    invoice_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface Invoice {
    id: string;
    invoice_number: string;
    client_id: string;
    issue_date: string;
    due_date: string;
    status: string;
    subtotal: number;
    discount_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    total_amount: number;
    amount_paid: number;
    currency: string;
    exchange_rate: number;
    total_inr_amount: number;
    notes: string | null;
    terms_conditions: string | null;
    created_at: string;
    client?: Client;
}

const BillingInvoices = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Invoice>>({
        client_id: '',
        invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Draft',
        subtotal: 0,
        discount_amount: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_amount: 0,
        currency: 'INR',
        exchange_rate: 1.0,
        total_inr_amount: 0,
        notes: 'Thank you for your business.',
        terms_conditions: 'Payment is due within 15 days.'
    });

    const [items, setItems] = useState<InvoiceItem[]>([
        { description: '', quantity: 1, unit_price: 0, total: 0 }
    ]);

    // Tax settings (Defaulting to 18% total tax for easy computation, user can override)
    const [autoTaxRate, setAutoTaxRate] = useState<number>(18);
    const [taxType, setTaxType] = useState<'intra' | 'inter' | 'none'>('intra'); // intra = CGST+SGST, inter = IGST, none = no tax

    const fetchData = async () => {
        try {
            setLoading(true);
            const timeoutId = setTimeout(() => {
                if (loading) {
                    setLoading(false);
                }
            }, 15000);

            const [invoicesRes, clientsRes]: any = await Promise.all([
                supabase.from('invoices').select('*, client:clients(id, name, company_name, email, phone, address, state_code, country, currency)').order('created_at', { ascending: false }),
                supabase.from('clients').select('id, name, company_name, email, phone, address, state_code, country, currency').order('name', { ascending: true })
            ]);

            clearTimeout(timeoutId);

            if (invoicesRes.error) throw invoicesRes.error;
            if (clientsRes.error) throw clientsRes.error;

            setInvoices(invoicesRes.data || []);
            setClients(clientsRes.data || []);
            setError('');
        } catch (err: any) {
            console.error('Invoice Fetch Error:', err);
            setError(err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const handleFocusRefresh = () => {
            console.log('[BillingInvoices] Auto-refreshing on window focus...');
            fetchData();
        };
        window.addEventListener('versovate:refresh', handleFocusRefresh);

        // WebSocket Subscription with unique channel ID to prevent remount deadlocks
        const channel = supabase.channel(`invoices-sync-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            window.removeEventListener('versovate:refresh', handleFocusRefresh);
            supabase.removeChannel(channel);
        };
    }, []);

    // Free Exchange Rate API
    const fetchExchangeRate = async (currency: string) => {
        if (!currency || currency === 'INR') return 1.0;
        try {
            const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`);
            const data = await res.json();
            if (data && data.rates && data.rates.INR) {
                return data.rates.INR;
            }
        } catch (e) {
            console.error('Failed to fetch exchange rate', e);
        }
        return 1.0;
    };

    // Recalculate Totals whenever items or taxes change
    useEffect(() => {
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const taxableAmount = Math.max(0, subtotal - (formData.discount_amount || 0));

        let cgst = 0, sgst = 0, igst = 0;
        const taxAmount = (taxableAmount * autoTaxRate) / 100;

        if (taxType === 'intra') {
            cgst = taxAmount / 2;
            sgst = taxAmount / 2;
            igst = 0;
        } else if (taxType === 'inter') {
            cgst = 0;
            sgst = 0;
            igst = taxAmount;
        } else {
            cgst = 0;
            sgst = 0;
            igst = 0;
        }

        const total = taxableAmount + cgst + sgst + igst;
        const exRate = formData.exchange_rate || 1.0;

        setFormData(prev => ({
            ...prev,
            subtotal: parseFloat(subtotal.toFixed(2)),
            cgst_amount: parseFloat(cgst.toFixed(2)),
            sgst_amount: parseFloat(sgst.toFixed(2)),
            igst_amount: parseFloat(igst.toFixed(2)),
            total_amount: Number(total.toFixed(2)),
            total_inr_amount: Math.round(total * exRate)
        }));
    }, [items, formData.discount_amount, autoTaxRate, taxType, formData.exchange_rate]);

    const handleOpenModal = () => {
        setFormData({
            client_id: '',
            invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'Draft',
            subtotal: 0, discount_amount: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, total_amount: 0,
            currency: 'INR', exchange_rate: 1.0, total_inr_amount: 0,
            notes: 'Thank you for your business.',
            terms_conditions: 'Payment is due within 15 days.'
        });
        setItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
        setIsModalOpen(true);
    };

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Auto calculate line total
        if (field === 'quantity' || field === 'unit_price') {
            newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
        }

        setItems(newItems);
    };

    const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.client_id) return alert('Please select a client');
        // filter out empty items
        const validItems = items.filter(i => i.description.trim() !== '' && i.total > 0);
        if (validItems.length === 0) return alert('Please add at least one valid item');

        setIsSaving(true);
        try {
            // 1. Insert Invoice
            const { data: invData, error: invError }: any = await supabase
                .from('invoices')
                .insert([{
                    ...formData,
                }])
                .select()
                .single();

            if (invError) throw invError;

            // 2. Insert Items
            const itemsToInsert = validItems.map(item => ({
                invoice_id: invData.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.total
            }));

            const { error: itemsError }: any = await supabase
                .from('invoice_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            if (err.message?.includes('country') || err.message?.includes('currency')) {
                alert(`⚠️ DATABASE UPDATE REQUIRED ⚠️\n\nYour Supabase database is missing the 'country' and 'currency' columns required for international billing.\n\nPlease go to your Supabase SQL Editor and run:\n\nALTER TABLE public.clients ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';\nALTER TABLE public.clients ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';\nALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tax_id TEXT;`);
            } else {
                alert(`Error saving invoice: ${err.message}`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadPDF = (invoice: Invoice) => generateInvoicePDF(invoice, false);
    const handlePreviewPDF = (invoice: Invoice) => generateInvoicePDF(invoice, true);

    const generateInvoicePDF = async (invoice: Invoice, preview: boolean = false) => {
        try {
            // Fetch invoice items
            const { data: items, error: itemsError } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id);
            if (itemsError) throw itemsError;

            // Fetch company bank settings dynamically
            const { data: settings } = await supabase.from('company_settings').select('*').eq('settings_key', 'billing_settings').single();

            const bankDetails = settings?.indian_bank_details || {};
            const hasBankDetails = Object.keys(bankDetails).length > 0 && bankDetails.bankName;

            const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency || 'INR' });

            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice - ${invoice.invoice_number}</title>
                <style>
                    body { 
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                        padding: 30px; 
                        color: #111827; 
                        line-height: 1.5; 
                        background: #fff;
                    }
                    .invoice-container { max-width: 850px; margin: auto; padding: 0 16px; }
                    
                    /* Header Section */
                    .header-flex { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
                    .header-left h1 { font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 12px 0; }
                    .meta-grid { display: grid; grid-template-columns: 120px 1fr; gap: 6px 16px; font-size: 13px; color: #4b5563; }
                    .meta-label { color: #8C8C8C; }
                    .meta-value { font-weight: 600; color: #111827; }
                    
                    .header-right { text-align: center; }
                    .v-logo { font-size: 42px; font-weight: 900; line-height: 1; letter-spacing: -2px; margin-bottom: 4px; }
                    .v-logo-brand { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }

                    /* Billed By / To Section */
                    .billing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; font-size: 13px; }
                    .billing-col h4 { font-size: 14px; font-weight: 600; color: #6D28D9; margin: 0 0 10px 0; }
                    .billing-name { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 6px; }
                    .billing-address { color: #4b5563; max-width: 250px; margin-bottom: 10px; line-height: 1.5; }
                    .contact-grid { display: grid; grid-template-columns: 50px 1fr; gap: 4px; color: #4b5563; }
                    .contact-link { color: #3b82f6; text-decoration: none; }

                    /* Table Section */
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { 
                        background: #6D28D9; 
                        color: white; 
                        text-align: left; 
                        padding: 10px 12px; 
                        font-size: 13px; 
                        font-weight: 600; 
                    }
                    th.text-center { text-align: center; }
                    th.text-right { text-align: right; }
                    
                    td { 
                        padding: 12px; 
                        border-bottom: 1px solid #f3f4f6; 
                        font-size: 13px; 
                        vertical-align: top;
                    }
                    td.text-center { text-align: center; }
                    td.text-right { text-align: right; }
                    
                    .item-desc { font-weight: 600; color: #111827; margin-bottom: 2px; }
                    .item-note { color: #6b7280; font-size: 12px; }

                    /* Lower Section (Payment & Totals) */
                    .lower-grid { display: grid; grid-template-columns: 1fr 300px; gap: 40px; margin-bottom: 30px; }
                    
                    .payment-block h4 { font-size: 14px; font-weight: 600; color: #6D28D9; margin: 0 0 12px 0; }
                    .bank-grid { display: grid; grid-template-columns: 150px 1fr; gap: 8px 16px; font-size: 13px; }
                    .bank-label { color: #6b7280; }
                    .bank-value { font-weight: 600; color: #111827; }

                    .totals-block { font-size: 14px; }
                    .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; color: #4b5563; }
                    .total-label { }
                    .total-value { font-weight: 600; color: #111827; }
                    .amount-due { 
                        display: flex; justify-content: space-between; 
                        margin-top: 16px; padding-top: 16px; 
                        border-top: 1px solid #e5e7eb; 
                        font-size: 18px; font-weight: 700; color: #111827; 
                    }

                    /* Footer */
                    .footer { text-align: left; margin-top: 30px; font-size: 12px; color: #6b7280; line-height: 1.6; }
                    .footer-brand { display: flex; align-items: center; justify-content: space-between; margin-top: 30px; font-size: 13px; color: #111827; }
                </style>
            </head>
            <body>
                <div class="invoice-container">
                    
                    <!-- Top Header -->
                    <div class="header-flex">
                        <div class="header-left">
                            <h1>Invoice</h1>
                            <div class="meta-grid">
                                <span class="meta-label">Invoice No.</span>
                                <span class="meta-value">#${invoice.invoice_number}</span>
                                
                                <span class="meta-label">Invoice Date</span>
                                <span class="meta-value" style="text-transform: uppercase;">${new Date(invoice.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                
                                <span class="meta-label">Due Date</span>
                                <span class="meta-value" style="text-transform: uppercase;">${new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                        </div>
                        <div class="header-right">
                            <img src="${window.location.origin}/assets/logo%20png.png" alt="Versovate Logo" style="height: 64px; width: auto; object-fit: contain;" />
                        </div>
                    </div>

                    <!-- Billed By & To -->
                    <div class="billing-grid">
                        <div class="billing-col">
                            <h4>Billed By</h4>
                            <div class="billing-name">Versovate Labs Pvt Ltd</div>
                            <div class="billing-address">
                                Dhanalakshmi Complex, 392, 7th Cross Rd, above lifecare medicals, Mico Layout, BTM 2nd Stage, BTM Layout, Bengaluru, Karnataka 560076
                            </div>
                            <div class="contact-grid">
                                <span>Email</span> <a href="mailto:info@versovate.com" class="contact-link">info@versovate.com</a>
                                <span>Phone</span> <span>+91 8123858571</span>
                            </div>
                        </div>
                        <div class="billing-col">
                            <h4>Billed To</h4>
                            <div class="billing-name">${invoice.client?.company_name || invoice.client?.name}</div>
                            <div class="billing-address">
                                ${invoice.client?.address || 'Address not provided'}
                            </div>
                            <div class="contact-grid">
                                <span>Email</span> <a href="mailto:${invoice.client?.email}" class="contact-link">${invoice.client?.email || 'N/A'}</a>
                                <span>Phone</span> <span>${invoice.client?.phone || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Line Items Table -->
                    <table>
                        <thead>
                            <tr>
                                <th>Service and description</th>
                                <th class="text-center" style="width: 80px;">Qty</th>
                                <th class="text-right" style="width: 120px;">Rate</th>
                                <th class="text-right" style="width: 120px;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items?.map(item => `
                                <tr>
                                    <td>
                                        <div class="item-desc">${item.description}</div>
                                        <div class="item-note">Create and send professional invoices. Use our unique features to collect payments faster.</div>
                                    </td>
                                    <td class="text-center" style="font-weight: 600;">${item.quantity}</td>
                                    <td class="text-right" style="font-weight: 600;">${formatter.format(item.unit_price).replace('.00', '')}</td>
                                    <td class="text-right" style="font-weight: 600;">${formatter.format(item.total).replace('.00', '')}</td>
                                </tr>
                            `).join('') || ''}
                        </tbody>
                    </table>

                    <!-- Payment Details & Totals -->
                    <div class="lower-grid">
                        
                        <!-- Left: Bank Details -->
                        <div class="payment-block">
                            ${hasBankDetails ? `
                                <h4>Payment Method</h4>
                                <div class="bank-grid">
                                    <span class="bank-label">Bank Name</span>
                                    <span class="bank-value">${bankDetails.bankName || ''}</span>
                                    
                                    <span class="bank-label">Account Holder Name</span>
                                    <span class="bank-value">${bankDetails.accountHolder || ''}</span>
                                    
                                    <span class="bank-label">Account Number</span>
                                    <span class="bank-value">${bankDetails.accountNumber || ''}</span>
                                    
                                    <span class="bank-label">IFSC Code</span>
                                    <span class="bank-value">${bankDetails.ifsc || ''}</span>

                                    <span class="bank-label">Account Type</span>
                                    <span class="bank-value">${bankDetails.accountType || ''}</span>
                                    
                                    ${bankDetails.branch ? `
                                        <span class="bank-label">Branch Address</span>
                                        <span class="bank-value">${bankDetails.branch}</span>
                                    ` : ''}
                                </div>
                            ` : ''}

                            <div style="margin-top: 24px;">
                                <h4 style="color: #6D28D9; margin-bottom: 6px;">Terms and Conditions</h4>
                                <div style="font-size: 12px; color: #4b5563;">
                                    ${invoice.terms_conditions || 'Please pay within 15 days from the date of invoice.'}
                                </div>
                            </div>
                        </div>

                        <!-- Right: Totals -->
                        <div class="totals-block">
                            <div class="total-row">
                                <span class="total-label">Sub Total</span>
                                <span class="total-value">${formatter.format(invoice.subtotal).replace('.00', '')}</span>
                            </div>
                            <div class="total-row">
                                <span class="total-label">Discount(${invoice.discount_amount > 0 ? 'Applied' : '0%'})</span>
                                <span class="total-value">${formatter.format(invoice.discount_amount).replace('.00', '')}</span>
                            </div>
                            ${invoice.cgst_amount > 0 || invoice.sgst_amount > 0 || invoice.igst_amount > 0 ? `
                                <div class="total-row">
                                    <span class="total-label">VAT(Tax)</span>
                                    <span class="total-value">${formatter.format((invoice.cgst_amount || 0) + (invoice.sgst_amount || 0) + (invoice.igst_amount || 0)).replace('.00', '')}</span>
                                </div>
                            ` : `
                                <div class="total-row">
                                    <span class="total-label">VAT(0%)</span>
                                    <span class="total-value">${formatter.format(0)}</span>
                                </div>
                            `}

                            <div class="amount-due">
                                <span>Amount Due</span>
                                <span>${formatter.format(invoice.total_amount).replace('.00', '')}</span>
                            </div>
                        </div>

                    </div>

                    <!-- Footer Bar -->
                    <div class="footer-brand">
                        <div style="display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 18px;">
                            <img src="${window.location.origin}/assets/logo%20png.png" alt="Logo" style="height: 32px; width: auto; object-fit: contain;" />
                            Versovate
                        </div>
                        <div style="display: flex; gap: 24px; font-size: 12px; color: #4b5563;">
                            <span>info@versovate.com</span>
                            <span>www.versovate.com</span>
                            <span>+91 8123858571</span>
                        </div>
                    </div>

                </div>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
                <script>
                    window.onload = () => { 
                        var element = document.querySelector('.invoice-container');
                        var opt = {
                            margin:       0.2,
                            filename:     'Invoice_${invoice.invoice_number}.pdf',
                            image:        { type: 'jpeg', quality: 0.98 },
                            html2canvas:  { scale: 2, useCORS: true },
                            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                        };
                        
                        if (${preview}) {
                            html2pdf().set(opt).from(element).toPdf().get('pdf').then(function (pdf) {
                                window.location.href = pdf.output('bloburl');
                            });
                        } else {
                            html2pdf().set(opt).from(element).save().then(() => {
                                setTimeout(() => { window.close(); }, 1000);
                            });
                        }
                    }
                </script>
            </body>
            </html>
            `;

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
            }
        } catch (err: any) {
            console.error('Failed to generate PDF', err);
            alert('Failed to load invoice items for printing.');
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        (inv.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.client?.company_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const StatusBadge = ({ status }: { status: string }) => {
        const getColors = () => {
            switch (status) {
                case 'Draft': return { bg: 'var(--bg-block)', color: 'var(--text-muted)' };
                case 'Sent': return { bg: 'rgba(56, 189, 248, 0.1)', color: '#0ea5e9' };
                case 'Paid': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981' };
                case 'Partially Paid': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' };
                case 'Overdue': return { bg: 'rgba(244, 63, 94, 0.1)', color: '#F43F5E' };
                case 'Cancelled': return { bg: 'var(--bg-block)', color: 'var(--text-muted)' };
                default: return { bg: 'var(--bg-block)', color: 'var(--text-muted)' };
            }
        };
        const colors = getColors();
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '4px 12px',
                borderRadius: '100px', fontSize: '12px', fontWeight: 600,
                backgroundColor: colors.bg, color: colors.color
            }}>
                {status}
            </span>
        );
    };

    return (
        <div className="employees-container">
            <div className="employees-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="header-left">
                    <h2 className="title-bold">Invoices</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Generate GST compliant invoices and track statuses.</p>
                </div>
                <button
                    onClick={handleOpenModal}
                    className="btn-primary-v2"
                >
                    <Plus size={18} /> <span>New Invoice</span>
                </button>
            </div>

            <div className="employee-list-section card">
                <div className="list-header-bar">
                    <div className="search-bar-v2">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search invoices..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>{filteredInvoices.length} invoices</span>
                </div>

                <div className="table-responsive">
                    <table className="employees-table">
                        <thead>
                            <tr>
                                <th>INVOICE DETAILS</th>
                                <th>CLIENT</th>
                                <th>DATES</th>
                                <th>AMOUNT</th>
                                <th>STATUS</th>
                                <th style={{ textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-primary)' }}>
                                        <Loader2 className="animate-spin" style={{ margin: '0 auto', marginBottom: '8px' }} />
                                        Loading invoices...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '24px' }}>
                                        <DataError message={error} onRetry={fetchData} />
                                    </td>
                                </tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        <FileText size={48} style={{ margin: '0 auto', marginBottom: '12px', opacity: 0.5 }} />
                                        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>No invoices yet</p>
                                        <p style={{ fontSize: '14px', marginTop: '4px' }}>Create your first invoice to get started.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="row-hover">
                                        <td>
                                            <span className="id-txt">{inv.invoice_number}</span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.client?.company_name || inv.client?.name}</div>
                                            <div className="color-muted text-sm">{inv.client?.company_name ? inv.client?.name : ''}</div>
                                        </td>
                                        <td>
                                            <div className="text-sm">
                                                <span className="color-muted">Issued: </span>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(inv.issue_date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-sm mt-0.5">
                                                <span className="color-muted">Due: </span>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(inv.due_date).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: inv.currency || 'INR' }).format(inv.total_amount)}
                                            </div>
                                            <div className="color-muted text-sm mt-0.5">
                                                Paid: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: inv.currency || 'INR' }).format(inv.amount_paid)}
                                            </div>
                                        </td>
                                        <td>
                                            <StatusBadge status={inv.status} />
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => handlePreviewPDF(inv)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Preview Invoice">
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => handleDownloadPDF(inv)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Download Invoice PDF">
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Full Screen Invoice Generator Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
                    <div className="modal-content-v2" style={{ maxWidth: '900px', width: '90vw', height: '90vh', display: 'flex', flexDirection: 'column' }}>

                        {/* Header */}
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <FileText style={{ color: 'var(--color-primary)' }} />
                                Create New Invoice
                            </h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="close-btn">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="modal-body custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
                            <form id="invoice-form" onSubmit={handleSave} className="form-grid">
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '32px', marginBottom: '32px' }}>

                                    {/* Left Column: Client & Details */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div className="form-group">
                                            <label className="form-label">Client *</label>
                                            <select
                                                required
                                                value={formData.client_id}
                                                onChange={async e => {
                                                    const cid = e.target.value;
                                                    const cli = clients.find(c => c.id === cid);

                                                    // Smart default tax routing
                                                    if (cli?.country && cli.country !== 'India') {
                                                        setTaxType('none');
                                                    } else if (cli?.state_code === 'KA') {
                                                        setTaxType('intra');
                                                    } else {
                                                        setTaxType('inter');
                                                    }

                                                    // Handle Currency Exchange
                                                    const cur = cli?.currency || 'INR';
                                                    let rate = 1.0;
                                                    if (cur !== 'INR') { rate = await fetchExchangeRate(cur); }

                                                    setFormData(prev => ({
                                                        ...prev,
                                                        client_id: cid,
                                                        currency: cur,
                                                        exchange_rate: rate
                                                    }));
                                                }}
                                                className="form-input"
                                            >
                                                <option value="">Select a client...</option>
                                                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
                                            </select>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div className="form-group">
                                                <label className="form-label">Issue Date *</label>
                                                <input type="date" value={formData.issue_date} onChange={e => setFormData({ ...formData, issue_date: e.target.value })} className="form-input" />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Due Date *</label>
                                                <input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} className="form-input" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Invoice Meta */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div className="form-group">
                                            <label className="form-label">Invoice Number *</label>
                                            <input type="text" value={formData.invoice_number} onChange={e => setFormData({ ...formData, invoice_number: e.target.value })} className="form-input" style={{ fontWeight: 600 }} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div className="form-group">
                                                <label className="form-label">Status</label>
                                                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="form-input">
                                                    <option value="Draft">Draft</option>
                                                    <option value="Sent">Sent</option>
                                                    <option value="Paid">Paid</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Currency</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className="badge-v2" style={{ background: 'var(--bg-block)', border: '1px solid var(--border-color)', height: '42px', display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: '8px', fontWeight: 600 }}>{formData.currency || 'INR'}</span>
                                                    {formData.currency !== 'INR' && (
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={formData.exchange_rate}
                                                            onChange={e => setFormData({ ...formData, exchange_rate: Number(e.target.value) })}
                                                            className="form-input"
                                                            placeholder="Rate"
                                                            title="Exchange Rate to INR"
                                                            style={{ padding: '8px', fontSize: '14px' }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                {/* Line Items Matrix */}
                                <div style={{ marginBottom: '40px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Line Items</h4>
                                    </div>

                                    <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                                        <table className="employees-table">
                                            <thead>
                                                <tr>
                                                    <th>Description</th>
                                                    <th style={{ width: '80px' }}>Qty</th>
                                                    <th style={{ width: '120px' }}>Rate (₹)</th>
                                                    <th style={{ width: '120px', textAlign: 'right' }}>Amount (₹)</th>
                                                    <th style={{ width: '48px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((item, index) => (
                                                    <tr key={index}>
                                                        <td style={{ padding: '8px' }}>
                                                            <input type="text" placeholder="Item description..." value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="form-input" style={{ border: 'none', background: 'transparent' }} />
                                                        </td>
                                                        <td style={{ padding: '8px' }}>
                                                            <input type="number" min="1" value={item.quantity || ''} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} className="form-input" style={{ border: 'none', background: 'transparent' }} />
                                                        </td>
                                                        <td style={{ padding: '8px' }}>
                                                            <input type="number" min="0" step="0.01" value={item.unit_price || ''} onChange={e => handleItemChange(index, 'unit_price', Number(e.target.value))} className="form-input" style={{ border: 'none', background: 'transparent' }} />
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                                                            {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                            <button type="button" onClick={() => removeItem(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} disabled={items.length === 1}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                                            <button type="button" onClick={addItem} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '4px 8px' }}>
                                                <Plus size={16} /> Add Line Item
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Calculation Matrix */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 400px)', gap: '32px' }}>
                                    {/* Left Notes */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div className="form-group">
                                            <label className="form-label">Notes</label>
                                            <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="form-input" style={{ resize: 'none' }}></textarea>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Terms & Conditions</label>
                                            <textarea value={formData.terms_conditions || ''} onChange={e => setFormData({ ...formData, terms_conditions: e.target.value })} rows={2} className="form-input" style={{ resize: 'none' }}></textarea>
                                        </div>
                                    </div>

                                    {/* Right Totals */}
                                    <div className="card" style={{ padding: '24px', alignSelf: 'start', minWidth: '300px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                                            <span style={{ fontWeight: 600, fontSize: '18px' }}>
                                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: formData.currency || 'INR' }).format(formData.subtotal || 0)}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Discount Factor (₹)</span>
                                            <input type="number" min="0" value={formData.discount_amount || ''} onChange={e => setFormData({ ...formData, discount_amount: Number(e.target.value) })} className="form-input" style={{ width: '100px', textAlign: 'right', padding: '4px 8px' }} />
                                        </div>

                                        <div style={{ margin: '16px 0', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Tax Setup</span>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <select value={taxType} onChange={e => setTaxType(e.target.value as 'intra' | 'inter' | 'none')} className="form-input" style={{ padding: '4px 8px', fontSize: '12px' }}>
                                                        <option value="intra">Intra-state (CGST+SGST)</option>
                                                        <option value="inter">Inter-state (IGST)</option>
                                                        <option value="none">Tax Exempt / Export</option>
                                                    </select>
                                                    <select value={autoTaxRate} onChange={e => setAutoTaxRate(Number(e.target.value))} className="form-input" style={{ padding: '4px 8px', fontSize: '12px', width: '70px' }} disabled={taxType === 'none'}>
                                                        <option value="0">0%</option>
                                                        <option value="5">5%</option>
                                                        <option value="12">12%</option>
                                                        <option value="18">18%</option>
                                                        <option value="28">28%</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {taxType === 'intra' ? (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '14px', color: 'var(--text-muted)' }}>
                                                        <span>CGST ({(autoTaxRate / 2)}%)</span>
                                                        <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: formData.currency || 'INR' }).format(formData.cgst_amount || 0)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '14px', color: 'var(--text-muted)' }}>
                                                        <span>SGST ({(autoTaxRate / 2)}%)</span>
                                                        <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: formData.currency || 'INR' }).format(formData.sgst_amount || 0)}</span>
                                                    </div>
                                                </>
                                            ) : taxType === 'inter' ? (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                                                    <span>IGST ({autoTaxRate}%)</span>
                                                    <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: formData.currency || 'INR' }).format(formData.igst_amount || 0)}</span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                                                    <span>Tax Exempt / Export</span>
                                                    <span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: formData.currency || 'INR' }).format(0)}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
                                                {formData.currency !== 'INR' && (
                                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>≈ ₹{(formData.total_inr_amount || 0).toLocaleString()} INR Base</span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-primary)' }}>
                                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: formData.currency || 'INR' }).format(formData.total_amount || 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </form>
                        </div>

                        {/* Footer */}
                        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary-v2">
                                Cancel
                            </button>
                            <button type="submit" form="invoice-form" disabled={isSaving} className="btn-primary-v2" style={{ padding: '12px 24px', fontSize: '15px' }}>
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                                <span>Generate Invoice</span>
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingInvoices;
