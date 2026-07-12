-- Migration 0005: Add speed and accuracy to vehicle_locations
ALTER TABLE vehicle_locations ADD COLUMN speed REAL;
ALTER TABLE vehicle_locations ADD COLUMN accuracy REAL;
