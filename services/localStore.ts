

import { State, LogAction, LogStatus, UserStatus } from '../types';

const LOCAL_STORAGE_KEY = 'oliLabLocalData';
const SETTINGS_STORAGE_KEY = 'oliLabSettings';

const getDefaultData = (): State => {
    const defaultAdminId = `admin_${Date.now()}`;
    return {
        items: [
            { id: 'item_1622548800000', name: 'Beaker 250ml', category: 'Chemistry', totalQuantity: 20, availableQuantity: 18 },
            { id: 'item_1622548800001', name: 'Test Tube Rack', category: 'Chemistry', totalQuantity: 15, availableQuantity: 15 },
            { id: 'item_1622548800002', name: 'Microscope', category: 'Biology', totalQuantity: 5, availableQuantity: 3 },
            { id: 'item_1622548800003', name: 'Sulfuric Acid (H2SO4)', category: 'Chemistry', totalQuantity: 10, availableQuantity: 10 },
        ],
        users: [
            {
                id: defaultAdminId,
                username: 'admin',
                fullName: 'Admin User',
                email: 'admin@olilab.app',
                password: 'password', // NOTE: Storing plain-text passwords is a security risk. This is for demonstration purposes only.
                lrn: '',
                gradeLevel: null,
                section: null,
                role: 'Admin',
                isAdmin: true,
                status: UserStatus.APPROVED,
            }
        ],
        logs: [
             { id: 'log_1622548800002', userId: defaultAdminId, itemId: 'item_1622548800002', quantity: 2, timestamp: new Date(Date.now() - 86400000).toISOString(), action: LogAction.BORROW, status: LogStatus.APPROVED, returnRequested: false },
             { id: 'log_1622548800003', userId: defaultAdminId, itemId: 'item_1622548800000', quantity: 2, timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), action: LogAction.BORROW, status: LogStatus.APPROVED, returnRequested: false },
        ],
        notifications: [],
        suggestions: [],
        comments: [],
    };
};

export const loadState = (): State | null => {
    try {
        const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (serializedState === null) {
            const defaultData = getDefaultData();
            saveState(defaultData);
            return defaultData;
        }
        return JSON.parse(serializedState);
    } catch (err) {
        console.error("Could not load state from local storage", err);
        return null;
    }
};

export const saveState = (state: State) => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
    } catch (err) {
        console.error("Could not save state to local storage", err);
    }
};

// Functions for settings
export const loadSettings = () => {
    try {
        const serializedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (serializedSettings === null) {
            return undefined;
        }
        return JSON.parse(serializedSettings);
    } catch (err) {
        console.error("Could not load settings from local storage", err);
        return undefined;
    }
};

export const saveSettings = (settings: any) => {
    try {
        const serializedSettings = JSON.stringify(settings);
        localStorage.setItem(SETTINGS_STORAGE_KEY, serializedSettings);
    } catch (err) {
        console.error("Could not save settings to local storage", err);
    }
};
