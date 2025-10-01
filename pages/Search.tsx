import * as React from 'react';
import { QRScanner } from '../components/QRScanner';
import { useInventory } from '../context/InventoryContext';
import { Item } from '../types';
import { Modal } from '../components/Modal';
import { IconSearch } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { UserSearchInput } from '../components/UserSearchInput';

const InventoryProgressBar: React.FC<{ available: number; total: number }> = ({ available, total }) => {
    const percentage = total > 0 ? (available / total) * 100 : 0;
    const color = percentage > 50 ? 'bg-green-500' : percentage > 20 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="w-full bg-slate-600 rounded-full h-2.5">
            <div className={`${color} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};


export const Search: React.FC = () => {
    const { state, requestBorrowItem } = useInventory();
    const { currentUser } = useAuth();
    const [searchResults, setSearchResults] = React.useState<Item[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [hasSearched, setHasSearched] = React.useState(false);
    const [isBorrowModalOpen, setBorrowModalOpen] = React.useState(false);
    const [selectedItem, setSelectedItem] = React.useState<Item | null>(null);
    const [borrowForm, setBorrowForm] = React.useState({ quantity: 1 });
    const [borrowerId, setBorrowerId] = React.useState('');

    const handleOpenBorrowModal = (item: Item) => {
        setSelectedItem(item);
        setBorrowForm({ quantity: 1 });
        if (currentUser) {
            setBorrowerId(currentUser.id);
        }
        setBorrowModalOpen(true);
    };

    const handleBorrowSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedItem && borrowerId && borrowForm.quantity > 0) {
            try {
                await requestBorrowItem({
                    itemId: selectedItem.id,
                    userId: borrowerId,
                    quantity: Number(borrowForm.quantity),
                });
                setBorrowModalOpen(false);
                alert('Borrow request submitted successfully!');
            } catch (error: any) {
                alert(`Failed to submit request: ${error.message}`);
            }
        }
    };
    
    const handleSearch = React.useCallback((query: string) => {
        setSearchQuery(query);
        setHasSearched(true);
        setSearchResults([]);

        if (!query) return;

        let foundItems: Item[] = [];
        let searchTerm = query.toLowerCase();

        try {
            const qrData = JSON.parse(query);
            if(qrData.id || qrData.name) {
                searchTerm = (qrData.name || qrData.id).toLowerCase();
            }
        } catch (e) {
            // Not JSON, treat as plain text. searchTerm is already set.
        }

        foundItems = state.items.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            item.id.toLowerCase() === searchTerm
        );
        
        setSearchResults(foundItems);
    }, [state.items]);

    const handleScanFailure = (error: string) => {
        console.warn(`QR scan error: ${error}`);
    };

    return (
        <div className="p-4 md:p-8 flex flex-col items-center">
            <h1 className="text-3xl font-bold text-white mb-4 text-center">Scan & Find Item</h1>
            <p className="text-slate-400 mb-8 text-center max-w-md">Position a QR code inside the viewfinder to automatically search for it in the inventory. You can also manually enter a search term below.</p>

            <div className="w-full max-w-lg mb-8">
                 <div className="w-full h-96 bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg overflow-hidden relative">
                    <QRScanner
                        onScanSuccess={(text) => handleSearch(text)}
                        onScanFailure={handleScanFailure}
                    />
                </div>
            </div>

            <div className="w-full max-w-lg mb-8">
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }} className="flex gap-2">
                    <label htmlFor="manual-search" className="sr-only">Search by item name or ID</label>
                    <input
                        id="manual-search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Or enter item name/ID manually..."
                        className="flex-grow bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button type="submit" className="flex items-center justify-center bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-emerald-700 transition-colors">
                        <IconSearch />
                        <span className="ml-2 hidden sm:inline">Search</span>
                    </button>
                </form>
            </div>
            
            <div className="w-full max-w-4xl">
                {hasSearched && (
                    <>
                        <h2 className="text-2xl font-semibold text-white mb-4">Search Results for "{searchQuery}"</h2>
                        {searchResults.length > 0 ? (
                            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-slate-300">
                                        <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3">Item Name</th>
                                                <th scope="col" className="px-6 py-3">Category</th>
                                                <th scope="col" className="px-6 py-3">Availability</th>
                                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {searchResults.map(item => (
                                                <tr key={item.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{item.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{item.category}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3 min-w-[200px]">
                                                            <span className="font-mono text-sm whitespace-nowrap">{item.availableQuantity} / {item.totalQuantity}</span>
                                                            <InventoryProgressBar available={item.availableQuantity} total={item.totalQuantity} />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => handleOpenBorrowModal(item)}
                                                            disabled={item.availableQuantity === 0}
                                                            className="font-medium text-emerald-400 hover:text-emerald-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            Request
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 px-6 bg-slate-800 rounded-lg border border-slate-700">
                                <p className="text-slate-400">No items found matching your search.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            <Modal isOpen={isBorrowModalOpen} onClose={() => setBorrowModalOpen(false)} title={`Request to Borrow: ${selectedItem?.name}`}>
                <form onSubmit={handleBorrowSubmit} className="space-y-4">
                    {currentUser?.isAdmin ? (
                        <UserSearchInput selectedUserId={borrowerId} onUserSelect={setBorrowerId} />
                    ) : (
                        <div>
                            <label className="block mb-2 text-sm font-medium text-slate-300">Borrower</label>
                            <div className="flex items-center justify-between bg-slate-700/50 border border-slate-600 rounded-lg p-2.5">
                                <span className="text-white">{currentUser?.fullName} ({currentUser?.username})</span>
                            </div>
                        </div>
                    )}
                    <div>
                        <label htmlFor="quantity" className="block mb-2 text-sm font-medium text-slate-300">Quantity</label>
                        <input type="number" id="quantity" value={borrowForm.quantity} onChange={(e) => setBorrowForm({ quantity: parseInt(e.target.value, 10)})} min="1" max={selectedItem?.availableQuantity} className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5" required />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setBorrowModalOpen(false)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" disabled={!borrowerId} className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed">Submit Request</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
