import * as React from 'react';
import { IconCloudOff, IconLoader } from './icons';

interface ConnectionErrorProps {
    message: string;
    onRetry: () => void;
}

export const ConnectionError: React.FC<ConnectionErrorProps> = ({ message, onRetry }) => {
    const [isRetrying, setIsRetrying] = React.useState(false);

    const handleRetry = () => {
        setIsRetrying(true);
        onRetry();
        // A small timeout to prevent button spamming and give feedback
        setTimeout(() => setIsRetrying(false), 1500);
    };
    
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-center p-4">
            <div className="bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700 max-w-lg">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50">
                    <IconCloudOff className="h-6 w-6 text-red-400" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-white">Could Not Connect to Server</h2>
                <div className="mt-2 text-sm text-slate-400">
                    <p>The application was unable to establish a connection with the backend server.</p>
                    <p className="mt-4 p-3 bg-slate-900/70 border border-slate-600 rounded-md font-mono text-xs text-left">
                        {message}
                    </p>
                </div>
                <div className="mt-6">
                    <button
                        onClick={handleRetry}
                        disabled={isRetrying}
                        className="flex items-center justify-center w-full px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                    >
                        {isRetrying ? (
                            <>
                                <IconLoader className="h-5 w-5 mr-2" />
                                Retrying...
                            </>
                        ) : (
                            'Retry Connection'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
