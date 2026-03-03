# Versovate EMS

Versovate Employee Management System (EMS) is a comprehensive platform designed to streamline HR operations, attendance tracking, and payroll management.

## Core Features

- **Attendance Management**:
    - Weekly timesheets strictly following a **Sunday to Saturday** schedule.
    - Configurable **Working Days** per employee (managed by Admin).
    - Automated "Holiday" marking for non-working days.
    - Visual **Friday Reminder** for weekly attendance submission.

- **Compensation & Payroll**:
    - Automated salary breakdown from Gross Monthly CTC.
    - **Manual EPF Overrides**: Admins can set custom EPF Employee and Employer percentages for specific individuals.
    - **Deferred Impact Logic**: Mid-month compensation updates automatically apply only to the next month's payroll.
    - Detailed payroll records and payslip generation.

- **Employee Profiles**:
    - Centralized repository for personal, professional, and banking information.
    - Document management (Offer Letters, Identity Proofs, etc.).

## Tech Stack

- **Frontend**: React (Vite), TypeScript, Tailwind CSS.
- **Backend/Database**: Supabase (PostgreSQL, Auth, Storage).
- **Icons**: Lucide React.

## Getting Started

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Set up environment variables in `.env`.
4. Run development server: `npm run dev`.
