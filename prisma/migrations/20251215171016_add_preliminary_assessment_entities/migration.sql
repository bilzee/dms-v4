-- CreateTable
CREATE TABLE "preliminary_assessment_entities" (
    "id" TEXT NOT NULL,
    "preliminaryAssessmentId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preliminary_assessment_entities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "preliminary_assessment_entities_preliminaryAssessmentId_ent_key" ON "preliminary_assessment_entities"("preliminaryAssessmentId", "entityId");

-- AddForeignKey
ALTER TABLE "preliminary_assessment_entities" ADD CONSTRAINT "preliminary_assessment_entities_preliminaryAssessmentId_fkey" FOREIGN KEY ("preliminaryAssessmentId") REFERENCES "preliminary_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preliminary_assessment_entities" ADD CONSTRAINT "preliminary_assessment_entities_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
