import * as React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { IconLayoutDashboard, IconFlaskConical, IconBookText, IconUsers, IconOliveBranch, IconFileSpreadsheet, IconLogOut, IconSearch, IconUserCircle, IconLightbulb, IconChevronLeft, IconChevronRight, IconCloud, IconCloudOff, IconLoader } from './icons';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';
import { LogAction, LogStatus, SuggestionStatus, UserStatus } from '../types';
import { useSettings } from '../context/SettingsContext';

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

const formatTimeAgo = (date: Date | null): string => {
    if (!date) return 'never';
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const SyncStatusIndicator: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => {
    const { syncStatus, lastSynced } = useInventory();

    const statusContent = React.useMemo(() => {
        switch (syncStatus) {
            case 'syncing':
                return { icon: <IconLoader className="h-4 w-4" />, text: "Syncing...", color: "text-slate-400", title: "Saving your changes..." };
            case 'synced':
                return { icon: <IconCloud />, text: `Synced ${formatTimeAgo(lastSynced)}`, color: "text-green-400", title: `Last sync: ${lastSynced?.toLocaleString()}` };
            case 'error':
                return { icon: <IconCloudOff />, text: "Sync failed", color: "text-red-400", title: "Could not save changes. Please check your connection." };
            default:
                return { icon: null, text: "", color: "" };
        }
    }, [syncStatus, lastSynced]);

    return (
        <div 
            title={statusContent.title}
            className={`flex items-center gap-2 text-xs py-2 mt-2 transition-all duration-200 ${statusContent.color} ${isCollapsed ? 'justify-center' : 'px-4'}`}
        >
            {statusContent.icon}
            {!isCollapsed && <span>{statusContent.text}</span>}
        </div>
    );
};

const memberNavItems = [
  { to: '/dashboard', text: 'Dashboard', icon: <IconLayoutDashboard /> },
  { to: '/inventory', text: 'Inventory', icon: <IconFlaskConical /> },
  { to: '/search', text: 'Scan & Find', icon: <IconSearch /> },
  { to: '/my-borrows', text: 'My Borrows', icon: <IconBookText /> },
  { to: '/suggestions', text: 'Suggestions', icon: <IconLightbulb /> },
];

const NavItem: React.FC<{ to: string; text: string; icon: React.ReactNode; badge?: number; isCollapsed: boolean }> = ({ to, text, icon, badge, isCollapsed }) => (
    <NavLink
        to={to}
        title={isCollapsed ? text : undefined}
        className={({ isActive }) => `relative flex items-center py-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out ${isCollapsed ? 'px-3 justify-center' : 'px-4'} ${
            isActive
            ? 'bg-emerald-600 text-white shadow-lg'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
    >
        {icon}
        {!isCollapsed && <span className="ml-3 flex-grow">{text}</span>}
        {!isCollapsed && badge && badge > 0 && (
            <span className="bg-red-500 text-white text-xs font-semibold h-5 w-5 flex items-center justify-center rounded-full">
                {badge > 9 ? '9+' : badge}
            </span>
        )}
        {isCollapsed && badge && badge > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-semibold h-4 w-4 flex items-center justify-center rounded-full text-[9px] border-2 border-slate-800">
                {badge > 9 ? '!' : badge}
            </span>
        )}
    </NavLink>
);

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
    const { currentUser, logout } = useAuth();
    const { state } = useInventory();
    const { settings } = useSettings();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const pendingUsersCount = React.useMemo(() => {
        return state.users.filter(u => u.status === UserStatus.PENDING).length;
    }, [state.users]);
    
    const pendingSuggestionsCount = React.useMemo(() => {
        return state.suggestions.filter(s => s.status === SuggestionStatus.PENDING).length;
    }, [state.suggestions]);

    const borrowLogBadgeCount = React.useMemo(() => {
        const returnRequests = state.notifications.filter(n => n.type === 'return_request' && !n.read).length;
        const borrowRequests = state.notifications.filter(n => n.type === 'new_borrow_request' && !n.read).length;
        return returnRequests + borrowRequests;
    }, [state.notifications]);


    const adminNavItems = React.useMemo(() => [
      { to: '/dashboard', text: 'Dashboard', icon: <IconLayoutDashboard /> },
      { to: '/inventory', text: 'Inventory', icon: <IconFlaskConical /> },
      { to: '/search', text: 'Scan & Find', icon: <IconSearch /> },
      { to: '/log', text: 'Borrow Log', icon: <IconBookText />, badge: borrowLogBadgeCount },
      { to: '/users', text: 'Users', icon: <IconUsers />, badge: pendingUsersCount },
      { to: '/reports', text: 'Data & Reports', icon: <IconFileSpreadsheet /> },
      { to: '/suggestions', text: 'Suggestions', icon: <IconLightbulb />, badge: pendingSuggestionsCount },
    ], [pendingUsersCount, pendingSuggestionsCount, borrowLogBadgeCount]);

    const navItems = currentUser?.isAdmin ? adminNavItems : memberNavItems;

  return (
    <div className={`h-screen bg-slate-800 flex flex-col border-r border-slate-700 fixed top-0 left-0 sidebar-print-hide transition-all duration-300 ${isCollapsed ? 'w-20 p-2' : 'w-64 p-4'}`}>
      <div className={`flex items-center mb-8 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="p-2 bg-emerald-600 rounded-lg flex-shrink-0">
          {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-6 w-6 object-contain" />
          ) : (
              <IconOliveBranch />
          )}
        </div>
        {!isCollapsed && <h1 className="text-2xl font-bold text-white ml-3">{settings.title}</h1>}
      </div>
      <nav className="flex-grow flex flex-col space-y-2">
        {navItems.map(item => (
          <NavItem key={item.to} {...item} isCollapsed={isCollapsed} />
        ))}
      </nav>
      <div className="border-t border-slate-700 pt-4">
        {currentUser && !isCollapsed && (
            <div className="px-2 py-3 mb-2">
                <p className="text-sm font-semibold text-white truncate">{currentUser.fullName}</p>
                <p className="text-xs text-slate-400">{currentUser.role}</p>
            </div>
        )}
        <NavItem to="/profile" text="My Profile" icon={<IconUserCircle />} isCollapsed={isCollapsed}/>
        <button
            onClick={handleLogout}
            title="Logout"
            className={`flex w-full items-center py-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out text-slate-300 hover:bg-slate-700 hover:text-white ${isCollapsed ? 'justify-center px-3' : 'px-4'}`}
        >
            <IconLogOut />
            {!isCollapsed && <span className="ml-3">Logout</span>}
        </button>
        <button
            onClick={onToggle}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            className={`flex w-full items-center py-3 mt-2 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-all duration-200 ease-in-out ${isCollapsed ? 'justify-center px-3' : 'px-4'}`}
        >
            {isCollapsed ? (
                <IconChevronRight />
            ) : (
                <>
                    <IconChevronLeft />
                    <span className="ml-3">Collapse</span>
                </>
            )}
        </button>
        <SyncStatusIndicator isCollapsed={isCollapsed} />
      </div>
    </div>
  );
};
