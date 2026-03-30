const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Minimal .env parser
const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase URL or Anon Key in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const START_DATE = new Date('2026-02-10T00:00:00Z');
const END_DATE = new Date('2026-03-06T23:59:59Z');

async function seed() {
    console.log('Fetching active employees...');
    const { data: employees, error: empError } = await supabase
        .from('profiles')
        .select('id, full_name, work_days')
        .eq('role', 'employee')
        .in('status', ['Active', 'On Leave']);

    if (empError) throw empError;
    console.log(`Found ${employees.length} employees.`);

    // Define weeks
    const weeks = [
        { start: '2026-02-09', end: '2026-02-15' },
        { start: '2026-02-16', end: '2026-02-22' },
        { start: '2026-02-23', end: '2026-03-01' },
        { start: '2026-03-02', end: '2026-03-08' }
    ];

    const attendanceRecords = [];

    for (const emp of employees) {
        for (const week of weeks) {
            const weekStart = new Date(week.start);
            const weekEnd = new Date(week.end);
            const breakdown = [];
            let present = 0, absent = 0, leave = 0, holiday = 0;

            for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const dayIdx = d.getDay(); // 0 (Sun) to 6 (Sat)
                const isWorkDay = (emp.work_days || [1, 2, 3, 4, 5]).includes(dayIdx);

                let status = 'Holiday';
                if (isWorkDay) {
                    // Only randomize for the requested period
                    if (d >= START_DATE && d <= END_DATE) {
                        status = Math.random() > 0.1 ? 'Present' : 'Absent';
                    } else {
                        // Default for days outside range but within the week
                        status = 'Present';
                    }
                }

                if (status === 'Present') present++;
                else if (status === 'Absent') absent++;
                else if (status === 'Leave') leave++;
                else if (status === 'Holiday') holiday++;

                breakdown.push({
                    date: dateStr,
                    day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                    status: status
                });
            }

            attendanceRecords.push({
                employee_id: emp.id,
                week_start_date: week.start,
                week_end_date: week.end,
                days_present: present,
                days_lop: absent,
                days_paid_leave: leave,
                days_holiday: holiday,
                daily_breakdown: breakdown,
                status: 'Approved' // Auto-approve for simulation
            });
        }
    }

    console.log(`Upserting ${attendanceRecords.length} weekly records...`);

    // Batch upsert in chunks of 50 to avoid payload limits
    for (let i = 0; i < attendanceRecords.length; i += 50) {
        const chunk = attendanceRecords.slice(i, i + 50);
        const { error: upsertError } = await supabase
            .from('weekly_attendance')
            .upsert(chunk, { onConflict: 'employee_id,week_start_date' });

        if (upsertError) {
            console.error('Error upserting chunk:', upsertError);
        } else {
            console.log(`Upserted ${i + chunk.length}/${attendanceRecords.length}`);
        }
    }

    console.log('✅ Simulation complete!');
}

seed().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
