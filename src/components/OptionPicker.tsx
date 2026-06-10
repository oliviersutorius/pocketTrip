import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Text, TextInput, List, Surface, Button, TouchableRipple } from 'react-native-paper';
import { theme } from '../theme';

interface Option {
  id: number;
  name: string;
}

interface Props {
  label: string;
  options: Option[];
  value: number | null;
  onChange: (id: number) => void;
  error?: boolean;
  style?: object;
}

export default function OptionPicker({ label, options, value, onChange, error, style }: Props) {
  const [visible, setVisible] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <>
      <TouchableRipple onPress={() => setVisible(true)} style={style} borderless={false}>
        <View style={styles.pointerNone}>
          <TextInput
            label={label}
            value={selected?.name ?? ''}
            mode="outlined"
            editable={false}
            error={error}
            right={<TextInput.Icon icon="menu-down" />}
          />
        </View>
      </TouchableRipple>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <Surface style={styles.sheet} elevation={4}>
            <Text variant="titleMedium" style={styles.title}>{label}</Text>
            <ScrollView>
              {options.map((o) => (
                <List.Item
                  key={o.id}
                  title={o.name}
                  onPress={() => {
                    onChange(o.id);
                    setVisible(false);
                  }}
                  right={() =>
                    o.id === value ? (
                      <List.Icon icon="check" color={theme.colors.primary} />
                    ) : null
                  }
                />
              ))}
            </ScrollView>
            <Button onPress={() => setVisible(false)} style={styles.cancel}>Annuler</Button>
          </Surface>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pointerNone: { pointerEvents: 'none' } as object,
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
    backgroundColor: theme.colors.surface,
  },
  title: {
    marginBottom: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.onSurface,
  },
  cancel: { marginTop: 8 },
});
