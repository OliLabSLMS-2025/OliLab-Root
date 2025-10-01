import * as React from 'react';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { User } from '../types';
import { IconUserCircle, IconLoader } from '../components/icons';

export const Profile: React.FC = () => {
    const { currentUser } = useAuth();
    const { state, editUser } = useInventory();
    const [formData, setFormData] = React.useState<Partial<User>>({ fullName: '', email: '' });
    const [isSaving, setIsSaving] = React.useState(false);
    const [showSuccess, setShowSuccess] = React.useState(false);
    const [error, setError] = React.useState('');
    
    React.useEffect(() => {
        if (currentUser) {
            // Find the full user object from the state to edit, since currentUser is secure
            const fullUser = state.users.find(u => u.id === currentUser.id);
            if (fullUser) {
                setFormData(fullUser);
            }
        }
    }, [currentUser, state.users]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        // This check is sufficient as the save button is only rendered for admins.
        if (!formData.id) return;

        setIsSaving(true);
        
        try {
            await editUser(formData as User);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!currentUser || !formData.id) {
        return <div className="p-4 md:p-8 text-center">Loading profile...</div>;
    }

    const InfoField: React.FC<{ label: string, value: string | undefined | null }> = ({ label, value }) => (
        <div>
            <label className="block mb-1 text-sm font-medium text-slate-400">{label}</label>
            <p className="text-white bg-slate-700/50 rounded-lg p-2.5 text-sm">{value || 'N/A'}</p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">My Profile</h1>

            <div className="bg-slate-800 p-6 md:p-8 rounded-lg border border-slate-700">
                <div className="flex items-center gap-4 mb-8">
                    <div className="bg-slate-700 p-4 rounded-full">
                        <IconUserCircle />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold text-white">{currentUser.fullName}</h2>
                        <p className="text-slate-400">{currentUser.role} {currentUser.isAdmin && '(Admin)'}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {currentUser.isAdmin ? (
                        <>
                            <div>
                                <label htmlFor="fullName" className="block mb-2 text-sm font-medium text-slate-300">Full Name</label>
                                <input
                                    type="text"
                                    id="fullName"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData((f: Partial<User>) => ({ ...f, fullName: e.target.value }))}
                                    className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block mb-2 text-sm font-medium text-slate-300">Email Address</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData((f: Partial<User>) => ({ ...f, email: e.target.value }))}
                                    className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
                                    required
                                />
                            </div>
                        </>
                    ) : (
                         <>
                            <InfoField label="Full Name" value={formData.fullName} />
                            <InfoField label="Email Address" value={formData.email} />
                        </>
                    )}

                    <InfoField label="Username" value={currentUser.username} />
                    
                    {!currentUser.isAdmin && (
                        <>
                         <InfoField label="Learner's Reference Number (LRN)" value={currentUser.lrn} />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoField label="Grade Level" value={currentUser.gradeLevel} />
                            <InfoField label="Section" value={currentUser.section} />
                         </div>
                        </>
                    )}

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                    {currentUser.isAdmin && (
                        <div className="flex items-center justify-end gap-4 pt-4">
                            {showSuccess && <p className="text-sm text-green-400">Profile saved successfully!</p>}
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center justify-center w-32 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <IconLoader /> : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};
