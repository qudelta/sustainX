import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Paper, Title, Text, Loader, Center, Alert } from '@mantine/core';
import { useAuthStore } from '../store/authStore';

export default function VerifyPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { verifyToken } = useAuthStore();
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setError('Invalid verification link');
            return;
        }

        verifyToken(token)
            .then(() => {
                navigate('/');
            })
            .catch((err) => {
                setError(err.response?.data?.detail || 'Verification failed. The link may have expired.');
            });
    }, [searchParams, verifyToken, navigate]);

    return (
        <Center style={{ minHeight: '100vh', background: '#f8f9fa' }}>
            <Container size={420}>
                <Paper radius="md" p="xl" withBorder>
                    <Title order={2} ta="center" mb="md">
                        Verifying...
                    </Title>

                    {error ? (
                        <Alert color="red" title="Verification Failed">
                            {error}
                        </Alert>
                    ) : (
                        <Center>
                            <Loader size="lg" />
                        </Center>
                    )}
                </Paper>
            </Container>
        </Center>
    );
}
