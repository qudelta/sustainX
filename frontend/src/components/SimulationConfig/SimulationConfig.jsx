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
} from '@mantine/core';

const HEATING_MODES = [
    { value: 'none', label: 'No Heating' },
    { value: 'thermostat', label: 'Thermostat' },
    { value: 'fixed_power', label: 'Fixed Power' },
    { value: 'schedule', label: 'Scheduled' },
];

export default function SimulationConfig({ onSubmit }) {
    const [config, setConfig] = useState({
        duration_hours: 24,
        timestep_minutes: 15,
        outdoor_temperature: 5,
        initial_indoor_temp: 18,
        heating_mode: 'thermostat',
        thermostat: {
            setpoint: 20,
            hysteresis: 0.5,
            max_power: 3000,
        },
        fixed_power: {
            power: 2000,
        },
        schedule: {
            hours_per_day: 8,
            power: 2000,
            start_hour: 6,
        },
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateConfig = (key, value) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    const updateNested = (parent, key, value) => {
        setConfig((prev) => ({
            ...prev,
            [parent]: { ...prev[parent], [key]: value },
        }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onSubmit(config);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card withBorder>
            <Stack>
                <Text fw={500} size="lg">Simulation Parameters</Text>

                <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                        <NumberInput
                            label="Duration (hours)"
                            value={config.duration_hours}
                            onChange={(v) => updateConfig('duration_hours', v)}
                            min={1}
                            max={8760}
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                        <NumberInput
                            label="Timestep (minutes)"
                            value={config.timestep_minutes}
                            onChange={(v) => updateConfig('timestep_minutes', v)}
                            min={1}
                            max={60}
                        />
                    </Grid.Col>
                </Grid>

                <Divider label="Environmental Conditions" labelPosition="center" />

                <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                        <NumberInput
                            label="Outdoor Temperature (°C)"
                            value={config.outdoor_temperature}
                            onChange={(v) => updateConfig('outdoor_temperature', v)}
                            min={-30}
                            max={50}
                        />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                        <NumberInput
                            label="Initial Indoor Temp (°C)"
                            value={config.initial_indoor_temp}
                            onChange={(v) => updateConfig('initial_indoor_temp', v)}
                            min={0}
                            max={40}
                        />
                    </Grid.Col>
                </Grid>

                <Divider label="Heating Configuration" labelPosition="center" />

                <Select
                    label="Heating Mode"
                    data={HEATING_MODES}
                    value={config.heating_mode}
                    onChange={(v) => updateConfig('heating_mode', v)}
                />

                {config.heating_mode === 'thermostat' && (
                    <Grid>
                        <Grid.Col span={4}>
                            <NumberInput
                                label="Setpoint (°C)"
                                value={config.thermostat.setpoint}
                                onChange={(v) => updateNested('thermostat', 'setpoint', v)}
                                min={10}
                                max={30}
                            />
                        </Grid.Col>
                        <Grid.Col span={4}>
                            <NumberInput
                                label="Hysteresis (°C)"
                                value={config.thermostat.hysteresis}
                                onChange={(v) => updateNested('thermostat', 'hysteresis', v)}
                                min={0.1}
                                max={5}
                                step={0.1}
                            />
                        </Grid.Col>
                        <Grid.Col span={4}>
                            <NumberInput
                                label="Max Power (W)"
                                value={config.thermostat.max_power}
                                onChange={(v) => updateNested('thermostat', 'max_power', v)}
                                min={100}
                                max={10000}
                                step={100}
                            />
                        </Grid.Col>
                    </Grid>
                )}

                {config.heating_mode === 'fixed_power' && (
                    <NumberInput
                        label="Power (W)"
                        value={config.fixed_power.power}
                        onChange={(v) => updateNested('fixed_power', 'power', v)}
                        min={100}
                        max={10000}
                        step={100}
                    />
                )}

                {config.heating_mode === 'schedule' && (
                    <Grid>
                        <Grid.Col span={4}>
                            <NumberInput
                                label="Hours per Day"
                                value={config.schedule.hours_per_day}
                                onChange={(v) => updateNested('schedule', 'hours_per_day', v)}
                                min={0}
                                max={24}
                            />
                        </Grid.Col>
                        <Grid.Col span={4}>
                            <NumberInput
                                label="Start Hour"
                                value={config.schedule.start_hour}
                                onChange={(v) => updateNested('schedule', 'start_hour', v)}
                                min={0}
                                max={23}
                            />
                        </Grid.Col>
                        <Grid.Col span={4}>
                            <NumberInput
                                label="Power (W)"
                                value={config.schedule.power}
                                onChange={(v) => updateNested('schedule', 'power', v)}
                                min={100}
                                max={10000}
                                step={100}
                            />
                        </Grid.Col>
                    </Grid>
                )}

                <Group justify="flex-end" mt="md">
                    <Button size="lg" onClick={handleSubmit} loading={isSubmitting}>
                        Run Simulation
                    </Button>
                </Group>
            </Stack>
        </Card>
    );
}
