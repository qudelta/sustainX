import { Card, Title, Stack, Group, Text, ThemeIcon, Badge } from '@mantine/core';

const CATEGORY_COLORS = {
    windows: 'blue',
    walls: 'red',
    ventilation: 'grape',
    doors: 'yellow',
    floor: 'green',
    ceiling: 'orange',
};

export default function InsightsPanel({ insights }) {
    if (!insights || insights.length === 0) {
        return null;
    }

    return (
        <Card withBorder>
            <Title order={4} mb="md">💡 Improvement Suggestions</Title>
            <Stack gap="md">
                {insights.map((insight, index) => (
                    <Card key={index} withBorder padding="sm" bg="gray.0">
                        <Group justify="space-between" mb="xs">
                            <Badge color={CATEGORY_COLORS[insight.category] || 'gray'} variant="light">
                                {insight.category}
                            </Badge>
                            {insight.potential_savings_percent && (
                                <Text size="sm" c="green" fw={500}>
                                    ~{insight.potential_savings_percent.toFixed(0)}% savings
                                </Text>
                            )}
                        </Group>
                        <Text size="sm">{insight.message}</Text>
                    </Card>
                ))}
            </Stack>
        </Card>
    );
}
