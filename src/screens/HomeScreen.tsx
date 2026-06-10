import React, { memo, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Card, Text, FAB, Chip } from 'react-native-paper';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RootStackProps } from '../navigation/types';
import { useProjectStore } from '../stores/projectStore';
import { theme, spacing, radius, colors } from '../theme';
import type { Project } from '../types';

interface ProjectCardProps {
  item: Project;
  onPress: (id: number) => void;
}

const ProjectCard = memo(function ProjectCard({ item, onPress }: ProjectCardProps) {
  const start = parseISO(item.start_date);
  const end = parseISO(item.end_date);
  const duration = differenceInDays(end, start) + 1;
  const dateLabel = `${format(start, 'd MMM', { locale: fr })} → ${format(end, 'd MMM yyyy', { locale: fr })}`;

  return (
    <Card
      style={styles.card}
      onPress={() => onPress(item.id)}
      accessibilityLabel={`Voyage ${item.name}, ${dateLabel}`}
    >
      <Card.Content>
        <Text variant="titleLarge" style={styles.cardTitle}>{item.name}</Text>
        <Text variant="bodyMedium" style={styles.cardDate}>{dateLabel}</Text>
        <View style={styles.chips}>
          <Chip icon="calendar-range" compact style={styles.chip}>
            {duration} jour{duration > 1 ? 's' : ''}
          </Chip>
          <Chip icon="wallet-outline" compact style={styles.chip}>
            {item.initial_budget.toLocaleString('fr-FR')} {item.currency}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );
});

export default function HomeScreen({ navigation }: RootStackProps<'Home'>) {
  const { projects } = useProjectStore();

  const handlePress = useCallback((id: number) => {
    navigation.navigate('ProjectTabs', { projectId: id });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="headlineSmall" style={styles.emptyTitle}>Aucun voyage</Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Appuyez sur + pour créer votre premier voyage
            </Text>
          </View>
        }
        renderItem={({ item }) => <ProjectCard item={item} onPress={handlePress} />}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateProject')}
        label="Nouveau voyage"
        accessibilityLabel="Créer un nouveau voyage"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  list: { padding: spacing.md, paddingBottom: 100 },
  card: {
    marginBottom: spacing.md,
    borderRadius: radius.card,
    backgroundColor: theme.colors.surface,
  },
  cardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  cardDate: { color: colors.textMuted, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.surfaceHighlight },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.primary,
    marginBottom: spacing.sm,
  },
  emptyText: { textAlign: 'center', color: colors.textMuted },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    backgroundColor: theme.colors.primary,
  },
});
