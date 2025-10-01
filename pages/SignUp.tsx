import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { IconOliveBranch, IconLoader } from '../components/icons';
import { User, UserStatus } from '../types';
import { GRADE_LEVELS } from '../constants';
import { Modal } from '../components/Modal';
import { UserAgreement } from '../components/UserAgreement';

const initialFormState = {
    username: '',
    fullName: '',
    email: '',
    lrn: '',
    gradeLevel: null as User['gradeLevel'],
    section: null as User['section'],
    password: '',
};

const initialErrorsState = {
    username: '',
    fullName: '',
    email: '',
    lrn: '',
    password: '',
    general: '',
};

export const SignUpPage: React.FC = () => {
    const [formData, setFormData] = React.useState(initialFormState);
    const [errors, setErrors] = React.useState(initialErrorsState);
    const [isLoading, setIsLoading] = React.useState(false);
    const { state, createUser } = useInventory();
    const navigate = useNavigate();
    const [isAgreementModalOpen, setAgreementModalOpen] = React.useState(false);
    const [agreedToTerms, setAgreedToTerms] = React.useState(false);

    const validateForm = (): boolean => {
        const newErrors = { ...initialErrorsState };
        let isValid = true;

        if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters long.';
            isValid = false;
        }
        if (formData.lrn && !/^\d{12}$/.test(formData.lrn)) {
            newErrors.lrn = 'LRN must be exactly 12 digits.';
            isValid = false;
        }
        if (state.users.some(u => u.username.toLowerCase() === formData.username.toLowerCase())) {
            newErrors.username = 'This username is already taken.';
            isValid = false;
        }
        if (state.users.some(u => u.fullName.toLowerCase() === formData.fullName.toLowerCase())) {
            newErrors.fullName = 'A user with this full name already exists.';
            isValid = false;
        }
        if (state.users.some(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
            newErrors.email = 'This email is already registered.';
            isValid = false;
        }
        if (formData.lrn && state.users.some(u => u.lrn === formData.lrn)) {
            if (!newErrors.lrn) newErrors.lrn = 'This LRN is already registered.';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors(initialErrorsState);

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const { ...userProfileData } = formData;
            const newUser: Omit<User, 'id' | 'status'> = {
                ...userProfileData,
                isAdmin: false, // New signups are always members
                role: 'Member',
            };
            
            await createUser(newUser);
            
            navigate('/login', { state: { message: 'Account created! An administrator will review your registration. You will be notified via email upon approval.' } });
        } catch (err: any) {
            let errorMessage = 'An error occurred during sign up.';
            console.error("Signup error:", err);
            setErrors((prev: typeof initialErrorsState) => ({ ...prev, general: errorMessage }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: typeof initialFormState) => {
            const newState = { ...prev, [name]: value };
            if (name === "gradeLevel") {
                newState.section = null;
                newState.gradeLevel = value === "" ? null : (value as User['gradeLevel']);
            }
            if (name === "section" && value === "") {
                newState.section = null;
            }
            return newState;
        });
    };

    const getInputClasses = (fieldName: keyof typeof errors) => {
        const baseClasses = "appearance-none rounded-lg relative block w-full px-3 py-3 border bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:z-10 sm:text-sm";
        return errors[fieldName]
            ? `${baseClasses} border-red-500 focus:ring-red-500 focus:border-red-500`
            : `${baseClasses} border-slate-600 focus:ring-emerald-500 focus:border-emerald-500`;
    };

    return (
        <>
            <div className="flex items-center justify-center min-h-screen bg-slate-900 py-8">
                <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700">
                    <div className="flex flex-col items-center">
                        <div className="p-3 bg-emerald-600 rounded-lg mb-4">
                            <IconOliveBranch />
                        </div>
                        <h1 className="text-3xl font-bold text-white">Create Account</h1>
                        <p className="text-slate-400">Join the OliLab System</p>
                    </div>
                    <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
                        <div>
                            <label htmlFor="fullName" className="sr-only">Full Name</label>
                            <input id="fullName" name="fullName" type="text" autoComplete="name" required value={formData.fullName} onChange={handleChange}
                                className={getInputClasses('fullName')}
                                placeholder="Full Name"
                            />
                            {errors.fullName && <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>}
                        </div>
                        <div>
                            <label htmlFor="username" className="sr-only">Username</label>
                            <input id="username" name="username" type="text" autoComplete="username" required value={formData.username} onChange={handleChange}
                                className={getInputClasses('username')}
                                placeholder="Username"
                            />
                            {errors.username && <p className="mt-1 text-xs text-red-400">{errors.username}</p>}
                        </div>
                        <div>
                            <label htmlFor="email" className="sr-only">Email Address</label>
                            <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleChange}
                            className={getInputClasses('email')}
                                placeholder="Email Address"
                            />
                            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
                        </div>
                        <div>
                            <label htmlFor="lrn" className="sr-only">Learner's Reference Number (LRN)</label>
                            <input id="lrn" name="lrn" type="text" required value={formData.lrn} onChange={handleChange}
                            className={getInputClasses('lrn')}
                                placeholder="Learner's Reference Number (LRN)"
                            />
                            {errors.lrn && <p className="mt-1 text-xs text-red-400">{errors.lrn}</p>}
                        </div>
                        <div className="flex gap-4">
                            <div className="w-full">
                                <label htmlFor="gradeLevel" className="sr-only">Grade Level</label>
                                <select id="gradeLevel" name="gradeLevel" value={formData.gradeLevel ?? ''} onChange={handleChange} required className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-slate-600 bg-slate-700 text-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm">
                                    <option value="">Select Grade Level</option>
                                    {Object.keys(GRADE_LEVELS).map(level => <option key={level} value={level}>{level}</option>)}
                                </select>
                            </div>
                            <div className="w-full">
                                <label htmlFor="section" className="sr-only">Section</label>
                                <select id="section" name="section" value={formData.section ?? ''} onChange={handleChange} required disabled={!formData.gradeLevel} className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-slate-600 bg-slate-700 text-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm disabled:opacity-50">
                                    <option value="">Select Section</option>
                                    {formData.gradeLevel && GRADE_LEVELS[formData.gradeLevel].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input id="password" name="password" type="password" autoComplete="new-password" required value={formData.password} onChange={handleChange}
                            className={getInputClasses('password')}
                                placeholder="Password"
                            />
                            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
                        </div>

                        <div className="pt-2">
                             <div className="flex items-center">
                                <input
                                    id="terms"
                                    name="terms"
                                    type="checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="h-4 w-4 text-emerald-600 bg-slate-700 border-slate-600 rounded focus:ring-emerald-500"
                                />
                                <label htmlFor="terms" className="ml-2 block text-sm text-slate-400">
                                    I have read and agree to the{' '}
                                    <button
                                        type="button"
                                        onClick={() => setAgreementModalOpen(true)}
                                        className="font-medium text-emerald-400 hover:text-emerald-300 underline"
                                    >
                                        User Agreement
                                    </button>
                                    .
                                </label>
                            </div>
                        </div>
                        
                        {errors.general && (
                            <p className="text-center text-sm text-red-400 animate-in fade-in-0">{errors.general}</p>
                        )}

                        <div className="pt-2">
                            <button type="submit" disabled={isLoading || !agreedToTerms}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? <IconLoader className="h-5 w-5" /> : 'Create Account'}
                            </button>
                        </div>
                    </form>
                    <p className="text-center text-sm text-slate-400">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>

            <Modal isOpen={isAgreementModalOpen} onClose={() => setAgreementModalOpen(false)} title="OliLab User Agreement">
                <UserAgreement />
                <div className="flex justify-end mt-4">
                    <button
                        onClick={() => setAgreementModalOpen(false)}
                        className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </Modal>
        </>
    );
};
