import { State, Item, User, LogEntry, Notification, Suggestion, Comment, LogAction, SuggestionStatus, SuggestionType, UserStatus, LogStatus, InventoryReport } from '../types';

const isDevelopment = import.meta.env.DEV;

// The base URL of your Python Flask backend.
// In development, it points to the local Flask server.
// IMPORTANT: Before deploying, you MUST replace the placeholder with your live Render URL.
const BASE_URL = isDevelopment
  ? `http://localhost:5000/api`
  : `https://your-backend-name.onrender.com/api`; // <-- IMPORTANT: REPLACE WITH YOUR LIVE RENDER URL

// --- Helper for API Calls ---
const apiFetch = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            let errorMessage: string;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || 'An unknown server error occurred.';
            } catch (jsonError) {
                const textError = await response.text();
                errorMessage = textError || `HTTP Error: ${response.status}`;
            }
            throw new Error(errorMessage);
        }
        
        const responseText = await response.text();
        return responseText ? JSON.parse(responseText) : ({} as T);

    } catch (error) {
        // Provide a more helpful error message for the most common issue.
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            const helpfulError = new Error(`Could not connect to the backend server at ${BASE_URL}. If you are developing locally, please ensure your Python server ('flask run') is running.`);
            console.error(`API call to ${endpoint} failed:`, helpfulError);
            throw helpfulError;
        }
        console.error(`API call to ${endpoint} failed:`, error);
        throw error;
    }
};


const api = {
    login: async (payload: { identifier: string; password: string }): Promise<User> => {
        return apiFetch<User>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
    
    getInitialData: async (): Promise<State> => {
        return apiFetch<State>('/data');
    },

    addItem: async (itemData: Omit<Item, 'id' | 'availableQuantity'>): Promise<Item> => {
        return apiFetch<Item>('/items', {
            method: 'POST',
            body: JSON.stringify(itemData),
        });
    },

    editItem: async (itemData: Item): Promise<Item> => {
        return apiFetch<Item>(`/items/${itemData.id}`, {
            method: 'PUT',
            body: JSON.stringify(itemData),
        });
    },

    deleteItem: async (itemId: string): Promise<{id: string}> => {
        return apiFetch<{id: string}>(`/items/${itemId}`, {
            method: 'DELETE',
        });
    },

    createUser: async (userData: Omit<User, 'id' | 'status'>): Promise<{ newUser: User; newNotification: Notification }> => {
        return apiFetch<{ newUser: User; newNotification: Notification }>('/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },
    
    editUser: async (userData: User): Promise<User> => {
        return apiFetch<User>(`/users/${userData.id}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    },

    deleteUser: async (userId: string): Promise<{id: string}> => {
        return apiFetch<{id: string}>(`/users/${userId}`, {
            method: 'DELETE',
        });
    },
    
    approveUser: async (userId: string): Promise<User> => {
        return apiFetch<User>(`/users/${userId}/approve`, { method: 'POST' });
    },

    denyUser: async (userId: string): Promise<User> => {
        return apiFetch<User>(`/users/${userId}/deny`, { method: 'POST' });
    },

    requestBorrowItem: async (payload: { userId: string; itemId: string; quantity: number }): Promise<{ newLog: LogEntry; newNotification: Notification }> => {
        return apiFetch<{ newLog: LogEntry; newNotification: Notification }>('/logs/borrow', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
    
    approveBorrowRequest: async (logId: string): Promise<{ updatedLog: LogEntry, updatedItem: Item }> => {
       return apiFetch<{ updatedLog: LogEntry, updatedItem: Item }>(`/logs/${logId}/approve`, {
           method: 'POST',
       });
    },

    denyBorrowRequest: async (payload: { logId: string; reason: string }): Promise<LogEntry> => {
        return apiFetch<LogEntry>(`/logs/${payload.logId}/deny`, {
            method: 'POST',
            body: JSON.stringify({ reason: payload.reason }),
        });
    },
    
    returnItem: async (payload: { borrowLog: LogEntry; adminNotes: string }): Promise<{ returnLog: LogEntry; updatedBorrowLog: LogEntry; updatedItem: Item }> => {
        return apiFetch<{ returnLog: LogEntry; updatedBorrowLog: LogEntry; updatedItem: Item }>('/logs/return', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },
    
    requestItemReturn: async (logId: string): Promise<{updatedLog: LogEntry, newNotification: Notification}> => {
        return apiFetch<{updatedLog: LogEntry, newNotification: Notification}>(`/logs/${logId}/request-return`, {
            method: 'POST'
        });
    },

    markNotificationsAsRead: async (notificationIds: string[]): Promise<string[]> => {
        // In a real app, this would be a POST request to an endpoint.
        console.log("Simulating marking notifications as read on backend:", notificationIds);
        return Promise.resolve(notificationIds);
    },

    importItems: async (itemsToImport: Omit<Item, 'id' | 'availableQuantity'>[]): Promise<Item[]> => {
        return apiFetch<Item[]>('/items/import', {
            method: 'POST',
            body: JSON.stringify(itemsToImport)
        });
    },

    addSuggestion: async (suggestionData: Omit<Suggestion, 'id' | 'status' | 'timestamp' | 'category'>): Promise<Suggestion> => {
        return apiFetch<Suggestion>('/suggestions', {
            method: 'POST',
            body: JSON.stringify(suggestionData)
        });
    },
    approveItemSuggestion: async (payload: { suggestionId: string; category: string; totalQuantity: number }): Promise<{ updatedSuggestion: Suggestion; newItem: Item }> => {
        return apiFetch<{ updatedSuggestion: Suggestion; newItem: Item }>(`/suggestions/${payload.suggestionId}/approve-item`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },
    approveFeatureSuggestion: async (suggestionId: string): Promise<Suggestion> => {
        return apiFetch<Suggestion>(`/suggestions/${suggestionId}/approve-feature`, {
            method: 'POST'
        });
    },
    denySuggestion: async (payload: { suggestionId: string; reason: string; adminId: string }): Promise<{ updatedSuggestion: Suggestion; newComment: Comment }> => {
        return apiFetch<{ updatedSuggestion: Suggestion; newComment: Comment }>(`/suggestions/${payload.suggestionId}/deny`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },
    addComment: async (payload: { suggestionId: string; userId: string; text: string }): Promise<Comment> => {
        return apiFetch<Comment>('/comments', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },
    generateReport: async (payload: { items: Item[], logs: LogEntry[], users: User[] }): Promise<InventoryReport> => {
        return apiFetch<InventoryReport>('/reports/generate', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
};

export default api;