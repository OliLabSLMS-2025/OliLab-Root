import * as React from 'react';
import { useInventory } from '../context/InventoryContext';
import { IconDownload, IconPrinter, IconUpload, IconDeviceFloppy } from '../components/icons';
import { Item, User } from '../types';
import { useSettings } from '../context/SettingsContext';

const downloadCSV = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const convertToCSV = <T extends object>(data: T[]): string => {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
        const values = headers.map(header => {
            const value = (row as any)[header];
            const stringValue = String(value ?? '');
            // Escape commas and quotes by enclosing in double quotes
            if (/[",\n]/.test(stringValue)) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
};

// A more robust CSV parser that handles quoted fields with commas.
const parseCSV = (csvText: string): Record<string, string>[] => {
    try {
        const lines = csvText.trim().split(/\r\n|\n/);
        if (lines.length < 2) return [];

        const headers = lines.shift()!.split(',').map(h => h.trim());
        const data: Record<string, string>[] = [];

        lines.forEach(line => {
            if (line.trim() === '') return;
            // This regex splits by comma, but ignores commas inside double quotes.
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            
            if (values.length === headers.length) {
                const row: Record<string, string> = {};
                headers.forEach((header, index) => {
                    let value = (values[index] || '').trim();
                    // Remove surrounding quotes and un-escape double quotes
                    if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.substring(1, value.length - 1).replace(/""/g, '"');
                    }
                    row[header] = value;
                });
                data.push(row);
            }
        });
        return data;
    } catch (error) {
        console.error("Failed to parse CSV", error);
        return [];
    }
};

export const DataReports: React.FC = () => {
    const { state, importItems } = useInventory();
    const { settings, updateSettings } = useSettings();

    const [importStatus, setImportStatus] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [localSettings, setLocalSettings] = React.useState(settings);
    const [saveStatus, setSaveStatus] = React.useState('');

    const inventoryInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSettings({
            ...localSettings,
            [e.target.name]: e.target.value
        });
    };

    const handleSettingsSave = (e: React.FormEvent) => {
        e.preventDefault();
        updateSettings(localSettings);
        setSaveStatus('Settings saved successfully!');
        setTimeout(() => setSaveStatus(''), 3000);
    };

    const handleExportInventory = React.useCallback(() => {
        const csvData = convertToCSV(state.items);
        downloadCSV(csvData, 'olilab_inventory.csv');
    }, [state.items]);

    const handleExportUsers = React.useCallback(() => {
        const csvData = convertToCSV(state.users);
        downloadCSV(csvData, 'olilab_users.csv');
    }, [state.users]);

    const handleExportLogs = React.useCallback(() => {
        const csvData = convertToCSV(state.logs);
        downloadCSV(csvData, 'olilab_logs.csv');
    }, [state.logs]);

    const handleInventoryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportStatus(null);
        const text = await file.text();
        const parsedData = parseCSV(text);

        const itemsToImport = parsedData.map(row => {
            const keys = Object.keys(row);
            // Helper to find a key case-insensitively and ignoring spaces, with multiple variations
            const findKey = (variations: string[]) => 
                keys.find(k => variations.includes(k.toLowerCase().replace(/\s+/g, '')));
            
            // Define possible header names for each required field
            const nameKey = findKey(['name', 'itemname']);
            const categoryKey = findKey(['category']);
            const totalQuantityKey = findKey(['totalquantity', 'quantity', 'total']);

            const name = nameKey ? row[nameKey] : '';
            const category = categoryKey ? row[categoryKey] : '';
            const totalQuantityStr = totalQuantityKey ? row[totalQuantityKey] : '0';

            const totalQuantity = parseInt(totalQuantityStr, 10);
            
            return {
                name: name.trim(),
                category: category.trim(),
                totalQuantity: isNaN(totalQuantity) ? 0 : totalQuantity,
            };
        }).filter(item => item.name && item.category && item.totalQuantity > 0);

        if (itemsToImport.length > 0) {
            try {
                await importItems(itemsToImport);
                setImportStatus({ message: `Successfully imported ${itemsToImport.length} items.`, type: 'success' });
            } catch (error) {
                setImportStatus({ message: 'An error occurred during import.', type: 'error' });
            }
        } else {
            setImportStatus({ message: 'No valid items found in the CSV file. Please ensure it has columns for "name", "category", and "totalQuantity".', type: 'error' });
        }
        
        if (inventoryInputRef.current) {
            inventoryInputRef.current.value = '';
        }
    };
    
    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Data & Reports</h1>
                 <button onClick={() => window.print()} className="flex items-center justify-center px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-colors button-print-hide">
                    <IconPrinter />
                    <span>Print Page</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Data Management */}
                <div className="space-y-8">
                    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                        <h2 className="text-xl font-semibold text-white mb-4">Export Data</h2>
                        <p className="text-slate-400 mb-6">Download your laboratory data in CSV format for backups or external analysis.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button onClick={handleExportInventory} className="flex items-center justify-center w-full px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-colors">
                                <IconDownload /><span>Inventory</span>
                            </button>
                            <button onClick={handleExportUsers} className="flex items-center justify-center w-full px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-colors">
                                <IconDownload /><span>Users</span>
                            </button>
                            <button onClick={handleExportLogs} className="flex items-center justify-center w-full px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-colors">
                                <IconDownload /><span>Logs</span>
                            </button>
                        </div>
                    </div>
                     <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                        <h2 className="text-xl font-semibold text-white mb-4">Import Inventory</h2>
                        <p className="text-slate-400 mb-6">Upload a CSV file to bulk-add items to the inventory. The CSV must contain 'name', 'category', and 'totalQuantity' columns.</p>
                        <input type="file" id="inventory-import" className="hidden" ref={inventoryInputRef} onChange={handleInventoryFileChange} accept=".csv" />
                        <label htmlFor="inventory-import" className="flex items-center justify-center cursor-pointer w-full px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-700 transition-colors">
                            <IconUpload />
                            <span>Upload Inventory CSV</span>
                        </label>
                        {importStatus && (
                            <div className={`mt-4 text-sm p-3 rounded-lg ${importStatus.type === 'success' ? 'bg-green-900/50 border border-green-700 text-green-300' : 'bg-red-900/50 border border-red-700 text-red-300'}`}>
                                {importStatus.message}
                            </div>
                        )}
                    </div>
                </div>

                {/* Settings */}
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                    <h2 className="text-xl font-semibold text-white mb-4">System Settings</h2>
                    <p className="text-slate-400 mb-6">Customize the title and logo of the application.</p>
                    <form className="space-y-4" onSubmit={handleSettingsSave}>
                        <div>
                            <label htmlFor="title" className="block mb-2 text-sm font-medium text-slate-300">System Title</label>
                            <input type="text" id="title" name="title" value={localSettings.title} onChange={handleSettingsChange} className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5" />
                        </div>
                        <div>
                            <label htmlFor="logoUrl" className="block mb-2 text-sm font-medium text-slate-300">Logo Image URL</label>
                            <input type="text" id="logoUrl" name="logoUrl" value={localSettings.logoUrl} onChange={handleSettingsChange} className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5" />
                        </div>
                        <div className="flex items-center justify-end gap-4 pt-4">
                            {saveStatus && <p className="text-sm text-green-400">{saveStatus}</p>}
                            <button type="submit" className="flex items-center justify-center px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-700 transition-colors">
                                <IconDeviceFloppy />
                                <span>Save Settings</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
