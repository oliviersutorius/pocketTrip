import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, IconButton, Divider } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { theme, spacing, colors } from '../theme';

interface LocalParticipant {
  id?: number;
  name: string;
}

interface Props {
  participants: LocalParticipant[];
  onAdd: (name: string) => void;
  onRemove: (index: number) => void;
}

export default function ParticipantManager({ participants, onAdd, onRemove }: Props) {
  const [input, setInput] = useState('');

  function handleAdd() {
    const trimmed = input.trim().slice(0, 100);
    if (!trimmed) return;
    const alreadyExists = participants.some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyExists) return;
    onAdd(trimmed);
    setInput('');
  }

  return (
    <View>
      <Text variant="labelLarge" style={styles.label}>Participants</Text>
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="Ajouter un participant"
        mode="outlined"
        style={styles.input}
        onSubmitEditing={handleAdd}
        returnKeyType="done"
        maxLength={100}
        right={
          <TextInput.Icon
            icon="account-plus"
            onPress={handleAdd}
            disabled={!input.trim()}
            color={input.trim() ? theme.colors.primary : colors.inputDisabled}
          />
        }
      />
      {participants.length > 0 && (
        <View style={styles.list}>
          {participants.map((p, index) => (
            <View key={p.id ?? `new-${index}`}>
              <View style={styles.row}>
                <MaterialCommunityIcons
                  name="account"
                  size={20}
                  color={theme.colors.primary}
                  style={styles.icon}
                />
                <Text variant="bodyMedium" style={styles.name}>{p.name}</Text>
                <IconButton
                  icon="delete-outline"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={() => onRemove(index)}
                  style={styles.deleteButton}
                  accessibilityLabel={`Retirer ${p.name}`}
                />
              </View>
              {index < participants.length - 1 && <Divider />}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.onBackground,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  input: { backgroundColor: theme.colors.surface },
  list: {
    marginTop: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: spacing.sm,
  },
  icon: { marginRight: 10 },
  name: { flex: 1, color: theme.colors.onSurface },
  deleteButton: { margin: 0 },
});
