import { useState } from 'react';
import {
  Card,
  Stack,
  Group,
  Button,
  NumberInput,
  Select,
  Grid,
  Text,
  Divider,
  Switch,
  Accordion,
  Badge,
  Tooltip,
  Box,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

/* ---------- CONSTANTS (UNCHANGED) ---------- */

const HEATING_MODES = [
  { value: 'none', label: 'No Heating' },
  { value: 'thermostat', label: 'Thermostat Control' },
  { value: 'fixed_power', label: 'Fixed Power Output' },
  { value: 'schedule', label: 'Scheduled Operation' },
];

const WEATHER_PRESETS = [
  { value: 'custom', label: 'Custom' },
  { value: 'winter_severe', label: 'Severe Winter (-10°C, High Wind)' },
  { value: 'winter_mild', label: 'Mild Winter (5°C, Low Wind)' },
  { value: 'spring_autumn', label: 'Spring / Autumn (15°C)' },
  { value: 'summer', label: 'Summer (25°C)' },
];

const OCCUPANCY_PATTERNS = [
  { value: 'none', label: 'No Occupancy' },
  { value: 'residential', label: 'Residential (Evenings/Nights)' },
  { value: 'office', label: 'Office Hours (9–5)' },
  { value: 'continuous', label: 'Continuous Occupancy' },
];

export default function SimulationConfig({ onSubmit }) {
  /* ---------- STATE (UNCHANGED) ---------- */

  const [config, setConfig] = useState({
    duration_hours: 24,
    timestep_minutes: 15,

    outdoor_temperature: 5,
    initial_indoor_temp: 18,
    wind_speed: 3.5,
    relative_humidity: 70,

    enable_solar_gains: true,
    window_solar_factor: 0.6,
    orientation: 'south',
    cloud_cover: 0.5,

    occupancy_pattern: 'residential',
    people_count: 2,
    heat_per_person: 100,
    appliance_load: 200,
    lighting_load: 100,

    air_leakage_rate: 0.5,

    heating_mode: 'thermostat',
    thermostat: { setpoint: 20, hysteresis: 0.5, max_power: 3000 },
    fixed_power: { power: 2000 },
    schedule: { hours_per_day: 8, power: 2000, start_hour: 6 },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateConfig = (key, value) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const updateNested = (parent, key, value) =>
    setConfig((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [key]: value },
    }));

  const applyWeatherPreset = (preset) => {
    const presets = {
      winter_severe: { outdoor_temperature: -10, wind_speed: 8, relative_humidity: 80, cloud_cover: 0.8 },
      winter_mild: { outdoor_temperature: 5, wind_speed: 2, relative_humidity: 75, cloud_cover: 0.7 },
      spring_autumn: { outdoor_temperature: 15, wind_speed: 3.5, relative_humidity: 65, cloud_cover: 0.5 },
      summer: { outdoor_temperature: 25, wind_speed: 2, relative_humidity: 60, cloud_cover: 0.3 },
    };
    if (presets[preset]) setConfig((prev) => ({ ...prev, ...presets[preset] }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(config);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------- SHARED HOVER STYLE ---------- */
  const hoverCard = {
    background: '#ffffff',
    borderRadius: 16,
    transition: 'all 0.3s ease',
    '&:hover': {
      background: '#f1f3f5',
      transform: 'translateY(-3px)',
      boxShadow: '0 20px 45px rgba(0,0,0,0.15)',
    },
  };

  /* ---------- UI ---------- */

  return (
    <Box
      sx={{
        background: 'linear-gradient(180deg, #f4f7fb, #ffffff)',
        borderRadius: 20,
        padding: 24,
      }}
    >
      <Card withBorder radius="xl" padding="xl">
        <Stack gap="xl">
          {/* HEADER */}
          <Group justify="space-between">
            <Text fw={700} size="xl">Simulation Configuration</Text>
            <Badge size="lg" variant="light" color="blue">
              {config.duration_hours}h · {config.timestep_minutes} min
            </Badge>
          </Group>

          {/* ACCORDION */}
          <Accordion variant="separated" radius="lg">
            {/* BASIC */}
            <Accordion.Item value="basic" sx={hoverCard}>
              <Accordion.Control>
                <Group>
                  <Text fw={600}>Basic Settings</Text>
                  <Badge size="xs" variant="dot">Required</Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Grid>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Duration (hours)"
                      value={config.duration_hours}
                      onChange={(v) => updateConfig('duration_hours', v)}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Timestep (minutes)"
                      value={config.timestep_minutes}
                      onChange={(v) => updateConfig('timestep_minutes', v)}
                    />
                  </Grid.Col>
                </Grid>
                <NumberInput
                  label="Initial Indoor Temperature (°C)"
                  value={config.initial_indoor_temp}
                  onChange={(v) => updateConfig('initial_indoor_temp', v)}
                />
              </Accordion.Panel>
            </Accordion.Item>

            {/* WEATHER */}
            <Accordion.Item value="weather" sx={hoverCard}>
              <Accordion.Control>
                <Text fw={600}>Weather Conditions</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Select
                  label="Weather Preset"
                  data={WEATHER_PRESETS}
                  value="custom"
                  onChange={applyWeatherPreset}
                />
                <Grid mt="sm">
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Outdoor Temperature (°C)"
                      value={config.outdoor_temperature}
                      onChange={(v) => updateConfig('outdoor_temperature', v)}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Wind Speed (m/s)"
                      value={config.wind_speed}
                      onChange={(v) => updateConfig('wind_speed', v)}
                    />
                  </Grid.Col>
                </Grid>
              </Accordion.Panel>
            </Accordion.Item>

            {/* SOLAR */}
            <Accordion.Item value="solar" sx={hoverCard}>
              <Accordion.Control>
                <Group>
                  <Text fw={600}>Solar Heat Gains</Text>
                  <Badge color={config.enable_solar_gains ? 'green' : 'gray'}>
                    {config.enable_solar_gains ? 'Enabled' : 'Disabled'}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Switch
                  label="Enable Solar Heat Gains"
                  checked={config.enable_solar_gains}
                  onChange={(e) =>
                    updateConfig('enable_solar_gains', e.currentTarget.checked)
                  }
                />
                {config.enable_solar_gains && (
                  <Grid mt="sm">
                    <Grid.Col span={6}>
                      <Select
                        label="Orientation"
                        data={[
                          { value: 'north', label: 'North' },
                          { value: 'south', label: 'South' },
                          { value: 'east', label: 'East' },
                          { value: 'west', label: 'West' },
                        ]}
                        value={config.orientation}
                        onChange={(v) => updateConfig('orientation', v)}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <NumberInput
                        label="Window Solar Factor"
                        value={config.window_solar_factor}
                        onChange={(v) => updateConfig('window_solar_factor', v)}
                      />
                    </Grid.Col>
                  </Grid>
                )}
              </Accordion.Panel>
            </Accordion.Item>

            {/* INTERNAL */}
            <Accordion.Item value="internal" sx={hoverCard}>
              <Accordion.Control>
                <Text fw={600}>Internal Heat Gains</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Select
                  label="Occupancy Pattern"
                  data={OCCUPANCY_PATTERNS}
                  value={config.occupancy_pattern}
                  onChange={(v) => updateConfig('occupancy_pattern', v)}
                />
                {config.occupancy_pattern !== 'none' && (
                  <Grid mt="sm">
                    <Grid.Col span={6}>
                      <NumberInput
                        label="People Count"
                        value={config.people_count}
                        onChange={(v) => updateConfig('people_count', v)}
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <NumberInput
                        label="Heat per Person (W)"
                        value={config.heat_per_person}
                        onChange={(v) => updateConfig('heat_per_person', v)}
                      />
                    </Grid.Col>
                  </Grid>
                )}
              </Accordion.Panel>
            </Accordion.Item>

            {/* INFILTRATION */}
            <Accordion.Item value="infiltration" sx={hoverCard}>
              <Accordion.Control>
                <Text fw={600}>Air Leakage & Ventilation</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <NumberInput
                  label="Air Leakage Rate (ACH)"
                  value={config.air_leakage_rate}
                  onChange={(v) => updateConfig('air_leakage_rate', v)}
                  rightSection={
                    <Tooltip label="Passive <0.6, New build 1–3, Old 5–15">
                      <IconInfoCircle size={16} />
                    </Tooltip>
                  }
                />
              </Accordion.Panel>
            </Accordion.Item>

            {/* HEATING */}
            <Accordion.Item value="heating" sx={hoverCard}>
              <Accordion.Control>
                <Group>
                  <Text fw={600}>Heating System</Text>
                  <Badge>
                    {HEATING_MODES.find(m => m.value === config.heating_mode)?.label}
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Select
                  label="Heating Mode"
                  data={HEATING_MODES}
                  value={config.heating_mode}
                  onChange={(v) => updateConfig('heating_mode', v)}
                />
                {config.heating_mode === 'thermostat' && (
                  <Grid mt="sm">
                    <Grid.Col span={4}>
                      <NumberInput
                        label="Setpoint (°C)"
                        value={config.thermostat.setpoint}
                        onChange={(v) => updateNested('thermostat', 'setpoint', v)}
                      />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <NumberInput
                        label="Hysteresis (°C)"
                        value={config.thermostat.hysteresis}
                        onChange={(v) => updateNested('thermostat', 'hysteresis', v)}
                      />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <NumberInput
                        label="Max Power (W)"
                        value={config.thermostat.max_power}
                        onChange={(v) => updateNested('thermostat', 'max_power', v)}
                      />
                    </Grid.Col>
                  </Grid>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Divider />

          {/* FOOTER */}
          <Group
            justify="space-between"
            sx={{
              padding: '12px 16px',
              borderRadius: 12,
              transition: 'background 0.25s ease',
              '&:hover': { background: '#f1f3f5' },
            }}
          >
            <Text size="sm" c="dimmed">
              Total data points:{' '}
              <b>
                ~{Math.ceil((config.duration_hours * 60) / config.timestep_minutes)}
              </b>
            </Text>
            <Button size="lg" loading={isSubmitting} onClick={handleSubmit}>
              Run Simulation
            </Button>
          </Group>
        </Stack>
      </Card>
    </Box>
  );
}
