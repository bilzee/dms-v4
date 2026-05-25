'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X, BarChart3, UserCheck, Eye } from '@/lib/icons';

interface IndividualEntityGapInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentType?: 'health' | 'food' | 'wash' | 'shelter' | 'security';
}

export function IndividualEntityGapInfoPopup({ 
  isOpen, 
  onClose, 
  assessmentType = 'health'
}: IndividualEntityGapInfoPopupProps) {
  if (!isOpen) return null;

  const assessmentConfig = {
    health: {
      title: 'Health Assessment',
      icon: '🏥',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      fields: [
        {
          name: 'Medical Supplies',
          key: 'hasMedicalSupplies',
          description: 'Availability of medicines, equipment, diagnostic tools, and protective equipment'
        },
        {
          name: 'Trained Staff',
          key: 'hasTrainedStaff',
          description: 'Presence of qualified medical personnel and health workers'
        },
        {
          name: 'Functional Clinic',
          key: 'hasFunctionalClinic',
          description: 'Operational healthcare facility with basic infrastructure'
        },
        {
          name: 'Emergency Services',
          key: 'hasEmergencyServices',
          description: 'Emergency room, trauma care, and emergency medical response capability'
        },
        {
          name: 'Medicine Supply',
          key: 'hasMedicineSupply',
          description: 'Availability of essential medicines and medical commodities'
        },
        {
          name: 'Maternal & Child Services',
          key: 'hasMaternalChildServices',
          description: 'Prenatal, delivery, postnatal, and pediatric healthcare services'
        }
      ]
    },
    food: {
      title: 'Food Security',
      icon: '🍲',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      fields: [
        {
          name: 'Food Sufficiency',
          key: 'isFoodSufficient',
          description: 'Enough food available to meet population needs'
        },
        {
          name: 'Regular Meal Access',
          key: 'hasRegularMealAccess',
          description: 'Consistent access to regular meals throughout the day'
        },
        {
          name: 'Infant Nutrition',
          key: 'hasInfantNutrition',
          description: 'Specialized nutrition support for infants and young children'
        }
      ]
    },
    wash: {
      title: 'WASH (Water & Sanitation)',
      icon: '💧',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      fields: [
        {
          name: 'Water Sufficiency',
          key: 'isWaterSufficient',
          description: 'Adequate water quantity for drinking, cooking, and hygiene'
        },
        {
          name: 'Clean Water Access',
          key: 'hasCleanWaterAccess',
          description: 'Access to safe, potable water that meets WHO standards'
        },
        {
          name: 'Functional Latrines',
          key: 'functionalLatrinesAvailable',
          description: 'Working sanitation facilities that separate waste from human contact'
        },
        {
          name: 'Latrine Sufficiency',
          key: 'areLatrinesSufficient',
          description: 'Adequate number of latrines based on population served'
        },
        {
          name: 'Handwashing Facilities',
          key: 'hasHandwashingFacilities',
          description: 'Access to handwashing stations with soap and water'
        }
      ]
    },
    shelter: {
      title: 'Shelter Assessment',
      icon: '🏠',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      fields: [
        {
          name: 'Shelter Sufficiency',
          key: 'areSheltersSufficient',
          description: 'Adequate number of shelters for affected population'
        },
        {
          name: 'Safe Structures',
          key: 'hasSafeStructures',
          description: 'Structurally sound buildings that provide protection from elements'
        },
        {
          name: 'Weather Protection',
          key: 'provideWeatherProtection',
          description: 'Protection from rain, wind, extreme temperatures, and environmental hazards'
        },
        {
          name: 'Overcrowding',
          key: 'areOvercrowded',
          description: 'Appropriate space allocation per person in shelters'
        }
      ]
    },
    security: {
      title: 'Security Assessment',
      icon: '🛡️',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      fields: [
        {
          name: 'Safety from Violence',
          key: 'isSafeFromViolence',
          description: 'Protection from physical harm, violence, and security threats'
        },
        {
          name: 'Security Presence',
          key: 'hasSecurityPresence',
          description: 'Availability of security personnel or law enforcement'
        },
        {
          name: 'Protection Reporting',
          key: 'hasProtectionReportingMechanism',
          description: 'System for reporting protection concerns and accessing help'
        },
        {
          name: 'Vulnerable Groups Access',
          key: 'vulnerableGroupsHaveAccess',
          description: 'Prioritized access to services for women, children, elderly, and persons with disabilities'
        },
        {
          name: 'Lighting',
          key: 'hasLighting',
          description: 'Adequate lighting in communal areas and around facilities'
        }
      ]
    }
  };

  const config = assessmentConfig[assessmentType];

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5 text-blue-600" />
              Understanding {config.title} for Individual Entities
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Overview */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              What This Assessment Shows
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Individual entity assessments evaluate gap indicators at a <span className="font-medium">specific location or facility</span>. 
              Unlike aggregated &quot;All Entities&quot; view which shows patterns across many locations, this assessment focuses on 
              the actual conditions at <span className="font-medium">this specific entity</span>.
            </p>
          </div>

          {/* Severity Hierarchy */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              Understanding Severity Hierarchy
            </h3>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
              <p className="text-sm text-foreground">
                Severity is calculated through a clear three-level hierarchy that connects individual field conditions to overall entity priority:
              </p>
              
              <div className="space-y-3">
                {/* Level 1 */}
                <div className="bg-card rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <span className="font-semibold text-blue-700">Individual Field Severity</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Each gap field (e.g., &quot;Functional Clinic&quot;, &quot;Clean Water Access&quot;) is assigned a severity level in <strong>Gap Field Severity Management</strong>:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                      <span>CRITICAL</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                      <span>HIGH</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                      <span>MEDIUM</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      <span>LOW</span>
                    </div>
                  </div>
                </div>

                {/* Level 2 */}
                <div className="bg-card rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <span className="font-semibold text-purple-700">Assessment Severity</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Each assessment type (Health, Food, WASH, etc.) gets its severity from the <strong>highest severity among its gap fields that have gaps</strong>:
                  </p>
                  <div className="bg-purple-50 rounded p-2 text-xs text-purple-800">
                    Example: If Health assessment has fields with severities [HIGH, MEDIUM, LOW], the Assessment Severity = HIGH
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    The assessment badge shows this severity level with appropriate color and icon.
                  </p>
                </div>

                {/* Level 3 */}
                <div className="bg-card rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <span className="font-semibold text-green-700">Entity Severity</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Entity severity is the <strong>highest assessment severity across all assessment types</strong> for that entity:
                  </p>
                  <div className="bg-green-50 rounded p-2 text-xs text-green-800">
                    Example: If assessments show [HEALTH: HIGH, FOOD: MEDIUM, WASH: LOW], the Entity Severity = HIGH (with count = 1)
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    The entity badge shows this severity with the count of assessments that have this highest severity.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs font-semibold text-foreground mb-1">Priority Order:</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>CRITICAL</span>
                  <span>&gt;</span>
                  <span>HIGH</span>
                  <span>&gt;</span>
                  <span>MEDIUM</span>
                  <span>&gt;</span>
                  <span>LOW</span>
                </div>
              </div>
            </div>
          </div>

          {/* How Gap Detection Works */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              How Gaps Are Identified
            </h3>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <p className="text-sm text-foreground">
                Gaps are identified through rapid assessments where field teams evaluate specific criteria:
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                  <div>
                    <span className="font-semibold">Gap Detected (❌)</span> - Field doesn&apos;t meet required standards
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                  <div>
                    <span className="font-semibold">No Gap (✅)</span> - Field meets required standards
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What the Colors Mean */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              What the Colors Indicate
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                  <span className="text-sm font-medium text-red-700">Red (Critical)</span>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Life-threatening or immediate safety risks
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium text-orange-700">Orange (High)</span>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Significant impact on service delivery
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium text-yellow-700">Yellow (Medium)</span>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Moderate issues affecting service quality
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">Green (Low)</span>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  No significant issues detected
                </p>
              </div>
            </div>
          </div>

          {/* Specific Assessment Fields */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              {config.icon}
              <span>{config.title} Fields</span>
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-blue-800">
                This assessment evaluates the following gap indicators for {config.title}:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {config.fields.map((field, index) => (
                  <div key={field.key} className="bg-card rounded border border-blue-200 p-3">
                    <div className="font-medium text-sm text-foreground mb-1">
                      {field.name}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {field.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Assessment Process */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              Assessment Process
            </h3>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">1</div>
                  <div>
                    <div className="font-medium">Field Assessment</div>
                    <p className="text-muted-foreground">Evaluate each gap indicator against standards</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">2</div>
                  <div>
                    <div className="font-medium">Gap Detection</div>
                    <p className="text-muted-foreground">Identify which indicators have gaps</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">3</div>
                  <div>
                    <div className="font-medium">Severity Assignment</div>
                    <p className="text-muted-foreground">Assign severity level based on impact</p>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                Assessment is conducted by trained field teams and verified by supervisors.
              </p>
            </div>
          </div>

          {/* Key Benefits */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Key Benefits</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Provides detailed understanding of conditions at specific locations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Enables targeted interventions based on actual gaps identified</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Supports monitoring of improvement over time at individual sites</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Helps identify which specific resources are needed at each location</span>
              </li>
            </ul>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>
              Got it, thanks!
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default IndividualEntityGapInfoPopup;