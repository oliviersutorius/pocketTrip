import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RootStackProps } from '../navigation/types';
import { useProjectStore } from '../stores/projectStore';
import { getProject, getParticipants, addParticipant, syncProjectParticipants } from '../db/database';
import { parseAmount } from '../utils/validation';
import CurrencyPicker, { getCurrencySymbol } from '../components/CurrencyPicker';
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
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (savedRef.current || !dirty) return;
      e.preventDefault();
      Alert.alert(
        'Quitter sans enregistrer ?',
        'Vos modifications seront perdues.',
        [
          { text: 'Rester', style: 'cancel' },
          { text: 'Quitter', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, dirty]);

  useEffect(() => {
    if (mode === 'edit' && params?.projectId) {
      async function load() {
        const project = await getProject(params!.projectId!);
        if (project) {
          setName(project.name);
          setStartDate(parseISO(project.start_date));
          setEndDate(parseISO(project.end_date));
          setBudget(String(project.initial_budget));
          setCurrency(project.currency);
        }
        const existing = await getParticipants(params!.projectId!);
        setParticipants(existing.map((p) => ({ id: p.id, name: p.name })));
      }
      load();
    }
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Le nom est requis';
    if (name.trim().length > 100) e.name = 'Le nom ne peut pas dépasser 100 caractères';
    if (endDate < startDate) e.endDate = 'La date de fin doit être après la date de début';
    const b = parseAmount(budget);
    if (b === null || b <= 0) e.budget = 'Le budget doit être un nombre positif';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    const data = {
      name: name.trim(),
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      initial_budget: parseAmount(budget)!,
      currency,
    };

    try {
      if (mode === 'edit' && params?.projectId) {
        await updateProject(params.projectId, data);
        await syncProjectParticipants(params.projectId, participants);
        savedRef.current = true;
        navigation.goBack();
      } else {
        const newProjectId = await createProject(data);
        for (const p of participants) {
          await addParticipant(newProjectId, p.name);
        }
        savedRef.current = true;
        navigation.navigate('Home');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleAddParticipant(pName: string) {
    setParticipants((prev) => [...prev, { name: pName }]);
    setDirty(true);
  }

  function handleRemoveParticipant(index: number) {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextInput
        label="Nom du voyage"
        value={name}
        onChangeText={(t) => { setName(t); setDirty(true); }}
        placeholder="ex : Rome 2026"
        mode="outlined"
        style={styles.input}
        error={!!errors.name}
        maxLength={100}
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
          display="default"
          onChange={(_, date) => {
            setShowStartPicker(false);
            if (date) { setStartDate(date); setDirty(true); }
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
          display="default"
          minimumDate={startDate}
          onChange={(_, date) => {
            setShowEndPicker(false);
            if (date) { setEndDate(date); setDirty(true); }
          }}
        />
      )}
      {errors.endDate && <HelperText type="error">{errors.endDate}</HelperText>}

      <TextInput
        label="Budget initial"
        value={budget}
        onChangeText={(t) => { setBudget(t); setDirty(true); }}
        keyboardType="decimal-pad"
        mode="outlined"
        style={styles.input}
        error={!!errors.budget}
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
      {errors.budget && <HelperText type="error">{errors.budget}</HelperText>}

      <CurrencyPicker
        value={currency}
        onChange={(c) => { setCurrency(c); setDirty(true); }}
        visible={currencyPickerVisible}
        onDismiss={() => setCurrencyPickerVisible(false)}
      />

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
        loading={saving}
        disabled={saving}
      >
        {mode === 'edit' ? 'Enregistrer' : 'Créer le voyage'}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.md, paddingBottom: 40 },
  input: { marginVertical: 6 },
  dateButton: { marginVertical: 6 },
  currencyTrigger: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  currencySymbol: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  saveButton: {
    marginTop: spacing.lg,
    borderRadius: radius.button,
    backgroundColor: theme.colors.primary,
  },
  saveButtonContent: { paddingVertical: 6 },
});
