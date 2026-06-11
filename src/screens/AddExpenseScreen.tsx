import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RootStackProps } from '../navigation/types';
import { parseAmount } from '../utils/validation';
import { validateExpense } from '../utils/expenseValidation';
import { useExpenseStore } from '../stores/expenseStore';
import { getCategories, getSubcategories, getAllSubcategories, getExpense, getParticipants } from '../db/database';
import CurrencyPicker, { getCurrencySymbol } from '../components/CurrencyPicker';
import OptionPicker from '../components/OptionPicker';
import { theme, spacing, radius, colors } from '../theme';
import type { Category, Subcategory, Participant } from '../types';

type Props = RootStackProps<'AddExpense'> | RootStackProps<'EditExpense'>;

export default function AddExpenseScreen({ route, navigation }: Props) {
  const params = route.params as { projectId: number; expenseId?: number };
  const { projectId, expenseId } = params;
  const isEdit = !!expenseId;

  const { addExpense, updateExpense, isLoading } = useExpenseStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [comment, setComment] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      const [cats, parts] = await Promise.all([
        getCategories(),
        getParticipants(projectId),
      ]);
      setCategories(cats);
      setParticipants(parts);

      if (!isEdit && parts.length === 1) {
        setSelectedParticipantId(parts[0].id);
      }

      if (isEdit && expenseId) {
        const expense = await getExpense(expenseId);
        if (expense) {
          setDate(parseISO(expense.date));
          setAmount(String(expense.amount));
          setCurrency(expense.currency);
          setComment(expense.comment ?? '');
          setSelectedSubcategoryId(expense.subcategory_id);
          setSelectedParticipantId(expense.participant_id);
          const allSubs = await getAllSubcategories();
          const sub = allSubs.find((s) => s.id === expense.subcategory_id);
          if (sub) setSelectedCategoryId(sub.category_id);
        }
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      getSubcategories(selectedCategoryId).then(setSubcategories);
    } else {
      setSubcategories([]);
    }
  }, [selectedCategoryId]);

  function validate() {
    const e = validateExpense(amount, selectedCategoryId, selectedSubcategoryId);
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    let success: boolean;
    if (isEdit && expenseId) {
      success = await updateExpense(expenseId, projectId, {
        subcategory_id: selectedSubcategoryId!,
        participant_id: selectedParticipantId,
        amount: parseAmount(amount)!,
        currency,
        date: format(date, 'yyyy-MM-dd'),
        comment: comment.trim() || null,
      });
    } else {
      success = await addExpense({
        project_id: projectId,
        subcategory_id: selectedSubcategoryId!,
        participant_id: selectedParticipantId,
        amount: parseAmount(amount)!,
        currency,
        date: format(date, 'yyyy-MM-dd'),
        comment: comment.trim() || null,
      });
    }
    if (success) navigation.goBack();
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
          display="default"
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
        mode="outlined"
        style={styles.input}
        error={!!errors.amount}
        right={
          <TextInput.Icon
            icon={({ color, size }) => (
              <View style={styles.currencyTrigger}>
                <Text style={[styles.currencySymbol, { color }]}>{getCurrencySymbol(currency)}</Text>
                <MaterialCommunityIcons name="menu-down" size={16} color={color} />
              </View>
            )}
            onPress={() => setCurrencyPickerVisible(true)}
          />
        }
      />
      {errors.amount && <HelperText type="error">{errors.amount}</HelperText>}

      <CurrencyPicker
        value={currency}
        onChange={setCurrency}
        visible={currencyPickerVisible}
        onDismiss={() => setCurrencyPickerVisible(false)}
      />

      <OptionPicker
        label="Catégorie"
        options={categories}
        value={selectedCategoryId}
        onChange={(id) => {
          setSelectedCategoryId(id);
          setSelectedSubcategoryId(null);
        }}
        error={!!errors.category}
        style={styles.input}
      />
      {errors.category && <HelperText type="error">{errors.category}</HelperText>}

      {selectedCategoryId !== null && (
        <>
          <OptionPicker
            label="Sous-catégorie"
            options={subcategories}
            value={selectedSubcategoryId}
            onChange={setSelectedSubcategoryId}
            error={!!errors.subcategory}
            style={styles.input}
          />
          {errors.subcategory && <HelperText type="error">{errors.subcategory}</HelperText>}
        </>
      )}

      {participants.length > 0 && (
        <>
          <Text variant="labelLarge" style={styles.sectionLabel}>Payé par</Text>
          <View style={styles.categoryGrid}>
            {participants.length > 1 && (
              <Button
                mode={selectedParticipantId === null ? 'contained' : 'outlined'}
                onPress={() => setSelectedParticipantId(null)}
                style={styles.categoryButton}
                compact
                buttonColor={selectedParticipantId === null ? colors.textMuted : undefined}
              >
                Personne
              </Button>
            )}
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
        maxLength={500}
      />


      <Button
        mode="contained"
        onPress={handleSave}
        style={styles.saveButton}
        contentStyle={styles.saveButtonContent}
        loading={isLoading}
        disabled={isLoading}
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
  input: { marginVertical: 6 },
  sectionLabel: {
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.onBackground,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: { marginBottom: 4 },
  commentInput: { marginTop: 6 },
  currencyTrigger: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  currencySymbol: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  saveButton: {
    marginTop: spacing.xl,
    borderRadius: radius.button,
    backgroundColor: theme.colors.primary,
  },
  saveButtonContent: { paddingVertical: 6 },
});
