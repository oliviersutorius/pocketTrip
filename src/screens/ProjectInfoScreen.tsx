import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, Divider, Chip } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ProjectTabProps } from '../navigation/types';
import { useProjectStore } from '../stores/projectStore';
import { useExpenseStore } from '../stores/expenseStore';
import { useParticipantStore } from '../stores/participantStore';
import { exportToPDF } from '../utils/pdfExport';
import { theme, spacing, radius } from '../theme';

export default function ProjectInfoScreen({ route, navigation }: ProjectTabProps<'ProjectInfo'>) {
  const { projectId } = route.params;
  const { projects, loadProjects, deleteProject } = useProjectStore();
  const { summary, expenses, totalSpent, loadExpenses } = useExpenseStore();
  const { participants, loadParticipants } = useParticipantStore();
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
      loadExpenses(projectId);
      loadParticipants(projectId);
    }, [projectId])
  );

  async function handleExport() {
    if (!project) return;
    if (expenses.length === 0) {
      Alert.alert('Aucune dépense', "Ajoutez des dépenses avant d'exporter.");
      return;
    }
    setExporting(true);
    try {
      await exportToPDF(project, summary, expenses, totalSpent);
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    } finally {
      setExporting(false);
    }
  }

  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;

  const start = parseISO(project.start_date);
  const end = parseISO(project.end_date);
  const duration = differenceInDays(end, start) + 1;

  function handleDelete() {
    Alert.alert(
      'Supprimer le voyage',
      `Supprimer "${project!.name}" et toutes ses dépenses ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteProject(projectId);
            navigation.getParent()?.navigate('Home');
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.projectName}>{project.name}</Text>
          <Divider style={styles.divider} />
          <Row label="Début" value={format(start, 'd MMMM yyyy', { locale: fr })} />
          <Row label="Fin" value={format(end, 'd MMMM yyyy', { locale: fr })} />
          <Row label="Durée" value={`${duration} jour${duration > 1 ? 's' : ''}`} />
          <Row label="Budget" value={`${project.initial_budget.toLocaleString('fr-FR')} ${project.currency}`} />
          {participants.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <Text variant="bodyMedium" style={styles.participantsLabel}>Participants</Text>
              <View style={styles.chips}>
                {participants.map((p) => (
                  <Chip key={p.id} style={styles.chip} textStyle={styles.chipText}>
                    {p.name}
                  </Chip>
                ))}
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        icon="pencil"
        style={styles.editButton}
        onPress={() => navigation.getParent()?.navigate('EditProject', { projectId })}
      >
        Modifier le voyage
      </Button>

      <Button
        mode="contained"
        icon={exporting ? 'loading' : 'file-pdf-box'}
        style={styles.exportButton}
        onPress={handleExport}
        disabled={exporting}
        buttonColor={theme.colors.secondary}
      >
        {exporting ? 'Génération...' : 'Exporter en PDF'}
      </Button>

      <Button
        mode="outlined"
        icon="delete"
        style={styles.deleteButton}
        textColor={theme.colors.error}
        onPress={handleDelete}
      >
        Supprimer le voyage
      </Button>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text variant="bodyMedium" style={rowStyles.label}>{label}</Text>
      <Text variant="bodyMedium" style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { color: '#666' },
  value: { fontFamily: 'Poppins_600SemiBold', color: theme.colors.onSurface },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.md, paddingBottom: 40 },
  card: { borderRadius: radius.card, backgroundColor: theme.colors.surface, marginBottom: spacing.lg },
  projectName: {
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.primary,
    marginBottom: spacing.sm,
  },
  divider: { marginBottom: spacing.sm },
  participantsLabel: { color: '#666', marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: theme.colors.background },
  chipText: { fontFamily: 'Poppins_400Regular' },
  editButton: {
    marginBottom: spacing.md,
    borderRadius: radius.button,
    backgroundColor: theme.colors.primary,
  },
  exportButton: {
    marginBottom: spacing.md,
    borderRadius: radius.button,
  },
  deleteButton: {
    borderRadius: radius.button,
    borderColor: theme.colors.error,
  },
});
