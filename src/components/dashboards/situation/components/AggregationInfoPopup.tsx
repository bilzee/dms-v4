'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, X, BarChart3, Users, AlertTriangle, CheckCircle } from '@/lib/icons';

interface AggregationInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AggregationInfoPopup({ isOpen, onClose }: AggregationInfoPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-blue-600" />
              Understanding &quot;All Entities&quot; Aggregation
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
              <BarChart3 className="h-4 w-4 text-blue-600" />
              What This View Shows
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              When you select <span className="font-medium">&quot;All Entities&quot;</span>, the dashboard combines assessment data 
              from all entities affected by the selected incident. This gives you a comprehensive overview of gaps 
              across the entire incident area, helping identify widespread issues and prioritize resources effectively.
            </p>
          </div>

          {/* Severity Hierarchy */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              Severity Calculation Method
            </h3>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
              <p className="text-sm text-foreground">
                Aggregated severity now uses the <span className="font-medium">same Gap Field Severity Management system</span> 
                as individual entity assessments, ensuring consistency across all views:
              </p>
              
              <div className="space-y-3">
                {/* Field Level */}
                <div className="bg-card rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <span className="font-semibold text-blue-700">Field-Level Severity</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Each gap field gets its severity from <strong>Gap Field Severity Management</strong> (not percentage-based):
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                    <span>&quot;Functional Clinic&quot; = CRITICAL (Critical infrastructure)</span>
                  </div>
                </div>

                {/* Display Count */}
                <div className="bg-card rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <span className="font-semibold text-purple-700">Entity Count Display</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Each field shows how many entities have gaps: <strong>[Severity] &quot;X of Y&quot;</strong>
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <div className="bg-red-600 text-white px-2 py-1 rounded text-xs">CRITICAL</div>
                    <span>2 of 4 entities have &quot;Functional Clinic&quot; gaps</span>
                  </div>
                </div>

                {/* Assessment Level */}
                <div className="bg-card rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <span className="font-semibold text-green-700">Assessment Severity</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Each assessment type gets severity from the <strong>highest severity among its fields</strong>
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span>If Health has fields [CRITICAL, HIGH, MEDIUM] → Health Assessment = CRITICAL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Example */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Practical Example
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-foreground mb-3">
                <span className="font-semibold">Scenario:</span> 4 entities have Health assessments
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>&quot;Functional Clinic&quot; field</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">CRITICAL</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">2 of 4</span>
                  </div>
                </div>
                <div className="text-muted-foreground text-xs pl-2">
                  Severity from Gap Field Management • 2 entities have gaps
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <span>&quot;Clean Water Access&quot; field</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">HIGH</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">1 of 4</span>
                  </div>
                </div>
                <div className="text-muted-foreground text-xs pl-2">
                  Severity from Gap Field Management • 1 entity has gaps
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t">
                  <span className="font-semibold">Health Assessment Severity</span>
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">CRITICAL</span>
                </div>
                <div className="text-muted-foreground text-xs pl-2">
                  Highest field severity = CRITICAL
                </div>
              </div>
            </div>
          </div>

          {/* What the Colors Mean */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              What the Colors Indicate
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  <span className="text-sm font-medium">Red (Critical)</span>
                </div>
                <p className="text-xs text-muted-foreground pl-5">
                  Urgent action needed. Widespread problem affecting most entities.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium">Orange (High)</span>
                </div>
                <p className="text-xs text-muted-foreground pl-5">
                  Significant issue requiring immediate attention.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium">Yellow (Medium)</span>
                </div>
                <p className="text-xs text-muted-foreground pl-5">
                  Moderate issue affecting some entities.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span className="text-sm font-medium">Green (Low)</span>
                </div>
                <p className="text-xs text-muted-foreground pl-5">
                  No significant gaps detected.
                </p>
              </div>
            </div>
          </div>

          {/* Key Benefits */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Key Benefits</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Identifies widespread issues that need coordinated response</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Helps prioritize resource allocation to most critical gaps</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Reveals patterns across different locations and entity types</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Enables data-driven decision making for incident response</span>
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

export default AggregationInfoPopup;