-- Create database views for efficient gamification metrics calculation

-- View for donor performance metrics aggregation
CREATE OR REPLACE VIEW donor_performance_metrics AS
SELECT 
    d.id AS donor_id,
    d.name AS donor_name,
    d.organization AS donor_organization,
    d."selfReportedDeliveryRate" AS current_self_reported_rate,
    d."verifiedDeliveryRate" AS current_verified_rate,
    d."leaderboardRank" AS current_rank,
    d."createdAt" AS created_at,
    
    -- Commitment metrics
    COUNT(DISTINCT c.id) AS total_commitments,
    COUNT(DISTINCT CASE WHEN c.status = 'COMPLETE' THEN c.id END) AS completed_commitments,
    COUNT(DISTINCT CASE WHEN c.status = 'PARTIAL' THEN c.id END) AS partial_commitments,
    COUNT(DISTINCT CASE WHEN c.status = 'PLANNED' THEN c.id END) AS planned_commitments,
    
    -- Quantity metrics
    COALESCE(SUM(c."totalCommittedQuantity"), 0) AS total_committed_items,
    COALESCE(SUM(c."deliveredQuantity"), 0) AS total_delivered_items,
    COALESCE(SUM(c."verifiedDeliveredQuantity"), 0) AS total_verified_items,
    COALESCE(SUM(c."totalValueEstimated"), 0) AS total_commitment_value,
    
    -- Response metrics
    COUNT(DISTINCT r.id) AS total_responses,
    COUNT(DISTINCT CASE WHEN r."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED') THEN r.id END) AS verified_responses,
    COUNT(DISTINCT CASE WHEN r."verificationStatus" = 'REJECTED' THEN r.id END) AS rejected_responses,
    COUNT(DISTINCT CASE WHEN r."verificationStatus" = 'SUBMITTED' THEN r.id END) AS pending_responses,
    
    -- Date calculations
    MIN(c."commitmentDate") AS first_commitment_date,
    MAX(c."commitmentDate") AS last_commitment_date,
    MIN(r."createdAt") AS first_response_date,
    MAX(r."createdAt") AS last_response_date,
    GREATEST(
        COALESCE(MAX(c."lastUpdated"), '1970-01-01'::timestamp),
        COALESCE(MAX(r."createdAt"), '1970-01-01'::timestamp)
    ) AS last_activity_date
    
FROM "donors" d
LEFT JOIN "donorCommitments" c ON d.id = c."donorId"
LEFT JOIN "rapidResponses" r ON d.id = r."donorId"
WHERE d."isActive" = true
GROUP BY d.id, d.name, d.organization, d."selfReportedDeliveryRate", d."verifiedDeliveryRate", d."leaderboardRank", d."createdAt";

-- View for monthly performance trends
CREATE OR REPLACE VIEW monthly_performance_trends AS
WITH monthly_data AS (
    SELECT 
        d.id AS donor_id,
        DATE_TRUNC('month', c."commitmentDate") AS month_period,
        COUNT(DISTINCT c.id) AS commitments,
        COUNT(DISTINCT CASE WHEN c.status = 'COMPLETE' THEN c.id END) AS completed_commitments,
        COALESCE(SUM(c."totalCommittedQuantity"), 0) AS committed_items,
        COALESCE(SUM(c."verifiedDeliveredQuantity"), 0) AS verified_items,
        COALESCE(SUM(c."totalValueEstimated"), 0) AS total_value,
        COUNT(DISTINCT r.id) AS responses,
        COUNT(DISTINCT CASE WHEN r."verificationStatus" IN ('VERIFIED', 'AUTO_VERIFIED') THEN r.id END) AS verified_responses
    FROM "donors" d
    LEFT JOIN "donorCommitments" c ON d.id = c."donorId"
    LEFT JOIN "rapidResponses" r ON d.id = r."donorId" 
        AND DATE_TRUNC('month', r."createdAt") = DATE_TRUNC('month', c."commitmentDate")
    WHERE d."isActive" = true 
        AND c."commitmentDate" IS NOT NULL
        AND c."commitmentDate" >= NOW() - INTERVAL '2 years'
    GROUP BY d.id, DATE_TRUNC('month', c."commitmentDate")
)
SELECT 
    donor_id,
    month_period,
    commitments,
    completed_commitments,
    committed_items,
    verified_items,
    total_value,
    responses,
    verified_responses,
    -- Calculated metrics
    CASE 
        WHEN committed_items > 0 THEN ROUND((verified_items::decimal / committed_items::decimal) * 100, 2)
        ELSE 0 
    END AS delivery_rate,
    CASE 
        WHEN commitments > 0 THEN ROUND((completed_commitments::decimal / commitments::decimal) * 100, 2)
        ELSE 0 
    END AS fulfillment_rate,
    CASE 
        WHEN responses > 0 THEN ROUND((verified_responses::decimal / responses::decimal) * 100, 2)
        ELSE 0 
    END AS response_verification_rate,
    commitments + responses AS total_activities
FROM monthly_data;

-- View for regional rankings
CREATE OR REPLACE VIEW regional_rankings AS
WITH regional_metrics AS (
    SELECT 
        d.id AS donor_id,
        d.organization AS donor_name,
        COALESCE(e.location, 'Unassigned') AS region,
        
        -- Performance scores
        COALESCE(d."verifiedDeliveryRate", 0) AS verified_delivery_rate,
        COALESCE(SUM(c."totalValueEstimated"), 0) AS total_commitment_value,
        
        -- Consistency score (activities per month since creation)
        CASE 
            WHEN d."createdAt" IS NOT NULL THEN
                ROUND(
                    (COUNT(DISTINCT c.id) + COUNT(DISTINCT r.id))::decimal / 
                    GREATEST(EXTRACT(EPOCH FROM (NOW() - d."createdAt")) / (86400 * 30), 1),
                    3
                )
            ELSE 0 
        END AS consistency_score,
        
        -- Response speed score (simplified - based on recent activity)
        CASE 
            WHEN COUNT(DISTINCT c.id) > 0 THEN
                LEAST(100, 
                    CASE 
                        WHEN MAX(c."lastUpdated") > NOW() - INTERVAL '7 days' THEN 90
                        WHEN MAX(c."lastUpdated") > NOW() - INTERVAL '14 days' THEN 70
                        WHEN MAX(c."lastUpdated") > NOW() - INTERVAL '30 days' THEN 50
                        ELSE 30
                    END
                )
            ELSE 0 
        END AS speed_score
    FROM "donors" d
    LEFT JOIN "donorCommitments" c ON d.id = c."donorId"
    LEFT JOIN "rapidResponses" r ON d.id = r."donorId"
    LEFT JOIN "entityAssignments" ea ON d.id = ea."userId"
    LEFT JOIN "entities" e ON ea."entityId" = e."id"
    WHERE d."isActive" = true
    GROUP BY d.id, d.organization, e.location, d."createdAt"
),
ranked_donors AS (
    SELECT 
        donor_id,
        donor_name,
        region,
        verified_delivery_rate,
        total_commitment_value,
        consistency_score,
        speed_score,
        -- Calculate overall score using gamification weights
        (
            (verified_delivery_rate * 0.4) + 
            (LEAST(100, (total_commitment_value / 10000) * 100) * 0.3) +
            (LEAST(100, consistency_score * 1000) * 0.2) +
            (speed_score * 0.1)
        ) AS overall_score,
        ROW_NUMBER() OVER (PARTITION BY region ORDER BY (
            (verified_delivery_rate * 0.4) + 
            (LEAST(100, (total_commitment_value / 10000) * 100) * 0.3) +
            (LEAST(100, consistency_score * 1000) * 0.2) +
            (speed_score * 0.1)
        ) DESC) AS regional_rank
    FROM regional_metrics
)
SELECT 
    donor_id,
    donor_name,
    region,
    verified_delivery_rate,
    total_commitment_value,
    consistency_score,
    speed_score,
    overall_score,
    regional_rank,
    -- Calculate percentile within region
        ROUND(((COUNT(*) OVER (PARTITION BY region) - regional_rank) + 1) * 100.0 / COUNT(*) OVER (PARTITION BY region), 2) AS regional_percentile
FROM ranked_donors;

-- Materialized view for leaderboard (refreshes every 15 minutes)
CREATE MATERIALIZED VIEW leaderboard_snapshot AS
SELECT 
    rr.donor_id,
    rr.donor_name,
    rr.region,
    rr.overall_score,
    rr.regional_rank,
    rr.regional_percentile,
    dp.total_commitments,
    dp.total_commitment_value,
    dp.total_verified_items,
    dp.total_committed_items,
    dp.total_responses,
    dp.total_verified_responses,
    -- Calculate delivery rate
    CASE 
        WHEN dp.total_committed_items > 0 THEN 
            ROUND((dp.total_verified_items::decimal / dp.total_committed_items::decimal) * 100, 2)
        ELSE 0 
    END AS delivery_rate,
    dp.last_activity_date,
    -- Get previous rank for trend calculation (would need history table in production)
    d."leaderboardRank" AS previous_rank,
    -- Calculate trend
    CASE 
        WHEN d."leaderboardRank" IS NULL THEN 'new'
        WHEN rr.regional_rank < d."leaderboardRank" THEN 'up'
        WHEN rr.regional_rank > d."leaderboardRank" THEN 'down'
        ELSE 'stable'
    END AS trend,
    -- Ranking timestamp
    NOW() AS calculated_at
FROM regional_rankings rr
JOIN donor_performance_metrics dp ON rr.donor_id = dp.donor_id
JOIN "donors" d ON rr.donor_id = d.id
WHERE dp.total_commitments >= 3 -- Minimum commitments for ranking
ORDER BY rr.overall_score DESC;

-- Create unique index for efficient lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_snapshot_donor_id 
ON leaderboard_snapshot (donor_id);

-- Create composite indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_donor_commitments_donor_status_date 
ON "donorCommitments" ("donorId", status, "commitmentDate");

CREATE INDEX IF NOT EXISTS idx_donor_commitments_donor_last_updated 
ON "donorCommitments" ("donorId", "lastUpdated" DESC);

CREATE INDEX IF NOT EXISTS idx_rapid_responses_donor_status_created 
ON "rapidResponses" ("donorId", "verificationStatus", "createdAt");

CREATE INDEX IF NOT EXISTS idx_rapid_responses_donor_created 
ON "rapidResponses" ("donorId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_entity_assignments_user_entity 
ON "entityAssignments" ("userId", "entityId");

CREATE INDEX IF NOT EXISTS idx_donors_active_rank 
ON "donors" ("isActive", "leaderboardRank") WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS idx_donor_commitments_value 
ON "donorCommitments" ("donorId", "totalValueEstimated" DESC) WHERE "totalValueEstimated" > 0;

-- Partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_donor_commitments_complete 
ON "donorCommitments" ("donorId", "commitmentDate", "verifiedDeliveredQuantity") 
WHERE status = 'COMPLETE';

CREATE INDEX IF NOT EXISTS idx_donor_commitments_recent 
ON "donorCommitments" ("commitmentDate" DESC) 
WHERE "commitmentDate" >= NOW() - INTERVAL '1 year';

-- Function to refresh the leaderboard snapshot
CREATE OR REPLACE FUNCTION refresh_leaderboard_snapshot()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_snapshot;
    
    -- Update donor ranks in main table
    UPDATE "donors" d
    SET 
        "leaderboardRank" = ls.regional_rank,
        "verifiedDeliveryRate" = ls.delivery_rate,
        "selfReportedDeliveryRate" = ls.delivery_rate -- Using verified as proxy for self-reported
    FROM leaderboard_snapshot ls
    WHERE d.id = ls.donor_id;
    
    -- Log the refresh
    INSERT INTO audit_logs (action, details, "userId", timestamp)
    VALUES ('LEADERBOARD_REFRESH', 
            json_build_object('timestamp', NOW(), 'donors_updated', (SELECT COUNT(*) FROM leaderboard_snapshot)),
            'system', 
            NOW())
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic leaderboard updates (optional - for real-time updates)
-- Note: In production, you might want to run this as a scheduled job instead of triggers
CREATE OR REPLACE FUNCTION trigger_leaderboard_update()
RETURNS trigger AS $$
BEGIN
    -- Only update if the change affects gamification metrics
    IF TG_TABLE_NAME = 'donorCommitments' THEN
        -- If commitment status or quantities changed
        IF (
            OLD.status IS DISTINCT FROM NEW.status OR
            OLD."verifiedDeliveredQuantity" IS DISTINCT FROM NEW."verifiedDeliveredQuantity" OR
            OLD."totalValueEstimated" IS DISTINCT FROM NEW."totalValueEstimated"
        ) THEN
            PERFORM refresh_leaderboard_snapshot();
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Note: Uncomment these triggers if you want real-time updates
-- They can impact performance for high-volume applications

-- CREATE TRIGGER trigger_leaderboard_commitment_update
--     AFTER INSERT OR UPDATE ON "donorCommitments"
--     FOR EACH ROW EXECUTE FUNCTION trigger_leaderboard_update();

-- CREATE TRIGGER trigger_leaderboard_response_update  
--     AFTER UPDATE ON "rapidResponses"
--     FOR EACH ROW 
--     WHEN (OLD."verificationStatus" IS DISTINCT FROM NEW."verificationStatus")
--     EXECUTE FUNCTION trigger_leaderboard_update();

-- Grant necessary permissions
-- GRANT SELECT ON leaderboard_snapshot TO authenticated_users;
-- GRANT EXECUTE ON FUNCTION refresh_leaderboard_snapshot() TO authenticated_users;