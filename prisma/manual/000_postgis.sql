-- Run once, before the first `prisma migrate deploy`, against the target database.
-- Prisma does not manage extensions or GIST/GIN indexes on unsupported column
-- types, so these are applied as a raw-SQL migration outside the Prisma flow
-- (see prisma/schema.prisma bottom-of-file note).

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Spatial index for distance/radius queries on properties.location
CREATE INDEX IF NOT EXISTS properties_location_gist
  ON properties USING GIST (location);

-- Fuzzy match indexes for search + duplicate-address resolution (FR-DISC-1, FR-DISC-3)
CREATE INDEX IF NOT EXISTS properties_name_trgm
  ON properties USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS localities_name_trgm
  ON localities USING GIN (name gin_trgm_ops);

-- Full-text search vector for property name + address fields (FR-DISC-1)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(street, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(district, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(state, '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS properties_search_vector_gin
  ON properties USING GIN (search_vector);
