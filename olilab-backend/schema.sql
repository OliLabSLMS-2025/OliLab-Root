-- OliLab Database Schema for PostgreSQL
-- This script creates all necessary tables, types, and relationships.
-- Run this in your Supabase SQL Editor to set up the database.

-- Drop existing types and tables to start fresh (optional, for clean setup)
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS suggestions CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_status_enum;
DROP TYPE IF EXISTS user_role_enum;
DROP TYPE IF EXISTS log_action_enum;
DROP TYPE IF EXISTS log_status_enum;
DROP TYPE IF EXISTS suggestion_type_enum;
DROP TYPE IF EXISTS suggestion_status_enum;

-- 1. Create ENUM types for status and role fields
-- These constraints ensure data integrity for specific fields.

CREATE TYPE user_status_enum AS ENUM ('PENDING', 'APPROVED', 'DENIED');
CREATE TYPE user_role_enum AS ENUM ('Member', 'Admin');
CREATE TYPE log_action_enum AS ENUM ('BORROW', 'RETURN');
CREATE TYPE log_status_enum AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'RETURNED');
CREATE TYPE suggestion_type_enum AS ENUM ('ITEM', 'FEATURE');
CREATE TYPE suggestion_status_enum AS ENUM ('PENDING', 'APPROVED', 'DENIED');


-- 2. Create the 'users' table
-- Stores user account information and credentials.

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(80) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    lrn VARCHAR(12),
    grade_level VARCHAR(50),
    section VARCHAR(50),
    role user_role_enum NOT NULL DEFAULT 'Member',
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    status user_status_enum NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 3. Create the 'items' table
-- Stores all inventory items.

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    total_quantity INTEGER NOT NULL CHECK (total_quantity >= 0),
    available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 4. Create the 'suggestions' table
-- Stores user-submitted suggestions for new items or features.

CREATE TABLE suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type suggestion_type_enum NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100), -- For approved ITEM suggestions
    status suggestion_status_enum NOT NULL DEFAULT 'PENDING',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 5. Create the 'comments' table
-- Stores comments related to suggestions.

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    suggestion_id UUID REFERENCES suggestions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 6. Create the 'logs' table
-- Stores a history of all borrow and return transactions.

CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Keep log history even if user is deleted
    item_id UUID REFERENCES items(id) ON DELETE SET NULL, -- Keep log history even if item is deleted
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    action log_action_enum NOT NULL,
    status log_status_enum,
    admin_notes TEXT,
    related_log_id UUID, -- Links a RETURN log to the original BORROW log
    return_requested BOOLEAN DEFAULT FALSE
);

-- Add indexes for faster queries on frequently searched columns
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_item_id ON logs(item_id);
CREATE INDEX idx_suggestions_user_id ON suggestions(user_id);
CREATE INDEX idx_comments_suggestion_id ON comments(suggestion_id);


-- Final confirmation message
-- (This is just a comment, but it's good practice)
-- Schema creation complete. You can now initialize the database with the first admin user.