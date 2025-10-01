import * as React from 'react';
import { User, UserStatus } from '../types';
import { useInventory } from './InventoryContext';
import api from '../services/apiService';

export type SecureUser = Omit<User, 'password'>;

interface AuthContextType {
  currentUser: SecureUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'oliLabLoggedInUserId';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = React.useState<SecureUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const { state: inventoryState } = useInventory();

  React.useEffect(() => {
    try {
        const loggedInUserId = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (loggedInUserId) {
            const user = inventoryState.users.find(u => u.id === loggedInUserId);
            if (user && user.status === UserStatus.APPROVED) {
                const { password, ...secureUser } = user;
                setCurrentUser(secureUser);
            } else {
                // User ID in session not found or user is not approved, clear session
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
            }
        }
    } catch (error) {
        console.error("Failed to check session storage:", error);
    } finally {
        setIsLoading(false);
    }
  }, [inventoryState.users]);

  const login = async (identifier: string, password: string): Promise<boolean> => {
    try {
        const user = await api.login({ identifier, password });
        // The API now handles all checks (password, status).
        // If successful, it returns the user object (without password hash).
        setCurrentUser(user);
        sessionStorage.setItem(SESSION_STORAGE_KEY, user.id);
        return true;
    } catch (error) {
        // Re-throw the error so the LoginPage can catch it and display the message.
        throw error;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };
  
  const value = {
      currentUser,
      isAuthenticated: !!currentUser,
      isLoading,
      login,
      logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
