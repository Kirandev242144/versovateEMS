import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

const data = [
    { day: 'Mon', attendance: 95 },
    { day: 'Tue', attendance: 88 },
    { day: 'Wed', attendance: 92 },
    { day: 'Thu', attendance: 98 },
    { day: 'Fri', attendance: 90 },
];

const AttendanceChart = () => {
    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    />
                    <Tooltip
                        cursor={{ fill: 'var(--bg-muted)' }}
                        contentStyle={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            boxShadow: 'var(--shadow-md)',
                            color: 'var(--text-primary)'
                        }}
                    />
                    <Bar dataKey="attendance" radius={[6, 6, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.attendance > 93 ? '#00BFA5' : 'rgba(0, 191, 165, 0.2)'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AttendanceChart;
