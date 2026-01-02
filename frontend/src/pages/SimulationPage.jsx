import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    Button,
    Group,
    Card,
    Stack,
    Loader,
    Center,
    Alert,
    Grid,
    Badge,
    Progress,
} from '@mantine/core';
import { useSimulationStore } from '../store/simulationStore';
import TemperatureChart from '../components/Charts/TemperatureChart';
import EnergyChart from '../components/Charts/EnergyChart';
import HeatLossChart from '../components/Charts/HeatLossChart';
import InsightsPanel from '../components/Insights/InsightsPanel';
import PDFReport from '../components/PDFReport/PDFReport';

export default function SimulationPage() {
    const { projectId, jobId } = useParams();
    const navigate = useNavigate();

    const {
        currentJob,
        currentResult,
        isPolling,
        fetchJob,
        fetchResult,
        pollJobStatus,
    } = useSimulationStore();

    const [error, setError] = useState(null);

    useEffect(() => {
        const loadJob = async () => {
            try {
                const job = await fetchJob(jobId);

                if (job.status === 'COMPLETED') {
                    await fetchResult(jobId);
                } else if (job.status === 'PENDING' || job.status === 'QUEUED' || job.status === 'RUNNING') {
                    pollJobStatus(
                        jobId,
                        (result) => {
                            // Result already set by fetchResult in pollJobStatus
                        },
                        (errorMsg) => {
                            setError(errorMsg);
                        }
                    );
                } else if (job.status === 'FAILED') {
                    setError(job.error_message || 'Simulation failed');
                }
            } catch (err) {
                setError('Failed to load simulation');
            }
        };

        loadJob();
    }, [jobId, fetchJob, fetchResult, pollJobStatus]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'green';
            case 'FAILED': return 'red';
            case 'RUNNING': return 'blue';
            default: return 'gray';
        }
    };

    if (!currentJob) {
        return (
            <Center style={{ minHeight: 400 }}>
                <Loader size="lg" />
            </Center>
        );
    }

    const isRunning = ['PENDING', 'QUEUED', 'RUNNING'].includes(currentJob.status);

    return (
        <Container size="xl">
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2}>Simulation Results</Title>
                    <Group gap="sm" mt="xs">
                        <Badge color={getStatusColor(currentJob.status)} size="lg">
                            {currentJob.status}
                        </Badge>
                        <Text c="dimmed" size="sm">
                            Started: {new Date(currentJob.created_at).toLocaleString()}
                        </Text>
                    </Group>
                </div>
                <Button variant="subtle" onClick={() => navigate(`/project/${projectId}`)}>
                    ← Back to Editor
                </Button>
            </Group>

            {error && (
                <Alert color="red" title="Error" mb="xl">
                    {error}
                </Alert>
            )}

            {isRunning && (
                <Card withBorder padding="xl" ta="center" mb="xl">
                    <Loader size="lg" mb="md" />
                    <Text size="lg" fw={500}>
                        Simulation in progress...
                    </Text>
                    <Text c="dimmed" size="sm">
                        This may take a few moments
                    </Text>
                    <Progress value={100} animated mt="md" />
                </Card>
            )}

            {currentResult && (
                <Stack gap="xl">
                    {/* Summary Card */}
                    <Card withBorder>
                        <Group justify="space-between" align="flex-start">
                            <div>
                                <Text size="sm" c="dimmed">Total Energy Consumption</Text>
                                <Text size="xl" fw={700}>
                                    {currentResult.total_energy_kwh.toFixed(2)} kWh
                                </Text>
                            </div>
                            <PDFReport result={currentResult} job={currentJob} />
                        </Group>
                    </Card>

                    {/* Charts */}
                    <Grid>
                        <Grid.Col span={{ base: 12, lg: 8 }}>
                            <Card withBorder style={{ height: 450 }}>
                                <Title order={4} mb="sm">Temperature Over Time</Title>
                                <TemperatureChart data={currentResult.time_series} height={380} />
                            </Card>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, lg: 4 }}>
                            <Card withBorder style={{ height: 450 }}>
                                <Title order={4} mb="md">Heat Loss Breakdown</Title>
                                <HeatLossChart data={currentResult.heat_loss_breakdown} height={350} />
                            </Card>
                        </Grid.Col>
                    </Grid>

                    <Card withBorder style={{ height: 450 }}>
                        <Title order={4} mb="sm">Energy Usage</Title>
                        <EnergyChart data={currentResult.time_series} height={380} />
                    </Card>

                    {/* Insights */}
                    {currentResult.insights && currentResult.insights.length > 0 && (
                        <InsightsPanel insights={currentResult.insights} />
                    )}
                </Stack>
            )}
        </Container>
    );
}
