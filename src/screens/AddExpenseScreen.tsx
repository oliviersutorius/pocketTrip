import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RootStackProps } from '../navigation/types';
import { parseAmount } from '../utils/validation';
import { useExpenseStore } from '../stores/expenseStore';
import { getCategories, getSubcategories, getAllSubcategories, getExpense, getParticipants } from '../db/database';
import CurrencyPicker from '../components/CurrencyPicker';
import { theme, spacing, radius } from '../theme';
import type { Participant } from '../types';

type Props = RootStackProps<'AddExpense'> | RootStackProps<'EditExpense'>;

export default function AddExpenseScreen({ route, navigation }: Props) {
  const params = route.params as { projectId: number; expenseId?: number };
  const { projectId, expenseId } = params;
  const isEdit = !!expenseId;

  const { addExpense, updateExpense } = useExpenseStore();
  const [categories] = useState(() => getCategories());
  const [participants] = useState<Participant[]>(() => getParticipants(projectId));

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [comment, setComment] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEdit && expenseId) {
      const expense = getExpense(expenseId);
      if (expense) {
        setDate(parseISO(expense.date));
        setAmount(String(expense.amount));
        setCurrency(expense.currency);
        setComment(expense.comment ?? '');
        setSelectedSubcategoryId(expense.subcategory_id);
        setSelectedParticipantId(expense.participant_id);
        const sub = getAllSubcategories().find((s) => s.id === expense.subcategory_id);
        if (sub) setSelectedCategoryId(sub.category_id);
      }
    }
  }, []);

  const subcategories = useMemo(
    () => (selectedCategoryId ? getSubcategories(selectedCategoryId) : []),
    [selectedCategoryId]
  );

  function validate() {
    const e: Record<string, string> = {};
    const a = parseAmount(amount);
    if (a === null || a <= 0) e.amount = 'Montant invalide';
    if (!selectedCategoryId) e.category = 'Choisissez une catégorie';
    if (!selectedSubcategoryId) e.subcategory = 'Choisissez une sous-catégorie';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    if (isEdit && expenseId) {
      updateExpense(expenseId, projectId, {
        subcategory_id: selectedSubcategoryId!,
        participant_id: selectedParticipantId,
        amount: parseAmount(amount)!,
        currency,
        date: format(date, 'yyyy-MM-dd'),
        comment: comment.trim() || null,
      });
    } else {
      addExpense({
        project_id: projectId,
        subcategory_id: selectedSubcategoryId!,
        participant_id: selectedParticipantId,
        amount: parseAmount(amount)!,
        currency,
        date: format(date, 'yyyy-MM-dd'),
        comment: comment.trim() || null,
      });
    }
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Button
        mode="outlined"
        icon="calendar"
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
      >
        Date : {format(date, 'd MMMM yyyy', { locale: fr })}
      </Button>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_, d) => {
            setShowDatePicker(false);
            if (d) setDate(d);
          }}
        />
      )}

      <TextInput
        label="Montant"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        style={styles.input}
        error={!!errors.amount}
        right={<TextInput.Affix text={currency} />}
      />
      {errors.amount && <HelperText type="error">{errors.amount}</HelperText>}

      <CurrencyPicker value={currency} onChange={setCurrency} label="Devise" />

      <Text variant="labelLarge" style={styles.sectionLabel}>Catégorie</Text>
      {errors.category && <HelperText type="error">{errors.category}</HelperText>}
      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            mode={selectedCategoryId === cat.id ? 'contained' : 'outlined'}
            onPress={() => {
              setSelectedCategoryId(cat.id);
              setSelectedSubcategoryId(null);
            }}
            style={styles.categoryButton}
            compact
          >
            {cat.name}
          </Button>
        ))}
      </View>

      {subcategories.length > 0 && (
        <>
          <Text variant="labelLarge" style={styles.sectionLabel}>Sous-catégorie</Text>
          {errors.subcategory && <HelperText type="error">{errors.subcategory}</HelperText>}
          <View style={styles.categoryGrid}>
            {subcategories.map((sub) => (
              <Button
                key={sub.id}
                mode={selectedSubcategoryId === sub.id ? 'contained' : 'outlined'}
                onPress={() => setSelectedSubcategoryId(sub.id)}
                style={styles.categoryButton}
                compact
              >
                {sub.name}
              </Button>
            ))}
          </View>
        </>
      )}

      {participants.length > 0 && (
        <>
          <Text variant="labelLarge" style={styles.sectionLabel}>Payé par</Text>
          <View style={styles.categoryGrid}>
            <Button
              mode={selectedParticipantId === null ? 'contained' : 'outlined'}
              onPress={() => setSelectedParticipantId(null)}
              style={styles.categoryButton}
              compact
              buttonColor={selectedParticipantId === null ? '#666' : undefined}
            >
              Personne
            </Button>
            {participants.map((p) => (
              <Button
                key={p.id}
                mode={selectedParticipantId === p.id ? 'contained' : 'outlined'}
                onPress={() => setSelectedParticipantId(p.id)}
                style={styles.categoryButton}
                compact
              >
                {p.name}
              </Button>
            ))}
          </View>
        </>
      )}

      <Text variant="labelLarge" style={styles.sectionLabel}>Commentaire</Text>
      <TextInput
        label="Optionnel — ex : restaurant du midi, plein d'essence..."
        value={comment}
        onChangeText={setComment}
        mode="outlined"
        style={styles.commentInput}
        multiline
        numberOfLines={3}
      />

      <Button
        mode="contained"
        onPress={handleSave}
        style={styles.saveButton}
        contentStyle={styles.saveButtonContent}
      >
        {isEdit ? 'Enregistrer les modifications' : 'Enregistrer la dépense'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.md, paddingBottom: 40 },
  dateButton: { marginVertical: 6 },
  input: { marginVertical: 6, backgroundColor: theme.colors.surface },
  sectionLabel: {
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.onBackground,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { marginBottom: 4 },
  commentInput: { marginTop: 6, backgroundColor: theme.colors.surface },
  saveButton: {
    marginTop: spacing.xl,
    borderRadius: radius.button,
    backgroundColor: theme.colors.primary,
  },
  saveButtonContent: { paddingVertical: 6 },
});
