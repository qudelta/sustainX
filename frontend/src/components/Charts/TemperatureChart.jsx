import {
  Card,
  Text,
  Group,
  SimpleGrid,
  Box,
  Stack,
  Paper,
  Divider,
  Badge,
} from "@mantine/core";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from "recharts";
import { useMemo } from "react";

export default function TemperatureChart({ data, height = 420 }) {

  /* ---------------- DATA MAPPING (UNCHANGED LOGIC) ---------------- */
  const chartData = useMemo(() => {
    if (!data?.length) return [];

    return data.map((p, i) => ({
      timeLabel: `${Math.floor(i / 4)}:${(i % 4) * 15}`.padStart(5, "0"),
      indoor: p.indoor_temp,
      outdoor: p.outdoor_temp,
      power: p.heating_power || 0,
    }));
  }, [data]);

  const stats = useMemo(() => {
    if (!data?.length) return null;

    const indoor = data.map(d => d.indoor_temp);
    const outdoor = data.map(d => d.outdoor_temp);
    const powers = data.map(d => d.heating_power || 0);

    return {
      avgTemp: indoor.reduce((a, b) => a + b, 0) / indoor.length,
      outdoorAvg: outdoor.reduce((a, b) => a + b, 0) / outdoor.length,
      duty: ((powers.filter(p => p > 0).length / powers.length) * 100).toFixed(1),
      maxPower: Math.max(...powers),
    };
  }, [data]);

  /* ---------------- TOOLTIP ---------------- */
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const get = key => payload.find(p => p.dataKey === key)?.value;

    return (
      <Paper radius="lg" shadow="xl" p="md" withBorder>
        <Text fw={700} size="sm" mb={6}>Time {label}</Text>
        <Divider mb={6} />
        <Stack gap={6}>
          <Metric color="#12b886" label="Indoor" value={`${get("indoor")} °C`} />
          <Metric color="#868e96" label="Outdoor" value={`${get("outdoor")} °C`} />
          <Metric color="#3b82f6" label="Heater" value={`${get("power")} W`} />
        </Stack>
      </Paper>
    );
  };

  if (!chartData.length) {
    return (
      <Card withBorder radius="lg" h={height}>
        <Text c="dimmed" ta="center" mt="lg">No temperature data</Text>
      </Card>
    );
  }

  return (
    <Card
      withBorder
      radius="xl"
      p="xl"
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      }}
    >
      {/* HEADER */}
      <Group justify="space-between" mb="md">
        <Stack gap={2}>
          <Text fw={700} size="lg">Temperature & Heating Profile</Text>
          {stats && (
            <Badge
              color={stats.avgTemp >= 20 ? "green" : "orange"}
              variant="light"
              size="sm"
            >
              {stats.avgTemp >= 20
                ? "Comfortable indoor climate"
                : "Heating under load"}
            </Badge>
          )}
        </Stack>

        <Group gap="lg">
          <LegendDot color="#12b886" label="Indoor" />
          <LegendDot color="#868e96" label="Outdoor" />
          <LegendDot color="#fa5252" label="Target" />
          <LegendDot color="#3b82f6" label="Heater" />
        </Group>
      </Group>

      {/* CHART */}
      <Box h={height}>
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>

            <CartesianGrid
              stroke="#e9ecef"
              strokeDasharray="2 4"
              vertical={false}
            />

            <XAxis
              dataKey="timeLabel"
              tick={{ fill: "#868e96", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              yAxisId="temp"
              tickFormatter={v => `${v}°C`}
              tick={{ fill: "#12b886", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              yAxisId="power"
              orientation="right"
              tickFormatter={v => v ? `${(v / 1000).toFixed(1)}kW` : "0kW"}
              tick={{ fill: "#3b82f6", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* COMFORT BAND */}
            <ReferenceLine yAxisId="temp" y={20} stroke="none" fill="#12b886" fillOpacity={0.06} />
            <ReferenceLine yAxisId="temp" y={22} stroke="none" fill="#12b886" fillOpacity={0.06} />

            {/* TARGET */}
            <ReferenceLine
              yAxisId="temp"
              y={21}
              stroke="#fa5252"
              strokeDasharray="6 4"
            />

            {/* HEATER */}
            <Bar
              yAxisId="power"
              dataKey="power"
              fill="#3b82f6"
              barSize={5}
              radius={[3, 3, 0, 0]}
              style={{ filter: "drop-shadow(0 0 6px rgba(59,130,246,0.4))" }}
            />

            {/* OUTDOOR */}
            <Line
              yAxisId="temp"
              dataKey="outdoor"
              stroke="#868e96"
              strokeDasharray="6 6"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              isAnimationActive
            />

            {/* INDOOR */}
            <Line
              yAxisId="temp"
              dataKey="indoor"
              type="natural"
              stroke="#12b886"
              strokeWidth={4}
              dot={false}
              activeDot={{ r: 7 }}
              isAnimationActive
            />

            <Brush
              dataKey="timeLabel"
              height={26}
              fill="#f1f3f5"
              travellerWidth={8}
            />

          </ComposedChart>
        </ResponsiveContainer>
      </Box>

      {/* STATS */}
      {stats && (
        <SimpleGrid cols={{ base: 2, sm: 4 }} mt="xl">
          <Stat label="Avg Temp" value={`${stats.avgTemp.toFixed(1)}°C`} />
          <Stat label="Outdoor Avg" value={`${stats.outdoorAvg.toFixed(1)}°C`} />
          <Stat label="Duty Cycle" value={`${stats.duty}%`} />
          <Stat label="Max Power" value={`${stats.maxPower} W`} />
        </SimpleGrid>
      )}
    </Card>
  );
}

/* ---------------- HELPERS ---------------- */

function LegendDot({ color, label }) {
  return (
    <Group gap={6}>
      <Box w={10} h={10} bg={color} style={{ borderRadius: "50%" }} />
      <Text size="sm" c="dimmed">{label}</Text>
    </Group>
  );
}

function Metric({ label, value, color }) {
  return (
    <Group justify="space-between">
      <Group gap={6}>
        <Box w={8} h={8} bg={color} style={{ borderRadius: "50%" }} />
        <Text size="xs" c="dimmed">{label}</Text>
      </Group>
      <Text fw={600}>{value}</Text>
    </Group>
  );
}

function Stat({ label, value }) {
  return (
    <Paper withBorder radius="lg" p="md">
      <Text size="xs" c="dimmed">{label}</Text>
      <Text fw={700} size="lg">{value}</Text>
    </Paper>
  );
}
