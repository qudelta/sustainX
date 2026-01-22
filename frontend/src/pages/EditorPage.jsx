import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Grid,
    Title,
    Button,
    Group,
    Stack,
    Card,
    Text,
    Loader,
    Center,
    Tabs,
    TextInput,
    NumberInput,
    Select,
    Divider,
    Badge,
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

    const { currentProject, fetchProject, updateFloorplan, isLoading } = useProjectStore();
    const { createJob, jobs, fetchProjectJobs } = useSimulationStore();

    const [floorplan, setFloorplan] = useState({
        walls: [],
        windows: [],
        doors: [],
        floor: { area: 20, u_value: 1.8, type: 'ground' },
        ceiling: { area: 20, u_value: 1.8, type: 'roof' },
        ventilation: { air_changes_per_hour: 0.5, exhaust_rate: 0 },
    });

    useEffect(() => {
        fetchProject(projectId);
        fetchProjectJobs(projectId);
    }, [projectId, fetchProject, fetchProjectJobs]);

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
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to save floorplan',
                color: 'red',
            });
        }
    };

    const handleRunSimulation = async (config) => {
        try {
            // Save floorplan first
            await updateFloorplan(projectId, floorplan);

            // Create simulation job
            const job = await createJob(projectId, config);
            navigate(`/project/${projectId}/simulation/${job.id}`);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.detail || 'Failed to start simulation',
                color: 'red',
            });
        }
    };

    if (isLoading || !currentProject) {
        return (
            <Center style={{ minHeight: 400 }}>
                <Loader size="lg" />
            </Center>
        );
    }

    return (
        <Container size="xl">
            <Group justify="space-between" mb="md">
                <div>
                    <Title order={2}>{currentProject.name}</Title>
                    <Text c="dimmed" size="sm">{currentProject.description}</Text>
                </div>
                <Group>
                    <Button variant="subtle" onClick={() => navigate('/')}>
                        ← Back
                    </Button>
                    <Button onClick={handleSave}>Save</Button>
                </Group>
            </Group>

            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List mb="md">
                    <Tabs.Tab value="floorplan">Floorplan</Tabs.Tab>
                    <Tabs.Tab value="simulate">Simulate</Tabs.Tab>
                    <Tabs.Tab value="history">
                        History {jobs.length > 0 && <Badge size="sm" ml="xs">{jobs.length}</Badge>}
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="floorplan">
                    <FloorplanEditor
                        floorplan={floorplan}
                        onChange={setFloorplan}
                    />
                </Tabs.Panel>

                <Tabs.Panel value="simulate">
                    <SimulationConfig onSubmit={handleRunSimulation} />
                </Tabs.Panel>

                <Tabs.Panel value="history">
                    <Stack>
                        {jobs.length === 0 ? (
                            <Text c="dimmed" ta="center" py="xl">
                                No simulations yet. Run your first simulation in the Simulate tab.
                            </Text>
                        ) : (
                            jobs.map((job) => (
                                <Card key={job.id} withBorder padding="md">
                                    <Group justify="space-between">
                                        <div>
                                            <Badge
                                                color={
                                                    job.status === 'COMPLETED' ? 'green' :
                                                        job.status === 'FAILED' ? 'red' :
                                                            job.status === 'RUNNING' ? 'blue' : 'gray'
                                                }
                                            >
                                                {job.status}
                                            </Badge>
                                            <Text size="sm" c="dimmed" mt="xs">
                                                {new Date(job.created_at).toLocaleString()}
                                            </Text>
                                        </div>
                                        {job.status === 'COMPLETED' && (
                                            <Button
                                                variant="light"
                                                onClick={() => navigate(`/project/${projectId}/simulation/${job.id}`)}
                                            >
                                                View Results
                                            </Button>
                                        )}
                                    </Group>
                                </Card>
                            ))
                        )}
                    </Stack>
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
}
