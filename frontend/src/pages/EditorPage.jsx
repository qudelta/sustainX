import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Button,
    Group,
    Stack,
    Card,
    Text,
    Loader,
    Center,
    Tabs,
    Divider,
    Badge,
    Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useProjectStore } from '../store/projectStore';
import { useSimulationStore } from '../store/simulationStore';
import FloorplanEditor from '../components/FloorplanEditor/FloorplanEditor';
import SimulationConfig from '../components/SimulationConfig/SimulationConfig';

export default function EditorPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('floorplan');

    const { currentProject, fetchProject, updateFloorplan, isLoading } =
        useProjectStore();
    const { createJob, jobs, fetchProjectJobs } = useSimulationStore();

    const [floorplan, setFloorplan] = useState({
        walls: [],
        windows: [],
        doors: [],
        floor: { area: 20, u_value: 0.5, type: 'ground' },
        ceiling: { area: 20, u_value: 0.3, type: 'roof' },
        ventilation: { air_changes_per_hour: 0.5, exhaust_rate: 0 },
    });

    useEffect(() => {
        fetchProject(projectId);
        fetchProjectJobs(projectId);
    }, [projectId]);

    useEffect(() => {
        if (currentProject?.floorplan) {
            setFloorplan(currentProject.floorplan);
        }
    }, [currentProject]);

    const handleSave = async () => {
        try {
            await updateFloorplan(projectId, floorplan);
            notifications.show({
                title: 'Saved',
                message: 'Floorplan saved successfully',
                color: 'green',
            });
        } catch {
            notifications.show({
                title: 'Error',
                message: 'Failed to save floorplan',
                color: 'red',
            });
        }
    };

    const handleRunSimulation = async (config) => {
        await updateFloorplan(projectId, floorplan);
        const job = await createJob(projectId, config);
        navigate(`/project/${projectId}/simulation/${job.id}`);
    };

    if (isLoading || !currentProject) {
        return (
            <Center style={{ minHeight: 400 }}>
                <Loader size="lg" />
            </Center>
        );
    }

    return (
        <Box
            style={{
                minHeight: '100vh',
                background: `
                    radial-gradient(1200px 400px at top, #dbeafe 0%, transparent 60%),
                    linear-gradient(180deg, #f8fafc, #eef2f7)
                `,
                paddingBottom: 80,
            }}
        >
            <Container size="xl">
                {/* HEADER */}
                <Group justify="space-between" mb="xl" pt="xl">
                    <Stack gap={2}>
                        <Title order={2} fw={800}>
                            {currentProject.name}
                        </Title>
                        <Text size="sm" c="dimmed">
                            {currentProject.description}
                        </Text>
                    </Stack>

                    <Group>
                        <Button
                            variant="subtle"
                            onClick={() => navigate('/')}
                            styles={{
                                root: {
                                    transition: 'all 0.25s ease',
                                    ':hover': {
                                        transform: 'translateX(-4px)',
                                    },
                                },
                            }}
                        >
                            ← Back
                        </Button>

                        <Button
                            onClick={handleSave}
                            styles={{
                                root: {
                                    transition: 'all 0.25s ease',
                                    ':hover': {
                                        transform: 'translateY(-3px)',
                                        boxShadow:
                                            '0 15px 40px rgba(59,130,246,0.45)',
                                    },
                                },
                            }}
                        >
                            Save
                        </Button>
                    </Group>
                </Group>

                {/* TABS */}
                <Tabs value={activeTab} onChange={setActiveTab}>
                    <Tabs.List
                        mb="xl"
                        style={{
                            display: 'flex',
                            gap: 12,
                            padding: 12,
                            borderRadius: 18,
                            background: 'rgba(255,255,255,0.85)',
                            backdropFilter: 'blur(14px)',
                            boxShadow:
                                '0 25px 60px rgba(0,0,0,0.12)',
                        }}
                    >
                        {[
                            { value: 'floorplan', label: 'Floorplan' },
                            { value: 'simulate', label: 'Simulate' },
                            { value: 'history', label: 'History' },
                        ].map((tab) => (
                            <Tabs.Tab
                                key={tab.value}
                                value={tab.value}
                                style={{
                                    borderRadius: 14,
                                    padding: '10px 18px',
                                    fontWeight: 600,
                                    transition: 'all 0.25s ease',
                                }}
                                styles={{
                                    tab: {
                                        background:
                                            activeTab === tab.value
                                                ? 'linear-gradient(180deg,#3b82f6,#2563eb)'
                                                : 'transparent',
                                        color:
                                            activeTab === tab.value
                                                ? '#fff'
                                                : '#334155',
                                        boxShadow:
                                            activeTab === tab.value
                                                ? '0 12px 30px rgba(37,99,235,0.45)'
                                                : 'none',
                                    },
                                }}
                            >
                                <Group gap={6}>
                                    {tab.label}
                                    {tab.value === 'history' &&
                                        jobs.length > 0 && (
                                            <Badge size="sm" color="dark">
                                                {jobs.length}
                                            </Badge>
                                        )}
                                </Group>
                            </Tabs.Tab>
                        ))}
                    </Tabs.List>

                    {/* FLOORPLAN */}
                    <Tabs.Panel value="floorplan">
                        <Card
                            radius="xl"
                            padding="xl"
                            style={{
                                background:
                                    'linear-gradient(180deg,#ffffff,#f9fbff)',
                                boxShadow:
                                    '0 40px 90px rgba(0,0,0,0.18)',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            <Stack gap="md">
                                <Group>
                                    <Text fw={700} size="lg">
                                        Room Designer
                                    </Text>
                                    <Badge color="blue" variant="light">
                                        Interactive
                                    </Badge>
                                </Group>

                                <Divider />

                                <Box
                                    style={{
                                        borderRadius: 18,
                                        overflow: 'hidden',
                                        background:
                                            'linear-gradient(180deg,#f9fbff,#ffffff)',
                                        boxShadow:
                                            'inset 0 0 0 1px #e5e7eb',
                                    }}
                                >
                                    <FloorplanEditor
                                        floorplan={floorplan}
                                        onChange={setFloorplan}
                                    />
                                </Box>
                            </Stack>
                        </Card>
                    </Tabs.Panel>

                    {/* SIMULATE */}
                    <Tabs.Panel value="simulate">
                        <Card
                            radius="xl"
                            padding="xl"
                            style={{
                                background: '#ffffff',
                                boxShadow:
                                    '0 30px 70px rgba(0,0,0,0.15)',
                            }}
                        >
                            <SimulationConfig
                                onSubmit={handleRunSimulation}
                            />
                        </Card>
                    </Tabs.Panel>

                    {/* HISTORY */}
                    <Tabs.Panel value="history">
                        <Stack>
                            {jobs.map((job) => (
                                <Card
                                    key={job.id}
                                    radius="lg"
                                    padding="md"
                                    withBorder
                                    style={{
                                        transition: 'all 0.25s ease',
                                    }}
                                    styles={{
                                        root: {
                                            ':hover': {
                                                transform:
                                                    'translateY(-6px)',
                                                boxShadow:
                                                    '0 25px 60px rgba(0,0,0,0.18)',
                                            },
                                        },
                                    }}
                                >
                                    <Group justify="space-between">
                                        <div>
                                            <Badge>{job.status}</Badge>
                                            <Text size="sm" c="dimmed" mt={6}>
                                                {new Date(
                                                    job.created_at
                                                ).toLocaleString()}
                                            </Text>
                                        </div>

                                        {job.status === 'COMPLETED' && (
                                            <Button
                                                variant="light"
                                                onClick={() =>
                                                    navigate(
                                                        `/project/${projectId}/simulation/${job.id}`
                                                    )
                                                }
                                            >
                                                View Results
                                            </Button>
                                        )}
                                    </Group>
                                </Card>
                            ))}
                        </Stack>
                    </Tabs.Panel>
                </Tabs>
            </Container>
        </Box>
    );
}
