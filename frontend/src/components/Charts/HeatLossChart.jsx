import {
  Card,
  Text,
  Group,
  Stack,
  Divider,
  Box,
} from "@mantine/core";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Sector,
} from "recharts";
import { useMemo, useState } from "react";

/* ---------- COLORS & LABELS ---------- */
const COLORS = {
  walls: "#adb5bd",
  ventilation: "#868e96",
  ceiling: "#ff922b",
  floor: "#82c91e",
};

const LABELS = {
  walls: "Walls",
  ventilation: "Ventilation",
  ceiling: "Ceiling",
  floor: "Floor",
};

export default function HeatLossChart({ data, height = 300 }) {
  const [activeIndex, setActiveIndex] = useState(0);

  /* ---------- DATA ---------- */
  const chartData = useMemo(() => {
    if (!data || typeof data !== "object") return [];

    return Object.entries(data)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({
        key,
        name: LABELS[key] || key,
        value: +value.toFixed(2),
        color: COLORS[key] || "#999",
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const total = useMemo(
    () => chartData.reduce((sum, d) => sum + d.value, 0),
    [chartData]
  );

  const finalData = chartData.map(d => ({
    ...d,
    percentage: total ? ((d.value / total) * 100).toFixed(1) : 0,
  }));

  /* ---------- ACTIVE SLICE ---------- */
  const renderActiveShape = (props) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
    } = props;

    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    );
  };

  /* ---------- TOOLTIP ---------- */
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;

    return (
      <Card p="xs" radius="sm" withBorder shadow="sm">
        <Text fw={600} size="xs">{d.name}</Text>
        <Text size="xs">Heat Loss: <b>{d.value} W</b></Text>
        <Text size="xs">Share: <b>{d.percentage}%</b></Text>
      </Card>
    );
  };

  if (!finalData.length) {
    return (
      <Card withBorder radius="md" h={height}>
        <Text c="dimmed" ta="center" mt="lg">
          No heat loss data
        </Text>
      </Card>
    );
  }

  return (
    <Card withBorder radius="md" p="md">
      {/* Header */}
      <Group justify="space-between" mb="xs">
        <Text fw={600}>Heat Loss Distribution</Text>
        <Text size="xs" c="dimmed">Watts (W)</Text>
      </Group>

      {/* Total */}
      <Card radius="sm" p="sm" mb="sm" bg="gray.0">
        <Text size="xs" c="dimmed">Total Heat Loss</Text>
        <Text fw={700} size="lg">
          {total.toFixed(2)} W
        </Text>
      </Card>

      {/* Chart + Legend */}
      <Group align="center" gap="lg" grow>
        {/* Donut */}
        <Box h={180}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={finalData}
                dataKey="value"
                innerRadius={55}
                outerRadius={75}
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={(_, i) => setActiveIndex(i)}
              >
                {finalData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Box>

        {/* Legend */}
        <Stack gap={6}>
          {finalData.map((item, i) => (
            <Group
              key={item.name}
              justify="space-between"
              px={6}
              py={4}
              radius="sm"
              style={{
                backgroundColor: activeIndex === i ? "#f1f3f5" : "transparent",
                cursor: "pointer",
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <Group gap={8}>
                <Box
                  w={8}
                  h={8}
                  bg={item.color}
                  style={{ borderRadius: 2 }}
                />
                <Text size="sm">{item.name}</Text>
              </Group>

              <Text size="sm" fw={600}>
                {item.percentage}%
              </Text>
            </Group>
          ))}
        </Stack>
      </Group>
    </Card>
  );
}
