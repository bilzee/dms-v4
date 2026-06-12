-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "name" TEXT;

-- Update existing records to use the first 50 characters of description as name
UPDATE "incidents" SET "name" = CASE 
  WHEN "description" IS NOT NULL AND LENGTH("description") > 0 THEN 
    SUBSTRING("description", 1, 50)
  ELSE 
    'Unnamed Incident ' || id
  END;

-- Make the name field NOT NULL after populating it
ALTER TABLE "incidents" ALTER COLUMN "name" SET NOT NULL;
