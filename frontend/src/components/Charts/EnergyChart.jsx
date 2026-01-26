import { useState, useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Brush,
} from 'recharts';
import { Group, SegmentedControl, Text, Stack } from '@mantine/core';

const INTERVALS = [
    { value: 'all', label: 'All' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '8h', label: '8h' },
    { value: '12h', label: '12h' },
];

export default function EnergyChart({ data, height = 350 }) {
    const [interval, setInterval] = useState('all');

    // Use backend-provided cumulative energy
    const chartData = useMemo(() => {
        return data.map((point) => {
            return {
                ...point,
                time_hours: parseFloat((point.time_minutes / 60).toFixed(2)),
                energy_kwh: parseFloat(((point.cumulative_energy_wh || 0) / 1000).toFixed(3)),
                power_kw: parseFloat(((point.heating_power || 0) / 1000).toFixed(2)),
            };
        });
    }, [data]);

    // Filter data based on interval
    const filteredData = useMemo(() => {
        if (interval === 'all') return chartData;

        const hours = parseInt(interval);
        const maxMinutes = hours * 60;
        return chartData.filter(p => p.time_minutes <= maxMinutes);
    }, [chartData, interval]);

    return (
        <Stack gap="xs" style={{ height }}>
            <Group justify="space-between">
                <Text size="xs" c="dimmed">Time Range</Text>
                <SegmentedControl
                    size="xs"
                    value={interval}
                    onChange={setInterval}
                    data={INTERVALS}
                />
            </Group>

            <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={filteredData}
                        margin={{ top: 5, right: 30, left: 0, bottom: 30 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                        <XAxis
                            dataKey="time_hours"
                            label={{ value: 'Time (hours)', position: 'bottom', offset: 0 }}
                            stroke="#868e96"
                            tickFormatter={(v) => `${v}h`}
                        />
                        <YAxis
                            label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
                            stroke="#868e96"
                        />
                        <Tooltip
                            formatter={(value, name) => {
                                if (name === 'energy_kwh') return [`${value} kWh`, 'Cumulative Energy'];
                                return [value, name];
                            }}
                            labelFormatter={(label) => `Time: ${label}h`}
                        />
                        <Area
                            type="monotone"
                            dataKey="energy_kwh"
                            name="Cumulative Energy"
                            stroke="#40c057"
                            fill="#b2f2bb"
                            fillOpacity={0.6}
                            isAnimationActive={false}
                        />
                        {/* Brush for scrolling/zooming */}
                        <Brush
                            dataKey="time_hours"
                            height={20}
                            stroke="#40c057"
                            tickFormatter={(v) => `${v}h`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Stack>
    );
}
