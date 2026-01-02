import { useState, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
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

export default function TemperatureChart({ data, height = 350 }) {
    const [interval, setInterval] = useState('all');
    const [brushRange, setBrushRange] = useState({ startIndex: 0, endIndex: data.length - 1 });

    // Convert time_minutes to hours for display
    const chartData = useMemo(() => data.map((point, idx) => ({
        ...point,
        time_hours: parseFloat((point.time_minutes / 60).toFixed(2)),
        index: idx,
    })), [data]);

    // Filter data based on interval
    const filteredData = useMemo(() => {
        if (interval === 'all') return chartData;

        const hours = parseInt(interval);
        const maxMinutes = hours * 60;
        return chartData.filter(p => p.time_minutes <= maxMinutes);
    }, [chartData, interval]);

    // Get visible range for brush
    const visibleData = useMemo(() => {
        return filteredData.slice(brushRange.startIndex, brushRange.endIndex + 1);
    }, [filteredData, brushRange]);

    // Calculate Y domain with padding
    const yDomain = useMemo(() => {
        if (visibleData.length === 0) return ['auto', 'auto'];
        const temps = visibleData.map(d => d.indoor_temp);
        const min = Math.floor(Math.min(...temps) - 2);
        const max = Math.ceil(Math.max(...temps) + 2);
        return [min, max];
    }, [visibleData]);

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
                    <LineChart
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
                            label={{ value: '°C', angle: -90, position: 'insideLeft' }}
                            stroke="#868e96"
                            domain={yDomain}
                        />
                        <Tooltip
                            formatter={(value, name) => {
                                if (name === 'indoor_temp') return [`${value}°C`, 'Temperature'];
                                if (name === 'heating_on') return [value ? 'On' : 'Off', 'Heating'];
                                return [value, name];
                            }}
                            labelFormatter={(label) => `Time: ${label}h`}
                        />
                        <Legend verticalAlign="top" height={24} />
                        <Line
                            type="monotone"
                            dataKey="indoor_temp"
                            name="Indoor Temp"
                            stroke="#228be6"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                        {/* Heating on/off indication */}
                        <Line
                            type="stepAfter"
                            dataKey={(d) => (d.heating_on ? d.indoor_temp : null)}
                            name="Heating On"
                            stroke="#ff6b6b"
                            strokeWidth={3}
                            dot={false}
                            connectNulls={false}
                            isAnimationActive={false}
                        />
                        {/* Brush for scrolling/zooming */}
                        <Brush
                            dataKey="time_hours"
                            height={20}
                            stroke="#228be6"
                            startIndex={brushRange.startIndex}
                            endIndex={Math.min(brushRange.endIndex, filteredData.length - 1)}
                            onChange={(range) => setBrushRange(range)}
                            tickFormatter={(v) => `${v}h`}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Stack>
    );
}
