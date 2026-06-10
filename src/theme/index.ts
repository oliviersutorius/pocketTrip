import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1A6BAE',
    secondary: '#00BCD4',
    background: '#F0F7FF',
    surface: '#FFFFFF',
    error: '#D32F2F',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#1A237E',
    onSurface: '#1A237E',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  card: 16,
  button: 8,
  input: 8,
};

export const colors = {
  textMuted: '#666',         // labels secondaires, texte de support
  textFaint: '#999',         // texte très atténué (sous-totaux, états vides, chevrons)
  textComment: '#888',       // commentaires en italique, texte tertiaire
  textDark: '#555',          // texte sombre atténué (dates dans détail catégorie)
  surfaceHighlight: '#E3F2FD', // fond chips, surfaces en surbrillance légère
  border: '#e0e0e0',         // séparateurs de liste, bordures de carte
  inputDisabled: '#ccc',     // icônes/inputs désactivés
  budgetPositive: '#2E7D32', // budget restant positif (vert)
} as const;
