import { GroupingMode } from '../api/analytics';

const GROUPING_MODE_KEY = 'dashboardGroupingMode';

export const saveGroupingMode = (mode: GroupingMode): void => {
  try {
    localStorage.setItem(GROUPING_MODE_KEY, mode);
  } catch (error) {
    console.error('Failed to save grouping mode to localStorage:', error);
  }
};

export const loadGroupingMode = (): GroupingMode => {
  try {
    const saved = localStorage.getItem(GROUPING_MODE_KEY);
    if (saved && ['assetStyle', 'assetClass', 'currency', 'none'].includes(saved)) {
      return saved as GroupingMode;
    }
  } catch (error) {
    console.error('Failed to load grouping mode from localStorage:', error);
  }
  return 'none'; // Default to individual holdings
};
