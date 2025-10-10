-- Add new columns to locations table for Sahar food and Women prayer hall information
ALTER TABLE locations
ADD COLUMN sahar_food_availability BOOLEAN DEFAULT FALSE,
ADD COLUMN sahar_food_contact_number TEXT,
ADD COLUMN sahar_food_time TEXT,
ADD COLUMN women_prayer_hall BOOLEAN DEFAULT FALSE;