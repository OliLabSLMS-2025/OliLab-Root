import * as React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { BorrowLog } from './pages/BorrowLog';
import { Users } from './pages/Users';
import { DataReports } from './pages/DataReports';
import { InventoryProvider } from './context/InventoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/Login';
import { Search } from './pages/Search';
import { MyBorrows } from './pages/MyBorrows';
import { Profile } from './pages/Profile';
import { SignUpPage } from './pages/SignUp';
import { Suggestions } from './pages/Suggestions';
import { SettingsProvider, useSettings } from './context/SettingsContext';

const DynamicTitle = () => {
    const { settings } = useSettings();
    React.useEffect(() => {
        if (settings.title) {
            document.title = `${settings.title} - Science Laboratory Management`;
        }
    }, [settings.title]);
    return null; // This component does not render anything
};

const MainLayout: React.FC = () => {
  const [isSidebarCollapsed, setSidebarCollapsed] = React.useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    // Call handler right away in case the initial state is wrong
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <div className="flex">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setSidebarCollapsed((prev: boolean) => !prev)} />
      <main className={`flex-1 min-h-screen main-content-print bg-slate-900 transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
          <Outlet />
      </main>
    </div>
  );
};

const ProtectedRoute: React.FC = () => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const AdminRoute: React.FC = () => {
    const { currentUser } = useAuth();
    return currentUser?.isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <InventoryProvider>
        <AuthProvider>
          <HashRouter>
            <DynamicTitle />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<MainLayout />}>
                      <Route index element={<Navigate to="/dashboard" replace />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="inventory" element={<Inventory />} />
                      <Route path="search" element={<Search />} />
                      <Route path="profile" element={<Profile />} />
                      <Route path="my-borrows" element={<MyBorrows />} />
                      <Route path="suggestions" element={<Suggestions />} />
                      
                      <Route element={<AdminRoute />}>
                          <Route path="log" element={<BorrowLog />} />
                          <Route path="users" element={<Users />} />
                          <Route path="reports" element={<DataReports />} />
                      </Route>
                      
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Route>
              </Route>
            </Routes>
          </HashRouter>
        </AuthProvider>
      </InventoryProvider>
    </SettingsProvider>
  );
};

export default App;
