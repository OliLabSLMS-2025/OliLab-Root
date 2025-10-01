import * as React from 'react';
import { User } from '../types';
import { useInventory } from '../context/InventoryContext';

interface UserSearchInputProps {
    selectedUserId: string;
    onUserSelect: (userId: string) => void;
}

export const UserSearchInput: React.FC<UserSearchInputProps> = ({ selectedUserId, onUserSelect }) => {
    const { state } = useInventory();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isSearching, setIsSearching] = React.useState(!selectedUserId);

    const selectedUser = React.useMemo(() => state.users.find(u => u.id === selectedUserId), [state.users, selectedUserId]);

    React.useEffect(() => {
        if (selectedUserId && !isSearching) {
            // If parent provides a default user, show it.
            setIsSearching(false);
        } else if (!selectedUserId) {
            // If parent clears the user, go into search mode.
            setIsSearching(true);
        }
    }, [selectedUserId, isSearching]);

    const filteredUsers = React.useMemo(() => {
        if (!searchTerm.trim()) return [];
        const lowercasedFilter = searchTerm.toLowerCase();
        return state.users.filter(user =>
            user.fullName.toLowerCase().includes(lowercasedFilter) ||
            user.username.toLowerCase().includes(lowercasedFilter) ||
            (user.lrn && user.lrn.includes(lowercasedFilter))
        ).slice(0, 5); // Limit results
    }, [state.users, searchTerm]);

    const handleSelectUser = (user: User) => {
        onUserSelect(user.id);
        setSearchTerm('');
        setIsSearching(false);
    };

    if (!isSearching && selectedUser) {
        return (
            <div>
                <label className="block mb-2 text-sm font-medium text-slate-300">Borrower</label>
                <div className="flex items-center justify-between bg-slate-700/50 border border-slate-600 rounded-lg p-2.5">
                    <span className="text-white">{selectedUser.fullName} ({selectedUser.username})</span>
                    <button
                        type="button"
                        onClick={() => setIsSearching(true)}
                        className="text-sm text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                        Change
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <label htmlFor="userSearch" className="block mb-2 text-sm font-medium text-slate-300">
                {selectedUser ? `Change Borrower (current: ${selectedUser.fullName})` : 'Search for Borrower'}
            </label>
            <input
                id="userSearch"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, username, or LRN..."
                className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
                autoFocus
            />
            {searchTerm && (
                <div className="relative w-full">
                    <ul className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg max-h-48 overflow-y-auto shadow-lg">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <li key={user.id} className="border-b border-slate-700 last:border-b-0">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectUser(user)}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors"
                                    >
                                        <p className="font-semibold text-white">{user.fullName}</p>
                                        <p className="text-xs text-slate-400">{user.username} - {user.lrn || 'No LRN'}</p>
                                    </button>
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-3 text-slate-400">No users found.</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};
