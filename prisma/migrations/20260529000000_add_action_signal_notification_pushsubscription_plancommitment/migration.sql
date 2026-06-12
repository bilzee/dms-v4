-- Step 1: Create plan_commitments table
CREATE TABLE "plan_commitments" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "commitment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plan_commitments_pkey" PRIMARY KEY ("id")
);

-- Step 2: Seed plan_commitments from existing FK data
INSERT INTO "plan_commitments" ("id", "plan_id", "commitment_id", "created_at")
SELECT gen_random_uuid(), rr."id", rr."commitmentId", NOW()
FROM "rapid_responses" rr
WHERE rr."commitmentId" IS NOT NULL;

-- Step 3: Create indexes and FKs on plan_commitments
CREATE UNIQUE INDEX "plan_commitments_plan_id_commitment_id_key" ON "plan_commitments"("plan_id", "commitment_id");
ALTER TABLE "plan_commitments" ADD CONSTRAINT "plan_commitments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "rapid_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plan_commitments" ADD CONSTRAINT "plan_commitments_commitment_id_fkey" FOREIGN KEY ("commitment_id") REFERENCES "donor_commitments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Drop FK constraints and index on rapid_responses
ALTER TABLE "rapid_responses" DROP CONSTRAINT IF EXISTS "rapid_responses_commitmentId_fkey";
ALTER TABLE "rapid_responses" DROP CONSTRAINT IF EXISTS "rapid_responses_donorId_fkey";
DROP INDEX IF EXISTS "rapid_responses_commitmentId_idx";

-- Step 5: Drop donorId and commitmentId columns from rapid_responses
ALTER TABLE "rapid_responses" DROP COLUMN "commitmentId";
ALTER TABLE "rapid_responses" DROP COLUMN "donorId";

-- Step 6: Create action_signals table
CREATE TABLE "action_signals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "incident_id" TEXT,
    "type" TEXT NOT NULL,
    "signal_reason" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "action_signals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "action_signals_user_id_entity_id_incident_id_type_signal_reason_key" ON "action_signals"("user_id", "entity_id", "incident_id", "type", "signal_reason");
CREATE INDEX "action_signals_user_id_resolved_at_idx" ON "action_signals"("user_id", "resolved_at");
CREATE INDEX "action_signals_user_id_entity_id_idx" ON "action_signals"("user_id", "entity_id");
CREATE INDEX "action_signals_user_id_priority_idx" ON "action_signals"("user_id", "priority");
ALTER TABLE "action_signals" ADD CONSTRAINT "action_signals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "action_signals" ADD CONSTRAINT "action_signals_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "action_signals" ADD CONSTRAINT "action_signals_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Create notifications table
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "signal_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
CREATE INDEX "notifications_user_id_expires_at_idx" ON "notifications"("user_id", "expires_at");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_signal_id_fkey" FOREIGN KEY ("signal_id") REFERENCES "action_signals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 8: Create push_subscriptions table
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "browser_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
