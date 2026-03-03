import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const data = [
    { month: 'Jan', efficiency: 75 },
    { month: 'Feb', efficiency: 82 },
    { month: 'Mar', efficiency: 78 },
    { month: 'Apr', efficiency: 85 },
    { month: 'May', efficiency: 91 },
    { month: 'Jun', efficiency: 89.52 },
];

const PerformanceChart = () => {
    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6232FF" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6232FF" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis
                        dataKey="month"
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
                        contentStyle={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            boxShadow: 'var(--shadow-md)',
                            color: 'var(--text-primary)'
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="efficiency"
                        stroke="#6232FF"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorPerf)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PerformanceChart;
