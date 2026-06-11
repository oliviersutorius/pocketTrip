import React from 'react';
import { Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { RootStackParamList, ProjectTabParamList, RootStackProps } from './types';
import { useProjectStore } from '../stores/projectStore';
import HomeScreen from '../screens/HomeScreen';
import SummaryScreen from '../screens/SummaryScreen';
import ExpenseListScreen from '../screens/ExpenseListScreen';
import ProjectInfoScreen from '../screens/ProjectInfoScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import CategoryDetailScreen from '../screens/CategoryDetailScreen';
import CreateProjectScreen from '../screens/CreateProjectScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<ProjectTabParamList>();

function ProjectTabs({ route, navigation }: RootStackProps<'ProjectTabs'>) {
  const { colors } = useTheme();
  const { projectId } = route.params;
  const { projects } = useProjectStore();
  const project = projects.find((p) => p.id === projectId);
  const projectName = project?.name ?? '';

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: { backgroundColor: colors.surface },
        headerShown: true,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'Poppins_600SemiBold', flexShrink: 1 },
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.navigate('Home')}
            accessibilityLabel="Retour à la liste des voyages"
            accessibilityRole="button"
            style={{ marginLeft: 12, marginRight: 8, padding: 4 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
        ),
      }}
    >
      <Tab.Screen
        name="Summary"
        component={SummaryScreen}
        initialParams={{ projectId }}
        options={{
          tabBarLabel: 'Récapitulatif',
          headerTitle: projectName ? `Récapitulatif · ${projectName}` : 'Récapitulatif',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-bar" size={size} color={color} accessibilityElementsHidden />
          ),
        }}
      />
      <Tab.Screen
        name="ExpenseList"
        component={ExpenseListScreen}
        initialParams={{ projectId }}
        options={{
          tabBarLabel: 'Dépenses',
          headerTitle: projectName ? `Dépenses · ${projectName}` : 'Dépenses',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="format-list-bulleted" size={size} color={color} accessibilityElementsHidden />
          ),
        }}
      />
      <Tab.Screen
        name="ProjectInfo"
        component={ProjectInfoScreen}
        initialParams={{ projectId }}
        options={{
          title: 'Projet',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="information-outline" size={size} color={color} accessibilityElementsHidden />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Mes Voyages', headerBackVisible: false }} />
      <Stack.Screen name="CreateProject" component={CreateProjectScreen} options={{ title: 'Nouveau Voyage' }} />
      <Stack.Screen
        name="ProjectTabs"
        component={ProjectTabs}
        options={({ route }) => ({ headerShown: false })}
      />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ title: 'Nouvelle Dépense', presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditExpense"
        component={AddExpenseScreen}
        options={{ title: 'Modifier la Dépense', presentation: 'modal' }}
      />
      <Stack.Screen
        name="CategoryDetail"
        component={CategoryDetailScreen}
        options={({ route }) => ({ title: route.params.categoryName, presentation: 'modal' })}
      />
      <Stack.Screen
        name="EditProject"
        component={CreateProjectScreen}
        options={{ title: 'Modifier le Voyage' }}
      />
    </Stack.Navigator>
  );
}
