-- Allow temperatures like 100.4°F: DECIMAL(4,2) max is 99.99
-- Change to DECIMAL(5,2) so values 95–110 are valid.

ALTER TABLE visits ALTER COLUMN temperature TYPE DECIMAL(5,2);
ALTER TABLE illnesses ALTER COLUMN temperature TYPE DECIMAL(5,2);
