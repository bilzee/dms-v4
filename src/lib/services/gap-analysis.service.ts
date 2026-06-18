/**
 * Gap Analysis Service
 * 
 * Provides gap analysis calculation functions that can be used across
 * the application for real-time form indicators and submission workflow.
 * 
 * Updated to use dynamic severity calculation from database instead of hardcoded logic.
 */

import { AssessmentType, Priority } from '@prisma/client'
import { gapFieldSeverityService } from './gap-field-severity.service'

// Types for gap analysis results
type FieldSeverityMap = Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>;

export interface HealthGapAnalysis {
  hasGap: boolean;
  gapFields: string[];
  severity: Priority;
  recommendations: string[];
  fieldSeverityMap?: FieldSeverityMap;
}

export interface FoodGapAnalysis {
  hasGap: boolean;
  gapFields: string[];
  severity: Priority;
  recommendations: string[];
  fieldSeverityMap?: FieldSeverityMap;
}

export interface WASHGapAnalysis {
  hasGap: boolean;
  gapFields: string[];
  severity: Priority;
  recommendations: string[];
  fieldSeverityMap?: FieldSeverityMap;
}

export interface ShelterGapAnalysis {
  hasGap: boolean;
  gapFields: string[];
  severity: Priority;
  recommendations: string[];
  fieldSeverityMap?: FieldSeverityMap;
}

export interface SecurityGapAnalysis {
  hasGap: boolean;
  gapFields: string[];
  severity: Priority;
  recommendations: string[];
  fieldSeverityMap?: FieldSeverityMap;
}

// Gap analysis calculation functions
export async function analyzeHealthGaps(data: any): Promise<HealthGapAnalysis> {
  const gapFields: string[] = [];
  let hasGap = false;

  // Gap-Indicating fields (when false, indicates a gap)
  if (!data.hasFunctionalClinic) { gapFields.push('hasFunctionalClinic'); hasGap = true; }
  if (!data.hasEmergencyServices) { gapFields.push('hasEmergencyServices'); hasGap = true; }
  if (!data.hasTrainedStaff) { gapFields.push('hasTrainedStaff'); hasGap = true; }
  if (!data.hasMedicineSupply) { gapFields.push('hasMedicineSupply'); hasGap = true; }
  if (!data.hasMedicalSupplies) { gapFields.push('hasMedicalSupplies'); hasGap = true; }
  if (!data.hasMaternalChildServices) { gapFields.push('hasMaternalChildServices'); hasGap = true; }

  // Build per-field severity map from database config
  const fieldSeverityMap: FieldSeverityMap = {};
  for (const fieldName of gapFields) {
    fieldSeverityMap[fieldName] = await gapFieldSeverityService.calculateFieldSeverity(
      AssessmentType.HEALTH, fieldName
    ) as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }

  // Use dynamic severity calculation from database
  const severity = await gapFieldSeverityService.calculateAssessmentSeverity(
    AssessmentType.HEALTH, 
    gapFields
  );

  const recommendations = generateHealthRecommendations(gapFields);

  return { hasGap, gapFields, severity, recommendations, fieldSeverityMap };
}

export async function analyzeFoodGaps(data: any): Promise<FoodGapAnalysis> {
  const gapFields: string[] = [];
  let hasGap = false;

  if (!data.isFoodSufficient) { gapFields.push('isFoodSufficient'); hasGap = true; }
  if (!data.hasRegularMealAccess) { gapFields.push('hasRegularMealAccess'); hasGap = true; }
  if (!data.hasInfantNutrition) { gapFields.push('hasInfantNutrition'); hasGap = true; }

  // Build per-field severity map from database config
  const fieldSeverityMap: FieldSeverityMap = {};
  for (const fieldName of gapFields) {
    fieldSeverityMap[fieldName] = await gapFieldSeverityService.calculateFieldSeverity(
      AssessmentType.FOOD, fieldName
    ) as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }

  // Use dynamic severity calculation from database
  const severity = await gapFieldSeverityService.calculateAssessmentSeverity(
    AssessmentType.FOOD, 
    gapFields
  );

  const recommendations = generateFoodRecommendations(gapFields);

  return { hasGap, gapFields, severity, recommendations, fieldSeverityMap };
}

export async function analyzeWASHGaps(data: any): Promise<WASHGapAnalysis> {
  const gapFields: string[] = [];
  let hasGap = false;

  if (!data.isWaterSufficient) { gapFields.push('isWaterSufficient'); hasGap = true; }
  if (!data.hasCleanWaterAccess) { gapFields.push('hasCleanWaterAccess'); hasGap = true; }
  if (!data.areLatrinesSufficient) { gapFields.push('areLatrinesSufficient'); hasGap = true; }
  if (!data.hasHandwashingFacilities) { gapFields.push('hasHandwashingFacilities'); hasGap = true; }
  if (data.hasOpenDefecationConcerns) { gapFields.push('hasOpenDefecationConcerns'); hasGap = true; }

  // Build per-field severity map from database config
  const fieldSeverityMap: FieldSeverityMap = {};
  for (const fieldName of gapFields) {
    fieldSeverityMap[fieldName] = await gapFieldSeverityService.calculateFieldSeverity(
      AssessmentType.WASH, fieldName
    ) as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }

  // Use dynamic severity calculation from database
  const severity = await gapFieldSeverityService.calculateAssessmentSeverity(
    AssessmentType.WASH, 
    gapFields
  );

  const recommendations = generateWASHRecommendations(gapFields);

  return { hasGap, gapFields, severity, recommendations, fieldSeverityMap };
}

export async function analyzeShelterGaps(data: any): Promise<ShelterGapAnalysis> {
  const gapFields: string[] = [];
  let hasGap = false;

  if (!data.areSheltersSufficient) { gapFields.push('areSheltersSufficient'); hasGap = true; }
  if (!data.hasSafeStructures) { gapFields.push('hasSafeStructures'); hasGap = true; }
  if (data.areOvercrowded) { gapFields.push('areOvercrowded'); hasGap = true; }
  if (!data.provideWeatherProtection) { gapFields.push('provideWeatherProtection'); hasGap = true; }

  // Build per-field severity map from database config
  const fieldSeverityMap: FieldSeverityMap = {};
  for (const fieldName of gapFields) {
    fieldSeverityMap[fieldName] = await gapFieldSeverityService.calculateFieldSeverity(
      AssessmentType.SHELTER, fieldName
    ) as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }

  // Use dynamic severity calculation from database
  const severity = await gapFieldSeverityService.calculateAssessmentSeverity(
    AssessmentType.SHELTER, 
    gapFields
  );

  const recommendations = generateShelterRecommendations(gapFields);

  return { hasGap, gapFields, severity, recommendations, fieldSeverityMap };
}

export async function analyzeSecurityGaps(data: any): Promise<SecurityGapAnalysis> {
  const gapFields: string[] = [];
  let hasGap = false;

  if (!data.isSafeFromViolence) { gapFields.push('isSafeFromViolence'); hasGap = true; }
  if (data.gbvCasesReported) { gapFields.push('gbvCasesReported'); hasGap = true; }
  if (!data.hasSecurityPresence) { gapFields.push('hasSecurityPresence'); hasGap = true; }
  if (!data.hasProtectionReportingMechanism) { gapFields.push('hasProtectionReportingMechanism'); hasGap = true; }
  if (!data.vulnerableGroupsHaveAccess) { gapFields.push('vulnerableGroupsHaveAccess'); hasGap = true; }
  if (!data.hasLighting) { gapFields.push('hasLighting'); hasGap = true; }

  // Build per-field severity map from database config
  const fieldSeverityMap: FieldSeverityMap = {};
  for (const fieldName of gapFields) {
    fieldSeverityMap[fieldName] = await gapFieldSeverityService.calculateFieldSeverity(
      AssessmentType.SECURITY, fieldName
    ) as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }

  // Use dynamic severity calculation from database
  const severity = await gapFieldSeverityService.calculateAssessmentSeverity(
    AssessmentType.SECURITY, 
    gapFields
  );

  const recommendations = generateSecurityRecommendations(gapFields);

  return { hasGap, gapFields, severity, recommendations, fieldSeverityMap };
}

// Recommendation generation functions
function generateHealthRecommendations(gapFields: string[]): string[] {
  const recommendations: string[] = [];
  if (gapFields.includes('hasFunctionalClinic')) {
    recommendations.push('Deploy mobile clinics or establish temporary health facilities');
  }
  if (gapFields.includes('hasEmergencyServices')) {
    recommendations.push('Establish emergency medical response team with proper equipment');
  }
  if (gapFields.includes('hasTrainedStaff')) {
    recommendations.push('Deploy trained medical personnel and provide emergency training');
  }
  if (gapFields.includes('hasMedicineSupply')) {
    recommendations.push('Procure and distribute essential medicines and medical supplies');
  }
  if (gapFields.includes('hasMedicalSupplies')) {
    recommendations.push('Secure medical equipment, diagnostic tools, and protective equipment');
  }
  if (gapFields.includes('hasMaternalChildServices')) {
    recommendations.push('Establish maternal and child health services with emergency obstetric care');
  }
  return recommendations;
}

function generateFoodRecommendations(gapFields: string[]): string[] {
  const recommendations: string[] = [];
  if (gapFields.includes('isFoodSufficient')) {
    recommendations.push('Request emergency food assistance and establish food distribution points');
  }
  if (gapFields.includes('hasRegularMealAccess')) {
    recommendations.push('Implement regular meal distribution programs and community kitchens');
  }
  if (gapFields.includes('hasInfantNutrition')) {
    recommendations.push('Distribute therapeutic feeding and infant nutrition supplements');
  }
  return recommendations;
}

function generateWASHRecommendations(gapFields: string[]): string[] {
  const recommendations: string[] = [];
  if (gapFields.includes('isWaterSufficient')) {
    recommendations.push('Deploy water trucking services and install water purification systems');
  }
  if (gapFields.includes('hasCleanWaterAccess')) {
    recommendations.push('Establish water treatment points and ensure water quality testing');
  }
  if (gapFields.includes('areLatrinesSufficient')) {
    recommendations.push('Construct emergency sanitation facilities and improve existing latrines');
  }
  if (gapFields.includes('hasHandwashingFacilities')) {
    recommendations.push('Distribute soap and hand sanitizer, establish handwashing stations');
  }
  if (gapFields.includes('hasOpenDefecationConcerns')) {
    recommendations.push('Implement safe defecation campaigns and monitor sanitation practices');
  }
  return recommendations;
}

function generateShelterRecommendations(gapFields: string[]): string[] {
  const recommendations: string[] = [];
  if (gapFields.includes('areSheltersSufficient')) {
    recommendations.push('Deploy emergency shelter kits and establish temporary housing');
  }
  if (gapFields.includes('hasSafeStructures')) {
    recommendations.push('Identify and retrofit safe buildings for emergency shelter use');
  }
  if (gapFields.includes('areOvercrowded')) {
    recommendations.push('Decongest existing shelters and establish additional shelter sites');
  }
  if (gapFields.includes('provideWeatherProtection')) {
    recommendations.push('Provide weatherproofing materials and improve shelter insulation');
  }
  return recommendations;
}

function generateSecurityRecommendations(gapFields: string[]): string[] {
  const recommendations: string[] = [];
  if (gapFields.includes('isSafeFromViolence')) {
    recommendations.push('Establish security patrols and safe zones for vulnerable populations');
  }
  if (gapFields.includes('gbvCasesReported')) {
    recommendations.push('Deploy specialized GBV response teams and establish safe reporting mechanisms');
  }
  if (gapFields.includes('hasSecurityPresence')) {
    recommendations.push('Request security personnel deployment and establish local security committees');
  }
  if (gapFields.includes('hasProtectionReportingMechanism')) {
    recommendations.push('Establish confidential protection reporting channels and community alert systems');
  }
  if (gapFields.includes('vulnerableGroupsHaveAccess')) {
    recommendations.push('Ensure priority access to services for women, children, elderly, and persons with disabilities');
  }
  if (gapFields.includes('hasLighting')) {
    recommendations.push('Install lighting systems in high-risk areas and communal spaces');
  }
  return recommendations;
}

export default {
  analyzeHealthGaps,
  analyzeFoodGaps,
  analyzeWASHGaps,
  analyzeShelterGaps,
  analyzeSecurityGaps
};