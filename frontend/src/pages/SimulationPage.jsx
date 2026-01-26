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
  Transition,
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
    fetchJob,
    fetchResult,
    pollJobStatus,
  } = useSimulationStore();

  const [error, setError] = useState(null);
  const [summaryHover, setSummaryHover] = useState(false);

  /* ---------------- DATA FLOW (UNCHANGED) ---------------- */

  useEffect(() => {
    const loadJob = async () => {
      try {
        const job = await fetchJob(jobId);

        if (job.status === 'COMPLETED') {
          await fetchResult(jobId);
        } else if (
          job.status === 'PENDING' ||
          job.status === 'QUEUED' ||
          job.status === 'RUNNING'
        ) {
          pollJobStatus(
            jobId,
            () => {},
            (errorMsg) => setError(errorMsg)
          );
        } else if (job.status === 'FAILED') {
          setError(job.error_message || 'Simulation failed');
        }
      } catch {
        setError('Failed to load simulation');
      }
    };

    loadJob();
  }, [jobId, fetchJob, fetchResult, pollJobStatus]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'green';
      case 'FAILED':
        return 'red';
      case 'RUNNING':
        return 'blue';
      default:
        return 'gray';
    }
  };

  if (!currentJob) {
    return (
      <Center style={{ minHeight: 400 }}>
        <Loader size="lg" />
      </Center>
    );
  }

  const isRunning = ['PENDING', 'QUEUED', 'RUNNING'].includes(
    currentJob.status
  );

  /* ---------------- UI ---------------- */

  return (
    <Container
      size="xl"
      style={{
        paddingTop: 32,
        paddingBottom: 48,
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #f5f7fb 0%, #ffffff 65%)',
      }}
    >
      {/* HEADER */}
      <Transition mounted transition="slide-down" duration={400}>
        {(styles) => (
          <Group justify="space-between" mb="xl" style={styles}>
            <div>
              <Title order={2} fw={800}>
                Simulation Results
              </Title>
              <Group gap="sm" mt={6}>
                <Badge
                  size="lg"
                  variant="light"
                  color={getStatusColor(currentJob.status)}
                >
                  {currentJob.status}
                </Badge>
                <Text c="dimmed" size="sm">
                  Started:{' '}
                  {new Date(
                    currentJob.created_at
                  ).toLocaleString()}
                </Text>
              </Group>
            </div>

            <Button
              variant="light"
              radius="xl"
              onClick={() =>
                navigate(`/project/${projectId}`)
              }
            >
              ← Back to Editor
            </Button>
          </Group>
        )}
      </Transition>

      {/* ERROR */}
      <Transition mounted={!!error} transition="fade" duration={300}>
        {(styles) =>
          error && (
            <Alert color="red" title="Error" mb="xl" style={styles}>
              {error}
            </Alert>
          )
        }
      </Transition>

      {/* RUNNING STATE */}
      <Transition mounted={isRunning} transition="scale-y" duration={350}>
        {(styles) =>
          isRunning && (
            <Card
              withBorder
              radius="xl"
              padding="xl"
              ta="center"
              mb="xl"
              style={{
                background:
                  'linear-gradient(135deg, #e3f2fd, #ffffff)',
                ...styles,
              }}
            >
              <Stack align="center" gap="md">
                <Loader size="lg" color="blue" />
                <Text size="lg" fw={600}>
                  Simulation in progress
                </Text>
                <Text c="dimmed" size="sm">
                  Crunching physics & energy models…
                </Text>
                <Progress
                  value={100}
                  animated
                  striped
                  radius="xl"
                  color="blue"
                  style={{ width: '60%' }}
                />
              </Stack>
            </Card>
          )
        }
      </Transition>

      {/* RESULTS */}
      <Transition mounted={!!currentResult} transition="fade" duration={400}>
        {(styles) =>
          currentResult && (
            <Stack gap="xl" style={styles}>
              {/* ✅ SUMMARY CARD — WHITE → DIM GREEN */}
              <Card
                withBorder
                radius="xl"
                padding="lg"
                onMouseEnter={() => setSummaryHover(true)}
                onMouseLeave={() => setSummaryHover(false)}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  background: summaryHover
                    ? 'linear-gradient(135deg, #d1fae5, #ecfdf5)'
                    : '#ffffff',
                }}
              >
                <Group justify="space-between" align="center">
                  <div>
                    <Text
                      size="sm"
                      c={summaryHover ? 'green.8' : 'dimmed'}
                    >
                      Total Energy Consumption
                    </Text>
                    <Text
                      size="xl"
                      fw={800}
                      c={summaryHover ? 'green.9' : 'dark'}
                    >
                      {currentResult.total_energy_kwh.toFixed(2)} kWh
                    </Text>
                  </div>

                  <PDFReport
                    result={currentResult}
                    job={currentJob}
                  />
                </Group>
              </Card>

              {/* CHARTS */}
              <Grid>
                <Grid.Col span={{ base: 12, lg: 8 }}>
                  <Card withBorder radius="xl" style={{ height: 450 }}>
                    <Title order={4} mb="sm">
                      Temperature Over Time
                    </Title>
                    <TemperatureChart
                      data={currentResult.time_series}
                      height={380}
                    />
                  </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, lg: 4 }}>
                  <Card withBorder radius="xl" style={{ height: 450 }}>
                    <Title order={4} mb="md">
                      Heat Loss Breakdown
                    </Title>
                    <HeatLossChart
                      data={currentResult.heat_loss_breakdown}
                      height={350}
                    />
                  </Card>
                </Grid.Col>
              </Grid>

              <Card withBorder radius="xl" style={{ height: 450 }}>
                <Title order={4} mb="sm">
                  Energy Usage
                </Title>
                <EnergyChart
                  data={currentResult.time_series}
                  height={380}
                />
              </Card>

              {/* INSIGHTS */}
              {currentResult.insights &&
                currentResult.insights.length > 0 && (
                  <InsightsPanel
                    insights={currentResult.insights}
                  />
                )}
            </Stack>
          )
        }
      </Transition>
    </Container>
  );
}
