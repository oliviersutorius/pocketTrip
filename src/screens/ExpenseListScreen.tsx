import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Text, Card, FAB, Divider, IconButton, TouchableRipple, Snackbar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ProjectTabProps } from '../navigation/types';
import { useProjectStore } from '../stores/projectStore';
import { useExpenseStore } from '../stores/expenseStore';
import { theme, spacing, radius, colors } from '../theme';
import type { ExpenseWithDetails } from '../types';

interface DaySectionProps {
  dateKey: string;
  items: ExpenseWithDetails[];
  projectCurrency: string | undefined;
  isExpanded: boolean;
  isLoading: boolean;
  onToggle: (dateKey: string) => void;
  onEdit: (expenseId: number, projectId: number) => void;
  onDelete: (expense: ExpenseWithDetails) => void;
  projectId: number;
}

const DaySection = memo(function DaySection({
  dateKey, items, projectCurrency, isExpanded, isLoading, onToggle, onEdit, onDelete, projectId,
}: DaySectionProps) {
  const dayTotal = items.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Card style={[styles.dayCard, { overflow: 'hidden' }]}>
      <TouchableRipple onPress={() => onToggle(dateKey)} accessibilityLabel={`Section du ${dateKey}`}>
        <View style={styles.dayHeader}>
          <View>
            <Text variant="labelLarge" style={styles.dateLabel}>
              {format(parseISO(dateKey), 'EEEE d MMMM yyyy', { locale: fr })}
            </Text>
            <Text variant="bodySmall" style={styles.dayTotal}>
              {dayTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {projectCurrency}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color="#999"
          />
        </View>
      </TouchableRipple>

      {isExpanded && (
        <View>
          <Divider />
          {items.map((expense) => (
            <View key={expense.id} style={styles.expenseRow}>
              <View style={styles.expenseInfo}>
                <Text variant="bodyMedium" style={styles.expenseName}>{expense.subcategory_name}</Text>
                <Text variant="bodySmall" style={styles.expenseCategory}>
                  {expense.category_name}{expense.participant_name ? ` · ${expense.participant_name}` : ''}
                </Text>
                {expense.comment ? (
                  <Text variant="bodySmall" style={styles.expenseComment}>{expense.comment}</Text>
                ) : null}
              </View>
              <View style={styles.expenseRight}>
                <Text variant="bodyLarge" style={styles.expenseAmount}>
                  {expense.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {expense.currency}
                </Text>
                <IconButton
                  icon="pencil-outline"
                  size={18}
                  iconColor={theme.colors.primary}
                  disabled={isLoading}
                  accessibilityLabel={`Modifier la dépense ${expense.subcategory_name}`}
                  onPress={() => onEdit(expense.id, projectId)}
                />
                <IconButton
                  icon="delete-outline"
                  size={18}
                  iconColor={theme.colors.error}
                  disabled={isLoading}
                  accessibilityLabel={`Supprimer la dépense ${expense.subcategory_name}`}
                  onPress={() => onDelete(expense)}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
});

export default function ExpenseListScreen({ route, navigation }: ProjectTabProps<'ExpenseList'>) {
  const { projectId } = route.params;
  const { projects } = useProjectStore();
  const { expenses, totalSpent, loadExpenses, deleteExpense, isLoading, loadedForProjectId } = useExpenseStore();
  const isInitialLoading = isLoading && loadedForProjectId !== projectId;
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [snackVisible, setSnackVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadExpenses(projectId);
    }, [projectId])
  );

  const project = projects.find((p) => p.id === projectId);

  const sections = useMemo(() => {
    const grouped = expenses.reduce<Record<string, ExpenseWithDetails[]>>((acc, expense) => {
      const key = expense.date.slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key].push(expense);
      return acc;
    }, {});
    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
  }, [expenses]);

  const latestDate = sections.length > 0 ? sections[0][0] : null;
  useEffect(() => {
    setExpandedDate(latestDate);
  }, [latestDate]);

  const handleToggle = useCallback((dateKey: string) => {
    setExpandedDate((prev) => (prev === dateKey ? null : dateKey));
  }, []);

  const handleEdit = useCallback((expenseId: number, pId: number) => {
    navigation.getParent()?.navigate('EditExpense', { expenseId, projectId: pId });
  }, [navigation]);

  const handleDelete = useCallback((expense: ExpenseWithDetails) => {
    Alert.alert(
      'Supprimer la dépense',
      `Supprimer ${expense.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${expense.currency} — ${expense.subcategory_name} (${format(parseISO(expense.date.slice(0, 10)), 'd MMM yyyy', { locale: fr })}) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteExpense(expense.id, projectId);
            if (success) setSnackVisible(true);
          },
        },
      ]
    );
  }, [deleteExpense, projectId]);

  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={([date]) => date}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            {isInitialLoading
              ? <ActivityIndicator size="large" color={theme.colors.primary} />
              : <Text variant="bodyLarge" style={styles.emptyText}>Aucune dépense enregistrée</Text>
            }
          </View>
        }
        renderItem={({ item: [dateKey, items] }) => (
          <DaySection
            dateKey={dateKey}
            items={items}
            projectCurrency={project?.currency}
            isExpanded={expandedDate === dateKey}
            isLoading={isLoading}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
            projectId={projectId}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={
          expenses.length > 0 && project ? (
            <Card style={styles.footer}>
              <Card.Content>
                <View style={styles.footerRow}>
                  <Text variant="bodyMedium" style={styles.footerLabel}>Total dépensé</Text>
                  <Text variant="titleMedium" style={styles.footerTotal}>
                    {totalSpent.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}
                  </Text>
                </View>
                <Divider style={{ marginVertical: 8 }} />
                <View style={styles.footerRow}>
                  <Text variant="bodyMedium" style={styles.footerLabel}>Budget prévu</Text>
                  <Text variant="bodyMedium" style={styles.footerBudget}>
                    {project.initial_budget.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ) : null
        }
      />
      <FAB
        icon="plus"
        style={styles.fab}
        disabled={isLoading}
        accessibilityLabel="Ajouter une dépense"
        onPress={() => navigation.getParent()?.navigate('AddExpense', { projectId })}
      />
      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={2000}
      >
        Dépense supprimée
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  list: { padding: spacing.md, paddingBottom: 100 },
  dayCard: { borderRadius: radius.card, backgroundColor: theme.colors.surface },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateLabel: {
    color: theme.colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'capitalize',
  },
  dayTotal: { color: colors.textFaint, marginTop: 2 },
  expenseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 16 },
  expenseInfo: { flex: 1 },
  expenseName: { fontFamily: 'Poppins_600SemiBold', color: theme.colors.onSurface },
  expenseCategory: { color: colors.textFaint, marginTop: 2 },
  expenseComment: { color: colors.textComment, marginTop: 2, fontStyle: 'italic' },
  expenseRight: { flexDirection: 'row', alignItems: 'center' },
  expenseAmount: { color: theme.colors.primary, fontFamily: 'Poppins_600SemiBold' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: colors.textFaint },
  footer: {
    borderRadius: radius.card,
    backgroundColor: theme.colors.surface,
    marginBottom: spacing.md,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { color: colors.textMuted },
  footerTotal: { fontFamily: 'Poppins_600SemiBold', color: theme.colors.primary },
  footerBudget: { color: colors.textMuted },
  fab: { position: 'absolute', right: spacing.md, bottom: spacing.lg, backgroundColor: theme.colors.primary },
});
