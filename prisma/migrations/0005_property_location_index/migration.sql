-- Speeds up the State -> City filter counts on /search.
CREATE INDEX "properties_status_state_district_idx" ON "properties"("status", "state", "district");
