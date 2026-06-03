import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RootStackProps } from '../navigation/types';
import { useProjectStore } from '../stores/projectStore';
import { getProject, getParticipants, addParticipant, syncProjectParticipants } from '../db/database';
import { parseAmount } from '../utils/validation';
import CurrencyPicker from '../components/CurrencyPicker';
import ParticipantManager from '../components/ParticipantManager';
import { theme, spacing, radius } from '../theme';

type Mode = 'create' | 'edit';

interface LocalParticipant {
  id?: number;
  name: string;
}

export default function CreateProjectScreen({ navigation, route }: RootStackProps<'CreateProject'> | RootStackProps<'EditProject'>) {
  const params = (route as any).params as { projectId?: number } | undefined;
  const mode: Mode = params?.projectId ? 'edit' : 'create';

  const { createProject, updateProject } = useProjectStore();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [participants, setParticipants] = useState<LocalParticipant[]>([]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && params?.projectId) {
      const project = getProject(params.projectId);
      if (project) {
        setName(project.name);
        setStartDate(parseISO(project.start_date));
        setEndDate(parseISO(project.end_date));
        setBudget(String(project.initial_budget));
        setCurrency(project.currency);
      }
      const existing = getParticipants(params.projectId);
      setParticipants(existing.map((p) => ({ id: p.id, name: p.name })));
    }
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Le nom est requis';
    if (endDate < startDate) e.endDate = 'La date de fin doit être après la date de début';
    const b = parseAmount(budget);
    if (b === null || b <= 0) e.budget = 'Le budget doit être un nombre positif';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;

    const data = {
      name: name.trim(),
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      initial_budget: parseAmount(budget)!,
      currency,
    };

    if (mode === 'edit' && params?.projectId) {
      updateProject(params.projectId, data);
      syncProjectParticipants(params.projectId, participants);
      navigation.goBack();
    } else {
      const newProjectId = createProject(data);
      for (const p of participants) {
        addParticipant(newProjectId, p.name);
      }
      navigation.navigate('Home');
    }
  }

  function handleAddParticipant(name: string) {
    setParticipants((prev) => [...prev, { name }]);
  }

  function handleRemoveParticipant(index: number) {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextInput
        label="Nom du voyage"
        value={name}
        onChangeText={setName}
        placeholder="ex : Rome 2026"
        style={styles.input}
        error={!!errors.name}
      />
      {errors.name && <HelperText type="error">{errors.name}</HelperText>}

      <Button
        mode="outlined"
        icon="calendar"
        style={styles.dateButton}
        onPress={() => setShowStartPicker(true)}
      >
        Début : {format(startDate, 'd MMMM yyyy', { locale: fr })}
      </Button>
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowStartPicker(false);
            if (date) setStartDate(date);
          }}
        />
      )}

      <Button
        mode="outlined"
        icon="calendar"
        style={styles.dateButton}
        onPress={() => setShowEndPicker(true)}
      >
        Fin : {format(endDate, 'd MMMM yyyy', { locale: fr })}
      </Button>
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={startDate}
          onChange={(_, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
        />
      )}
      {errors.endDate && <HelperText type="error">{errors.endDate}</HelperText>}

      <TextInput
        label="Budget initial"
        value={budget}
        onChangeText={setBudget}
        keyboardType="decimal-pad"
        style={styles.input}
        error={!!errors.budget}
        right={<TextInput.Affix text={currency} />}
      />
      {errors.budget && <HelperText type="error">{errors.budget}</HelperText>}

      <CurrencyPicker value={currency} onChange={setCurrency} label="Devise du budget" />

      <ParticipantManager
        participants={participants}
        onAdd={handleAddParticipant}
        onRemove={handleRemoveParticipant}
      />

      <Button
        mode="contained"
        onPress={handleSave}
        style={styles.saveButton}
        contentStyle={styles.saveButtonContent}
      >
        {mode === 'edit' ? 'Enregistrer' : 'Créer le voyage'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.md, paddingBottom: 40 },
  input: { marginVertical: 6, backgroundColor: theme.colors.surface },
  dateButton: { marginVertical: 6 },
  saveButton: {
    marginTop: spacing.lg,
    borderRadius: radius.button,
    backgroundColor: theme.colors.primary,
  },
  saveButtonContent: { paddingVertical: 6 },
});
