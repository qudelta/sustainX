import { useMemo } from 'react';
import {
  Card,
  Title,
  Stack,
  Group,
  Text,
  Badge,
  ThemeIcon,
  Transition,
} from '@mantine/core';
import {
  IconWindow,
  IconWall,
  IconWind,
  IconDoor,
  IconLayersIntersect,
  IconBuilding,
} from '@tabler/icons-react';

/* ---------------- NORMALIZE CATEGORY ---------------- */

function normalizeCategory(raw) {
  if (!raw) return 'other';

  const value = raw.toLowerCase();

  if (
    value === 'ventilation' ||
    value === 'ventialtion' || // typo support
    value.includes('vent') ||
    value.includes('air')
  ) {
    return 'ventilation';
  }

  if (value.includes('wall')) return 'walls';
  if (value.includes('window')) return 'windows';
  if (value.includes('door')) return 'doors';
  if (value.includes('floor')) return 'floor';
  if (value.includes('ceiling') || value.includes('roof'))
    return 'ceiling';

  return value;
}

/* ---------------- CATEGORY META ---------------- */

const CATEGORY_META = {
  windows: { color: 'blue', icon: IconWindow },
  walls: { color: 'red', icon: IconWall },
  ventilation: { color: 'grape', icon: IconWind },
  doors: { color: 'yellow', icon: IconDoor },
  floor: { color: 'green', icon: IconLayersIntersect },
  ceiling: { color: 'orange', icon: IconBuilding },
};

function formatCategory(category) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/* ---------------- COMPONENT ---------------- */

export default function InsightsPanel({ insights }) {
  if (!insights || insights.length === 0) {
    return null;
  }

  const normalizedInsights = useMemo(() => {
    return insights.map((insight) => ({
      ...insight,
      _normalizedCategory: normalizeCategory(insight.category),
    }));
  }, [insights]);

  const sortedInsights = useMemo(() => {
    return [...normalizedInsights].sort(
      (a, b) =>
        (b.potential_savings_percent || 0) -
        (a.potential_savings_percent || 0)
    );
  }, [normalizedInsights]);

  return (
    <Card
      withBorder
      radius="lg"
      padding="lg"
      style={{
        background: 'linear-gradient(180deg, #ffffff, #f8fafc)',
      }}
    >
      <Title order={4} mb="md" fw={700}>
        💡 Improvement Suggestions
      </Title>

      <Stack gap="md">
        {sortedInsights.map((insight, index) => {
          const category = insight._normalizedCategory;
          const meta = CATEGORY_META[category] || {};
          const Icon = meta.icon;
          const savings = insight.potential_savings_percent || 0;

          const isMostImpactful = index === 0 && savings > 0;

          // 🔥 WALLS + VENTILATION ALWAYS HIGH-IMPACT
          const isHighImpact =
            category === 'walls' || category === 'ventilation';

          const content = (
            <Card
              withBorder
              radius="md"
              padding="sm"
              style={{
                background: isMostImpactful
                  ? 'linear-gradient(135deg, #ecfdf5, #f0fdf4)'
                  : '#ffffff',
                borderColor: isMostImpactful ? '#86efac' : undefined,
              }}
            >
              <Group justify="space-between" mb={6}>
                <Group gap="xs">
                  {Icon && (
                    <ThemeIcon
                      size="sm"
                      variant="light"
                      color={meta.color}
                    >
                      <Icon size={14} />
                    </ThemeIcon>
                  )}

                  <Badge
                    color={meta.color || 'gray'}
                    variant="light"
                  >
                    {formatCategory(category)}
                  </Badge>

                  {isMostImpactful && (
                    <Badge color="green" variant="filled">
                      Most Impactful
                    </Badge>
                  )}
                </Group>

                {savings > 0 && (
                  <Badge color="green" variant="light">
                    ~{savings.toFixed(0)}% savings
                  </Badge>
                )}
              </Group>

              <Text size="sm" lh={1.5}>
                {insight.message}
              </Text>
            </Card>
          );

          return isHighImpact ? (
            <Transition
              key={index}
              mounted
              transition="pop"
              duration={300}
            >
              {(styles) => (
                <div style={styles}>{content}</div>
              )}
            </Transition>
          ) : (
            <div key={index}>{content}</div>
          );
        })}
      </Stack>
    </Card>
  );
}
