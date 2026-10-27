-- CHECK constraints Prisma cannot express declaratively.
ALTER TABLE review_category_scores
  ADD CONSTRAINT score_range CHECK (score BETWEEN 1 AND 5);

ALTER TABLE review_reasons
  ADD CONSTRAINT reason_min_length CHECK (char_length(text) >= 20);

ALTER TABLE owner_responses
  ADD CONSTRAINT response_max_length CHECK (char_length(text) <= 1000);

-- Materialized view backing public property-page aggregate ratings.
-- Refreshed (CONCURRENTLY) from the application job queue whenever a review
-- transitions into/out of APPROVED status — never computed synchronously
-- on the read path at India-wide scale.
CREATE MATERIALIZED VIEW IF NOT EXISTS property_rating_aggregates AS
SELECT
  p.id AS property_id,
  count(DISTINCT r.id) AS approved_review_count,
  avg(rcs.score) FILTER (WHERE rcs.category = 'VALUE_FOR_MONEY')      AS avg_value_for_money,
  avg(rcs.score) FILTER (WHERE rcs.category = 'LOCALITY_SAFETY')      AS avg_locality_safety,
  avg(rcs.score) FILTER (WHERE rcs.category = 'OWNER_RESPONSIVENESS') AS avg_owner_responsiveness,
  avg(rcs.score) FILTER (WHERE rcs.category = 'HYGIENE_CLEANLINESS')  AS avg_hygiene_cleanliness,
  avg(rcs.score) FILTER (WHERE rcs.category = 'WATER_SUPPLY')         AS avg_water_supply,
  avg(rcs.score) FILTER (WHERE rcs.category = 'ELECTRICITY_BACKUP')   AS avg_electricity_backup,
  avg(rcs.score) FILTER (WHERE rcs.category = 'AMENITIES_LIFT')       AS avg_amenities_lift,
  avg(rcs.score) AS overall_avg
FROM properties p
JOIN reviews r ON r.property_id = p.id AND r.status = 'APPROVED'
JOIN review_category_scores rcs ON rcs.review_id = r.id
GROUP BY p.id;

CREATE UNIQUE INDEX IF NOT EXISTS property_rating_aggregates_property_id
  ON property_rating_aggregates (property_id);

-- Application refresh call (job-queued, debounced per property):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY property_rating_aggregates;
