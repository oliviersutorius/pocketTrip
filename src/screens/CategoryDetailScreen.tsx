import { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, TouchableRipple, Divider } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { RootStackProps } from '../navigation/types';
import { useExpenseStore } from '../stores/expenseStore';
import { useProjectStore } from '../stores/projectStore';
import { theme, spacing, radius, colors } from '../theme';

export default function CategoryDetailScreen({ route }: RootStackProps<'CategoryDetail'>) {
  const { categoryId, projectId } = route.params;
  const { summary, expenses, loadExpenses } = useExpenseStore();
  const { projects } = useProjectStore();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadExpenses(projectId);
    }, [projectId])
  );

  const project = projects.find((p) => p.id === projectId);
  const categorySummary = summary.find((s) => s.category_id === categoryId);

  if (!categorySummary || !project) return null;

  const subcategories = categorySummary.subcategories.filter((s) => s.total > 0);

  const expensesBySubcategory = useMemo(() => {
    const map = new Map<number, typeof expenses>();
    for (const e of expenses) {
      if (!map.has(e.subcategory_id)) map.set(e.subcategory_id, []);
      map.get(e.subcategory_id)!.push(e);
    }
    return map;
  }, [expenses]);

  if (subcategories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodyLarge" style={styles.emptyText}>
          Aucune dépense dans la catégorie {categorySummary.category_name}
        </Text>
      </View>
    );
  }

  function toggle(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>

        <Card style={styles.totalCard}>
          <Card.Content style={styles.totalRow}>
            <Text variant="bodyMedium" style={styles.totalLabel}>Total {categorySummary.category_name}</Text>
            <Text variant="titleMedium" style={styles.totalAmount}>
              {categorySummary.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.card, styles.accordionCard]}>
          {subcategories.map((sub, index) => {
            const isExpanded = expandedId === sub.subcategory_id;
            const subExpenses = expensesBySubcategory.get(sub.subcategory_id) ?? [];

            return (
              <View key={sub.subcategory_id}>
                {index > 0 && <Divider />}
                <TouchableRipple onPress={() => toggle(sub.subcategory_id)}>
                  <View style={styles.subRow}>
                    <Text variant="bodyLarge" style={styles.subName}>{sub.subcategory_name}</Text>
                    <View style={styles.subRight}>
                      <Text variant="bodyLarge" style={styles.subAmount}>
                        {sub.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {project.currency}
                      </Text>
                      <MaterialCommunityIcons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.textFaint}
                      />
                    </View>
                  </View>
                </TouchableRipple>

                {isExpanded && (
                  <View style={styles.expenseList}>
                    {subExpenses.map((expense, i) => (
                      <View key={expense.id}>
                        {i > 0 && <Divider style={styles.expenseDivider} />}
                        <View style={styles.expenseRow}>
                          <View>
                            <Text variant="bodySmall" style={styles.expenseDate}>
                              {format(parseISO(expense.date), 'd MMM yyyy', { locale: fr })}
                            </Text>
                            {expense.comment ? (
                              <Text variant="bodySmall" style={styles.expenseComment}>{expense.comment}</Text>
                            ) : null}
                          </View>
                          <Text variant="bodyMedium" style={styles.expenseAmount}>
                            {expense.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {expense.currency}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </Card>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: theme.colors.background },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  list: { padding: spacing.md, gap: spacing.md },
  totalCard: {
    borderRadius: radius.card,
    backgroundColor: theme.colors.primary,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#FFFFFF', opacity: 0.85 },
  totalAmount: { color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' },
  card: { borderRadius: radius.card, backgroundColor: theme.colors.surface },
  accordionCard: { overflow: 'hidden' },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  subName: { fontFamily: 'Poppins_600SemiBold', color: theme.colors.onSurface, flex: 1 },
  subRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subAmount: { fontFamily: 'Poppins_600SemiBold', color: theme.colors.primary },
  expenseList: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  expenseDivider: { opacity: 0.4 },
  expenseDate: { color: colors.textDark, fontFamily: 'Poppins_400Regular' },
  expenseComment: { color: colors.textComment, fontFamily: 'Poppins_400Regular', fontStyle: 'italic' },
  expenseAmount: { fontFamily: 'Poppins_600SemiBold', color: theme.colors.onSurface },
});
