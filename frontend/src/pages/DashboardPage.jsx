import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    Button,
    Card,
    Group,
    Stack,
    Modal,
    TextInput,
    Textarea,
    SimpleGrid,
    ActionIcon,
    Menu,
    Loader,
    Center,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useProjectStore } from '../store/projectStore';

export default function DashboardPage() {
    const navigate = useNavigate();
    const [opened, { open, close }] = useDisclosure(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const { projects, isLoading, fetchProjects, createProject, deleteProject } = useProjectStore();

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const handleCreate = async () => {
        if (!name.trim()) return;

        setIsCreating(true);
        try {
            const project = await createProject({ name, description });
            close();
            setName('');
            setDescription('');
            navigate(`/project/${project.id}`);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to create project',
                color: 'red',
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (projectId) => {
        if (!confirm('Are you sure you want to delete this project?')) return;

        try {
            await deleteProject(projectId);
            notifications.show({
                title: 'Deleted',
                message: 'Project deleted successfully',
                color: 'green',
            });
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: 'Failed to delete project',
                color: 'red',
            });
        }
    };

    if (isLoading) {
        return (
            <Center style={{ minHeight: 400 }}>
                <Loader size="lg" />
            </Center>
        );
    }

    return (
        <Container size="lg">
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2}>My Projects</Title>
                    <Text c="dimmed">Manage your thermal simulation projects</Text>
                </div>
                <Button onClick={open}>+ New Project</Button>
            </Group>

            {projects.length === 0 ? (
                <Card withBorder padding="xl" ta="center">
                    <Text c="dimmed" size="lg" mb="md">
                        No projects yet
                    </Text>
                    <Button onClick={open}>Create your first project</Button>
                </Card>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                    {projects.map((project) => (
                        <Card key={project.id} withBorder shadow="sm" padding="lg">
                            <Group justify="space-between" mb="xs">
                                <Text fw={500} lineClamp={1}>
                                    {project.name}
                                </Text>
                                <Menu shadow="md" width={150}>
                                    <Menu.Target>
                                        <ActionIcon variant="subtle" color="gray">
                                            ⋮
                                        </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Item onClick={() => navigate(`/project/${project.id}`)}>
                                            Open
                                        </Menu.Item>
                                        <Menu.Item color="red" onClick={() => handleDelete(project.id)}>
                                            Delete
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>

                            <Text size="sm" c="dimmed" lineClamp={2} mb="md">
                                {project.description || 'No description'}
                            </Text>

                            <Text size="xs" c="dimmed">
                                Updated: {new Date(project.updated_at).toLocaleDateString()}
                            </Text>

                            <Button
                                variant="light"
                                fullWidth
                                mt="md"
                                onClick={() => navigate(`/project/${project.id}`)}
                            >
                                Open Editor
                            </Button>
                        </Card>
                    ))}
                </SimpleGrid>
            )}

            <Modal opened={opened} onClose={close} title="Create New Project">
                <Stack>
                    <TextInput
                        label="Project Name"
                        placeholder="My Building Simulation"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <Textarea
                        label="Description"
                        placeholder="Optional description..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <Group justify="flex-end">
                        <Button variant="subtle" onClick={close}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} loading={isCreating}>
                            Create
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}
