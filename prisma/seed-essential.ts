import { PrismaClient, Priority, AssessmentType, RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting essential seed...');

  // ========================================
  // 1. ADMIN USER
  // ========================================
  console.log('Creating admin user...');
  
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@drms.local' },
    update: {},
    create: {
      email: 'admin@drms.local',
      username: 'admin',
      passwordHash,
      name: 'System Administrator',
      phone: '+2348000000000',
      organization: 'DRMS System',
      isActive: true,
    },
  });

  console.log(`✅ Admin user created: ${admin.email}`);

  // ========================================
  // 2. ROLE DEFINITIONS  
  // ========================================
  console.log('Creating role definitions...');

  const roles = [
    {
      name: RoleName.ADMIN,
      description: 'Full system access and configuration management',
    },
    {
      name: RoleName.COORDINATOR,
      description: 'Can view all data, assign tasks, manage assessments and responses',
    },
    {
      name: RoleName.ASSESSOR,
      description: 'Can create and edit rapid assessments in assigned areas',
    },
    {
      name: RoleName.RESPONDER,
      description: 'Can update response status and report delivery progress',
    },
    {
      name: RoleName.DONOR,
      description: 'Can view reports, analytics and commitment tracking',
    },
  ];

  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: roleData,
    });
    console.log(`✅ Role created: ${role.name}`);
  }

  // ========================================
  // 2b. PERMISSIONS
  // ========================================
  console.log('Creating permissions...');

  const permissions = [
    { name: 'Create Assessment', code: 'CREATE_ASSESSMENT', category: 'assessment', description: 'Can create new assessments' },
    { name: 'View Assessment', code: 'VIEW_ASSESSMENT', category: 'assessment', description: 'Can view assessments' },
    { name: 'Edit Assessment', code: 'EDIT_ASSESSMENT', category: 'assessment', description: 'Can edit own assessments' },
    { name: 'Verify Assessment', code: 'VERIFY_ASSESSMENT', category: 'assessment', description: 'Can verify assessments' },
    { name: 'Publish Assessment', code: 'PUBLISH_ASSESSMENT', category: 'assessment', description: 'Can publish verified assessments' },
    { name: 'Create Response', code: 'CREATE_RESPONSE', category: 'response', description: 'Can create response plans' },
    { name: 'View Response', code: 'VIEW_RESPONSE', category: 'response', description: 'Can view response plans' },
    { name: 'Edit Response', code: 'EDIT_RESPONSE', category: 'response', description: 'Can edit own responses' },
    { name: 'Verify Response', code: 'VERIFY_RESPONSE', category: 'response', description: 'Can verify responses' },
    { name: 'Execute Response', code: 'EXECUTE_RESPONSE', category: 'response', description: 'Can execute response activities' },
    { name: 'View Entities', code: 'VIEW_ENTITIES', category: 'entity', description: 'Can view assigned entities' },
    { name: 'Manage Entities', code: 'MANAGE_ENTITIES', category: 'entity', description: 'Can manage entity assignments' },
    { name: 'View Crisis Dashboard', code: 'VIEW_CRISIS_DASHBOARD', category: 'dashboard', description: 'Can access crisis management dashboard' },
    { name: 'View Situation Dashboard', code: 'VIEW_SITUATION_DASHBOARD', category: 'dashboard', description: 'Can access situation awareness dashboard' },
    { name: 'View Donor Dashboard', code: 'VIEW_DONOR_DASHBOARD', category: 'dashboard', description: 'Can access donor dashboard' },
    { name: 'Manage Users', code: 'MANAGE_USERS', category: 'user', description: 'Can create and manage users' },
    { name: 'Assign Roles', code: 'ASSIGN_ROLES', category: 'user', description: 'Can assign roles to users' },
    { name: 'View Audit Logs', code: 'VIEW_AUDIT_LOGS', category: 'audit', description: 'Can view system audit logs' },
    { name: 'View Sync Conflicts', code: 'VIEW_SYNC_CONFLICTS', category: 'sync', description: 'Can view synchronization conflicts' },
    { name: 'Resolve Sync Conflicts', code: 'RESOLVE_SYNC_CONFLICTS', category: 'sync', description: 'Can resolve sync conflicts' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }
  console.log(`✅ ${permissions.length} permissions created`);

  // ========================================
  // 2c. ASSIGN PERMISSIONS TO ADMIN ROLE
  // ========================================
  console.log('Assigning all permissions to ADMIN role...');

  const adminRole = await prisma.role.findUnique({ where: { name: RoleName.ADMIN } });
  if (adminRole) {
    const allPermissions = await prisma.permission.findMany();
    for (const permission of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: adminRole.id, permissionId: permission.id },
      });
    }
    console.log(`✅ ${allPermissions.length} permissions assigned to ADMIN role`);

    // Assign admin role to admin user
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: admin.id,
        roleId: adminRole.id,
        assignedBy: admin.id,
      },
    });
    console.log('✅ Admin role assigned to admin user');
  }

  // ========================================
  // 3. GAP FIELD SEVERITIES (System Configuration)
  // ========================================
  console.log('Creating gap field severity configurations...');

  const gapFieldSeverities = [
    // HEALTH Assessment Gap Fields
    {
      fieldName: 'hasFunctionalClinic',
      assessmentType: AssessmentType.HEALTH,
      severity: Priority.MEDIUM,
      displayName: 'Functional Health Clinic',
      description: 'Gap if no functional health clinic facility available',
    },
    {
      fieldName: 'hasEmergencyServices',
      assessmentType: AssessmentType.HEALTH,
      severity: Priority.MEDIUM,
      displayName: 'Emergency Health Services',
      description: 'Gap if emergency health services are not available',
    },
    {
      fieldName: 'hasTrainedStaff',
      assessmentType: AssessmentType.HEALTH,
      severity: Priority.MEDIUM,
      displayName: 'Trained Health Staff',
      description: 'Gap if insufficient trained health personnel',
    },
    {
      fieldName: 'hasMedicineSupply',
      assessmentType: AssessmentType.HEALTH,
      severity: Priority.MEDIUM,
      displayName: 'Medicine Supply',
      description: 'Gap if essential medicine supply is unavailable',
    },
    {
      fieldName: 'hasMedicalSupplies',
      assessmentType: AssessmentType.HEALTH,
      severity: Priority.MEDIUM,
      displayName: 'Medical Supplies',
      description: 'Gap if critical medical supplies are unavailable',
    },
    {
      fieldName: 'hasMaternalChildServices',
      assessmentType: AssessmentType.HEALTH,
      severity: Priority.MEDIUM,
      displayName: 'Maternal and Child Health Services',
      description: 'Gap if maternal and child health services are not available',
    },

    // WASH Assessment Gap Fields
    {
      fieldName: 'isWaterSufficient',
      assessmentType: AssessmentType.WASH,
      severity: Priority.MEDIUM,
      displayName: 'Water Sufficiency',
      description: 'Gap if water supply is insufficient for population needs',
    },
    {
      fieldName: 'hasCleanWaterAccess',
      assessmentType: AssessmentType.WASH,
      severity: Priority.MEDIUM,
      displayName: 'Clean Water Access',
      description: 'Gap if population lacks access to clean drinking water',
    },
    {
      fieldName: 'areLatrinesSufficient',
      assessmentType: AssessmentType.WASH,
      severity: Priority.MEDIUM,
      displayName: 'Latrine Sufficiency',
      description: 'Gap if sanitation facilities are insufficient',
    },
    {
      fieldName: 'hasHandwashingFacilities',
      assessmentType: AssessmentType.WASH,
      severity: Priority.MEDIUM,
      displayName: 'Handwashing Facilities',
      description: 'Gap if handwashing facilities are not available',
    },
    {
      fieldName: 'hasOpenDefecationConcerns',
      assessmentType: AssessmentType.WASH,
      severity: Priority.MEDIUM,
      displayName: 'Open Defecation Concerns',
      description: 'Gap if open defecation issues are present',
    },

    // SHELTER Assessment Gap Fields
    {
      fieldName: 'areSheltersSufficient',
      assessmentType: AssessmentType.SHELTER,
      severity: Priority.MEDIUM,
      displayName: 'Shelter Sufficiency',
      description: 'Gap if emergency shelter is insufficient',
    },
    {
      fieldName: 'hasSafeStructures',
      assessmentType: AssessmentType.SHELTER,
      severity: Priority.MEDIUM,
      displayName: 'Safe Shelter Structures',
      description: 'Gap if shelter structures are not safe',
    },
    {
      fieldName: 'areOvercrowded',
      assessmentType: AssessmentType.SHELTER,
      severity: Priority.MEDIUM,
      displayName: 'Shelter Overcrowding',
      description: 'Gap if shelters are overcrowded',
    },
    {
      fieldName: 'provideWeatherProtection',
      assessmentType: AssessmentType.SHELTER,
      severity: Priority.MEDIUM,
      displayName: 'Weather Protection',
      description: 'Gap if shelters do not provide adequate weather protection',
    },

    // FOOD Assessment Gap Fields
    {
      fieldName: 'isFoodSufficient',
      assessmentType: AssessmentType.FOOD,
      severity: Priority.MEDIUM,
      displayName: 'Food Sufficiency',
      description: 'Gap if food supply is insufficient for population needs',
    },
    {
      fieldName: 'hasRegularMealAccess',
      assessmentType: AssessmentType.FOOD,
      severity: Priority.MEDIUM,
      displayName: 'Regular Meal Access',
      description: 'Gap if population lacks access to regular meals',
    },
    {
      fieldName: 'hasInfantNutrition',
      assessmentType: AssessmentType.FOOD,
      severity: Priority.MEDIUM,
      displayName: 'Infant Nutrition',
      description: 'Gap if infant/child nutrition services are unavailable',
    },

    // SECURITY Assessment Gap Fields
    {
      fieldName: 'isSafeFromViolence',
      assessmentType: AssessmentType.SECURITY,
      severity: Priority.MEDIUM,
      displayName: 'Safety from Violence',
      description: 'Gap if population is not safe from violence',
    },
    {
      fieldName: 'gbvCasesReported',
      assessmentType: AssessmentType.SECURITY,
      severity: Priority.MEDIUM,
      displayName: 'GBV Cases Reported',
      description: 'Gap if gender-based violence cases are reported',
    },
    {
      fieldName: 'hasSecurityPresence',
      assessmentType: AssessmentType.SECURITY,
      severity: Priority.MEDIUM,
      displayName: 'Security Presence',
      description: 'Gap if security personnel presence is insufficient',
    },
    {
      fieldName: 'hasProtectionReportingMechanism',
      assessmentType: AssessmentType.SECURITY,
      severity: Priority.MEDIUM,
      displayName: 'Protection Reporting Mechanism',
      description: 'Gap if protection reporting mechanisms are unavailable',
    },
    {
      fieldName: 'vulnerableGroupsHaveAccess',
      assessmentType: AssessmentType.SECURITY,
      severity: Priority.MEDIUM,
      displayName: 'Vulnerable Groups Access',
      description: 'Gap if vulnerable groups lack access to protection services',
    },
    {
      fieldName: 'hasLighting',
      assessmentType: AssessmentType.SECURITY,
      severity: Priority.MEDIUM,
      displayName: 'Security Lighting',
      description: 'Gap if adequate security lighting is not available',
    },
  ];

  for (const severityData of gapFieldSeverities) {
    await prisma.gapFieldSeverity.upsert({
      where: {
        unique_field_assessment: {
          fieldName: severityData.fieldName,
          assessmentType: severityData.assessmentType,
        },
      },
      update: {
        severity: severityData.severity,
        displayName: severityData.displayName,
        description: severityData.description,
        isActive: true,
      },
      create: {
        ...severityData,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });
  }

  console.log(`✅ ${gapFieldSeverities.length} gap field severities configured (HEALTH: 6, WASH: 5, SHELTER: 4, FOOD: 3, SECURITY: 6)`);

  // ========================================
  // 4. SAMPLE ASSESSMENT TEMPLATES
  // ========================================
  console.log('Creating assessment templates...');

  // Rapid Assessment Template
  await prisma.reportTemplate.upsert({
    where: { id: 'rapid-assessment-template' },
    update: {},
    create: {
      id: 'rapid-assessment-template',
      name: 'Rapid Needs Assessment',
      description: 'Quick initial assessment for disaster response planning',
      type: 'CUSTOM',
      layout: {
        sections: [
          {
            id: 'basic-info',
            title: 'Basic Information',
            fields: [
              { id: 'location', type: 'text', label: 'Location Name', required: true },
              { id: 'population', type: 'number', label: 'Estimated Population', required: true },
              { id: 'date', type: 'date', label: 'Assessment Date', required: true },
            ],
          },
          {
            id: 'health-needs',
            title: 'Health Needs',
            fields: [
              { id: 'disease_outbreaks', type: 'text', label: 'Disease Outbreaks Reported' },
              { id: 'medical_supplies', type: 'text', label: 'Medical Supplies Status' },
              { id: 'health_personnel', type: 'text', label: 'Health Personnel Available' },
            ],
          },
          {
            id: 'wash-needs',
            title: 'WASH Needs',
            fields: [
              { id: 'water_access', type: 'text', label: 'Water Access Status' },
              { id: 'sanitation_facilities', type: 'text', label: 'Sanitation Facilities' },
            ],
          },
        ],
      },
      createdById: admin.id,
      isPublic: true,
    },
  });

  // Daily Situation Report Template
  await prisma.reportTemplate.upsert({
    where: { id: 'daily-sitrep-template' },
    update: {},
    create: {
      id: 'daily-sitrep-template',
      name: 'Daily Situation Report',
      description: 'Daily summary of disaster response activities and situation',
      type: 'CUSTOM',
      layout: {
        sections: [
          {
            id: 'situation-update',
            title: 'Situation Update',
            fields: [
              { id: 'security_situation', type: 'textarea', label: 'Security Situation', required: true },
              { id: 'weather_conditions', type: 'text', label: 'Weather Conditions' },
              { id: 'population_movements', type: 'textarea', label: 'Population Movements' },
            ],
          },
          {
            id: 'response-activities',
            title: 'Response Activities',
            fields: [
              { id: 'health_response', type: 'textarea', label: 'Health Response Activities' },
              { id: 'wash_response', type: 'textarea', label: 'WASH Response Activities' },
              { id: 'shelter_response', type: 'textarea', label: 'Shelter Response Activities' },
            ],
          },
        ],
      },
      createdById: admin.id,
      isPublic: true,
    },
  });

  console.log('✅ Assessment templates created');

  // ========================================
  // 5. SAMPLE GEOGRAPHIC ENTITIES (Minimal)
  // ========================================
  console.log('Creating sample geographic entities...');

  const bornoState = await prisma.entity.upsert({
    where: { id: 'borno-state' },
    update: {},
    create: {
      id: 'borno-state',
      name: 'Borno State',
      type: 'STATE',
      isActive: true,
    },
  });

  const maiduguriLGA = await prisma.entity.upsert({
    where: { id: 'maiduguri-lga' },
    update: {},
    create: {
      id: 'maiduguri-lga',
      name: 'Maiduguri LGA',
      type: 'LGA',
      isActive: true,
    },
  });

  console.log('✅ Sample geographic entities created');

  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📋 Summary:');
  console.log(`   - Admin user: admin@drms.local / Admin@123456`);
  console.log(`   - 5 roles configured (ADMIN, COORDINATOR, ASSESSOR, RESPONDER, DONOR)`);
  console.log(`   - 24 gap field severities configured (HEALTH: 6, WASH: 5, SHELTER: 4, FOOD: 3, SECURITY: 6)`);
  console.log(`   - All set to MEDIUM severity (default)`);
  console.log(`   - 2 assessment templates created`);
  console.log(`   - 2 sample geographic entities`);
  console.log('');
  console.log('⚠️  IMPORTANT: Change the admin password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });