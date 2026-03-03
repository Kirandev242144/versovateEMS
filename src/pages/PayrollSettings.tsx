import { useState, useEffect } from 'react';
import {
    Settings,
    Save,
    Info,
    ShieldCheck,
    Calculator,
    Percent,
    Banknote,
    ReceiptIndianRupee
} from 'lucide-react';
import { usePayrollSettings, calculateSalary } from '../hooks/usePayrollSettings';

const PayrollSettings = () => {
    const { settings: savedSettings, saving, saveSettings, loading } = usePayrollSettings();

    const [settings, setSettings] = useState({
        basicSalaryPercent: 50,
        hraPercent: 40,
        conveyance: 5000,
        medical: 5000,
        pfEnabled: true,
        pfPercent: 12,
        employerPfPercent: 12,
        pfLimit: 15000,
        professionalTax: 200,
        esiEnabled: false,
        workingDays: 26,
    });

    // Sync from DB when loaded
    useEffect(() => {
        if (!loading) {
            setSettings(prev => ({
                ...prev,
                basicSalaryPercent: savedSettings.basic_percent ?? prev.basicSalaryPercent,
                hraPercent: savedSettings.hra_percent ?? prev.hraPercent,
                conveyance: savedSettings.conveyance ?? prev.conveyance,
                medical: savedSettings.medical ?? prev.medical,
                pfPercent: savedSettings.pf_percent,
                employerPfPercent: savedSettings.employer_pf_percent,
                pfLimit: savedSettings.pf_limit,
                professionalTax: savedSettings.professional_tax,
                esiEnabled: savedSettings.esi_enabled ?? false,
                workingDays: savedSettings.working_days_per_month,
            }));
        }
    }, [loading, savedSettings]);

    const [saved, setSaved] = useState(false);
    const [demoGrossSalary, setDemoGrossSalary] = useState(50000);

    // Live sandbox — uses the shared pure calculateSalary()
    const demoResult = calculateSalary(
        demoGrossSalary,
        {
            basic_percent: settings.basicSalaryPercent,
            hra_percent: settings.hraPercent,
            conveyance: settings.conveyance,
            medical: settings.medical,
            pf_percent: settings.pfPercent,
            employer_pf_percent: settings.employerPfPercent,
            pf_limit: settings.pfLimit,
            professional_tax: settings.professionalTax,
            esi_enabled: settings.esiEnabled,
            working_days_per_month: settings.workingDays,
        }
    );

    const handleSave = async () => {
        const ok = await saveSettings({
            basic_percent: settings.basicSalaryPercent,
            hra_percent: settings.hraPercent,
            conveyance: settings.conveyance,
            medical: settings.medical,
            pf_percent: settings.pfPercent,
            employer_pf_percent: settings.employerPfPercent,
            pf_limit: settings.pfLimit,
            professional_tax: settings.professionalTax,
            esi_enabled: settings.esiEnabled,
            working_days_per_month: settings.workingDays,
        });
        if (ok) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    };

    return (
        <div className="settings-container">
            <header className="settings-header">
                <div className="header-left">
                    <div className="icon-badge">
                        <Settings size={20} />
                    </div>
                    <div className="title-box">
                        <h3>Payroll Settings</h3>
                        <p>Configure global rules and salary calculation logic</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className={`btn-save ${saved ? 'saved' : ''}`}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saved ? <ShieldCheck size={18} /> : <Save size={18} />}
                        {saving ? 'Saving…' : saved ? 'Settings Saved' : 'Save Changes'}
                    </button>
                </div>
            </header>

            <div className="settings-grid">
                {/* Left Column: Calculation Logic */}
                <div className="settings-section">
                    <div className="section-title">
                        <Calculator size={18} />
                        <h4>Earnings Configuration</h4>
                    </div>

                    <div className="card settings-card">
                        <div className="form-group">
                            <div className="label-row">
                                <label>Basic Salary %</label>
                                <Percent size={14} className="text-muted" />
                            </div>
                            <div className="input-with-symbol">
                                <input
                                    type="number"
                                    value={settings.basicSalaryPercent}
                                    onChange={(e) => setSettings({ ...settings, basicSalaryPercent: Number(e.target.value) })}
                                />
                                <span className="symbol">% of Gross</span>
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="label-row">
                                <label>HRA %</label>
                                <Percent size={14} className="text-muted" />
                            </div>
                            <div className="input-with-symbol">
                                <input
                                    type="number"
                                    value={settings.hraPercent}
                                    onChange={(e) => setSettings({ ...settings, hraPercent: Number(e.target.value) })}
                                />
                                <span className="symbol">% of Basic</span>
                            </div>
                        </div>

                        <div className="divider"></div>

                        <div className="form-group">
                            <div className="label-row">
                                <label>Conveyance Allowance</label>
                                <Banknote size={14} className="text-muted" />
                            </div>
                            <div className="input-with-symbol">
                                <span className="symbol-left">₹</span>
                                <input
                                    type="number"
                                    value={settings.conveyance}
                                    onChange={(e) => setSettings({ ...settings, conveyance: Number(e.target.value) })}
                                />
                                <span className="symbol">Monthly Fixed</span>
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="label-row">
                                <label>Medical Allowance</label>
                                <Banknote size={14} className="text-muted" />
                            </div>
                            <div className="input-with-symbol">
                                <span className="symbol-left">₹</span>
                                <input
                                    type="number"
                                    value={settings.medical}
                                    onChange={(e) => setSettings({ ...settings, medical: Number(e.target.value) })}
                                />
                                <span className="symbol">Monthly Fixed</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Statutory & Compliance */}
                <div className="settings-section">
                    <div className="section-title">
                        <ReceiptIndianRupee size={18} />
                        <h4>Statutory & Compliance</h4>
                    </div>

                    <div className="card settings-card">
                        <div className="form-group toggle-group">
                            <div className="toggle-info">
                                <label>Enable PF [ON/OFF]</label>
                                <p>Automatically calculate employee PF contributions</p>
                            </div>
                            <button
                                className={`toggle-switch ${settings.pfEnabled ? 'active' : ''}`}
                                onClick={() => setSettings({ ...settings, pfEnabled: !settings.pfEnabled })}
                            >
                                <div className="switch-handle"></div>
                            </button>
                        </div>

                        {settings.pfEnabled && (
                            <div className="animate-slide-down">
                                <div className="form-group">
                                    <div className="label-row">
                                        <label>PF %</label>
                                        <Percent size={14} className="text-muted" />
                                    </div>
                                    <div className="input-with-symbol">
                                        <input
                                            type="number"
                                            value={settings.pfPercent}
                                            onChange={(e) => setSettings({ ...settings, pfPercent: Number(e.target.value) })}
                                        />
                                        <span className="symbol">% of Basic</span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <div className="label-row">
                                        <label>Employer PF %</label>
                                        <Percent size={14} className="text-muted" />
                                    </div>
                                    <div className="input-with-symbol">
                                        <input
                                            type="number"
                                            value={settings.employerPfPercent}
                                            onChange={(e) => setSettings({ ...settings, employerPfPercent: Number(e.target.value) })}
                                        />
                                        <span className="symbol">% of Basic</span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <div className="label-row">
                                        <label>PF Wage Limit (Shared Cap)</label>
                                        <Info size={14} className="text-muted" />
                                    </div>
                                    <div className="input-with-symbol">
                                        <span className="symbol-left">₹</span>
                                        <input
                                            type="number"
                                            value={settings.pfLimit}
                                            onChange={(e) => setSettings({ ...settings, pfLimit: Number(e.target.value) })}
                                        />
                                        <span className="symbol">Max Cap</span>
                                    </div>
                                    <p className="field-hint">Note: Standard rule is {settings.pfPercent}% up to ₹{settings.pfLimit.toLocaleString()}.</p>
                                </div>
                            </div>
                        )}

                        <div className="divider"></div>

                        <div className="form-group">
                            <div className="label-row">
                                <label>Professional Tax (PT)</label>
                                <ReceiptIndianRupee size={14} className="text-muted" />
                            </div>
                            <div className="input-with-symbol">
                                <span className="symbol-left">₹</span>
                                <input
                                    type="number"
                                    value={settings.professionalTax}
                                    onChange={(e) => setSettings({ ...settings, professionalTax: Number(e.target.value) })}
                                />
                                <span className="symbol">Fixed State Tax</span>
                            </div>
                        </div>
                    </div>

                    <div className="alert-box">
                        <Info size={18} />
                        <p>These settings are applied globally to all new salary generation cycles. Existing payslips are not affected.</p>
                    </div>
                </div>

                {/* Bottom Row (Full Width): Live Sandbox Calculator */}
                <div className="sandbox-section" style={{ gridColumn: '1 / -1' }}>
                    <div className="sandbox-header">
                        <div className="flex align-center gap-12">
                            <div className="sandbox-icon-wrap bg-purple-light">
                                <Banknote size={20} className="text-purple" />
                            </div>
                            <div>
                                <h4 className="sandbox-title">Live Calculation Sandbox</h4>
                                <p className="sandbox-subtitle">Instantly preview how current rules affect an employee's payslip.</p>
                            </div>
                        </div>
                        <div className="sandbox-input-box">
                            <span className="si-label">Target Gross (₹)</span>
                            <div className="si-wrapper">
                                <span className="si-symbol">₹</span>
                                <input
                                    type="number"
                                    className="si-field"
                                    value={demoGrossSalary}
                                    onChange={(e) => setDemoGrossSalary(Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="sandbox-body">
                        <div className="sb-card">
                            <div className="sb-header text-success">
                                <h5>Earnings</h5>
                            </div>
                            <div className="sb-list">
                                <div className="sb-row"><span className="sb-lbl">Basic ({settings.basicSalaryPercent}% of Gross)</span><span className="sb-val">₹{demoResult.basic.toLocaleString('en-IN')}</span></div>
                                <div className="sb-row"><span className="sb-lbl">HRA ({settings.hraPercent}% of Basic)</span><span className="sb-val">₹{demoResult.hra.toLocaleString('en-IN')}</span></div>
                                <div className="sb-row"><span className="sb-lbl">Conveyance (Fixed)</span><span className="sb-val">₹{demoResult.conveyance.toLocaleString('en-IN')}</span></div>
                                <div className="sb-row"><span className="sb-lbl">Medical (Fixed)</span><span className="sb-val">₹{demoResult.medical.toLocaleString('en-IN')}</span></div>
                                <div className="sb-row"><span className="sb-lbl">Other Allowances</span><span className="sb-val">₹{demoResult.other_allowances.toLocaleString('en-IN')}</span></div>
                            </div>
                            <div className="sb-total flex-between">
                                <span>Total Earnings</span>
                                <span>₹{demoResult.gross.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <div className="sb-card">
                            <div className="sb-header text-danger">
                                <h5>Deductions</h5>
                            </div>
                            <div className="sb-list">
                                <div className="sb-row"><span className="sb-lbl">Employee PF ({settings.pfPercent}%)</span><span className="sb-val">₹{demoResult.pf_employee.toLocaleString('en-IN')}</span></div>
                                <div className="sb-row"><span className="sb-lbl">Employer PF ({settings.employerPfPercent}%)</span><span className="sb-val">₹{demoResult.pf_employer.toLocaleString('en-IN')}</span></div>
                                <div className="sb-row"><span className="sb-lbl">EPF (Combined)</span><span className="sb-val" style={{ color: '#6232FF', fontWeight: 900 }}>₹{demoResult.epf_display.toLocaleString('en-IN')}</span></div>
                                {settings.esiEnabled && (
                                    <div className="sb-row"><span className="sb-lbl">ESI (0.75%)</span><span className="sb-val">₹{demoResult.esi_employee.toLocaleString('en-IN')}</span></div>
                                )}
                                <div className="sb-row"><span className="sb-lbl">Professional Tax (PT)</span><span className="sb-val">₹{demoResult.professional_tax.toLocaleString('en-IN')}</span></div>
                                <div className="sb-row"><span className="sb-lbl">Loss of Pay (Demo)</span><span className="sb-val text-muted">₹0</span></div>
                            </div>
                            <div className="sb-total total-deductions flex-between mt-auto">
                                <span>Total Deductions</span>
                                <span>₹{demoResult.total_deductions.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <div className="sb-net-card flex-center flex-column">
                            <span className="sn-lbl">Net Take Home Salary</span>
                            <span className="sn-val text-primary">₹{demoResult.net_salary.toLocaleString('en-IN')}</span>
                            <span className="sn-sub">Per Month</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .settings-container {
           padding: 40px;
           background: var(--bg-main);
           min-height: calc(100vh - var(--header-height));
        }

        .settings-header {
           display: flex;
           justify-content: space-between;
           align-items: center;
           margin-bottom: 40px;
        }

        .header-left { display: flex; align-items: center; gap: 16px; }
        .icon-badge {
           width: 44px;
           height: 44px;
           background: var(--color-primary-light);
           color: var(--color-primary);
           border-radius: 12px;
           display: flex;
           align-items: center;
           justify-content: center;
        }
        .title-box h3 { font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }
        .title-box p { font-size: 13px; color: var(--text-muted); margin: 2px 0 0 0; }

        .btn-save {
           display: flex;
           align-items: center;
           gap: 10px;
           padding: 12px 24px;
           background: var(--color-primary);
           color: var(--text-on-primary);
           border: none;
           border-radius: 12px;
           font-size: 14px;
           font-weight: 700;
           cursor: pointer;
           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-save:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(98, 50, 255, 0.2); }
        .btn-save.saved { background: #10B981; }

        .settings-grid {
           display: grid;
           grid-template-columns: 1fr 1fr;
           gap: 40px;
           max-width: 1200px;
           margin: 0 auto;
        }

        .section-title {
           display: flex;
           align-items: center;
           gap: 12px;
           color: var(--text-primary);
           margin-bottom: 24px;
        }
        .section-title h4 { font-size: 16px; font-weight: 700; margin: 0; }

        .settings-card { padding: 32px; background: var(--bg-card); }

        .form-group { margin-bottom: 24px; }
        .form-group:last-child { margin-bottom: 0; }

        .label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .label-row label { font-size: 13px; font-weight: 700; color: var(--text-secondary); }

        .input-with-symbol {
           position: relative;
           display: flex;
           align-items: center;
        }

        .input-with-symbol input {
           width: 100%;
           padding: 12px 140px 12px 16px;
           background: var(--bg-block);
           border: 1px solid var(--border-color);
           border-radius: 12px;
           font-size: 15px;
           font-weight: 600;
           outline: none;
           transition: all 0.2s;
           color: var(--text-primary);
        }

        .input-with-symbol input:focus { background: var(--bg-card); border-color: var(--color-primary); box-shadow: 0 0 0 4px var(--color-primary-light); }

        .symbol {
           position: absolute;
           right: 16px;
           font-size: 12px;
           font-weight: 700;
           color: var(--text-muted);
           background: var(--bg-card);
           padding: 4px 8px;
           border-radius: 6px;
        }

        .symbol-left {
           position: absolute;
           left: 16px;
           font-size: 14px;
           font-weight: 700;
           color: var(--text-secondary);
        }

        .input-with-symbol .symbol-left + input { padding-left: 36px; }

        .divider { height: 1px; background: var(--border-color); margin: 24px 0; }

        .toggle-group {
           display: flex;
           justify-content: space-between;
           align-items: center;
        }
        .toggle-info label { font-size: 14px; font-weight: 700; color: var(--text-primary); display: block; }
        .toggle-info p { font-size: 12px; color: var(--text-muted); margin: 4px 0 0 0; }

        .toggle-switch {
           width: 50px;
           height: 26px;
           background: var(--bg-muted);
           border-radius: 20px;
           padding: 3px;
           border: none;
           cursor: pointer;
           transition: all 0.3s;
           position: relative;
        }
        .toggle-switch.active { background: var(--color-primary); }
        .switch-handle {
           width: 20px;
           height: 20px;
           background: white;
           border-radius: 50%;
           transition: all 0.3s;
           transform: translateX(0);
        }
        .toggle-switch.active .switch-handle { transform: translateX(24px); }

        .field-hint { font-size: 12px; color: var(--text-muted); margin-top: 8px; }

        .alert-box {
           margin-top: 24px;
           padding: 20px;
           background: var(--color-primary-light);
           border-radius: 16px;
           display: flex;
           gap: 16px;
           color: var(--color-primary);
           border: 1px solid var(--border-color);
        }
        .alert-box p { font-size: 13px; line-height: 1.6; margin: 0; }

        .animate-slide-down {
           animation: slideDown 0.3s ease-out;
           overflow: hidden;
        }

        @keyframes slideDown {
           from { opacity: 0; max-height: 0; transform: translateY(-10px); }
           to { opacity: 1; max-height: 200px; transform: translateY(0); }
        }

        /* Sandbox Styles */
        .sandbox-section {
            background: var(--bg-card);
            border-radius: 24px;
            padding: 30px;
            border: 1px solid var(--border-color);
            margin-top: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.02);
        }
        
        .sandbox-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px dashed var(--border-color);
            flex-wrap: wrap;
            gap: 20px;
        }

        .flex { display: flex; }
        .flex-between { display: flex; justify-content: space-between; align-items: center; }
        .flex-center { display: flex; justify-content: center; align-items: center; }
        .flex-column { flex-direction: column; }
        .align-center { align-items: center; }
        .gap-12 { gap: 12px; }
        .text-success { color: #00BFA5; }
        .text-danger { color: #FF4B4B; }
        .text-primary { color: var(--color-primary); }
        .mt-auto { margin-top: auto; }
        
        .sandbox-icon-wrap {
            width: 44px; height: 44px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
        }
        .bg-purple-light { background: rgba(108, 93, 211, 0.1); }
        .text-purple { color: #6C5DD3; }

        .sandbox-title { font-size: 18px; font-weight: 800; margin: 0; color: var(--text-primary); }
        .sandbox-subtitle { font-size: 13px; color: var(--text-muted); margin: 4px 0 0 0; }

        .sandbox-input-box {
            display: flex; align-items: center; gap: 12px;
            background: var(--bg-block); padding: 8px 12px; border-radius: 12px; border: 1px solid var(--border-color);
        }
        .si-label { font-size: 13px; font-weight: 700; color: var(--text-secondary); }
        .si-wrapper { position: relative; width: 140px; }
        .si-symbol { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 800; color: var(--text-primary); }
        .si-field { 
            width: 100%; padding: 10px 10px 10px 28px; border-radius: 8px; 
            border: 1px solid var(--border-color); background: var(--bg-main); 
            font-size: 16px; font-weight: 800; color: var(--text-primary); outline: none; transition: 0.2s;
        }
        .si-field:focus { border-color: var(--color-primary); }

        .sandbox-body {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 24px;
        }

        .sb-card {
            background: var(--bg-main);
            border-radius: 16px;
            border: 1px solid var(--border-color);
            padding: 20px;
            display: flex; flex-direction: column;
        }

        .sb-header { border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 16px; }
        .sb-header h5 { margin: 0; font-size: 14px; font-weight: 800; text-transform: uppercase; }

        .sb-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .sb-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
        .sb-lbl { color: var(--text-secondary); font-weight: 600; }
        .sb-val { font-weight: 800; color: var(--text-primary); }

        .sb-total {
            padding-top: 16px; border-top: 1px dashed var(--border-color);
            font-size: 15px; font-weight: 800; color: var(--text-primary);
        }
        .total-deductions { color: #FF4B4B; }

        .sb-net-card {
            background: linear-gradient(135deg, var(--color-primary-light) 0%, rgba(98, 50, 255, 0.02) 100%);
            border: 1px solid rgba(98, 50, 255, 0.2);
            border-radius: 16px;
            padding: 30px;
            text-align: center;
        }
        .sn-lbl { font-size: 14px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
        .sn-val { font-size: 36px; font-weight: 900; margin-bottom: 6px; }
        .sn-sub { font-size: 13px; color: var(--text-muted); font-weight: 600; }

        @media (max-width: 1024px) {
            .sandbox-body { grid-template-columns: 1fr; }
            .settings-grid { grid-template-columns: 1fr; }
        }
      `}</style>
        </div>
    );
};

export default PayrollSettings;
