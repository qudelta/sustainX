import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Legend,
    Tooltip,
} from 'recharts';

const COLORS = ['#ff6b6b', '#74c0fc', '#ffd43b', '#69db7c', '#da77f2', '#868e96'];

export default function HeatLossChart({ data, height = 250 }) {
    const chartData = [
        { name: 'Walls', value: data.walls || 0 },
        { name: 'Windows', value: data.windows || 0 },
        { name: 'Doors', value: data.doors || 0 },
        { name: 'Floor', value: data.floor || 0 },
        { name: 'Ceiling', value: data.ceiling || 0 },
        { name: 'Ventilation', value: data.ventilation || 0 },
    ].filter((d) => d.value > 0);

    const total = chartData.reduce((sum, d) => sum + d.value, 0);

    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    formatter={(value) => [`${value.toFixed(1)} Wh`, 'Heat Loss']}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
