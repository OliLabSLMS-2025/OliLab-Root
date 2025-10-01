import * as React from 'react';
import { Item, User, LogEntry, Notification, Suggestion, Comment, LogStatus, UserStatus, SuggestionType, State } from '../types';
import { IconLoader } from '../components/icons';
import api from '../services/apiService';
import { sendNewUserAdminNotification, sendAccountApprovedNotification, sendAccountDeniedNotification } from '../services/emailService';
import { ConnectionError } from '../components/ConnectionError';

type SyncStatus = 'synced' | 'syncing' | 'error';

interface InventoryContextType {
  state: State;
  isLoading: boolean;
  syncStatus: SyncStatus;
  lastSynced: Date | null;
  addItem: (itemData: Omit<Item, 'id' | 'availableQuantity'>) => Promise<void>;
  editItem: (itemData: Item) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  requestBorrowItem: (payload: { userId: string; itemId: string; quantity: number }) => Promise<void>;
  approveBorrowRequest: (logId: string) => Promise<void>;
  denyBorrowRequest: (payload: { logId: string; reason: string }) => Promise<void>;
  returnItem: (payload: { borrowLog: LogEntry; adminNotes: string }) => Promise<void>;
  requestItemReturn: (log: LogEntry) => Promise<void>;
  createUser: (userData: Omit<User, 'id' | 'status'>) => Promise<string>;
  editUser: (userData: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  approveUser: (userId: string) => Promise<void>;
  denyUser: (userId: string) => Promise<void>;
  markNotificationsAsRead: (notificationIds: string[]) => Promise<void>;
  addSuggestion: (suggestionData: Omit<Suggestion, 'id' | 'status' | 'timestamp' | 'category'>) => Promise<void>;
  approveItemSuggestion: (payload: { suggestionId: string; category: string; totalQuantity: number }) => Promise<void>;
  approveFeatureSuggestion: (suggestionId: string) => Promise<void>;
  denySuggestion: (payload: { suggestionId: string; reason: string; adminId: string }) => Promise<void>;
  importItems: (items: Omit<Item, 'id' | 'availableQuantity'>[]) => Promise<void>;
  addComment: (payload: { suggestionId: string; userId: string; text: string }) => Promise<void>;
}

const InventoryContext = React.createContext<InventoryContextType | undefined>(undefined);

const initialEmptyState: State = { items: [], users: [], logs: [], notifications: [], suggestions: [], comments: [] };

export const InventoryProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = React.useState<State>(initialEmptyState);
  const [isLoading, setIsLoading] = React.useState(true);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>('synced');
  const [lastSynced, setLastSynced] = React.useState<Date | null>(null);

  const loadData = React.useCallback(async () => {
      setIsLoading(true);
      setConnectionError(null);
      try {
          const initialState = await api.getInitialData();
          setState(initialState);
          setLastSynced(new Date());
          setSyncStatus('synced');
      } catch (error: any) {
          console.error("Failed to load initial state:", error);
          setConnectionError(error.message || 'An unknown error occurred.');
          setSyncStatus('error');
      } finally {
          setIsLoading(false);
      }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleApiCall = async <T,>(apiCall: () => Promise<T>, updateState: (result: T) => void) => {
    setSyncStatus('syncing');
    try {
        const result = await apiCall();
        updateState(result);
        setSyncStatus('synced');
        setLastSynced(new Date());
    } catch (error) {
        console.error("API call failed:", error);
        setSyncStatus('error');
        throw error;
    }
  };

  const addItem: InventoryContextType['addItem'] = async (itemData) => {
    await handleApiCall(
        () => api.addItem(itemData),
        (newItem) => setState((prev: State) => ({ ...prev, items: [...prev.items, newItem] }))
    );
  };

  const editItem: InventoryContextType['editItem'] = async (itemData) => {
    await handleApiCall(
        () => api.editItem(itemData),
        (updatedItem) => setState((prev: State) => ({ ...prev, items: prev.items.map(i => i.id === updatedItem.id ? updatedItem : i) }))
    );
  };

  const deleteItem: InventoryContextType['deleteItem'] = async (itemId) => {
      await handleApiCall(
          () => api.deleteItem(itemId),
          (deletedItemId) => setState((prev: State) => ({ ...prev, items: prev.items.filter(i => i.id !== deletedItemId.id) }))
      );
  };
  
  const createUser: InventoryContextType['createUser'] = async (userData) => {
    let newUserId = '';
    await handleApiCall(
        () => api.createUser(userData),
        ({ newUser, newNotification }) => {
            newUserId = newUser.id;
            setState((prev: State) => {
                const updatedUsers = [...prev.users, newUser];
                const admins = updatedUsers.filter(u => u.isAdmin);
                sendNewUserAdminNotification(newUser, admins);
                return {
                    ...prev,
                    users: updatedUsers,
                    notifications: [newNotification, ...prev.notifications]
                };
            });
        }
    );
    return newUserId;
  };

  const editUser: InventoryContextType['editUser'] = async (userData) => {
    await handleApiCall(
        () => api.editUser(userData),
        (updatedUser) => setState((prev: State) => ({ ...prev, users: prev.users.map(u => u.id === updatedUser.id ? updatedUser : u) }))
    );
  };

  const deleteUser: InventoryContextType['deleteUser'] = async (userId) => {
      await handleApiCall(
          () => api.deleteUser(userId),
          (deletedUserId) => setState((prev: State) => ({ ...prev, users: prev.users.filter(u => u.id !== deletedUserId.id) }))
      );
  };
  
  const approveUser: InventoryContextType['approveUser'] = async (userId) => {
    await handleApiCall(
        () => api.approveUser(userId),
        (approvedUser) => {
            setState((prev: State) => ({ ...prev, users: prev.users.map(u => u.id === approvedUser.id ? approvedUser : u) }));
            sendAccountApprovedNotification(approvedUser);
        }
    );
  };

  const denyUser: InventoryContextType['denyUser'] = async (userId) => {
    await handleApiCall(
        () => api.denyUser(userId),
        (deniedUser) => {
            setState((prev: State) => ({ ...prev, users: prev.users.map(u => u.id === deniedUser.id ? deniedUser : u) }));
            sendAccountDeniedNotification(deniedUser);
        }
    );
  };

  const requestBorrowItem: InventoryContextType['requestBorrowItem'] = async (payload) => {
    await handleApiCall(
        () => api.requestBorrowItem(payload),
        ({ newLog, newNotification }) => {
            setState((prev: State) => ({
                ...prev,
                logs: [newLog, ...prev.logs],
                notifications: [newNotification, ...prev.notifications]
            }));
        }
    );
  };

  const approveBorrowRequest: InventoryContextType['approveBorrowRequest'] = async (logId) => {
    await handleApiCall(
        () => api.approveBorrowRequest(logId),
        ({ updatedLog, updatedItem }) => {
            setState((prev: State) => ({
                ...prev,
                logs: prev.logs.map(l => l.id === updatedLog.id ? updatedLog : l),
                items: prev.items.map(i => i.id === updatedItem.id ? updatedItem : i),
            }));
        }
    );
  };

  const denyBorrowRequest: InventoryContextType['denyBorrowRequest'] = async (payload) => {
    await handleApiCall(
        () => api.denyBorrowRequest(payload),
        (updatedLog) => setState((prev: State) => ({ ...prev, logs: prev.logs.map(l => l.id === updatedLog.id ? updatedLog : l) }))
    );
  };

  const returnItem: InventoryContextType['returnItem'] = async (payload) => {
    await handleApiCall(
        () => api.returnItem(payload),
        ({ returnLog, updatedBorrowLog, updatedItem }) => {
            setState((prev: State) => ({
                ...prev,
                logs: [returnLog, ...prev.logs.map(l => l.id === updatedBorrowLog.id ? updatedBorrowLog : l)],
                items: prev.items.map(i => i.id === updatedItem.id ? updatedItem : i),
            }));
        }
    );
  };

  const requestItemReturn: InventoryContextType['requestItemReturn'] = async (log) => {
      await handleApiCall(
          () => api.requestItemReturn(log.id),
          ({ updatedLog, newNotification }) => {
              setState((prev: State) => ({
                  ...prev,
                  logs: prev.logs.map(l => l.id === updatedLog.id ? updatedLog : l),
                  notifications: [newNotification, ...prev.notifications],
              }));
          }
      );
  };
  
  const markNotificationsAsRead: InventoryContextType['markNotificationsAsRead'] = async (notificationIds) => {
    await handleApiCall(
        () => api.markNotificationsAsRead(notificationIds),
        (readIds) => {
            setState((prev: State) => ({
                ...prev,
                notifications: prev.notifications.map(n => readIds.includes(n.id) ? { ...n, read: true } : n),
            }));
        }
    );
  };

  const addSuggestion: InventoryContextType['addSuggestion'] = async (suggestionData) => {
    await handleApiCall(
        () => api.addSuggestion(suggestionData),
        (newSuggestion) => setState((prev: State) => ({ ...prev, suggestions: [newSuggestion, ...prev.suggestions] }))
    );
  };

  const approveItemSuggestion: InventoryContextType['approveItemSuggestion'] = async (payload) => {
    await handleApiCall(
        () => api.approveItemSuggestion(payload),
        ({ updatedSuggestion, newItem }) => {
            setState((prev: State) => ({
                ...prev,
                suggestions: prev.suggestions.map(s => s.id === updatedSuggestion.id ? updatedSuggestion : s),
                items: [...prev.items, newItem],
            }));
        }
    );
  };

  const approveFeatureSuggestion: InventoryContextType['approveFeatureSuggestion'] = async (suggestionId) => {
    await handleApiCall(
        () => api.approveFeatureSuggestion(suggestionId),
        (updatedSuggestion) => setState((prev: State) => ({ ...prev, suggestions: prev.suggestions.map(s => s.id === updatedSuggestion.id ? updatedSuggestion : s) }))
    );
  };

  const denySuggestion: InventoryContextType['denySuggestion'] = async (payload) => {
    await handleApiCall(
        () => api.denySuggestion(payload),
        ({ updatedSuggestion, newComment }) => {
            setState((prev: State) => ({
                ...prev,
                suggestions: prev.suggestions.map(s => s.id === updatedSuggestion.id ? updatedSuggestion : s),
                comments: [newComment, ...prev.comments],
            }));
        }
    );
  };
  
   const importItems: InventoryContextType['importItems'] = async (itemsToImport) => {
      await handleApiCall(
          () => api.importItems(itemsToImport),
          (newItems) => setState((prev: State) => ({ ...prev, items: [...prev.items, ...newItems] }))
      );
   };

  const addComment: InventoryContextType['addComment'] = async (payload) => {
    await handleApiCall(
        () => api.addComment(payload),
        (newComment) => setState((prev: State) => ({ ...prev, comments: [newComment, ...prev.comments] }))
    );
  };

  const contextValue: InventoryContextType = {
      state,
      isLoading,
      syncStatus,
      lastSynced,
      addItem,
      editItem,
      deleteItem,
      requestBorrowItem,
      approveBorrowRequest,
      denyBorrowRequest,
      returnItem,
      requestItemReturn,
      createUser,
      editUser,
      deleteUser,
      approveUser,
      denyUser,
      markNotificationsAsRead,
      addSuggestion,
      approveItemSuggestion,
      approveFeatureSuggestion,
      denySuggestion,
      importItems,
      addComment,
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen bg-slate-900">
            <IconLoader className="h-10 w-10 text-emerald-500" />
        </div>
    );
  }

  if (connectionError) {
      return <ConnectionError message={connectionError} onRetry={loadData} />;
  }

  return (
    <InventoryContext.Provider value={contextValue}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = React.useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
