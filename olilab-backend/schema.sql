-- OliLab Database Schema for PostgreSQL
-- This script creates all the necessary tables for the application to function.
-- To use, execute this entire script in the SQL Editor of your Supabase project.

-- -----------------------------------------------------------------------------
-- Table for Users
-- Stores user account information, roles, and status.
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(80) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    lrn VARCHAR(12),
    grade_level VARCHAR(50),
    section VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'Member',
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, DENIED
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Table for Inventory Items
-- Stores details about each item in the laboratory.
-- -----------------------------------------------------------------------------
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    total_quantity INTEGER NOT NULL,
    available_quantity INTEGER NOT NULL,
    category VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Table for Logs
-- Records all borrowing and returning transactions.
-- -----------------------------------------------------------------------------
CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Keep log history even if user is deleted
    item_id UUID REFERENCES items(id) ON DELETE CASCADE, -- If an item is deleted, its logs are removed
    quantity INTEGER NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action VARCHAR(20) NOT NULL, -- BORROW, RETURN
    status VARCHAR(20), -- PENDING, APPROVED, DENIED, RETURNED
    admin_notes TEXT,
    related_log_id UUID, -- Links a RETURN to its original BORROW log
    return_requested BOOLEAN DEFAULT FALSE
);

-- -----------------------------------------------------------------------------
-- Table for Notifications
-- Stores system-generated notifications for users. (Note: current implementation is frontend-only)
-- This table is included for future backend notification management.
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'new_user', 'return_request'
    read BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    related_log_id UUID
);

-- -----------------------------------------------------------------------------
-- Table for Suggestions
-- Allows users to suggest new items or features.
-- -----------------------------------------------------------------------------
CREATE TABLE suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL, -- ITEM, FEATURE
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100), -- For approved ITEM suggestions
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, DENIED
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Table for Comments
-- Allows admins and suggestion creators to comment on suggestions.
-- -----------------------------------------------------------------------------
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    suggestion_id UUID REFERENCES suggestions(id) ON DELETE CASCADE, -- Delete comments if suggestion is deleted
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for frequently queried columns to improve performance
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_item_id ON logs(item_id);
CREATE INDEX idx_suggestions_user_id ON suggestions(user_id);
CREATE INDEX idx_comments_suggestion_id ON comments(suggestion_id);

-- Notify that the script has completed.
-- (This part is not executable SQL but serves as a confirmation message)
-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
-- SCRIPT COMPLETE: All tables have been created successfully.
-- You can now proceed with the backend and frontend setup.
-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --