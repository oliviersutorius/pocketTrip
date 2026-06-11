import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Text, Card, TouchableRipple, FAB, ProgressBar, Divider } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { differenceInDays, parseISO, isAfter, isBefore, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ProjectTabProps } from '../navigation/types';
import { useProjectStore } from '../stores/projectStore';
import { useExpenseStore } from '../stores/expenseStore';
import { exportToPDF } from '../utils/pdfExport';
import { theme, spacing, radius, colors } from '../theme';

export default function SummaryScreen({ route, navigation }: ProjectTabProps<'Summary'>) {
  const { projectId } = route.params;
  const { projects } = useProjectStore();
  const { summary, participantSummary, expenses, totalSpent, loadExpenses, isLoading, loadedForProjectId } = useExpenseStore();
  const [exporting, setExporting] = useState(false);
  const [expandedParticipants, setExpandedParticipants] = useState<Set<number>>(new Set());

  async function handleExport() {
    if (!project) return;
    if (expenses.length === 0) {
      Alert.alert('Aucune dépense', "Ajoutez des dépenses avant d'exporter.");
      return;
    }
    Alert.alert(
      'Exporter en PDF',
      'Ce document contiendra vos données de budget et toutes vos dépenses. Partagez-le uniquement avec des personnes de confiance.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Exporter',
          onPress: async () => {
            setExporting(true);
            try {
              await exportToPDF(project, summary, expenses, totalSpent);
            } catch {
              Alert.alert('Erreur', 'Impossible de générer le PDF.');
            } finally {
              setExporting(false);
            }
          },
        },
      ]
    );
  }

  useFocusEffect(
    useCallback(() => {
      loadExpenses(projectId);
    }, [projectId])
  );

  // Hooks appelés inconditionnellement avant tout early return
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const spentToday = useMemo(
    () => expenses.filter((e) => e.date.startsWith(todayStr)).reduce((sum, e) => sum + e.amount, 0),
    [expenses, todayStr]
  );

  const participantBalances = useMemo(() => {
    if (participantSummary.length === 0) return [];
    const equalShare = totalSpent / participantSummary.length;
    return participantSummary.map((ps) => ({ ...ps, balance: ps.total - equalShare }));
  }, [participantSummary, totalSpent]);

  const transfers = useMemo(() => {
    if (participantBalances.length < 3) return [];
    const creditors = participantBalances
      .filter((p) => p.balance > 0.005)
      .map((p) => ({ id: p.participant_id, name: p.participant_name, balance: p.balance }));
    const debtors = participantBalances
      .filter((p) => p.balance < -0.005)
      .map((p) => ({ id: p.participant_id, name: p.participant_name, balance: p.balance }));
    const result: { fromId: number; fromName: string; toId: number; toName: string; amount: number }[] = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(-debtors[i].balance, creditors[j].balance);
      if (amount > 0.005) {
        result.push({ fromId: debtors[i].id, fromName: debtors[i].name, toId: creditors[j].id, toName: creditors[j].name, amount });
      }
      debtors[i].balance += amount;
      creditors[j].balance -= amount;
      if (Math.abs(debtors[i].balance) < 0.005) i++;
      if (Math.abs(creditors[j].balance) < 0.005) j++;
    }
    return result;
  }, [participantBalances]);

  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;

  if (isLoading && loadedForProjectId !== projectId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const remaining = project.initial_budget - totalSpent;
  const progress = Math.min(totalSpent / project.initial_budget, 1);

  const startDate = parseISO(project.start_date);
  const endDate = parseISO(project.end_date);
  const referenceDate = isBefore(today, startDate) ? startDate : today;
  const daysLeft = isAfter(endDate, referenceDate) ? differenceInDays(endDate, referenceDate) + 1 : 0;
  const budgetPerDay = daysLeft > 0 ? remaining / daysLeft : 0;
  const tripStarted = !isBefore(today, startDate);
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
            <ProgressBar
              progress={progress}
              color={progressColor}
              style={styles.progress}
              accessibilityLabel={`Budget utilisé à ${Math.round(progress * 100)} %`}
            />
            <View style={styles.row}>
              <Text variant="bodyMedium" style={styles.label}>Restant</Text>
              <Text variant="titleMedium" style={[styles.bold, { color: remaining >= 0 ? colors.budgetPositive : theme.colors.error }]}>
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
                  <Text variant="titleSmall" style={[styles.bold, { color: budgetPerDay >= 0 ? theme.colors.primary : theme.colors.error }]}>
                    {budgetPerDay.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}/j
                  </Text>
                </View>
                {tripStarted && (
                  <View style={styles.row}>
                    <Text variant="bodyMedium" style={styles.label}>
                      <MaterialCommunityIcons name="calendar-today" size={14} /> {todayLabel}
                    </Text>
                    <Text variant="titleSmall" style={[styles.bold, { color: theme.colors.onSurface }]}>
                      {spentToday.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}
                    </Text>
                  </View>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {participantBalances.length > 0 && (
          <Card style={[styles.card, styles.participantCard]}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Par participant</Text>
            </Card.Content>
            {participantBalances.map((ps, index) => {
              const isCollapsible = participantBalances.length >= 3;
              const isExpanded = expandedParticipants.has(ps.participant_id);
              const myTransfers = transfers.filter((t) => t.fromId === ps.participant_id || t.toId === ps.participant_id);

              const rowContent = (
                <View style={styles.participantRow}>
                  <Text variant="bodyMedium" style={styles.label}>{ps.participant_name}</Text>
                  <View style={styles.participantAmounts}>
                    <Text variant="bodyMedium" style={styles.spent}>
                      {ps.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}
                    </Text>
                    {participantBalances.length > 1 && (
                      <Text
                        variant="bodySmall"
                        style={[styles.balance, { color: ps.balance >= 0 ? colors.budgetPositive : theme.colors.error }]}
                      >
                        {` (${ps.balance >= 0 ? '+' : ''}${ps.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${project.currency})`}
                      </Text>
                    )}
                    {isCollapsible && (
                      <MaterialCommunityIcons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.textFaint}
                        style={{ marginLeft: 4 }}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      />
                    )}
                  </View>
                </View>
              );

              return (
                <View key={ps.participant_id}>
                  {index > 0 && <Divider />}
                  {isCollapsible ? (
                    <TouchableRipple
                      onPress={() => setExpandedParticipants((prev) => {
                        const next = new Set(prev);
                        next.has(ps.participant_id) ? next.delete(ps.participant_id) : next.add(ps.participant_id);
                        return next;
                      })}
                      accessibilityRole="button"
                      accessibilityLabel={`${ps.participant_name}, ${isExpanded ? 'réduire' : 'voir les remboursements'}`}
                    >
                      {rowContent}
                    </TouchableRipple>
                  ) : (
                    rowContent
                  )}
                  {isExpanded && myTransfers.map((t) => (
                    <View key={`${t.fromId}-${t.toId}`} style={styles.transferRow}>
                      <Text variant="bodySmall" style={styles.transferLabel}>
                        {t.toId === ps.participant_id ? `${t.fromName} lui doit` : `Doit à ${t.toName}`}
                      </Text>
                      <Text variant="bodySmall" style={styles.transferAmount}>
                        {t.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </Card>
        )}

        {categoryItems.length === 0 && !isLoading && (
          <Card style={styles.card}>
            <Card.Content style={styles.emptyCard}>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Aucune dépense enregistrée — appuyez sur + pour commencer.
              </Text>
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
                  accessibilityLabel={`${item.category_name}, ${item.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${project.currency}, voir le détail`}
                  accessibilityRole="button"
                >
                  <View style={styles.categoryRow}>
                    <Text variant="bodyLarge" style={styles.categoryName}>{item.category_name}</Text>
                    <View style={styles.categoryRight}>
                      <Text variant="bodyLarge" style={styles.categoryAmount}>
                        {item.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}
                      </Text>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textFaint} accessibilityElementsHidden importantForAccessibility="no" />
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
        accessibilityLabel="Ajouter une dépense"
      />
      <FAB
        icon={exporting ? 'loading' : 'file-pdf-box'}
        style={styles.fabPdf}
        size="small"
        onPress={handleExport}
        disabled={exporting}
        accessibilityLabel="Exporter en PDF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  list: { padding: spacing.md, paddingBottom: 100, gap: spacing.md },
  card: { borderRadius: radius.card, backgroundColor: theme.colors.surface },
  categoryCard: { overflow: 'hidden' },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', color: theme.colors.primary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  label: { color: colors.textMuted },
  spent: { fontFamily: 'Poppins_600SemiBold', color: theme.colors.onSurface },
  muted: { color: colors.textMuted },
  progress: { marginVertical: 8, height: 8, borderRadius: 4 },
  divider: { marginVertical: 8 },
  innerDivider: { marginVertical: 4 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  categoryName: { fontFamily: 'Poppins_600SemiBold', color: theme.colors.onSurface },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryAmount: { color: theme.colors.primary, fontFamily: 'Poppins_600SemiBold' },
  fab: { position: 'absolute', right: spacing.md, bottom: spacing.lg, backgroundColor: theme.colors.primary },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  fabPdf: { position: 'absolute', right: spacing.md, bottom: 90, backgroundColor: theme.colors.secondary },
  bold: { fontFamily: 'Poppins_600SemiBold' },
  participantCard: { overflow: 'hidden' },
  participantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  participantAmounts: { flexDirection: 'row', alignItems: 'center' },
  balance: { fontStyle: 'italic' },
  transferRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingLeft: 32, paddingVertical: 6, backgroundColor: theme.colors.background },
  transferLabel: { color: colors.textMuted, fontStyle: 'italic' },
  transferAmount: { color: theme.colors.onSurface },
});
