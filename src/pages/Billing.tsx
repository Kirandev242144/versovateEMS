import { Routes, Route, Navigate } from 'react-router-dom';

import BillingDashboard from './billing/BillingDashboard';
import BillingClients from './billing/BillingClients';
import BillingInvoices from './billing/BillingInvoices';
import BillingPayments from './billing/BillingPayments';

const Billing = () => {
    return (
        <div className="billing-module">
            <div className="flex flex-col gap-6">
                <header className="flex items-center justify-between bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Invoicing</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage clients, generate GST invoices, and track payments.</p>
                    </div>
                </header>


                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 min-h-[500px]">
                    <Routes>
                        <Route index element={<BillingDashboard />} />
                        <Route path="clients" element={<BillingClients />} />
                        <Route path="invoices" element={<BillingInvoices />} />
                        <Route path="payments" element={<BillingPayments />} />
                        <Route path="*" element={<Navigate to="/Admin/billing" replace />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
};

export default Billing;
