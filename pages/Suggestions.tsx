import * as React from 'react';
import { useInventory } from '../context/InventoryContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { Suggestion, SuggestionStatus, Comment, User, SuggestionType } from '../types';
import { IconPlusCircle, IconChevronDown, IconChevronUp } from '../components/icons';
import { ITEM_CATEGORIES } from '../constants';

const StatusBadge: React.FC<{ status: SuggestionStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    const statusMap = {
        [SuggestionStatus.PENDING]: { text: "Pending", classes: "bg-yellow-900 text-yellow-300" },
        [SuggestionStatus.APPROVED]: { text: "Approved", classes: "bg-green-900 text-green-300" },
        [SuggestionStatus.DENIED]: { text: "Denied", classes: "bg-red-900 text-red-300" },
    };
    const { text, classes } = statusMap[status];
    return <span className={`${baseClasses} ${classes}`}>{text}</span>;
};

const SuggestionComments: React.FC<{
    suggestion: Suggestion;
    currentUser: User;
}> = ({ suggestion, currentUser }) => {
    const { state, addComment } = useInventory();
    const [newCommentText, setNewCommentText] = React.useState('');

    const commentsForSuggestion = React.useMemo(() => {
        return state.comments
            .filter(c => c.suggestionId === suggestion.id)
            .map(c => ({
                ...c,
                user: state.users.find(u => u.id === c.userId)
            }))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [state.comments, state.users, suggestion.id]);

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newCommentText.trim()) {
            await addComment({
                suggestionId: suggestion.id,
                userId: currentUser.id,
                text: newCommentText.trim()
            });
            setNewCommentText('');
        }
    };

    const canComment = currentUser.isAdmin || currentUser.id === suggestion.userId;

    return (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">Commentary</h4>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {commentsForSuggestion.length > 0 ? commentsForSuggestion.map(comment => (
                    <div key={comment.id} className="text-xs p-3 bg-slate-900/70 rounded-md">
                        <div className="flex justify-between items-center mb-1">
                            <span className={`font-bold ${comment.user?.isAdmin ? 'text-emerald-400' : 'text-slate-200'}`}>
                                {comment.user?.fullName || 'Unknown User'}
                            </span>
                            <span className="text-slate-500">{new Date(comment.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-300 whitespace-pre-wrap">{comment.text}</p>
                    </div>
                )) : <p className="text-xs text-slate-500">No comments yet.</p>}
            </div>
            {canComment && (
                 <form onSubmit={handleCommentSubmit} className="mt-4 flex gap-2">
                    <textarea
                        value={newCommentText}
                        onChange={e => setNewCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        rows={2}
                        className="flex-grow bg-slate-700 border border-slate-600 rounded-lg p-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm self-end">Post</button>
                </form>
            )}
        </div>
    );
};


export const Suggestions: React.FC = () => {
    const { state, addSuggestion, approveItemSuggestion, approveFeatureSuggestion, denySuggestion } = useInventory();
    const { currentUser } = useAuth();
    
    const [isSuggestModalOpen, setSuggestModalOpen] = React.useState(false);
    const [suggestionType, setSuggestionType] = React.useState<SuggestionType>(SuggestionType.ITEM);
    const [suggestionForm, setSuggestionForm] = React.useState({ title: '', description: '' });
    
    const [isApproveModalOpen, setApproveModalOpen] = React.useState(false);
    const [isDenyModalOpen, setDenyModalOpen] = React.useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = React.useState<Suggestion | null>(null);
    const [approveForm, setApproveForm] = React.useState({ category: ITEM_CATEGORIES[0], quantity: 10 });
    const [denyReason, setDenyReason] = React.useState('');
    const [adminTab, setAdminTab] = React.useState<SuggestionType>(SuggestionType.ITEM);
    const [expandedSuggestionId, setExpandedSuggestionId] = React.useState<string | null>(null);

    const handleSuggestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        await addSuggestion({
            ...suggestionForm,
            type: suggestionType,
            userId: currentUser.id
        });
        setSuggestModalOpen(false);
        setSuggestionForm({ title: '', description: '' });
    };

    const openApproveModal = (suggestion: Suggestion) => {
        setSelectedSuggestion(suggestion);
        setApproveModalOpen(true);
    };

    const handleApproveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSuggestion) return;
        await approveItemSuggestion({
             suggestionId: selectedSuggestion.id,
             category: approveForm.category,
             totalQuantity: approveForm.quantity,
        });
        setApproveModalOpen(false);
        setSelectedSuggestion(null);
    };

    const openDenyModal = (suggestion: Suggestion) => {
        setSelectedSuggestion(suggestion);
        setDenyModalOpen(true);
    };

    const handleDenyConfirm = async () => {
        if (!selectedSuggestion || !denyReason.trim() || !currentUser) return;
        await denySuggestion({ 
            suggestionId: selectedSuggestion.id, 
            reason: denyReason,
            adminId: currentUser.id 
        });
        setDenyModalOpen(false);
        setSelectedSuggestion(null);
        setDenyReason('');
    };

    const toggleComments = (suggestionId: string) => {
        setExpandedSuggestionId((prev: string | null) => (prev === suggestionId ? null : suggestionId));
    };

    const mySuggestions = React.useMemo(() => {
        if (!currentUser) return [];
        return state.suggestions
            .filter(s => s.userId === currentUser.id)
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [state.suggestions, currentUser]);
    
    type SuggestionWithUser = Suggestion & { userName: string; commentCount: number; };

    const { itemSuggestions, featureSuggestions } = React.useMemo(() => {
        const suggestionsWithDetails: SuggestionWithUser[] = state.suggestions.map(suggestion => {
            const user = state.users.find(u => u.id === suggestion.userId);
            const commentCount = state.comments.filter(c => c.suggestionId === suggestion.id).length;
            return { ...suggestion, userName: user?.fullName || 'Unknown User', commentCount };
        }).sort((a, b) => {
            // Pending first, then by date
            if (a.status === SuggestionStatus.PENDING && b.status !== SuggestionStatus.PENDING) return -1;
            if (a.status !== SuggestionStatus.PENDING && b.status === SuggestionStatus.PENDING) return 1;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

        return {
            itemSuggestions: suggestionsWithDetails.filter(s => s.type === SuggestionType.ITEM),
            featureSuggestions: suggestionsWithDetails.filter(s => s.type === SuggestionType.FEATURE),
        };
    }, [state.suggestions, state.users, state.comments]);

    if (!currentUser) return null;

    const AdminSuggestionList: React.FC<{ suggestions: SuggestionWithUser[] }> = ({ suggestions }) => (
        <div className="space-y-4">
            {suggestions.map(suggestion => (
                <div key={suggestion.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-white">{suggestion.title}</h3>
                                <StatusBadge status={suggestion.status} />
                            </div>
                             {suggestion.type === SuggestionType.ITEM && suggestion.category &&
                                <p className="text-sm text-slate-400">Category: {suggestion.category}</p>
                            }
                            <p className="text-sm text-slate-300 mt-2">Description: <span className="font-normal text-slate-400 whitespace-pre-wrap">{suggestion.description}</span></p>
                            <p className="text-xs text-slate-500 mt-2">Suggested by {suggestion.userName} on {new Date(suggestion.timestamp).toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-4">
                             {suggestion.status === SuggestionStatus.PENDING && (
                                <div className="flex gap-2">
                                    {suggestion.type === SuggestionType.ITEM ? (
                                        <button onClick={() => openApproveModal(suggestion)} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-sm font-semibold">Approve</button>
                                    ) : (
                                        <button onClick={() => approveFeatureSuggestion(suggestion.id)} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-sm font-semibold">Approve</button>
                                    )}
                                    <button onClick={() => openDenyModal(suggestion)} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-sm font-semibold">Deny</button>
                                </div>
                            )}
                            <button onClick={() => toggleComments(suggestion.id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                                <span>{suggestion.commentCount} Comments</span>
                                {expandedSuggestionId === suggestion.id ? <IconChevronUp /> : <IconChevronDown />}
                            </button>
                        </div>
                    </div>
                    {expandedSuggestionId === suggestion.id && <SuggestionComments suggestion={suggestion} currentUser={currentUser} />}
                </div>
            ))}
            {suggestions.length === 0 && <p className="text-slate-400 text-center py-8">No suggestions of this type.</p>}
        </div>
    );

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Suggestions</h1>
                <button onClick={() => setSuggestModalOpen(true)} className="flex items-center justify-center bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-emerald-700 transition-colors">
                    <IconPlusCircle />
                    Make a Suggestion
                </button>
            </div>

            {currentUser.isAdmin && (
                <>
                    <div className="border-b border-slate-700 mb-6">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button onClick={() => setAdminTab(SuggestionType.ITEM)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${adminTab === SuggestionType.ITEM ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}>
                                Item Suggestions ({itemSuggestions.length})
                            </button>
                            <button onClick={() => setAdminTab(SuggestionType.FEATURE)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${adminTab === SuggestionType.FEATURE ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}>
                                Feature Suggestions ({featureSuggestions.length})
                            </button>
                        </nav>
                    </div>

                    {adminTab === SuggestionType.ITEM ? 
                        <AdminSuggestionList suggestions={itemSuggestions} /> : 
                        <AdminSuggestionList suggestions={featureSuggestions} />
                    }
                </>
            )}

            {!currentUser.isAdmin && (
                 <div className="space-y-4">
                    {mySuggestions.map(suggestion => (
                        <div key={suggestion.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-lg font-semibold text-white">{suggestion.title}</h3>
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{suggestion.type}</span>
                                        <StatusBadge status={suggestion.status} />
                                    </div>
                                    <p className="text-xs text-slate-500">Suggested on {new Date(suggestion.timestamp).toLocaleDateString()}</p>
                                </div>
                                <button onClick={() => toggleComments(suggestion.id)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors">
                                     <span>Commentary</span>
                                     {expandedSuggestionId === suggestion.id ? <IconChevronUp /> : <IconChevronDown />}
                                </button>
                            </div>
                            {expandedSuggestionId === suggestion.id && (
                                <div className="mt-4 pt-4 border-t border-slate-700/50">
                                     <p className="text-sm text-slate-300 mt-2">My Reason: <span className="font-normal text-slate-400 whitespace-pre-wrap">{suggestion.description}</span></p>
                                     <SuggestionComments suggestion={suggestion} currentUser={currentUser} />
                                </div>
                            )}
                        </div>
                    ))}
                    {mySuggestions.length === 0 && (
                        <div className="text-center py-10 px-6 bg-slate-800 rounded-lg border border-slate-700">
                             <p className="text-slate-400">You haven't made any suggestions yet.</p>
                        </div>
                    )}
                 </div>
            )}
            
            {/* --- Modals --- */}
            <Modal isOpen={isSuggestModalOpen} onClose={() => setSuggestModalOpen(false)} title="Make a Suggestion">
                <div className="border-b border-slate-700 mb-4">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <button onClick={() => setSuggestionType(SuggestionType.ITEM)} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${suggestionType === SuggestionType.ITEM ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
                            Suggest an Item
                        </button>
                        <button onClick={() => setSuggestionType(SuggestionType.FEATURE)} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${suggestionType === SuggestionType.FEATURE ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
                            Suggest a Feature
                        </button>
                    </nav>
                </div>
                <form onSubmit={handleSuggestSubmit} className="space-y-4">
                    {suggestionType === SuggestionType.ITEM && (
                        <>
                            <input type="text" value={suggestionForm.title} onChange={e => setSuggestionForm((f: typeof suggestionForm) => ({...f, title: e.target.value}))} placeholder="Item Name" required className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5" />
                            <textarea value={suggestionForm.description} onChange={e => setSuggestionForm((f: typeof suggestionForm) => ({...f, description: e.target.value}))} placeholder="Reason for suggesting this item..." required rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5" />
                        </>
                    )}
                    {suggestionType === SuggestionType.FEATURE && (
                         <>
                            <input type="text" value={suggestionForm.title} onChange={e => setSuggestionForm((f: typeof suggestionForm) => ({...f, title: e.target.value}))} placeholder="Feature Title (e.g., 'Dark Mode')" required className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5" />
                            <textarea value={suggestionForm.description} onChange={e => setSuggestionForm((f: typeof suggestionForm) => ({...f, description: e.target.value}))} placeholder="Describe the feature and why it would be useful..." required rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5" />
                        </>
                    )}
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setSuggestModalOpen(false)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">Submit Suggestion</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isApproveModalOpen} onClose={() => setApproveModalOpen(false)} title={`Approve Item: ${selectedSuggestion?.title}`}>
                <form onSubmit={handleApproveSubmit} className="space-y-4">
                    <p>This will add the item to the inventory. Please assign a category and initial quantity.</p>
                     <div>
                        <label htmlFor="category" className="block mb-2 text-sm font-medium text-slate-300">Category</label>
                        <select id="category" value={approveForm.category} onChange={(e) => setApproveForm((f: typeof approveForm) => ({...f, category: e.target.value}))} required className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5">
                            {ITEM_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="quantity" className="block mb-2 text-sm font-medium text-slate-300">Total Quantity</label>
                        <input type="number" id="quantity" value={approveForm.quantity} onChange={(e) => setApproveForm((f: typeof approveForm) => ({...f, quantity: parseInt(e.target.value, 10)}))} min="1" className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5" required />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setApproveModalOpen(false)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">Approve & Add Item</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isDenyModalOpen} onClose={() => setDenyModalOpen(false)} title="Confirm Denial">
                <p>Are you sure you want to deny the suggestion for <strong className="text-white">{selectedSuggestion?.title}</strong>?</p>
                <textarea value={denyReason} onChange={e => setDenyReason(e.target.value)} placeholder="Provide a reason for denying this suggestion..." required rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 mt-4" />
                <div className="flex justify-end gap-3 pt-6">
                    <button type="button" onClick={() => setDenyModalOpen(false)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors">Cancel</button>
                    <button onClick={handleDenyConfirm} disabled={!denyReason.trim()} className="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed">Confirm Deny</button>
                </div>
            </Modal>

        </div>
    );
};
