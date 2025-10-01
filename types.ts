

export interface Item {
  id: string;
  name: string;
  totalQuantity: number;
  availableQuantity: number;
  category: string;
}

export enum UserStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
}

export interface User {
  id:string;
  username: string;
  fullName: string;
  email: string;
  password?: string; // For local authentication
  lrn: string; // Learners Reference Number - can be empty for admins
  gradeLevel: 'Grade 11' | 'Grade 12' | null;
  section: string | null;
  role: 'Member' | 'Admin';
  isAdmin: boolean;
  status: UserStatus;
}

export enum LogAction {
  BORROW = 'BORROW',
  RETURN = 'RETURN',
}

export enum LogStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED', // This means the item is on loan
  DENIED = 'DENIED',
  RETURNED = 'RETURNED',
}


export interface LogEntry {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  timestamp: string;
  action: LogAction;
  status?: LogStatus; // Optional for backward compatibility
  adminNotes?: string; // For denial reasons or return notes
  relatedLogId?: string; // To link a RETURN action to a BORROW action
  returnRequested?: boolean;
}

export interface Notification {
  id: string;
  message: string;
  type: 'new_user' | 'return_request' | 'new_borrow_request' | 'borrow_request_denied' | 'borrow_request_approved' | 'account_approved' | 'account_denied';
  read: boolean;
  timestamp: string;
  relatedLogId?: string;
}

export enum SuggestionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
}

export enum SuggestionType {
  ITEM = 'ITEM',
  FEATURE = 'FEATURE',
}

export interface Suggestion {
  id: string;
  userId: string;
  type: SuggestionType;
  title: string;
  description: string;
  category?: string; // Optional: for ITEM suggestions, set by admin upon approval
  status: SuggestionStatus;
  timestamp: string;
}

export interface Comment {
  id: string;
  userId: string;
  suggestionId: string;
  text: string;
  timestamp: string;
}

export interface InventoryReport {
  overview: string;
  lowStockItems: {
    name: string;
    available: number;
    total: number;
  }[];
  recentActivity: {
    itemName: string;
    userName: string;
    action: string;
    quantity: number;
  }[];
  mostActiveItems: {
    name: string;
    borrowCount: number;
  }[];
  conclusion: string;
}


// FIX: Moved State interface here to be shared across modules and avoid circular dependencies.
export interface State {
  items: Item[];
  users: User[];
  logs: LogEntry[];
  notifications: Notification[];
  suggestions: Suggestion[];
  comments: Comment[];
}