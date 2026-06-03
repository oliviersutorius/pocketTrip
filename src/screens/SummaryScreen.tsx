import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, TouchableRipple, FAB, ProgressBar, Divider } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { differenceInDays, parseISO, isAfter, isBefore, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ProjectTabProps } from '../navigation/types';
import { useProjectStore } from '../stores/projectStore';
import { useExpenseStore } from '../stores/expenseStore';
import { exportToPDF } from '../utils/pdfExport';
import { theme, spacing, radius } from '../theme';

export default function SummaryScreen({ route, navigation }: ProjectTabProps<'Summary'>) {
  const { projectId } = route.params;
  const { projects } = useProjectStore();
  const { summary, participantSummary, expenses, totalSpent, loadExpenses } = useExpenseStore();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!project) return;
    if (expenses.length === 0) {
      Alert.alert('Aucune dépense', 'Ajoutez des dépenses avant d\'exporter.');
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

  useFocusEffect(
    useCallback(() => {
      loadExpenses(projectId);
    }, [projectId])
  );

  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;

  const remaining = project.initial_budget - totalSpent;
  const progress = Math.min(totalSpent / project.initial_budget, 1);

  const today = new Date();
  const startDate = parseISO(project.start_date);
  const endDate = parseISO(project.end_date);
  const referenceDate = isBefore(today, startDate) ? startDate : today;
  const daysLeft = isAfter(endDate, referenceDate) ? differenceInDays(endDate, referenceDate) + 1 : 0;
  const budgetPerDay = daysLeft > 0 ? remaining / daysLeft : 0;
  const tripStarted = !isBefore(today, startDate);

  const todayStr = format(today, 'yyyy-MM-dd');
  const spentToday = useMemo(
    () => expenses.filter((e) => e.date.startsWith(todayStr)).reduce((sum, e) => sum + e.amount, 0),
    [expenses, todayStr]
  );
  const todayLabel = format(today, 'd MMMM', { locale: fr });

  const progressColor = progress > 0.9 ? theme.colors.error : progress > 0.7 ? '#FF9800' : theme.colors.primary;
  const categoryItems = summary.filter((item) => item.total > 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Budget</Text>
            <View style={styles.row}>
              <Text variant="bodyMedium" style={styles.label}>Dépensé</Text>
              <Text variant="titleMedium" style={styles.spent}>
                {totalSpent.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}
              </Text>
            </View>
            <View style={styles.row}>
              <Text variant="bodyMedium" style={styles.label}>Budget initial</Text>
              <Text variant="bodyMedium" style={styles.muted}>
                {project.initial_budget.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}
              </Text>
            </View>
            <ProgressBar progress={progress} color={progressColor} style={styles.progress} />
            <View style={styles.row}>
              <Text variant="bodyMedium" style={styles.label}>Restant</Text>
              <Text variant="titleMedium" style={{ color: remaining >= 0 ? '#2E7D32' : theme.colors.error, fontFamily: 'Poppins_600SemiBold' }}>
                {remaining.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}
              </Text>
            </View>

            {daysLeft > 0 && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.row}>
                  <Text variant="bodyMedium" style={styles.label}>
                    <MaterialCommunityIcons name="calendar-clock" size={14} /> {daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}
                  </Text>
                  <Text variant="titleSmall" style={{ color: budgetPerDay >= 0 ? theme.colors.primary : theme.colors.error, fontFamily: 'Poppins_600SemiBold' }}>
                    {budgetPerDay.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}/j
                  </Text>
                </View>
                {tripStarted && (
                  <View style={styles.row}>
                    <Text variant="bodyMedium" style={styles.label}>
                      <MaterialCommunityIcons name="calendar-today" size={14} /> {todayLabel}
                    </Text>
                    <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontFamily: 'Poppins_600SemiBold' }}>
                      {spentToday.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}
                    </Text>
                  </View>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {participantSummary.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Par participant</Text>
              {participantSummary.map((ps, index) => (
                <View key={ps.participant_id}>
                  {index > 0 && <Divider style={styles.innerDivider} />}
                  <View style={styles.row}>
                    <Text variant="bodyMedium" style={styles.label}>{ps.participant_name}</Text>
                    <Text variant="bodyMedium" style={styles.spent}>
                      {ps.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}
                    </Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {categoryItems.length > 0 && (
          <Card style={[styles.card, styles.categoryCard]}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Par catégorie</Text>
            </Card.Content>
            {categoryItems.map((item, index) => (
              <View key={item.category_id}>
                {index > 0 && <Divider />}
                <TouchableRipple
                  onPress={() =>
                    navigation.getParent()?.navigate('CategoryDetail', {
                      categoryId: item.category_id,
                      categoryName: item.category_name,
                      projectId,
                    })
                  }
                >
                  <View style={styles.categoryRow}>
                    <Text variant="bodyLarge" style={styles.categoryName}>{item.category_name}</Text>
                    <View style={styles.categoryRight}>
                      <Text variant="bodyLarge" style={styles.categoryAmount}>
                        {item.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}
                      </Text>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
                    </View>
                  </View>
                </TouchableRipple>
              </View>
            ))}
          </Card>
        )}

      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.getParent()?.navigate('AddExpense', { projectId })}
      />
      <FAB
        icon={exporting ? 'loading' : 'file-pdf-box'}
        style={styles.fabPdf}
        size="small"
        onPress={handleExport}
        disabled={exporting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  list: { padding: spacing.md, paddingBottom: 100, gap: spacing.md },
  card: { borderRadius: radius.card, backgroundColor: theme.colors.surface },
  categoryCard: { overflow: 'hidden' },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', color: theme.colors.primary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  label: { color: '#666' },
  spent: { fontFamily: 'Poppins_600SemiBold', color: theme.colors.onSurface },
  muted: { color: '#666' },
  progress: { marginVertical: 8, height: 8, borderRadius: 4 },
  divider: { marginVertical: 8 },
  innerDivider: { marginVertical: 4 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  categoryName: { fontFamily: 'Poppins_600SemiBold', color: theme.colors.onSurface },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryAmount: { color: theme.colors.primary, fontFamily: 'Poppins_600SemiBold' },
  fab: { position: 'absolute', right: spacing.md, bottom: spacing.lg, backgroundColor: theme.colors.primary },
  fabPdf: { position: 'absolute', right: spacing.md, bottom: 90, backgroundColor: theme.colors.secondary },
});
