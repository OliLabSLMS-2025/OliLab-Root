import * as React from 'react';
import { useInventory } from '../context/InventoryContext';
import { Modal } from '../components/Modal';
import { Item, LogAction, LogStatus } from '../types';
import { IconPlusCircle, IconPrinter, IconPencil, IconTrash, IconQrcode, IconDownload, IconChevronUp, IconChevronDown, IconChevronsUpDown, IconOliveBranch } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { UserSearchInput } from '../components/UserSearchInput';
import QRCode from 'qrcode';
import * as ReactDOM from 'react-dom/client';
import { ITEM_CATEGORIES } from '../constants';
import { useSettings } from '../context/SettingsContext';

const InventoryProgressBar: React.FC<{ available: number; total: number }> = ({ available, total }) => {
    const percentage = total > 0 ? (available / total) * 100 : 0;
    const color = percentage > 50 ? 'bg-green-500' : percentage > 20 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="w-full bg-slate-600 rounded-full h-2.5">
            <div className={`${color} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

// New component for the QR Code Label
const QrCodeLabel = React.forwardRef<HTMLCanvasElement, { item: Item }>(({ item }, ref) => {
    const { settings } = useSettings();
    return (
        <div className="bg-white text-black p-4 rounded-lg border-2 border-slate-300 w-64 flex flex-col items-center font-sans">
            <div className="flex items-center gap-2 mb-2 self-start">
                 <div className="p-1 bg-emerald-600 rounded-md">
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo" className="h-4 w-4 object-contain" />
                    ) : (
                      <IconOliveBranch className="h-4 w-4 text-white" />
                    )}
                 </div>
                 <h2 className="font-bold text-sm text-slate-800">{settings.title} Asset</h2>
            </div>
            <canvas ref={ref} className="w-48 h-48"></canvas>
            <h3 className="mt-2 text-lg font-bold text-center break-words w-full">{item.name}</h3>
            <p className="text-sm text-slate-600">{item.category}</p>
        </div>
    );
});

export const Inventory: React.FC = () => {
  const { state, requestBorrowItem, addItem, editItem, deleteItem } = useInventory();
  const { currentUser } = useAuth();
  const [isBorrowModalOpen, setBorrowModalOpen] = React.useState(false);
  const [isAddModalOpen, setAddModalOpen] = React.useState(false);
  const [isEditModalOpen, setEditModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [isQrModalOpen, setQrModalOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<Item | null>(null);
  const [itemToEdit, setItemToEdit] = React.useState<Item | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<Item | null>(null);
  const [itemForQr, setItemForQr] = React.useState<Item | null>(null);
  const [borrowForm, setBorrowForm] = React.useState({ quantity: 1 });
  const [borrowerId, setBorrowerId] = React.useState('');
  const [addForm, setAddForm] = React.useState({ name: '', totalQuantity: 10, category: ITEM_CATEGORIES[0] });
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [sortConfig, setSortConfig] = React.useState<{ key: keyof Item | 'availability'; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });
  const [borrowedCount, setBorrowedCount] = React.useState(0);
  const qrCanvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (isQrModalOpen && itemForQr && qrCanvasRef.current) {
        const dataToEncode = JSON.stringify({ id: itemForQr.id, name: itemForQr.name });
        QRCode.toCanvas(qrCanvasRef.current, dataToEncode, { width: 256, margin: 2 }, (error) => {
            if (error) console.error('QR Code generation failed:', error);
        });
    }
  }, [isQrModalOpen, itemForQr]);

  const categories = React.useMemo(() => ['all', ...ITEM_CATEGORIES], []);

  const requestSort = (key: keyof Item | 'availability') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Item | 'availability') => {
    if (!sortConfig || sortConfig.key !== key) {
        return <IconChevronsUpDown />;
    }
    if (sortConfig.direction === 'ascending') {
        return <IconChevronUp />;
    }
    return <IconChevronDown />;
  };

  const itemHasOutstandingLoans = React.useMemo(() => {
    if (!itemToDelete) return false;
    // An item has outstanding loans if there's any BORROW log for it with an APPROVED status.
    return state.logs.some(
        log => log.itemId === itemToDelete.id && log.action === LogAction.BORROW && log.status === LogStatus.APPROVED
    );
  }, [itemToDelete, state.logs]);

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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(addForm.name && addForm.totalQuantity > 0 && addForm.category) {
        await addItem({
            name: addForm.name,
            totalQuantity: Number(addForm.totalQuantity),
            category: addForm.category
        });
        setAddModalOpen(false);
        setAddForm({ name: '', totalQuantity: 10, category: ITEM_CATEGORIES[0] });
    }
  };

  const handleOpenEditModal = (item: Item) => {
    setItemToEdit(item);
    setBorrowedCount(item.totalQuantity - item.availableQuantity);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setItemToEdit(null);
    setEditModalOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemToEdit) {
      try {
        await editItem(itemToEdit);
        handleCloseEditModal();
      } catch (error: any) {
        alert(`Failed to save changes: ${error.message}`);
      }
    }
  };

  const handleOpenDeleteModal = (item: Item) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setItemToDelete(null);
    setDeleteModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      try {
        await deleteItem(itemToDelete.id);
        handleCloseDeleteModal();
      } catch (error: any) {
        alert(error.message); 
      }
    }
  };

  const handleOpenQrModal = (item: Item) => {
    setItemForQr(item);
    setQrModalOpen(true);
  };

  const handlePrintQr = () => {
      const printArea = document.getElementById('qr-print-area');
      if (itemForQr && printArea) {
        const PrintContent = () => <QrCodeLabel item={itemForQr} />;
        
        const root = ReactDOM.createRoot(printArea);
        root.render(<PrintContent />);
        
        document.body.classList.add('printing-qr');
        window.print();
        document.body.classList.remove('printing-qr');
        
        // Clean up after printing
        setTimeout(() => {
            root.unmount();
        }, 500);
      }
  };
  
  const handleDownloadQr = () => {
    if (qrCanvasRef.current && itemForQr) {
        const link = document.createElement('a');
        link.download = `qr-${itemForQr.name.replace(/\s+/g, '-')}.png`;
        link.href = qrCanvasRef.current.toDataURL('image/png');
        link.click();
    }
  };
  
  const sortedAndFilteredItems = React.useMemo(() => {
    let filterableItems = [...state.items];

    // Filter by search term
    if (searchTerm) {
        filterableItems = filterableItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
        filterableItems = filterableItems.filter(item => item.category === categoryFilter);
    }
    
    // Sort
    if (sortConfig !== null) {
        filterableItems.sort((a, b) => {
            let aValue: string | number;
            let bValue: string | number;

            if (sortConfig.key === 'availability') {
                aValue = a.totalQuantity > 0 ? a.availableQuantity / a.totalQuantity : 0;
                bValue = b.totalQuantity > 0 ? b.availableQuantity / b.totalQuantity : 0;
            } else {
                aValue = a[sortConfig.key as keyof Item];
                bValue = b[sortConfig.key as keyof Item];
            }
            
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }

    return filterableItems;
  }, [state.items, searchTerm, categoryFilter, sortConfig]);

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-white print-text-black">Inventory</h1>
        <div className="flex flex-col md:flex-row items-stretch gap-4 button-print-hide">
             <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {currentUser?.isAdmin && (
                <button onClick={() => setAddModalOpen(true)} className="flex items-center justify-center bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-emerald-700 transition-colors">
                    <IconPlusCircle />
                    <span>Add Item</span>
                </button>
            )}
             <button
                onClick={() => window.print()}
                className="flex items-center justify-center px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-colors"
            >
                <IconPrinter />
                <span>Print</span>
            </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6 button-print-hide">
          <span className="text-sm font-medium text-slate-400 mr-2">Filter by Category:</span>
          {categories.map(cat => (
              <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                      categoryFilter === cat
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                  {cat === 'all' ? 'All Categories' : cat}
              </button>
          ))}
      </div>


      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden print-bg-white">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-slate-400 uppercase bg-slate-700/50 print-text-black">
                    <tr>
                        <th scope="col" className="px-6 py-3">
                           <button onClick={() => requestSort('name')} className="flex items-center gap-1 group">
                                Item Name
                                <span className="opacity-50 group-hover:opacity-100 transition-opacity">{getSortIcon('name')}</span>
                            </button>
                        </th>
                        <th scope="col" className="px-6 py-3">
                            <button onClick={() => requestSort('category')} className="flex items-center gap-1 group">
                                Category
                                <span className="opacity-50 group-hover:opacity-100 transition-opacity">{getSortIcon('category')}</span>
                            </button>
                        </th>
                        <th scope="col" className="px-6 py-3">
                           <button onClick={() => requestSort('availability')} className="flex items-center gap-1 group">
                                Availability
                                <span className="opacity-50 group-hover:opacity-100 transition-opacity">{getSortIcon('availability')}</span>
                            </button>
                        </th>
                        {currentUser?.isAdmin && (
                            <th scope="col" className="px-6 py-3 text-center button-print-hide">QR Code</th>
                        )}
                        <th scope="col" className="px-6 py-3 text-center button-print-hide">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedAndFilteredItems.map(item => (
                        <tr key={item.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors print-text-black">
                            <td className="px-6 py-4 font-medium text-white print-text-black whitespace-nowrap">{item.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.category}</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3 min-w-[200px]">
                                    <span className="font-mono text-sm whitespace-nowrap">{item.availableQuantity} / {item.totalQuantity}</span>
                                    <InventoryProgressBar available={item.availableQuantity} total={item.totalQuantity} />
                                </div>
                            </td>
                            {currentUser?.isAdmin && (
                                <td className="px-6 py-4 text-center button-print-hide">
                                    <button onClick={() => handleOpenQrModal(item)} title="Show QR Code" aria-label={`Generate QR code for ${item.name}`} className="p-2 text-slate-400 hover:text-emerald-400">
                                        <IconQrcode />
                                    </button>
                                </td>
                            )}
                            <td className="px-6 py-4 text-center button-print-hide">
                                <div className="flex items-center justify-center gap-2">
                                     <button
                                        onClick={() => handleOpenBorrowModal(item)}
                                        disabled={item.availableQuantity === 0}
                                        className="font-medium text-emerald-400 hover:text-emerald-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Request
                                    </button>
                                    {currentUser?.isAdmin && (
                                        <>
                                            <span className="text-slate-600">|</span>
                                            <button onClick={() => handleOpenEditModal(item)} title="Edit Item" aria-label={`Edit ${item.name}`} className="p-2 text-slate-400 hover:text-blue-400"><IconPencil /></button>
                                            <button onClick={() => handleOpenDeleteModal(item)} title="Delete Item" aria-label={`Delete ${item.name}`} className="p-2 text-slate-400 hover:text-red-400"><IconTrash /></button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {sortedAndFilteredItems.length === 0 && (
                        <tr>
                            <td colSpan={currentUser?.isAdmin ? 5 : 4} className="text-center py-8 text-slate-400 print-text-black">No items match your search or filter.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
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

      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="Add New Item">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <input type="text" value={addForm.name} onChange={(e) => setAddForm((f: typeof addForm) => ({ ...f, name: e.target.value }))} placeholder="Item Name" required className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5" />
          <select value={addForm.category} onChange={(e) => setAddForm((f: typeof addForm) => ({ ...f, category: e.target.value }))} required className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5" >
              {ITEM_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <div>
            <label htmlFor="totalQuantity" className="block mb-2 text-sm font-medium text-slate-300">Total Quantity</label>
            <input type="number" id="totalQuantity" value={addForm.totalQuantity} onChange={(e) => setAddForm((f: typeof addForm) => ({ ...f, totalQuantity: parseInt(e.target.value, 10) || 0 }))} min="1" className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5" required />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setAddModalOpen(false)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">Add Item</button>
          </div>
        </form>
      </Modal>

       <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title="Edit Item">
         {itemToEdit && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
                <input type="text" value={itemToEdit.name} onChange={(e) => setItemToEdit({ ...itemToEdit, name: e.target.value })} placeholder="Item Name" required className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5" />
                <select value={itemToEdit.category} onChange={(e) => setItemToEdit({ ...itemToEdit, category: e.target.value })} required className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5">
                    {ITEM_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <div>
                    <label htmlFor="totalQuantity" className="block mb-2 text-sm font-medium text-slate-300">Total Quantity</label>
                    <input 
                        type="number" 
                        id="totalQuantity" 
                        value={itemToEdit.totalQuantity} 
                        onChange={(e) => {
                            const newTotal = parseInt(e.target.value, 10);
                            if (itemToEdit && !isNaN(newTotal)) {
                                setItemToEdit({
                                    ...itemToEdit,
                                    totalQuantity: newTotal,
                                    availableQuantity: newTotal - borrowedCount,
                                });
                            }
                        }}
                        min={borrowedCount} 
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5" 
                        required 
                    />
                    <p className="text-xs text-slate-400 mt-1">Cannot be lower than the amount currently borrowed ({borrowedCount}).</p>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={handleCloseEditModal} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors">Cancel</button>
                    <button type="submit" className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">Save Changes</button>
                </div>
            </form>
         )}
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal} title="Confirm Deletion">
        {itemToDelete && (
            <div>
                <p className="text-slate-300">Are you sure you want to delete the item <strong className="text-white">{itemToDelete.name}</strong>?</p>
                {itemHasOutstandingLoans && (
                    <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-700 text-yellow-300 text-sm rounded-lg">
                        <strong>Warning:</strong> This item has outstanding loans. It cannot be deleted until all borrowed units are returned.
                    </div>
                )}
                <p className="text-xs text-slate-500 mt-2">This action is irreversible.</p>
                <div className="flex justify-end gap-3 pt-6">
                    <button type="button" onClick={handleCloseDeleteModal} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors">Cancel</button>
                    <button 
                        type="button" 
                        onClick={handleDeleteConfirm} 
                        disabled={itemHasOutstandingLoans}
                        className="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:bg-red-800 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                        Confirm Delete
                    </button>
                </div>
            </div>
        )}
    </Modal>
    
    <Modal isOpen={isQrModalOpen} onClose={() => setQrModalOpen(false)} title={`QR Asset Tag for ${itemForQr?.name}`}>
        <div className="flex flex-col items-center justify-center space-y-4">
            {itemForQr && <QrCodeLabel item={itemForQr} ref={qrCanvasRef} />}
            <p className="text-slate-400 text-sm pt-2">Scan this code to quickly find this item.</p>
            <div className="flex w-full justify-center gap-4 pt-2">
                <button onClick={handlePrintQr} className="flex items-center justify-center w-full py-2 px-4 bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors">
                    <IconPrinter />
                    <span>Print</span>
                </button>
                <button onClick={handleDownloadQr} className="flex items-center justify-center w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                    <IconDownload />
                    <span>Download</span>
                </button>
            </div>
        </div>
    </Modal>
    </div>
  );
};
