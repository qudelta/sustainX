import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Paper,
    Title,
    Text,
    TextInput,
    Button,
    Stack,
    Alert,
    Center,
    Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const navigate = useNavigate();
    const { requestMagicLink, isAuthenticated } = useAuthStore();

    // Redirect if already authenticated
    if (isAuthenticated) {
        navigate('/');
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await requestMagicLink(email);
            setSent(true);
            notifications.show({
                title: 'Check your email',
                message: 'A login link has been sent to your email address.',
                color: 'green',
            });
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.detail || 'Failed to send login link',
                color: 'red',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Container size={420}>
                <Paper radius="md" p="xl" withBorder shadow="xl">
                    <Title order={2} ta="center" mb="md">
                        🏠 Thermal Simulation
                    </Title>
                    <Text c="dimmed" size="sm" ta="center" mb="xl">
                        Enter your email to receive a magic login link
                    </Text>

                    {sent ? (
                        <Stack>
                            <Alert color="green" title="Email Sent">
                                Check your inbox for the login link. It expires in 15 minutes.
                            </Alert>
                            <Button variant="subtle" onClick={() => setSent(false)}>
                                Send another link
                            </Button>
                        </Stack>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <Stack>
                                <TextInput
                                    label="Email"
                                    placeholder="you@example.com"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <Button type="submit" loading={isLoading} fullWidth>
                                    Send Magic Link
                                </Button>
                            </Stack>
                        </form>
                    )}
                </Paper>
            </Container>
        </Box>
    );
}
