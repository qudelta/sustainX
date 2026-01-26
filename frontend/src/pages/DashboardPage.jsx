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
    Box,
    ThemeIcon,
    Badge,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
    IconPlus,
    IconFolder,
    IconDotsVertical,
    IconTrash,
    IconEdit,
} from '@tabler/icons-react';
import { useProjectStore } from '../store/projectStore';

export default function DashboardPage() {
    const navigate = useNavigate();
    const [opened, { open, close }] = useDisclosure(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const { projects, isLoading, fetchProjects, createProject, deleteProject } =
        useProjectStore();

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
        } catch {
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
        if (!confirm('Delete this project?')) return;
        try {
            await deleteProject(projectId);
            notifications.show({
                title: 'Deleted',
                message: 'Project deleted successfully',
                color: 'green',
            });
        } catch {
            notifications.show({
                title: 'Error',
                message: 'Failed to delete project',
                color: 'red',
            });
        }
    };

    if (isLoading) {
        return (
            <Center h={420}>
                <Loader size="lg" />
            </Center>
        );
    }

    return (
        <Box
            style={{
                minHeight: '100vh',
                background:
                    'radial-gradient(circle at top, #eef6ff, #f8fafc 40%, #ffffff)',
                paddingBottom: 60,
            }}
        >
            <Container size="xl" pt="xl">
                {/* HEADER */}
                <Box
                    mb="xl"
                    p="xl"
                    style={{
                        borderRadius: 20,
                        background:
                            'linear-gradient(135deg, #e3f2ff, #f0f9ff)',
                        boxShadow:
                            '0 20px 40px rgba(0, 0, 0, 0.08)',
                    }}
                >
                    <Group justify="space-between">
                        <div>
                            <Title order={2}>My Projects</Title>
                            <Text c="dimmed">
                                Manage and run thermal simulations for your buildings
                            </Text>
                        </div>

                        <Button
                            leftSection={<IconPlus size={18} />}
                            radius="md"
                            size="md"
                            onClick={open}
                        >
                            New Project
                        </Button>
                    </Group>
                </Box>

                {/* PROJECTS */}
                {projects.length === 0 ? (
                    <Card
                        withBorder
                        radius="xl"
                        p="xl"
                        ta="center"
                        style={{
                            background:
                                'linear-gradient(180deg, #ffffff, #f8fafc)',
                        }}
                    >
                        <ThemeIcon
                            size={72}
                            radius="xl"
                            variant="light"
                            color="blue"
                            mb="md"
                        >
                            <IconFolder size={36} />
                        </ThemeIcon>
                        <Title order={4}>No projects yet</Title>
                        <Text c="dimmed" mb="lg">
                            Create your first thermal simulation project
                        </Text>
                        <Button onClick={open}>Create Project</Button>
                    </Card>
                ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
                        {projects.map((project) => (
                            <Card
                                key={project.id}
                                radius="xl"
                                padding="xl"
                                withBorder
                                style={{
                                    height: 220,
                                    cursor: 'pointer',
                                    background:
                                        'linear-gradient(180deg, #ffffff, #f9fafb)',
                                    boxShadow:
                                        '0 12px 30px rgba(0,0,0,0.08)',
                                    transition:
                                        'transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform =
                                        'translateY(-10px) scale(1.02)';
                                    e.currentTarget.style.boxShadow =
                                        '0 28px 60px rgba(0,0,0,0.15)';
                                    e.currentTarget.style.background =
                                        'linear-gradient(180deg, #e6f4ff, #ffffff)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform =
                                        'translateY(0) scale(1)';
                                    e.currentTarget.style.boxShadow =
                                        '0 12px 30px rgba(0,0,0,0.08)';
                                    e.currentTarget.style.background =
                                        'linear-gradient(180deg, #ffffff, #f9fafb)';
                                }}
                            >
                                <Group justify="space-between" mb="md">
                                    <Group>
                                        <ThemeIcon
                                            size={42}
                                            radius="md"
                                            variant="light"
                                            color="blue"
                                        >
                                            <IconFolder size={22} />
                                        </ThemeIcon>
                                        <Text fw={700} size="lg">
                                            {project.name}
                                        </Text>
                                    </Group>

                                    <Menu shadow="md" width={160}>
                                        <Menu.Target>
                                            <ActionIcon variant="subtle">
                                                <IconDotsVertical size={18} />
                                            </ActionIcon>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            <Menu.Item
                                                leftSection={<IconEdit size={14} />}
                                                onClick={() =>
                                                    navigate(`/project/${project.id}`)
                                                }
                                            >
                                                Open Editor
                                            </Menu.Item>
                                            <Menu.Item
                                                color="red"
                                                leftSection={<IconTrash size={14} />}
                                                onClick={() =>
                                                    handleDelete(project.id)
                                                }
                                            >
                                                Delete
                                            </Menu.Item>
                                        </Menu.Dropdown>
                                    </Menu>
                                </Group>

                                <Text
                                    size="sm"
                                    c="dimmed"
                                    lineClamp={2}
                                    mb="md"
                                >
                                    {project.description || 'No description provided'}
                                </Text>

                                <Group justify="space-between">
                                    <Badge radius="sm" variant="light">
                                        Updated{' '}
                                        {new Date(
                                            project.updated_at
                                        ).toLocaleDateString()}
                                    </Badge>

                                    <Button
                                        variant="light"
                                        onClick={() =>
                                            navigate(`/project/${project.id}`)
                                        }
                                    >
                                        Open Editor
                                    </Button>
                                </Group>
                            </Card>
                        ))}
                    </SimpleGrid>
                )}

                {/* MODAL */}
                <Modal
                    opened={opened}
                    onClose={close}
                    title="Create New Project"
                    centered
                    radius="lg"
                >
                    <Stack>
                        <TextInput
                            label="Project Name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <Textarea
                            label="Description"
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
        </Box>
    );
}
