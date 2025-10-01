

import { Item, LogEntry, User, InventoryReport } from '../types';
import api from './apiService';

export const generateInventoryReport = async (items: Item[], logs: LogEntry[], users: User[]): Promise<InventoryReport> => {
  try {
    // The API call is now delegated to the secure backend.
    const report = await api.generateReport({ items, logs, users });
    return report;
  } catch (error) {
    console.error("Error generating report via backend:", error);
    // Re-throw the error to be handled by the UI component (Dashboard.tsx)
    throw error;
  }
};