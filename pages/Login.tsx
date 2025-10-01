import * as React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconOliveBranch, IconLoader } from '../components/icons';

export const LoginPage: React.FC = () => {
    const [identifier, setIdentifier] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [successMessage, setSuccessMessage] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    React.useEffect(() => {
        const state = location.state as { message?: string } | null;
        if(state?.message) {
            setSuccessMessage(state.message);
            // Clear location state to prevent message from showing again on refresh
            window.history.replaceState({}, document.title)
        }
    }, [location]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);
        
        try {
            const success = await login(identifier, password);
            if (success) {
                navigate('/dashboard', { replace: true });
            } else {
                setError('Invalid credentials. Please check your details and password.');
                setPassword('');
            }
        } catch (err: any) {
            setError(err.message);
            setPassword('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
            <div className="w-full max-w-sm p-8 space-y-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700">
                <div className="flex flex-col items-center">
                    <div className="p-3 bg-emerald-600 rounded-lg mb-4">
                        <IconOliveBranch />
                    </div>
                    <h1 className="text-3xl font-bold text-white">OliLab</h1>
                    <p className="text-slate-400">Science Laboratory Management System</p>
                </div>

                {successMessage && (
                    <div className="p-3 bg-green-900/50 border border-green-700 text-green-300 text-sm rounded-lg text-center">
                        {successMessage}
                    </div>
                )}
                
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                             <label htmlFor="identifier" className="sr-only">Email, Username, or LRN</label>
                            <input
                                id="identifier"
                                name="identifier"
                                type="text"
                                autoComplete="username"
                                required
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                                placeholder="Email, Username, or LRN"
                            />
                        </div>
                        <div>
                             <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                            />
                        </div>
                    </div>
                    
                    {error && (
                        <p className="text-center text-sm text-red-400 animate-in fade-in-0">{error}</p>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading || !password || !identifier}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? (
                                <IconLoader className="h-5 w-5" />
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </div>
                </form>
                <p className="text-center text-sm text-slate-400">
                    Don't have an account?{' '}
                    <Link to="/signup" className="font-medium text-emerald-400 hover:text-emerald-300">
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
};
