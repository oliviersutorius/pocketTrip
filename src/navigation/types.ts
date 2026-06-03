import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  Home: undefined;
  ProjectTabs: { projectId: number };
  AddExpense: { projectId: number };
  EditExpense: { expenseId: number; projectId: number };
  CategoryDetail: { categoryId: number; categoryName: string; projectId: number };
  CreateProject: undefined;
  EditProject: { projectId: number };
};

export type ProjectTabParamList = {
  Summary: { projectId: number };
  ExpenseList: { projectId: number };
  ProjectInfo: { projectId: number };
};

export type RootStackProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
export type ProjectTabProps<T extends keyof ProjectTabParamList> = BottomTabScreenProps<ProjectTabParamList, T>;
