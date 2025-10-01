const SETTINGS_STORAGE_KEY = 'oliLabSettings';

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