const fs = require('fs');
const path = 'e:/antigravity/versovate/src/pages/billing/BillingInvoices.tsx';
let data = fs.readFileSync(path, 'utf8');

const newFunc = `    const handleDownloadPDF = async (invoice: Invoice) => {
        try {
            // Fetch invoice items
            const { data: items, error: itemsError } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id);
            if (itemsError) throw itemsError;
            
            // Fetch company bank settings dynamically
            const { data: settings } = await supabase.from('company_settings').select('*').eq('settings_key', 'billing_settings').single();
            const isIndianClient = invoice.client?.country === 'India';
            
            const bankDetails = isIndianClient 
                ? (settings?.indian_bank_details || {}) 
                : (settings?.intl_bank_details || {});

            const hasBankDetails = Object.keys(bankDetails).length > 0 && bankDetails.bankName;

            const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency || 'INR' });
            
            const html = \`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice - \${invoice.invoice_number}</title>
                <style>
                    body { 
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                        padding: 40px; 
                        color: #111827; 
                        line-height: 1.6; 
                        background: #fff;
                    }
                    .invoice-container { max-width: 850px; margin: auto; }
                    
                    /* Header Section */
                    .header-flex { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 50px; }
                    .header-left h1 { font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 16px 0; }
                    .meta-grid { display: grid; grid-template-columns: 120px 1fr; gap: 8px 16px; font-size: 13px; color: #4b5563; }
                    .meta-label { color: #8C8C8C; }
                    .meta-value { font-weight: 600; color: #111827; }
                    
                    .header-right { text-align: center; }
                    .v-logo { font-size: 42px; font-weight: 900; line-height: 1; letter-spacing: -2px; margin-bottom: 4px; }
                    .v-logo-brand { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }

                    /* Billed By / To Section */
                    .billing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 50px; font-size: 13px; }
                    .billing-col h4 { font-size: 14px; font-weight: 600; color: #6D28D9; margin: 0 0 12px 0; }
                    .billing-name { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 8px; }
                    .billing-address { color: #4b5563; max-width: 250px; margin-bottom: 12px; line-height: 1.5; }
                    .contact-grid { display: grid; grid-template-columns: 50px 1fr; gap: 4px; color: #4b5563; }
                    .contact-link { color: #3b82f6; text-decoration: none; }

                    /* Table Section */
                    table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                    th { 
                        background: #6D28D9; 
                        color: white; 
                        text-align: left; 
                        padding: 14px 16px; 
                        font-size: 13px; 
                        font-weight: 600; 
                    }
                    th.text-center { text-align: center; }
                    th.text-right { text-align: right; }
                    
                    td { 
                        padding: 16px; 
                        border-bottom: 1px solid #f3f4f6; 
                        font-size: 13px; 
                        vertical-align: top;
                    }
                    td.text-center { text-align: center; }
                    td.text-right { text-align: right; }
                    
                    .item-desc { font-weight: 600; color: #111827; margin-bottom: 4px; }
                    .item-note { color: #6b7280; font-size: 12px; }

                    /* Lower Section (Payment & Totals) */
                    .lower-grid { display: grid; grid-template-columns: 1fr 300px; gap: 40px; margin-bottom: 50px; }
                    
                    .payment-block h4 { font-size: 14px; font-weight: 600; color: #6D28D9; margin: 0 0 16px 0; }
                    .bank-grid { display: grid; grid-template-columns: 150px 1fr; gap: 12px 16px; font-size: 13px; }
                    .bank-label { color: #6b7280; }
                    .bank-value { font-weight: 600; color: #111827; }

                    .totals-block { font-size: 14px; }
                    .total-row { display: flex; justify-content: space-between; margin-bottom: 12px; color: #4b5563; }
                    .total-label { }
                    .total-value { font-weight: 600; color: #111827; }
                    .amount-due { 
                        display: flex; justify-content: space-between; 
                        margin-top: 20px; padding-top: 20px; 
                        border-top: 1px solid #e5e7eb; 
                        font-size: 18px; font-weight: 700; color: #111827; 
                    }

                    /* Footer */
                    .footer { text-align: left; margin-top: 40px; font-size: 12px; color: #6b7280; line-height: 1.6; }
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
                                <span class="meta-value">#\${invoice.invoice_number}</span>
                                
                                <span class="meta-label">Invoice Date</span>
                                <span class="meta-value" style="text-transform: uppercase;">\${new Date(invoice.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                
                                <span class="meta-label">Due Date</span>
                                <span class="meta-value" style="text-transform: uppercase;">\${new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                        </div>
                        <div class="header-right">
                            <div class="v-logo">Vi</div>
                            <div class="v-logo-brand">Versovate</div>
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
                            <div class="billing-name">\${invoice.client?.company_name || invoice.client?.name}</div>
                            <div class="billing-address">
                                \${invoice.client?.address || 'Address not provided'}
                            </div>
                            <div class="contact-grid">
                                <span>Email</span> <a href="mailto:\${invoice.client?.email}" class="contact-link">\${invoice.client?.email || 'N/A'}</a>
                                <span>Phone</span> <span>\${invoice.client?.phone || 'N/A'}</span>
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
                            \${items?.map(item => \`
                                <tr>
                                    <td>
                                        <div class="item-desc">\${item.description}</div>
                                        <div class="item-note">Create and send professional invoices. Use our unique features to collect payments faster.</div>
                                    </td>
                                    <td class="text-center" style="font-weight: 600;">\${item.quantity}</td>
                                    <td class="text-right" style="font-weight: 600;">\${formatter.format(item.unit_price).replace('.00', '')}</td>
                                    <td class="text-right" style="font-weight: 600;">\${formatter.format(item.total).replace('.00', '')}</td>
                                </tr>
                            \`).join('') || ''}
                        </tbody>
                    </table>

                    <!-- Payment Details & Totals -->
                    <div class="lower-grid">
                        
                        <!-- Left: Bank Details -->
                        <div class="payment-block">
                            \${hasBankDetails ? \`
                                <h4>Payment Method</h4>
                                <div class="bank-grid">
                                    <span class="bank-label">Bank Name</span>
                                    <span class="bank-value">\${bankDetails.bankName || ''}</span>
                                    
                                    <span class="bank-label">Account Holder Name</span>
                                    <span class="bank-value">\${bankDetails.accountHolder || ''}</span>
                                    
                                    <span class="bank-label">\${isIndianClient ? 'Account Number' : 'Account Number / IBAN'}</span>
                                    <span class="bank-value">\${bankDetails.accountNumber || ''}</span>
                                    
                                    <span class="bank-label">\${isIndianClient ? 'IFSC Code' : 'SWIFT Code'}</span>
                                    <span class="bank-value">\${isIndianClient ? bankDetails.ifsc : bankDetails.swift}</span>
                                    
                                    \${bankDetails.routingNumber ? \`
                                        <span class="bank-label">Routing Num</span>
                                        <span class="bank-value">\${bankDetails.routingNumber}</span>
                                    \` : ''}

                                    <span class="bank-label">Account Type</span>
                                    <span class="bank-value">\${bankDetails.accountType || ''}</span>
                                    
                                    \${bankDetails.branch ? \`
                                        <span class="bank-label">Branch Address</span>
                                        <span class="bank-value">\${bankDetails.branch}</span>
                                    \` : ''}
                                </div>
                            \` : \`
                                <h4>Payment Method</h4>
                                <div style="color: #6b7280; font-size: 13px;">No bank details configured in settings.</div>
                            \`}

                            <div style="margin-top: 40px;">
                                <h4 style="color: #6D28D9; margin-bottom: 8px;">Terms and Conditions</h4>
                                <div style="font-size: 13px; color: #4b5563;">
                                    \${invoice.terms_conditions || 'Please pay within 15 days from the date of invoice.'}
                                </div>
                            </div>
                        </div>

                        <!-- Right: Totals -->
                        <div class="totals-block">
                            <div class="total-row">
                                <span class="total-label">Sub Total</span>
                                <span class="total-value">\${formatter.format(invoice.subtotal).replace('.00', '')}</span>
                            </div>
                            <div class="total-row">
                                <span class="total-label">Discount(\${invoice.discount_amount > 0 ? 'Applied' : '0%'})</span>
                                <span class="total-value">\${formatter.format(invoice.discount_amount).replace('.00', '')}</span>
                            </div>
                            \${invoice.cgst_amount > 0 || invoice.sgst_amount > 0 || invoice.igst_amount > 0 ? \`
                                <div class="total-row">
                                    <span class="total-label">VAT(Tax)</span>
                                    <span class="total-value">\${formatter.format((invoice.cgst_amount || 0) + (invoice.sgst_amount || 0) + (invoice.igst_amount || 0)).replace('.00', '')}</span>
                                </div>
                            \` : \`
                                <div class="total-row">
                                    <span class="total-label">VAT(0%)</span>
                                    <span class="total-value">\${formatter.format(0)}</span>
                                </div>
                            \`}

                            <div class="amount-due">
                                <span>Amount Due</span>
                                <span>\${formatter.format(invoice.total_amount).replace('.00', '')}</span>
                            </div>
                        </div>

                    </div>

                    <!-- Footer Bar -->
                    <div class="footer-brand">
                        <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 18px;">
                            <span style="font-size: 24px; letter-spacing: -1px; line-height: 1;">Vi</span> Versovate
                        </div>
                        <div style="display: flex; gap: 24px; font-size: 12px; color: #4b5563;">
                            <span>info@versovate.com</span>
                            <span>www.versovate.com</span>
                            <span>+91 8123858571</span>
                        </div>
                    </div>

                </div>
                <script>
                    window.onload = () => { setTimeout(() => { window.print(); }, 500); }
                </script>
            </body>
            </html>
            \`;
            
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
            }
        } catch (err: any) {
            console.error('Failed to generate PDF', err);
            alert('Failed to load invoice items for printing.');
        }
    };`;

const lines = data.split('\n');
// Find start and end exactly
let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const handleDownloadPDF = async (invoice: Invoice) => {')) {
        start = i;
    }
    if (start !== -1 && lines[i].includes('alert(\'Failed to load invoice items for printing.\');') && lines[i + 2].includes('};')) {
        end = i + 2;
        break;
    }
}

if (start !== -1 && end !== -1) {
    lines.splice(start, end - start + 1, newFunc);
    fs.writeFileSync(path, lines.join('\n'));
    console.log('Successfully replaced handleDownloadPDF block.');
} else {
    console.log('Could not find start/end lines.', start, end);
}
