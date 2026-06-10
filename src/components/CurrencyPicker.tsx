import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { Text, Button, List, Searchbar, Surface } from 'react-native-paper';
import { theme } from '../theme';

const CURRENCIES = [
  { code: 'EUR', label: '€ Euro' },
  { code: 'USD', label: '$ Dollar américain' },
  { code: 'GBP', label: '£ Livre sterling' },
  { code: 'CHF', label: 'CHF Franc suisse' },
  { code: 'JPY', label: '¥ Yen japonais' },
  { code: 'CAD', label: 'CA$ Dollar canadien' },
  { code: 'AUD', label: 'A$ Dollar australien' },
  { code: 'AED', label: 'AED Dirham (EAU)' },
  { code: 'MAD', label: 'MAD Dirham marocain' },
  { code: 'TND', label: 'TND Dinar tunisien' },
  { code: 'EGP', label: 'EGP Livre égyptienne' },
  { code: 'TRY', label: 'TRY Lire turque' },
  { code: 'THB', label: 'THB Baht thaïlandais' },
  { code: 'SGD', label: 'SGD Dollar singapourien' },
  { code: 'HKD', label: 'HKD Dollar de Hong Kong' },
  { code: 'CNY', label: '¥ Yuan chinois' },
  { code: 'INR', label: '₹ Roupie indienne' },
  { code: 'ZAR', label: 'ZAR Rand sud-africain' },
  { code: 'BRL', label: 'BRL Réal brésilien' },
  { code: 'MXN', label: 'MXN Peso mexicain' },
];

interface Props {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}

export default function CurrencyPicker({ value, onChange, label = 'Devise' }: Props) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.label.toLowerCase().includes(search.toLowerCase())
  );

  const selected = CURRENCIES.find((c) => c.code === value);

  return (
    <>
      <Button
        mode="outlined"
        onPress={() => setVisible(true)}
        style={styles.button}
        contentStyle={styles.buttonContent}
        icon="cash"
      >
        {label} : {selected?.code ?? value}
      </Button>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <Surface style={styles.sheet} elevation={4}>
            <Text variant="titleMedium" style={styles.title}>Choisir une devise</Text>
            <Searchbar
              placeholder="Rechercher..."
              value={search}
              onChangeText={setSearch}
              style={styles.search}
            />
            <ScrollView>
              {filtered.map((c) => (
                <List.Item
                  key={c.code}
                  title={c.label}
                  onPress={() => {
                    onChange(c.code);
                    setVisible(false);
                    setSearch('');
                  }}
                  right={() =>
                    c.code === value ? (
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
  button: { marginVertical: 6 },
  buttonContent: { justifyContent: 'flex-start' },
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
  search: { marginBottom: 8 },
  cancel: { marginTop: 8 },
});
