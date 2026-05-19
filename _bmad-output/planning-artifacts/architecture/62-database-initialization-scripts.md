# 6.2 Database Initialization Scripts

### Seed Script for Development

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create permissions
  const permissions = await createPermissions();
  console.log('✅ Created permissions');

  // Create roles with permissions
  const roles = await createRoles(permissions);
  console.log('✅ Created roles');

  // Create test users
  const users = await createUsers(roles);
  console.log('✅ Created users');

  // Create incident
  const incident = await createIncident(users.coordinator);
  console.log('✅ Created incident');

  // Create affected entities
  const entities = await createEntities(users.coordinator);
  console.log('✅ Created affected entities');

  // Link entities to incident
  await linkEntitiesToIncident(incident.id, entities);
  console.log('✅ Linked entities to incident');

  // Create entity assignments
  await createEntityAssignments(users, entities);
  console.log('✅ Created entity assignments');

  // Create sample assessments
  await createSampleAssessments(users.assessor, entities, incident);
  console.log('✅ Created sample assessments');

  // Create donor
  const donor = await createDonor();
  console.log('✅ Created donor');

  // Create donor commitments
  await createDonorCommitments(donor, entities, incident);
  console.log('✅ Created donor commitments');

  console.log('🎉 Seed completed successfully!');
}

async function createPermissions() {
  const permissionData = [
    // Assessment permissions
    { name: 'Create Assessment', code: 'CREATE_ASSESSMENT', category: 'ASSESSMENT' },
    { name: 'Edit Assessment', code: 'EDIT_ASSESSMENT', category: 'ASSESSMENT' },
    { name: 'View Assessment', code: 'VIEW_ASSESSMENT', category: 'ASSESSMENT' },
    { name: 'Delete Assessment', code: 'DELETE_ASSESSMENT', category: 'ASSESSMENT' },
    
    // Response permissions
    { name: 'Create Response', code: 'CREATE_RESPONSE', category: 'RESPONSE' },
    { name: 'Edit Response', code: 'EDIT_RESPONSE', category: 'RESPONSE' },
    { name: 'View Response', code: 'VIEW_RESPONSE', category: 'RESPONSE' },
    
    // Verification permissions
    { name: 'Verify Assessment', code: 'VERIFY_ASSESSMENT', category: 'VERIFICATION' },
    { name: 'Verify Response', code: 'VERIFY_RESPONSE', category: 'VERIFICATION' },
    { name: 'Configure Auto-Approval', code: 'CONFIG_AUTO_APPROVAL', category: 'VERIFICATION' },
    
    // Entity permissions
    { name: 'Create Entity', code: 'CREATE_ENTITY', category: 'ENTITY' },
    { name: 'Assign Entity', code: 'ASSIGN_ENTITY', category: 'ENTITY' },
    
    // Incident permissions
    { name: 'Manage Incidents', code: 'MANAGE_INCIDENTS', category: 'INCIDENT' },
    
    // Donor permissions
    { name: 'Create Commitment', code: 'CREATE_COMMITMENT', category: 'DONOR' },
    { name: 'View Dashboard', code: 'VIEW_DONOR_DASHBOARD', category: 'DONOR' },
    
    // Admin permissions
    { name: 'Manage Users', code: 'MANAGE_USERS', category: 'ADMIN' },
    { name: 'View Audit Logs', code: 'VIEW_AUDIT_LOGS', category: 'ADMIN' },
  ];

  const permissions = await Promise.all(
    permissionData.map(p =>
      prisma.permission.upsert({
        where: { code: p.code },
        update: {},
        create: { ...p, description: p.name },
      })
    )
  );

  return permissions;
}

async function createRoles(permissions: any[]) {
  // Helper to get permission IDs by codes
  const getPermissionIds = (codes: string[]) =>
    permissions.filter(p => codes.includes(p.code)).map(p => ({ id: p.id }));

  const rolesData = [
    {
      name: 'ASSESSOR',
      description: 'Field assessor conducting rapid assessments',
      permissionCodes: [
        'CREATE_ASSESSMENT',
        'EDIT_ASSESSMENT',
        'VIEW_ASSESSMENT',
        'CREATE_ENTITY',
        'VIEW_RESPONSE',
      ],
    },
    {
      name: 'COORDINATOR',
      description: 'Coordinator managing verification and incidents',
      permissionCodes: [
        'VIEW_ASSESSMENT',
        'VERIFY_ASSESSMENT',
        'VIEW_RESPONSE',
        'VERIFY_RESPONSE',
        'CONFIG_AUTO_APPROVAL',
        'CREATE_ENTITY',
        'ASSIGN_ENTITY',
        'MANAGE_INCIDENTS',
      ],
    },
    {
      name: 'RESPONDER',
      description: 'Responder delivering aid',
      permissionCodes: [
        'VIEW_ASSESSMENT',
        'CREATE_RESPONSE',
        'EDIT_RESPONSE',
        'VIEW_RESPONSE',
      ],
    },
    {
      name: 'DONOR',
      description: 'Donor providing resources',
      permissionCodes: [
        'CREATE_COMMITMENT',
        'VIEW_DONOR_DASHBOARD',
        'VIEW_ASSESSMENT',
      ],
    },
    {
      name: 'ADMIN',
      description: 'System administrator',
      permissionCodes: [
        'MANAGE_USERS',
        'VIEW_AUDIT_LOGS',
        'CONFIG_AUTO_APPROVAL',
        'ASSIGN_ENTITY',
      ],
    },
  ];

  const roles = await Promise.all(
    rolesData.map(r =>
      prisma.role.upsert({
        where: { name: r.name as any },
        update: {},
        create: {
          name: r.name as any,
          description: r.description,
          permissions: {
            connect: getPermissionIds(r.permissionCodes),
          },
        },
      })
    )
  );

  return roles;
}

async function createUsers(roles: any[]) {
  const passwordHash = await bcrypt.hash('password123', 10);

  const assessor = await prisma.user.upsert({
    where: { email: 'assessor@example.com' },
    update: {},
    create: {
      email: 'assessor@example.com',
      username: 'assessor1',
      passwordHash,
      name: 'John Assessor',
      phone: '+234 800 000 0001',
      organization: 'Field Operations',
      roles: {
        create: {
          roleId: roles.find(r => r.name === 'ASSESSOR').id,
          assignedBy: 'SYSTEM',
        },
      },
    },
  });

  const coordinator = await prisma.user.upsert({
    where: { email: 'coordinator@example.com' },
    update: {},
    create: {
      email: 'coordinator@example.com',
      username: 'coordinator1',
      passwordHash,
      name: 'Sarah Coordinator',
      phone: '+234 800 000 0002',
      organization: 'Coordination Center',
      roles: {
        create: {
          roleId: roles.find(r => r.name === 'COORDINATOR').id,
          assignedBy: 'SYSTEM',
        },
      },
    },
  });

  const responder = await prisma.user.upsert({
    where: { email: 'responder@example.com' },
    update: {},
    create: {
      email: 'responder@example.com',
      username: 'responder1',
      passwordHash,
      name: 'Mike Responder',
      phone: '+234 800 000 0003',
      organization: 'Response Team',
      roles: {
        create: {
          roleId: roles.find(r => r.name === 'RESPONDER').id,
          assignedBy: 'SYSTEM',
        },
      },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin1',
      passwordHash,
      name: 'Admin User',
      phone: '+234 800 000 0004',
      organization: 'System Administration',
      roles: {
        create: {
          roleId: roles.find(r => r.name === 'ADMIN').id,
          assignedBy: 'SYSTEM',
        },
      },
    },
  });

  return { assessor, coordinator, responder, admin };
}

async function createIncident(coordinator: any) {
  return prisma.incident.create({
    data: {
      name: 'Maiduguri Flood 2025',
      type: 'FLOOD',
      subType: 'River Overflow',
      severity: 'HIGH',
      status: 'ACTIVE',
      declarationDate: new Date('2025-09-01'),
      locationLat: 11.8333,
      locationLng: 13.1500,
      affectedPopulation: 15000,
      createdBy: coordinator.id,
    },
  });
}

async function createEntities(coordinator: any) {
  const camp1 = await prisma.affectedEntity.create({
    data: {
      name: 'Bakassi IDP Camp',
      type: 'CAMP',
      locationLat: 11.8400,
      locationLng: 13.1600,
      lga: 'Maiduguri',
      ward: 'Bakassi',
      population: 5000,
      vulnerableCount: 1200,
      autoApproveEnabled: false,
      campDetails: {
        campName: 'Bakassi IDP Camp',
        campStatus: 'OPEN',
        coordinatorName: 'Ibrahim Ahmed',
        coordinatorPhone: '+234 800 111 1111',
        supervisorName: 'Dr. Fatima Hassan',
        supervisorOrganization: 'UNHCR',
      },
      createdBy: coordinator.id,
    },
  });

  const community1 = await prisma.affectedEntity.create({
    data: {
      name: 'Gwange Community',
      type: 'COMMUNITY',
      locationLat: 11.8500,
      locationLng: 13.1400,
      lga: 'Maiduguri',
      ward: 'Gwange',
      population: 8000,
      vulnerableCount: 2000,
      autoApproveEnabled: true, // Auto-approval enabled for this entity
      communityDetails: {
        communityName: 'Gwange Community',
        contactPersonName: 'Mallam Bukar',
        contactPersonPhone: '+234 800 222 2222',
        contactPersonRole: 'Community Leader',
        estimatedHouseholds: 1200,
      },
      createdBy: coordinator.id,
    },
  });

  return [camp1, community1];
}

async function linkEntitiesToIncident(incidentId: string, entities: any[]) {
  await Promise.all(
    entities.map(entity =>
      prisma.incidentEntity.create({
        data: {
          incidentId,
          entityId: entity.id,
          affectedDate: new Date('2025-09-01'),
          severityLevel: 'HIGH',
        },
      })
    )
  );
}

async function createEntityAssignments(users: any, entities: any[]) {
  // Assign assessor to both entities
  await Promise.all(
    entities.map(entity =>
      prisma.entityAssignment.create({
        data: {
          entityId: entity.id,
          userId: users.assessor.id,
          role: 'ASSESSOR',
          assignedBy: users.coordinator.id,
        },
      })
    )
  );

  // Assign responder to both entities
  await Promise.all(
    entities.map(entity =>
      prisma.entityAssignment.create({
        data: {
          entityId: entity.id,
          userId: users.responder.id,
          role: 'RESPONDER',
          assignedBy: users.coordinator.id,
        },
      })
    )
  );
}

async function createSampleAssessments(
  assessor: any,
  entities: any[],
  incident: any
) {
  // Health assessment for camp (pending verification)
  await prisma.rapidAssessment.create({
    data: {
      entityId: entities[0].id,
      incidentId: incident.id,
      assessorId: assessor.id,
      assessmentType: 'HEALTH',
      assessmentDate: new Date('2025-09-15'),
      verificationStatus: 'PENDING',
      syncStatus: 'SYNCED',
      versionNumber: 1,
      assessmentData: {
        hasFunctionalClinic: false, // GAP
        hasEmergencyServices: true,
        hasMedicalSupplies: false, // GAP
        hasTrainedStaff: true,
        numberHealthFacilities: 1,
        healthFacilityTypes: ['Mobile Clinic'],
        qualifiedHealthWorkers: 3,
        commonHealthIssues: ['Malaria', 'Diarrhea', 'Malnutrition'],
        hasMaternalChildServices: false,
        additionalDetails: 'Urgent need for permanent health facility',
      },
    },
  });

  // WASH assessment for community (auto-verified due to autoApproveEnabled)
  await prisma.rapidAssessment.create({
    data: {
      entityId: entities[1].id,
      incidentId: incident.id,
      assessorId: assessor.id,
      assessmentType: 'WASH',
      assessmentDate: new Date('2025-09-16'),
      verificationStatus: 'AUTO_VERIFIED', // Auto-verified
      syncStatus: 'SYNCED',
      versionNumber: 1,
      assessmentData: {
        isWaterSufficient: false, // GAP
        hasCleanWaterAccess: false, // GAP
        areLatrinesSufficient: false, // GAP
        hasHandwashingFacilities: true,
        waterSources: ['Borehole', 'River'],
        waterQuality: 'CONTAMINATED',
        numberToilets: 15,
        toiletTypes: ['Pit Latrine'],
        hasSolidWasteDisposal: false,
        additionalDetails: 'Water source contaminated by flood',
      },
    },
  });

  // Population assessment for camp (verified)
  await prisma.rapidAssessment.create({
    data: {
      entityId: entities[0].id,
      incidentId: incident.id,
      assessorId: assessor.id,
      assessmentType: 'POPULATION',
      assessmentDate: new Date('2025-09-14'),
      verificationStatus: 'VERIFIED',
      syncStatus: 'SYNCED',
      versionNumber: 1,
      assessmentData: {
        totalHouseholds: 800,
        totalPopulation: 5000,
        populationMale: 2400,
        populationFemale: 2600,
        populationUnder5: 800,
        pregnantWomen: 150,
        lactatingMothers: 200,
        personWithDisability: 100,
        elderlyPersons: 250,
        separatedChildren: 15,
        numberLivesLost: 3,
        numberInjured: 45,
        additionalDetails: 'Population stable, no new arrivals in 48 hours',
      },
    },
  });
}

async function createDonor() {
  return prisma.donor.create({
    data: {
      organizationName: 'Global Relief Foundation',
      contactName: 'Emily Johnson',
      email: 'emily@globalrelief.org',
      phone: '+1 555 000 0000',
      registrationDate: new Date('2025-09-10'),
      totalCommitments: 3,
      totalDelivered: 1,
      selfReportedDeliveryRate: 33.3,
      verifiedDeliveryRate: 33.3,
      leaderboardRank: 5,
    },
  });
}

async function createDonorCommitments(
  donor: any,
  entities: any[],
  incident: any
) {
  await prisma.donorCommitment.create({
    data: {
      donorId: donor.id,
      entityId: entities[0].id,
      incidentId: incident.id,
      commitmentDate: new Date('2025-09-12'),
      deliveryStatus: 'PARTIAL',
      deliveredQuantity: 500,
      verifiedDeliveredQuantity: 500,
      items: [
        { name: 'Water Purification Tablets', unit: 'boxes', quantity: 1000, delivered: 500 },
        { name: 'Oral Rehydration Salts', unit: 'packets', quantity: 2000, delivered: 0 },
      ],
      totalValueEstimated: 5000,
    },
  });

  await prisma.donorCommitment.create({
    data: {
      donorId: donor.id,
      entityId: entities[1].id,
      incidentId: incident.id,
      commitmentDate: new Date('2025-09-13'),
      deliveryStatus: 'PLANNED',
      deliveredQuantity: 0,
      verifiedDeliveredQuantity: 0,
      items: [
        { name: 'Emergency Shelter Kits', unit: 'kits', quantity: 200, delivered: 0 },
        { name: 'Blankets', unit: 'pieces', quantity: 400, delivered: 0 },
      ],
      totalValueEstimated: 15000,
    },
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Migration Commands for LLM Implementation

```bash
# Initialize Prisma (first time only)
npx prisma init

# Create migration from schema changes
npx prisma migrate dev --name initial_schema

# Generate Prisma Client (after schema changes)
npx prisma generate

# Apply migrations to production
npx prisma migrate deploy

# Reset database and reseed (development only)
npx prisma migrate reset

# Seed database
npx prisma db seed

# Open Prisma Studio to view/edit data
npx prisma studio
```

---
