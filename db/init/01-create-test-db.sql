-- Runs once when the PostgreSQL volume is first created.
-- A separate database keeps integration and browser tests away from personal data.
CREATE DATABASE landed_test;
