import { Outlet, useNavigate } from 'react-router-dom';
import {
    AppShell,
    Burger,
    Group,
    Title,
    Button,
    Text,
    Menu,
    Avatar,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '../../store/authStore';

export default function AppLayout() {
    const [opened, { toggle }] = useDisclosure();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <AppShell
            header={{ height: 60 }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                        <Title
                            order={3}
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate('/')}
                        >
                            🏠 Thermal Sim
                        </Title>
                    </Group>

                    <Group>
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <Button variant="subtle" leftSection={<Avatar size="sm" />}>
                                    {user?.email}
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Account</Menu.Label>
                                <Menu.Item onClick={handleLogout} color="red">
                                    Logout
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}
