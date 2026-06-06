-- Run by postgres entrypoint on first container start.
-- Creates the 9 per-service databases if they don't already exist.

SELECT 'CREATE DATABASE sh_users'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sh_users')\gexec

SELECT 'CREATE DATABASE sh_catalog'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sh_catalog')\gexec

SELECT 'CREATE DATABASE sh_bookings'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sh_bookings')\gexec

SELECT 'CREATE DATABASE sh_reviews'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sh_reviews')\gexec

SELECT 'CREATE DATABASE sh_notifications'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sh_notifications')\gexec

SELECT 'CREATE DATABASE sh_chat'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sh_chat')\gexec

SELECT 'CREATE DATABASE sh_location'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sh_location')\gexec

SELECT 'CREATE DATABASE sh_jobs'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sh_jobs')\gexec
