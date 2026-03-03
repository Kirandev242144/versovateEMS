import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Building2, MapPin, Mail, Phone, Loader2, Edit2, X, Globe } from 'lucide-react';
import DataError from '../../components/DataError';

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
    "Afghanistan": "AFN", "Albania": "ALL", "Algeria": "DZD", "Andorra": "EUR", "Angola": "AOA", "Antigua and Barbuda": "XCD", "Argentina": "ARS", "Armenia": "AMD", "Australia": "AUD", "Austria": "EUR", "Azerbaijan": "AZN", "Bahamas": "BSD", "Bahrain": "BHD", "Bangladesh": "BDT", "Barbados": "BBD", "Belarus": "BYN", "Belgium": "EUR", "Belize": "BZD", "Benin": "XOF", "Bhutan": "BTN", "Bolivia": "BOB", "Bosnia and Herzegovina": "BAM", "Botswana": "BWP", "Brazil": "BRL", "Brunei": "BND", "Bulgaria": "BGN", "Burkina Faso": "XOF", "Burundi": "BIF", "Cabo Verde": "CVE", "Cambodia": "KHR", "Cameroon": "XAF", "Canada": "CAD", "Central African Republic": "XAF", "Chad": "XAF", "Chile": "CLP", "China": "CNY", "Colombia": "COP", "Comoros": "KMF", "Congo (Congo-Brazzaville)": "XAF", "Costa Rica": "CRC", "Croatia": "EUR", "Cuba": "CUP", "Cyprus": "EUR", "Czechia (Czech Republic)": "CZK", "Denmark": "DKK", "Djibouti": "DJF", "Dominica": "XCD", "Dominican Republic": "DOP", "Ecuador": "USD", "Egypt": "EGP", "El Salvador": "USD", "Equatorial Guinea": "XAF", "Eritrea": "ERN", "Estonia": "EUR", "Eswatini (fmr. 'Swaziland')": "SZL", "Ethiopia": "ETB", "Fiji": "FJD", "Finland": "EUR", "France": "EUR", "Gabon": "XAF", "Gambia": "GMD", "Georgia": "GEL", "Germany": "EUR", "Ghana": "GHS", "Greece": "EUR", "Grenada": "XCD", "Guatemala": "GTQ", "Guinea": "GNF", "Guinea-Bissau": "XOF", "Guyana": "GYD", "Haiti": "HTG", "Honduras": "HNL", "Hungary": "HUF", "Iceland": "ISK", "India": "INR", "Indonesia": "IDR", "Iran": "IRR", "Iraq": "IQD", "Ireland": "EUR", "Israel": "ILS", "Italy": "EUR", "Jamaica": "JMD", "Japan": "JPY", "Jordan": "JOD", "Kazakhstan": "KZT", "Kenya": "KES", "Kiribati": "AUD", "Kuwait": "KWD", "Kyrgyzstan": "KGS", "Laos": "LAK", "Latvia": "EUR", "Lebanon": "LBP", "Lesotho": "LSL", "Liberia": "LRD", "Libya": "LYD", "Liechtenstein": "CHF", "Lithuania": "EUR", "Luxembourg": "EUR", "Madagascar": "MGA", "Malawi": "MWK", "Malaysia": "MYR", "Maldives": "MVR", "Mali": "XOF", "Malta": "EUR", "Marshall Islands": "USD", "Mauritania": "MRU", "Mauritius": "MUR", "Mexico": "MXN", "Micronesia": "USD", "Moldova": "MDL", "Monaco": "EUR", "Mongolia": "MNT", "Montenegro": "EUR", "Morocco": "MAD", "Mozambique": "MZN", "Myanmar (formerly Burma)": "MMK", "Namibia": "NAD", "Nauru": "AUD", "Nepal": "NPR", "Netherlands": "EUR", "New Zealand": "NZD", "Nicaragua": "NIO", "Niger": "XOF", "Nigeria": "NGN", "North Korea": "KPW", "North Macedonia": "MKD", "Norway": "NOK", "Oman": "OMR", "Pakistan": "PKR", "Palau": "USD", "Palestine State": "ILS", "Panama": "PAB", "Papua New Guinea": "PGK", "Paraguay": "PYG", "Peru": "PEN", "Philippines": "PHP", "Poland": "PLN", "Portugal": "EUR", "Qatar": "QAR", "Romania": "RON", "Russia": "RUB", "Rwanda": "RWF", "Saint Kitts and Nevis": "XCD", "Saint Lucia": "XCD", "Saint Vincent and the Grenadines": "XCD", "Samoa": "WST", "San Marino": "EUR", "Sao Tome and Principe": "STN", "Saudi Arabia": "SAR", "Senegal": "XOF", "Serbia": "RSD", "Seychelles": "SCR", "Sierra Leone": "SLE", "Singapore": "SGD", "Slovakia": "EUR", "Slovenia": "EUR", "Solomon Islands": "SBD", "Somalia": "SOS", "South Africa": "ZAR", "South Korea": "KRW", "South Sudan": "SSP", "Spain": "EUR", "Sri Lanka": "LKR", "Sudan": "SDG", "Suriname": "SRD", "Sweden": "SEK", "Switzerland": "CHF", "Syria": "SYP", "Tajikistan": "TJS", "Tanzania": "TZS", "Thailand": "THB", "Timor-Leste": "USD", "Togo": "XOF", "Tonga": "TOP", "Trinidad and Tobago": "TTD", "Tunisia": "TND", "Turkey": "TRY", "Turkmenistan": "TMT", "Tuvalu": "AUD", "Uganda": "UGX", "Ukraine": "UAH", "United Arab Emirates": "AED", "United Kingdom": "GBP", "United States": "USD", "Uruguay": "UYU", "Uzbekistan": "UZS", "Vanuatu": "VUV", "Vatican City": "EUR", "Venezuela": "VES", "Vietnam": "VND", "Yemen": "YER", "Zambia": "ZMW", "Zimbabwe": "ZWL"
};

interface Client {
    id: string;
    name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    country: string;
    state_code: string | null;
    gstin: string | null;
    tax_id: string | null;
    currency: string;
    status: string;
    created_at: string;
}

const BillingClients = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        company_name: '',
        email: '',
        phone: '',
        address: '',
        country: 'India',
        state_code: '',
        gstin: '',
        tax_id: '',
        currency: 'INR',
        status: 'Active'
    });

    const fetchClients = async (retryCount = 0) => {
        try {
            if (retryCount === 0) setLoading(true);
            const timeoutId = setTimeout(() => {
                if (loading) {
                    setLoading(false);
                }
            }, 15000);

            const { data, error }: any = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            clearTimeout(timeoutId);

            if (error) throw error;
            setClients(data || []);
            setError('');
            setLoading(false);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch clients');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();

        const handleFocusRefresh = () => {
            console.log('[BillingClients] Auto-refreshing on window focus...');
            fetchClients(1);
        };
        window.addEventListener('versovate:refresh', handleFocusRefresh);

        // WebSocket Subscription with unique channel ID to prevent remount deadlocks
        const channel = supabase.channel(`clients-sync-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
                fetchClients(0);
            })
            .subscribe();

        return () => {
            window.removeEventListener('versovate:refresh', handleFocusRefresh);
            supabase.removeChannel(channel);
        };
    }, []);

    const handleOpenModal = (client?: Client) => {
        if (client) {
            setEditingClient(client);
            setFormData({
                name: client.name || '',
                company_name: client.company_name || '',
                email: client.email || '',
                phone: client.phone || '',
                address: client.address || '',
                country: client.country || 'India',
                state_code: client.state_code || '',
                gstin: client.gstin || '',
                tax_id: client.tax_id || '',
                currency: client.currency || 'INR',
                status: client.status || 'Active'
            });
        } else {
            setEditingClient(null);
            setFormData({
                name: '',
                company_name: '',
                email: '',
                phone: '',
                address: '',
                country: 'India',
                state_code: '',
                gstin: '',
                tax_id: '',
                currency: 'INR',
                status: 'Active'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setIsSaving(true);
        try {
            if (editingClient) {
                const { error } = await supabase
                    .from('clients')
                    .update({ ...formData })
                    .eq('id', editingClient.id);
                if (error) {
                    throw error;
                }
            } else {
                const { error } = await supabase
                    .from('clients')
                    .insert([{ ...formData }]);
                if (error) {
                    throw error;
                }
            }
            setIsModalOpen(false);
            fetchClients();
        } catch (err: any) {
            // Enhanced Error Handling for Schema Mismatches
            if (err.message?.includes('country') || err.message?.includes('currency')) {
                alert(`⚠️ DATABASE UPDATE REQUIRED ⚠️\n\nYour Supabase database is missing the 'country' and 'currency' columns required for international billing.\n\nPlease go to your Supabase SQL Editor and run:\n\nALTER TABLE public.clients ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';\nALTER TABLE public.clients ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';\nALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tax_id TEXT;`);
            } else {
                alert(`Error saving client: ${err.message}`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const filteredClients = clients.filter(c =>
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="employees-container">
            <div className="employees-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="header-left">
                    <h2 className="title-bold">Clients</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your billing recipients and GST details.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="btn-primary-v2"
                >
                    <Plus size={18} /> <span>New Client</span>
                </button>
            </div>

            <div className="employee-list-section card">
                <div className="list-header-bar">
                    <div className="search-bar-v2">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>{filteredClients.length} clients total</span>
                </div>

                <div className="table-responsive">
                    <table className="employees-table">
                        <thead>
                            <tr>
                                <th>CLIENT / COMPANY</th>
                                <th>CONTACT INFO</th>
                                <th>GSTIN / STATE</th>
                                <th>STATUS</th>
                                <th style={{ textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-primary)' }}>
                                        <Loader2 className="animate-spin" style={{ margin: '0 auto', marginBottom: '8px' }} />
                                        Loading clients...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '24px' }}>
                                        <DataError message={error} onRetry={() => fetchClients()} />
                                    </td>
                                </tr>
                            ) : filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        <Building2 size={48} style={{ margin: '0 auto', marginBottom: '12px', opacity: 0.5 }} />
                                        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>No clients found</p>
                                        <p style={{ fontSize: '14px', marginTop: '4px' }}>Click 'New Client' to add your first billing receiver.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map((client) => (
                                    <tr key={client.id} className="row-hover cursor-pointer" onClick={() => handleOpenModal(client)}>
                                        <td>
                                            <div className="user-profile-cell">
                                                <div className="user-avatar" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                    {client.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="user-info-v2">
                                                    <span className="user-name" style={{ fontWeight: 700 }}>{client.company_name || client.name}</span>
                                                    <span className="user-email-v2">{client.company_name ? client.name : 'Individual'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="user-info-v2 gap-1 text-sm color-muted">
                                                {client.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> {client.email}</div>}
                                                {client.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {client.phone}</div>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="user-info-v2 gap-1 text-sm color-muted">
                                                {(!client.country || client.country === 'India') ? (
                                                    <>
                                                        {client.gstin && <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{client.gstin}</div>}
                                                        {client.state_code && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> State: {client.state_code}</div>}
                                                        {!client.gstin && !client.state_code && <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Unregistered</span>}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                            <Globe size={14} /> {client.country}
                                                        </div>
                                                        {client.tax_id && <div>Tax ID: {client.tax_id}</div>}
                                                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Currency: {client.currency || 'USD'}</div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-pill-v3 ${client.status === 'Active' ? 'active' : 'inactive'}`}>
                                                {client.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                                <Edit2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modern Glass Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-v2" style={{ maxWidth: '640px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <Building2 style={{ color: 'var(--color-primary)' }} />
                                {editingClient ? 'Edit Client' : 'New Client'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="close-btn">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body custom-scrollbar">
                            <form id="client-form" onSubmit={handleSave} className="form-grid">

                                <div className="form-group grid-col-2">
                                    <label className="form-label">Contact Name *</label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="form-input" placeholder="John Doe" />
                                </div>

                                <div className="form-group grid-col-2">
                                    <label className="form-label">Company Name</label>
                                    <input type="text" value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} className="form-input" placeholder="Acme Corp LLC" />
                                </div>

                                <div className="form-group grid-col-1">
                                    <label className="form-label">Email Address</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="form-input" placeholder="billing@acme.com" />
                                </div>

                                <div className="form-group grid-col-1">
                                    <label className="form-label">Phone Number</label>
                                    <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="form-input" placeholder="+91 98765 43210" />
                                </div>

                                <div className="form-group grid-col-2">
                                    <label className="form-label">Billing Address</label>
                                    <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} rows={2} className="form-input" style={{ resize: 'none' }} placeholder="123 Tech Park, Phase 1..."></textarea>
                                </div>

                                <div className="form-group grid-col-1">
                                    <label className="form-label">Country</label>
                                    <select value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value, currency: COUNTRY_CURRENCY_MAP[e.target.value] || 'USD' })} className="form-input">
                                        {Object.keys(COUNTRY_CURRENCY_MAP).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group grid-col-1">
                                    <label className="form-label">Billing Currency</label>
                                    <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })} className="form-input">
                                        {Array.from(new Set(Object.values(COUNTRY_CURRENCY_MAP))).sort().map(cur => (
                                            <option key={cur as string} value={cur as string}>{cur as string}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group grid-col-2 pt-4 border-t" style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '12px' }}>
                                        {formData.country === 'India' ? 'GST & Tax Info' : 'International Tax Info'}
                                    </h4>
                                    <div className="form-grid">
                                        {formData.country === 'India' ? (
                                            <>
                                                <div className="form-group grid-col-1">
                                                    <label className="form-label">GSTIN</label>
                                                    <input type="text" value={formData.gstin} onChange={e => setFormData({ ...formData, gstin: e.target.value })} className="form-input" style={{ textTransform: 'uppercase' }} placeholder="29XXXXX1234X1X1" />
                                                </div>
                                                <div className="form-group grid-col-1">
                                                    <label className="form-label">State Code</label>
                                                    <select value={formData.state_code} onChange={e => setFormData({ ...formData, state_code: e.target.value })} className="form-input">
                                                        <option value="">Select State</option>
                                                        <option value="LD">01 - Ladakh</option>
                                                        <option value="HP">02 - Himachal Pradesh</option>
                                                        <option value="PB">03 - Punjab</option>
                                                        <option value="CH">04 - Chandigarh</option>
                                                        <option value="UT">05 - Uttarakhand</option>
                                                        <option value="HR">06 - Haryana</option>
                                                        <option value="DL">07 - Delhi</option>
                                                        <option value="RJ">08 - Rajasthan</option>
                                                        <option value="UP">09 - Uttar Pradesh</option>
                                                        <option value="BR">10 - Bihar</option>
                                                        <option value="SK">11 - Sikkim</option>
                                                        <option value="AR">12 - Arunachal Pradesh</option>
                                                        <option value="NL">13 - Nagaland</option>
                                                        <option value="MN">14 - Manipur</option>
                                                        <option value="MZ">15 - Mizoram</option>
                                                        <option value="TR">16 - Tripura</option>
                                                        <option value="ML">17 - Meghalaya</option>
                                                        <option value="AS">18 - Assam</option>
                                                        <option value="WB">19 - West Bengal</option>
                                                        <option value="JH">20 - Jharkhand</option>
                                                        <option value="OD">21 - Odisha</option>
                                                        <option value="CG">22 - Chhattisgarh</option>
                                                        <option value="MP">23 - Madhya Pradesh</option>
                                                        <option value="GJ">24 - Gujarat</option>
                                                        <option value="MH">27 - Maharashtra</option>
                                                        <option value="KA">29 - Karnataka</option>
                                                        <option value="GA">30 - Goa</option>
                                                        <option value="KL">32 - Kerala</option>
                                                        <option value="TN">33 - Tamil Nadu</option>
                                                        <option value="PY">34 - Puducherry</option>
                                                        <option value="AN">35 - Andaman & Nicobar</option>
                                                        <option value="TS">36 - Telangana</option>
                                                        <option value="AP">37 - Andhra Pradesh</option>
                                                        <option value="OS">97 - Other Territory</option>
                                                    </select>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="form-group grid-col-2">
                                                <label className="form-label">Tax ID / Registration Number</label>
                                                <input type="text" value={formData.tax_id} onChange={e => setFormData({ ...formData, tax_id: e.target.value })} className="form-input" placeholder="e.g. EIN, VAT Number, Business ID" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </form>
                        </div>

                        <div className="modal-footer">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary-v2">
                                Cancel
                            </button>
                            <button type="submit" form="client-form" disabled={isSaving} className="btn-primary-v2">
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
                                {editingClient ? 'Update Client' : 'Save Client'}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingClients;
