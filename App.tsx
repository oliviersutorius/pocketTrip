import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from './src/db/database';
import { useProjectStore } from './src/stores/projectStore';
import { theme } from './src/theme';
import RootNavigator from './src/navigation';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const { loadProjects } = useProjectStore();

  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_600SemiBold });

  useEffect(() => {
    try {
      initDatabase();
      loadProjects();
    } finally {
      setDbReady(true);
    }
  }, []);

  if (!fontsLoaded || !dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
