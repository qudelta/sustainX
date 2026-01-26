import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useMemo, useState } from "react";

export default function EnergyFlowChart({ data, height = 360 }) {
  const [hovered, setHovered] = useState(false);

  // ✅ derive power range ONLY for axis correctness
  const maxPowerKW = useMemo(() => {
    if (!data?.length) return 3;
    return Math.max(...data.map(d => d.heating_power / 1000));
  }, [data]);

  const flowData = useMemo(() => {
    if (!data?.length) return [];

    let cumulativeEnergy = 0;

    return data.map((p, i) => {
      const heatingKW = p.heating_power / 1000;
      cumulativeEnergy += heatingKW * 0.25; // ✅ unchanged math

      return {
        timeLabel: `${(i / 4).toFixed(1)}h`,
        cumulativeEnergy: +cumulativeEnergy.toFixed(3),
      };
    });
  }, [data]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <div
        style={{
          background: hovered ? "#212529" : "#ffffff",
          color: hovered ? "#ffffff" : "#000000",
          padding: 12,
          borderRadius: 10,
          boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
          transition: "all 0.3s ease",
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          ⏱ {label}
        </div>
        <div style={{ color: "#4dabf7", fontWeight: 600 }}>
          Energy: {payload[0].value.toFixed(2)} kWh
        </div>
      </div>
    );
  };

  if (!flowData.length) return <div style={{ height }}>No data</div>;

  return (
    <div
      style={{
        background: hovered ? "#dee2e6" : "#ffffff",
        borderRadius: 16,
        padding: 12,
        transition: "all 0.35s ease",
        transform: hovered
          ? "perspective(1200px) translateY(-4px)"
          : "perspective(1200px) translateY(0)",
        boxShadow: hovered
          ? "0 20px 45px rgba(0,0,0,0.25)"
          : "0 6px 14px rgba(0,0,0,0.12)",
      }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={flowData}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          margin={{ top: 20, right: 50, left: 45, bottom: 20 }}
        >
          {/* 🎨 DEFINITIONS */}
          <defs>
            <linearGradient id="energyGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#74c0fc" />
              <stop offset="100%" stopColor="#228be6" />
            </linearGradient>

            <filter id="energyGlow">
              <feGaussianBlur
                stdDeviation={hovered ? 6 : 3}
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 🧱 GRID */}
          <CartesianGrid
            stroke={hovered ? "#adb5bd" : "#e9ecef"}
            strokeDasharray="4 8"
            vertical={false}
          />

          {/* ⏱ X AXIS */}
          <XAxis
            dataKey="timeLabel"
            tick={{ fill: "#495057", fontWeight: 600 }}
            axisLine={{ stroke: "#868e96" }}
            tickLine={false}
          />

          {/* 🔌 POWER AXIS — CLEAR & VISIBLE */}
          <YAxis
            yAxisId="left"
            domain={[0, Math.ceil(maxPowerKW)]}
            tick={{ fill: "#495057", fontWeight: 600 }}
            axisLine={{ stroke: "#868e96" }}
            tickLine
            label={{
              value: "Power (kW)",
              angle: -90,
              position: "insideLeft",
              fill: "#343a40",
              fontWeight: 700,
            }}
          />

          {/* 🔵 ENERGY AXIS */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#495057", fontWeight: 600 }}
            axisLine={{ stroke: "#868e96" }}
            tickLine={false}
            label={{
              value: "Energy (kWh)",
              angle: 90,
              position: "insideRight",
              fill: "#343a40",
              fontWeight: 700,
            }}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* 🔵 ENERGY LINE */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativeEnergy"
            stroke="url(#energyGradient)"
            strokeWidth={hovered ? 5 : 4}
            dot={false}
            filter="url(#energyGlow)"
            isAnimationActive
            animationDuration={1000}
            animationEasing="ease-out"
            name="Cumulative Energy"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
