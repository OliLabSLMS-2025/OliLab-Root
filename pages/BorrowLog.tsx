import * as React from 'react';
import { useInventory } from '../context/InventoryContext';
import { LogAction, LogEntry, LogStatus } from '../types';
import { IconPrinter } from '../components/icons';
import { Modal } from '../components/Modal';

const tabs = [
    { id: 'requests', label: 'Borrow Requests' },
    { id: 'loans', label: 'Current Loans' },
    { id: 'history', label: 'Transaction History' },
];

// Define an extended type to include item and user names, which are added in the `useMemo` hook.
type LogEntryWithDetails = LogEntry & {
    itemName: string;
    userName: string;
};

const LogStatusBadge: React.FC<{ status: LogStatus | undefined }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap";
    const statusMap = {
        [LogStatus.PENDING]: { text: "Pending", classes: "bg-blue-900 text-blue-300" },
        [LogStatus.APPROVED]: { text: "On Loan", classes: "bg-yellow-900 text-yellow-300" },
        [LogStatus.DENIED]: { text: "Denied", classes: "bg-red-900 text-red-300" },
        [LogStatus.RETURNED]: { text: "Returned", classes: "bg-green-900 text-green-300" },
    };
    // Handle legacy logs that might not have a status by defaulting to APPROVED
    const effectiveStatus = status || LogStatus.APPROVED;
    const { text, classes } = statusMap[effectiveStatus];

    return <span className={`${baseClasses} ${classes}`}>{text}</span>;
};

export const BorrowLog: React.FC = () => {
  const { state, approveBorrowRequest, denyBorrowRequest, returnItem, markNotificationsAsRead } = useInventory();
  const [activeTab, setActiveTab] = React.useState('requests');

  const [isDenyModalOpen, setDenyModalOpen] = React.useState(false);
  const [isReturnModalOpen, setReturnModalOpen] = React.useState(false);
  const [selectedLog, setSelectedLog] = React.useState<LogEntryWithDetails | null>(null);
  const [denyReason, setDenyReason] = React.useState('');
  const [returnNotes, setReturnNotes] = React.useState('');
  
  React.useEffect(() => {
    const unreadNotifications = state.notifications
        .filter(n => (n.type === 'return_request' || n.type === 'new_borrow_request') && !n.read)
        .map(n => n.id);
    if (unreadNotifications.length > 0) {
        markNotificationsAsRead(unreadNotifications);
    }
  }, [state.notifications, markNotificationsAsRead]);

  const openDenyModal = (log: LogEntryWithDetails) => {
    setSelectedLog(log);
    setDenyModalOpen(true);
  };

  const handleDenySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLog && denyReason) {
        await denyBorrowRequest({ logId: selectedLog.id, reason: denyReason });
        setDenyModalOpen(false);
        setDenyReason('');
        setSelectedLog(null);
    }
  };

  const openReturnModal = (log: LogEntryWithDetails) => {
    setSelectedLog(log);
    setReturnModalOpen(true);
  }

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLog) {
        await returnItem({ borrowLog: selectedLog, adminNotes: returnNotes });
        setReturnModalOpen(false);
        setReturnNotes('');
        setSelectedLog(null);
    }
  };
  
  const { pendingRequests, currentLoans, transactionHistory } = React.useMemo(() => {
    const logsWithDetails: LogEntryWithDetails[] = state.logs.map(log => {
        const item = state.items.find(i => i.id === log.itemId);
        const user = state.users.find(u => u.id === log.userId);
        return {
            ...log,
            itemName: item?.name || 'Unknown Item',
            userName: user?.fullName || 'Unknown User',
        };
    }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    const requests = logsWithDetails.filter(log => log.action === LogAction.BORROW && log.status === LogStatus.PENDING);
    // Treat logs without a status as approved for backward compatibility
    const loans = logsWithDetails.filter(log => log.action === LogAction.BORROW && (log.status === LogStatus.APPROVED || typeof log.status === 'undefined'));

    return {
        pendingRequests: requests,
        currentLoans: loans,
        transactionHistory: logsWithDetails,
    }
  }, [state.logs, state.items, state.users]);


  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-white print-text-black">Borrow Log & Management</h1>
        <button
            onClick={() => window.print()}
            className="flex items-center justify-center px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-colors button-print-hide"
        >
            <IconPrinter />
            <span>Print</span>
        </button>
      </div>
      
      <div className="border-b border-slate-700 mb-6 button-print-hide">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                        ${activeTab === tab.id
                            ? 'border-emerald-500 text-emerald-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
                        }`
                    }
                >
                    {tab.label} {tab.id === 'requests' && pendingRequests.length > 0 && `(${pendingRequests.length})`}
                </button>
            ))}
        </nav>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden print-bg-white">
        <div className="overflow-x-auto">
            {activeTab === 'requests' && (
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50 print-text-black">
                        <tr>
                            <th scope="col" className="px-6 py-3">Item Name</th>
                            <th scope="col" className="px-6 py-3">Requested By</th>
                            <th scope="col" className="px-6 py-3">Quantity</th>
                            <th scope="col" className="px-6 py-3">Date</th>
                            <th scope="col" className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingRequests.map(log => (
                            <tr key={log.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors print-text-black">
                                <td className="px-6 py-4 font-medium text-white print-text-black whitespace-nowrap">{log.itemName}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{log.userName}</td>
                                <td className="px-6 py-4">{log.quantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => approveBorrowRequest(log.id)} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-sm font-semibold">Approve</button>
                                        <button onClick={() => openDenyModal(log)} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-sm font-semibold">Deny</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {pendingRequests.length === 0 && (
                             <tr>
                                <td colSpan={5} className="text-center py-8 text-slate-400">No pending borrow requests.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
            {activeTab === 'loans' && (
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50 print-text-black">
                        <tr>
                            <th scope="col" className="px-6 py-3">Item Name</th>
                            <th scope="col" className="px-6 py-3">Borrowed By</th>
                            <th scope="col" className="px-6 py-3">Quantity</th>
                            <th scope="col" className="px-6 py-3">Date</th>
                            <th scope="col" className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentLoans.map(log => (
                            <tr key={log.id} className={`border-b border-slate-700 hover:bg-slate-700/30 transition-colors print-text-black ${log.returnRequested ? 'bg-blue-900/30' : ''}`}>
                                <td className="px-6 py-4 font-medium text-white print-text-black whitespace-nowrap">{log.itemName}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{log.userName}</td>
                                <td className="px-6 py-4">{log.quantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={() => openReturnModal(log)} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded-md text-sm font-semibold">
                                        {log.returnRequested ? 'Confirm Return' : 'Mark as Returned'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {currentLoans.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-slate-400">No items are currently on loan.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
            {activeTab === 'history' && (
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50 print-text-black">
                        <tr>
                            <th scope="col" className="px-6 py-3">Item Name</th>
                            <th scope="col" className="px-6 py-3">User</th>
                            <th scope="col" className="px-6 py-3">Action</th>
                            <th scope="col" className="px-6 py-3">Quantity</th>
                            <th scope="col" className="px-6 py-3">Date</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactionHistory.map(log => (
                            <tr key={log.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors print-text-black">
                                <td className="px-6 py-4 font-medium text-white print-text-black whitespace-nowrap">{log.itemName}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{log.userName}</td>
                                <td className="px-6 py-4">
                                     <span className={`font-semibold ${log.action === LogAction.BORROW ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{log.quantity}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4"><LogStatusBadge status={log.status} /></td>
                            </tr>
                        ))}
                        {transactionHistory.length === 0 && (
                             <tr>
                                <td colSpan={6} className="text-center py-8 text-slate-400">No transaction history found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
      </div>
      
      <Modal isOpen={isDenyModalOpen} onClose={() => setDenyModalOpen(false)} title={`Deny Request: ${selectedLog?.itemName}`}>
        <form onSubmit={handleDenySubmit} className="space-y-4">
            <p>Please provide a reason for denying this borrow request.</p>
            <textarea value={denyReason} onChange={e => setDenyReason(e.target.value)} placeholder="e.g., Item reserved for class use" required rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5" />
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setDenyModalOpen(false)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">Confirm Denial</button>
            </div>
        </form>
      </Modal>

      <Modal isOpen={isReturnModalOpen} onClose={() => setReturnModalOpen(false)} title={`Return Item: ${selectedLog?.itemName}`}>
        <form onSubmit={handleReturnSubmit} className="space-y-4">
            <p>Confirm the return of {selectedLog?.quantity}x {selectedLog?.itemName} by {selectedLog?.userName}.</p>
            <textarea value={returnNotes} onChange={e => setReturnNotes(e.target.value)} placeholder="Add any notes about the return (optional, e.g., 'Item returned with minor scratches')" rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5" />
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setReturnModalOpen(false)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">Confirm Return</button>
            </div>
        </form>
      </Modal>
    </div>
  );
};
