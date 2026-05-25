import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create Permissions
  const permissions = [
    // Assessment permissions
    { name: 'Create Assessment', code: 'CREATE_ASSESSMENT', category: 'assessment', description: 'Can create new assessments' },
    { name: 'View Assessment', code: 'VIEW_ASSESSMENT', category: 'assessment', description: 'Can view assessments' },
    { name: 'Edit Assessment', code: 'EDIT_ASSESSMENT', category: 'assessment', description: 'Can edit own assessments' },
    { name: 'Verify Assessment', code: 'VERIFY_ASSESSMENT', category: 'assessment', description: 'Can verify assessments' },
    { name: 'Publish Assessment', code: 'PUBLISH_ASSESSMENT', category: 'assessment', description: 'Can publish verified assessments' },
    
    // Response permissions
    { name: 'Create Response', code: 'CREATE_RESPONSE', category: 'response', description: 'Can create response plans' },
    { name: 'View Response', code: 'VIEW_RESPONSE', category: 'response', description: 'Can view response plans' },
    { name: 'Edit Response', code: 'EDIT_RESPONSE', category: 'response', description: 'Can edit own responses' },
    { name: 'Verify Response', code: 'VERIFY_RESPONSE', category: 'response', description: 'Can verify responses' },
    { name: 'Execute Response', code: 'EXECUTE_RESPONSE', category: 'response', description: 'Can execute response activities' },
    
    // Entity permissions
    { name: 'View Entities', code: 'VIEW_ENTITIES', category: 'entity', description: 'Can view assigned entities' },
    { name: 'Manage Entities', code: 'MANAGE_ENTITIES', category: 'entity', description: 'Can manage entity assignments' },
    
    // Dashboard permissions
    { name: 'View Crisis Dashboard', code: 'VIEW_CRISIS_DASHBOARD', category: 'dashboard', description: 'Can access crisis management dashboard' },
    { name: 'View Situation Dashboard', code: 'VIEW_SITUATION_DASHBOARD', category: 'dashboard', description: 'Can access situation awareness dashboard' },
    { name: 'View Donor Dashboard', code: 'VIEW_DONOR_DASHBOARD', category: 'dashboard', description: 'Can access donor dashboard' },
    
    // User management permissions
    { name: 'Manage Users', code: 'MANAGE_USERS', category: 'user', description: 'Can create and manage users' },
    { name: 'Assign Roles', code: 'ASSIGN_ROLES', category: 'user', description: 'Can assign roles to users' },
    { name: 'View Audit Logs', code: 'VIEW_AUDIT_LOGS', category: 'audit', description: 'Can view system audit logs' },
    
    // Sync permissions
    { name: 'View Sync Conflicts', code: 'VIEW_SYNC_CONFLICTS', category: 'sync', description: 'Can view synchronization conflicts' },
    { name: 'Resolve Sync Conflicts', code: 'RESOLVE_SYNC_CONFLICTS', category: 'sync', description: 'Can resolve sync conflicts' },
  ]

  console.log('📝 Creating permissions...')
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {},
      create: permission,
    })
  }

  // Create Roles
  console.log('👥 Creating roles...')
  const assessorRole = await prisma.role.upsert({
    where: { name: 'ASSESSOR' },
    update: {},
    create: {
      name: 'ASSESSOR',
      description: 'Field assessors who conduct rapid assessments',
    },
  })

  const coordinatorRole = await prisma.role.upsert({
    where: { name: 'COORDINATOR' },
    update: {},
    create: {
      name: 'COORDINATOR',
      description: 'Coordinators who verify and manage assessments and responses',
    },
  })

  const responderRole = await prisma.role.upsert({
    where: { name: 'RESPONDER' },
    update: {},
    create: {
      name: 'RESPONDER',
      description: 'Response teams who execute intervention activities',
    },
  })

  const donorRole = await prisma.role.upsert({
    where: { name: 'DONOR' },
    update: {},
    create: {
      name: 'DONOR',
      description: 'Donors and funding organizations',
    },
  })

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System administrators with full access',
    },
  })

  // Assign permissions to roles
  console.log('🔗 Assigning permissions to roles...')
  
  // Assessor permissions
  const assessorPermissions = [
    'CREATE_ASSESSMENT', 'VIEW_ASSESSMENT', 'EDIT_ASSESSMENT',
    'VIEW_ENTITIES', 'VIEW_SITUATION_DASHBOARD'
  ]
  for (const permCode of assessorPermissions) {
    const permission = await prisma.permission.findUnique({ where: { code: permCode } })
    if (permission) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: assessorRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: assessorRole.id, permissionId: permission.id },
      })
    }
  }

  // Coordinator permissions
  const coordinatorPermissions = [
    'CREATE_ASSESSMENT', 'VIEW_ASSESSMENT', 'EDIT_ASSESSMENT', 'VERIFY_ASSESSMENT', 'PUBLISH_ASSESSMENT',
    'CREATE_RESPONSE', 'VIEW_RESPONSE', 'EDIT_RESPONSE', 'VERIFY_RESPONSE',
    'VIEW_ENTITIES', 'MANAGE_ENTITIES',
    'VIEW_CRISIS_DASHBOARD', 'VIEW_SITUATION_DASHBOARD',
    'VIEW_SYNC_CONFLICTS', 'RESOLVE_SYNC_CONFLICTS'
  ]
  for (const permCode of coordinatorPermissions) {
    const permission = await prisma.permission.findUnique({ where: { code: permCode } })
    if (permission) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: coordinatorRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: coordinatorRole.id, permissionId: permission.id },
      })
    }
  }

  // Responder permissions
  const responderPermissions = [
    'VIEW_ASSESSMENT', 'CREATE_RESPONSE', 'VIEW_RESPONSE', 'EDIT_RESPONSE', 'EXECUTE_RESPONSE',
    'VIEW_ENTITIES', 'VIEW_SITUATION_DASHBOARD'
  ]
  for (const permCode of responderPermissions) {
    const permission = await prisma.permission.findUnique({ where: { code: permCode } })
    if (permission) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: responderRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: responderRole.id, permissionId: permission.id },
      })
    }
  }

  // Donor permissions
  const donorPermissions = [
    'VIEW_ASSESSMENT', 'VIEW_RESPONSE', 'VIEW_DONOR_DASHBOARD'
  ]
  for (const permCode of donorPermissions) {
    const permission = await prisma.permission.findUnique({ where: { code: permCode } })
    if (permission) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: donorRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: donorRole.id, permissionId: permission.id },
      })
    }
  }

  // Admin permissions (all permissions)
  const allPermissions = await prisma.permission.findMany()
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    })
  }

  // Create sample entities
  console.log('🏢 Creating sample entities...')
  
  // Delete existing entities to avoid conflicts (in order of dependency)
  await prisma.donorCommitment.deleteMany({})
  await prisma.entityAssignment.deleteMany({})
  await prisma.rapidResponse.deleteMany({})
  await prisma.rapidAssessment.deleteMany({})
  await prisma.entity.deleteMany({})
  
  const entities = [
    { id: 'entity-1', name: 'Maiduguri Metropolitan', type: 'LGA', location: 'Borno State', coordinates: { lat: 11.8311, lng: 13.1511 } },
    { id: 'entity-2', name: 'Jere Local Government', type: 'LGA', location: 'Borno State', coordinates: { lat: 11.8822, lng: 13.2143 } },
    { id: 'entity-3', name: 'Gwoza Local Government', type: 'LGA', location: 'Borno State', coordinates: { lat: 11.0417, lng: 13.6875 } },
    { id: 'entity-4', name: 'Primary Health Center Maiduguri', type: 'FACILITY', location: 'Maiduguri', coordinates: { lat: 11.8467, lng: 13.1569 } },
    { id: 'entity-5', name: 'IDP Camp Dalori', type: 'CAMP', location: 'Maiduguri', coordinates: { lat: 11.7833, lng: 13.2167 } },
  ]

  for (const entityData of entities) {
    await prisma.entity.create({
      data: {
        id: entityData.id,
        name: entityData.name,
        type: entityData.type as any,
        location: entityData.location,
        coordinates: entityData.coordinates,
      },
    })
  }

  // Create default admin user
  console.log('👤 Creating default admin user...')
  const adminPasswordHash = await bcrypt.hash('admin123!', 10)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@dms.gov.ng' },
    update: {},
    create: {
      email: 'admin@dms.gov.ng',
      username: 'admin',
      passwordHash: adminPasswordHash,
      name: 'System Administrator',
      organization: 'Borno State Emergency Management Agency',
    },
  })

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
      assignedBy: 'system',
    },
  })

  // Create sample coordinator user
  console.log('👤 Creating sample coordinator user...')
  const coordinatorPasswordHash = await bcrypt.hash('coordinator123!', 10)
  
  const coordinatorUser = await prisma.user.upsert({
    where: { email: 'coordinator@dms.gov.ng' },
    update: {},
    create: {
      email: 'coordinator@dms.gov.ng',
      username: 'coordinator',
      passwordHash: coordinatorPasswordHash,
      name: 'Crisis Coordinator',
      organization: 'Borno State Emergency Management Agency',
    },
  })

  // Assign coordinator role
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: coordinatorUser.id, roleId: coordinatorRole.id } },
    update: {},
    create: {
      userId: coordinatorUser.id,
      roleId: coordinatorRole.id,
      assignedBy: adminUser.id,
    },
  })

  // Assign coordinator to entities
  const maiduguri = await prisma.entity.findUnique({ where: { id: 'entity-1' } })
  if (maiduguri) {
    await prisma.entityAssignment.upsert({
      where: { userId_entityId: { userId: coordinatorUser.id, entityId: maiduguri.id } },
      update: {},
      create: {
        userId: coordinatorUser.id,
        entityId: 'entity-1',
        assignedBy: adminUser.id,
      },
    })
  }

  // Create sample multi-role user for testing role switching
  console.log('👤 Creating sample multi-role user...')
  const multiRolePasswordHash = await bcrypt.hash('multirole123!', 10)
  
  const multiRoleUser = await prisma.user.upsert({
    where: { email: 'multirole@dms.gov.ng' },
    update: {},
    create: {
      email: 'multirole@dms.gov.ng',
      username: 'multirole',
      passwordHash: multiRolePasswordHash,
      name: 'Multi Role Test User',
      organization: 'Borno State Emergency Management Agency',
    },
  })

  // Assign multiple roles to the multi-role user
  const rolesToAssign = [assessorRole.id, coordinatorRole.id, donorRole.id, responderRole.id]
  for (const roleId of rolesToAssign) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: multiRoleUser.id, roleId } },
      update: {},
      create: {
        userId: multiRoleUser.id,
        roleId,
        assignedBy: adminUser.id,
      },
    })
  }

  // Assign multi-role user to entities
  if (maiduguri) {
    await prisma.entityAssignment.upsert({
      where: { userId_entityId: { userId: multiRoleUser.id, entityId: maiduguri.id } },
      update: {},
      create: {
        userId: multiRoleUser.id,
        entityId: 'entity-1',
        assignedBy: adminUser.id,
      },
    })
  }

  // Create sample responder user for testing
  console.log('👤 Creating sample responder user...')
  const responderPasswordHash = await bcrypt.hash('responder123!', 10)
  
  const responderUser = await prisma.user.upsert({
    where: { email: 'responder@dms.gov.ng' },
    update: {},
    create: {
      email: 'responder@dms.gov.ng',
      username: 'responder',
      passwordHash: responderPasswordHash,
      name: 'Response Responder',
      organization: 'Borno State Emergency Management Agency',
    },
  })

  // Assign responder role
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: responderUser.id, roleId: responderRole.id } },
    update: {},
    create: {
      userId: responderUser.id,
      roleId: responderRole.id,
      assignedBy: adminUser.id,
    },
  })

  // Assign responder to entities
  if (maiduguri) {
    await prisma.entityAssignment.upsert({
      where: { userId_entityId: { userId: responderUser.id, entityId: maiduguri.id } },
      update: {},
      create: {
        userId: responderUser.id,
        entityId: 'entity-1',
        assignedBy: adminUser.id,
      },
    })
  }

  // Create sample assessor user for testing
  console.log('👤 Creating sample assessor user...')
  const assessorPasswordHash = await bcrypt.hash('test-password', 10)
  
  const assessorUser = await prisma.user.upsert({
    where: { email: 'assessor@test.com' },
    update: {},
    create: {
      email: 'assessor@test.com',
      username: 'assessor',
      passwordHash: assessorPasswordHash,
      name: 'Field Assessor',
      organization: 'Borno State Emergency Management Agency',
    },
  })

  // Assign assessor role
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: assessorUser.id, roleId: assessorRole.id } },
    update: {},
    create: {
      userId: assessorUser.id,
      roleId: assessorRole.id,
      assignedBy: adminUser.id,
    },
  })

  // Assign assessor to entities
  if (maiduguri) {
    await prisma.entityAssignment.upsert({
      where: { userId_entityId: { userId: assessorUser.id, entityId: maiduguri.id } },
      update: {},
      create: {
        userId: assessorUser.id,
        entityId: 'entity-1',
        assignedBy: adminUser.id,
      },
    })
  }

  // Assign users to Gwoza entity (entity-3) for testing commitments
  const gwoza = await prisma.entity.findUnique({ where: { id: 'entity-3' } })
  if (gwoza) {
    // Assign multi-role user to Gwoza
    await prisma.entityAssignment.upsert({
      where: { userId_entityId: { userId: multiRoleUser.id, entityId: gwoza.id } },
      update: {},
      create: {
        userId: multiRoleUser.id,
        entityId: gwoza.id,
        assignedBy: adminUser.id,
      },
    })

    // Assign responder to Gwoza
    await prisma.entityAssignment.upsert({
      where: { userId_entityId: { userId: responderUser.id, entityId: gwoza.id } },
      update: {},
      create: {
        userId: responderUser.id,
        entityId: gwoza.id,
        assignedBy: adminUser.id,
      },
    })

    // Assign assessor to Gwoza
    await prisma.entityAssignment.upsert({
      where: { userId_entityId: { userId: assessorUser.id, entityId: gwoza.id } },
      update: {},
      create: {
        userId: assessorUser.id,
        entityId: gwoza.id,
        assignedBy: adminUser.id,
      },
    })
  }

  // Assign multirole user to additional entities for comprehensive testing
  console.log('🏢 Assigning multirole user to additional entities...')
  
  // Assign to Jere Local Government (entity-2)
  const jere = await prisma.entity.findUnique({ where: { id: 'entity-2' } })
  if (jere) {
    await prisma.entityAssignment.upsert({
      where: { userId_entityId: { userId: multiRoleUser.id, entityId: jere.id } },
      update: {},
      create: {
        userId: multiRoleUser.id,
        entityId: jere.id,
        assignedBy: adminUser.id,
      },
    })
  }

  // Assign to Primary Health Center (entity-4)
  const healthCenter = await prisma.entity.findUnique({ where: { id: 'entity-4' } })
  if (healthCenter) {
    await prisma.entityAssignment.upsert({
      where: { userId_entityId: { userId: multiRoleUser.id, entityId: healthCenter.id } },
      update: {},
      create: {
        userId: multiRoleUser.id,
        entityId: healthCenter.id,
        assignedBy: adminUser.id,
      },
    })

    // Create sample donor user with only DONOR role for testing Story 5.1
    console.log('👤 Creating sample donor user (Donor-only role)...')
    const donorPasswordHash = await bcrypt.hash('donor123!', 10)
    
    const donorUser = await prisma.user.upsert({
      where: { email: 'donor@test.com' },
      update: {},
      create: {
        email: 'donor@test.com',
        username: 'donor',
        passwordHash: donorPasswordHash,
        name: 'Donor Organization Contact',
        organization: 'Test Donor Organization',
      },
    })

    // Assign ONLY donor role to the donor user
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: donorUser.id, roleId: donorRole.id } },
      update: {},
      create: {
        userId: donorUser.id,
        roleId: donorRole.id,
        assignedBy: adminUser.id,
      },
    })

    // Assign donor user to entities for testing entity access
    if (maiduguri) {
      await prisma.entityAssignment.upsert({
        where: { userId_entityId: { userId: donorUser.id, entityId: maiduguri.id } },
        update: {},
        create: {
          userId: donorUser.id,
          entityId: maiduguri.id,
          assignedBy: adminUser.id,
        },
      })
    }

    // Create sample donor record for the donor user
    console.log('🏢 Creating donor record for donor user...')
    const testDonor = await prisma.donor.upsert({
      where: { id: 'donor-test-001' },
      update: {},
      create: {
        id: 'donor-test-001',
        name: 'Test Donor Organization',
        type: 'ORGANIZATION',
        contactEmail: 'donor@test.com',
        contactPhone: '+234-800-000-0000',
        organization: 'Test Donor Organization',
        isActive: true,
      },
    })

    // Create donor record for the multi-role user
    console.log('🏢 Creating donor record for multi-role user...')
    await prisma.donor.upsert({
      where: { id: 'donor-multirole-001' },
      update: {},
      create: {
        id: 'donor-multirole-001',
        name: 'Borno State Emergency Management Agency',
        type: 'ORGANIZATION',
        contactEmail: 'multirole@dms.gov.ng',
        contactPhone: '+234-800-555-0000',
        organization: 'Borno State Emergency Management Agency',
        isActive: true,
      },
    })
  }

  // Create sample incidents first
  console.log('🚨 Creating sample incidents...')
  
  const floodIncident = await prisma.incident.upsert({
    where: { id: 'incident-flood-001' },
    update: {
      name: 'Maiduguri Metropolitan Flooding 2025',
    },
    create: {
      id: 'incident-flood-001',
      name: 'Maiduguri Metropolitan Flooding 2025',
      type: 'FLOOD',
      subType: 'SEASONAL_FLOODING',
      severity: 'HIGH',
      status: 'ACTIVE',
      description: 'Severe flooding in Maiduguri metropolitan area affecting multiple neighborhoods',
      location: 'Maiduguri Metropolitan Area, Borno State',
      coordinates: { latitude: 11.8311, longitude: 13.1566 },
      createdBy: coordinatorUser.id,
    },
  })

  const droughtIncident = await prisma.incident.upsert({
    where: { id: 'incident-drought-001' },
    update: {
      name: 'Gwoza Agricultural Drought 2025',
    },
    create: {
      id: 'incident-drought-001',
      name: 'Gwoza Agricultural Drought 2025',
      type: 'DROUGHT',
      subType: 'AGRICULTURAL_DROUGHT',
      severity: 'MEDIUM',
      status: 'ACTIVE', 
      description: 'Agricultural drought affecting crop production in Gwoza area',
      location: 'Gwoza Local Government Area, Borno State',
      coordinates: { latitude: 11.0544, longitude: 13.7839 },
      createdBy: coordinatorUser.id,
    },
  })

  // Create sample rapid assessments for verification workflow testing
  console.log('📋 Creating sample rapid assessments for verification testing...')
  
  const sampleAssessments = [
    {
      rapidAssessmentType: 'HEALTH',
      rapidAssessmentDate: new Date('2025-10-15'),
      assessorId: assessorUser.id,
      entityId: 'entity-1', // Maiduguri Metropolitan
      incidentId: 'incident-flood-001',
      assessorName: 'Field Assessor',
      location: 'Maiduguri Metropolitan',
      status: 'DRAFT',
      priority: 'HIGH',
      verificationStatus: 'VERIFIED',
      coordinates: { latitude: 11.8311, longitude: 13.1511, accuracy: 10, timestamp: new Date().toISOString(), captureMethod: 'GPS' }
    },
    {
      rapidAssessmentType: 'WASH',
      rapidAssessmentDate: new Date('2025-10-16'),
      assessorId: assessorUser.id,
      entityId: 'entity-2', // Jere Local Government
      incidentId: 'incident-flood-001',
      assessorName: 'Field Assessor',
      location: 'Jere Local Government',
      status: 'DRAFT',
      priority: 'CRITICAL',
      verificationStatus: 'VERIFIED',
      coordinates: { latitude: 11.8822, longitude: 13.2143, accuracy: 8, timestamp: new Date().toISOString(), captureMethod: 'GPS' }
    },
    {
      rapidAssessmentType: 'SHELTER',
      rapidAssessmentDate: new Date('2025-10-16'),
      assessorId: multiRoleUser.id,
      entityId: 'entity-5', // IDP Camp Dalori
      incidentId: 'incident-flood-001',
      assessorName: 'Multi Role Test User',
      location: 'IDP Camp Dalori',
      status: 'DRAFT',
      priority: 'MEDIUM',
      verificationStatus: 'VERIFIED',
      coordinates: { latitude: 11.7833, longitude: 13.2167, accuracy: 12, timestamp: new Date().toISOString(), captureMethod: 'GPS' }
    },
    {
      rapidAssessmentType: 'FOOD',
      rapidAssessmentDate: new Date('2025-10-17'),
      assessorId: assessorUser.id,
      entityId: 'entity-3', // Gwoza Local Government
      incidentId: 'incident-drought-001',
      assessorName: 'Field Assessor',
      location: 'Gwoza Local Government',
      status: 'DRAFT',
      priority: 'HIGH',
      verificationStatus: 'VERIFIED',
      coordinates: { latitude: 11.0417, longitude: 13.6875, accuracy: 15, timestamp: new Date().toISOString(), captureMethod: 'GPS' }
    },
    {
      rapidAssessmentType: 'SECURITY',
      rapidAssessmentDate: new Date('2025-10-17'),
      assessorId: multiRoleUser.id,
      entityId: 'entity-4', // Primary Health Center Maiduguri
      incidentId: 'incident-flood-001',
      assessorName: 'Multi Role Test User',
      location: 'Primary Health Center Maiduguri',
      status: 'DRAFT',
      priority: 'LOW',
      verificationStatus: 'VERIFIED',
      coordinates: { latitude: 11.8467, longitude: 13.1569, accuracy: 5, timestamp: new Date().toISOString(), captureMethod: 'GPS' }
    }
  ]

  for (let seedIdx = 0; seedIdx < sampleAssessments.length; seedIdx++) {
    const assessment = sampleAssessments[seedIdx]
    const createdAssessment = await prisma.rapidAssessment.create({
      data: assessment as any
    })

    // Create corresponding assessment detail records with deterministic seed values based on index
    if (assessment.rapidAssessmentType === 'HEALTH') {
      await prisma.healthAssessment.create({
        data: {
          rapidAssessmentId: createdAssessment.id,
          hasFunctionalClinic: seedIdx % 2 === 0,
          hasEmergencyServices: seedIdx % 3 !== 0,
          numberHealthFacilities: seedIdx + 2,
          healthFacilityType: 'Primary Health Center',
          qualifiedHealthWorkers: seedIdx * 3 + 5,
          hasTrainedStaff: seedIdx % 2 === 0,
          hasMedicineSupply: seedIdx % 3 !== 0,
          hasMedicalSupplies: seedIdx % 2 === 0,
          hasMaternalChildServices: seedIdx % 2 === 0,
          commonHealthIssues: JSON.stringify(['Malaria', 'Diarrhea', 'Respiratory infections'])
        }
      })
    } else if (assessment.rapidAssessmentType === 'FOOD') {
      await prisma.foodAssessment.create({
        data: {
          rapidAssessmentId: createdAssessment.id,
          isFoodSufficient: seedIdx % 3 !== 0,
          hasRegularMealAccess: seedIdx % 2 === 0,
          hasInfantNutrition: seedIdx % 2 === 0,
          foodSource: JSON.stringify(['Market', 'Food aid', 'Local farming']),
          availableFoodDurationDays: seedIdx * 7 + 3,
          additionalFoodRequiredPersons: seedIdx * 25 + 10,
          additionalFoodRequiredHouseholds: seedIdx * 5 + 2
        }
      })
    } else if (assessment.rapidAssessmentType === 'WASH') {
      await prisma.wASHAssessment.create({
        data: {
          rapidAssessmentId: createdAssessment.id,
          waterSource: JSON.stringify(['Well', 'Borehole', 'River']),
          isWaterSufficient: seedIdx % 2 === 0,
          hasCleanWaterAccess: seedIdx % 3 !== 0,
          functionalLatrinesAvailable: seedIdx * 2 + 3,
          areLatrinesSufficient: seedIdx % 3 !== 0,
          hasHandwashingFacilities: seedIdx % 2 === 0,
          hasOpenDefecationConcerns: seedIdx % 3 === 0
        }
      })
    } else if (assessment.rapidAssessmentType === 'SHELTER') {
      await prisma.shelterAssessment.create({
        data: {
          rapidAssessmentId: createdAssessment.id,
          areSheltersSufficient: seedIdx % 3 !== 0,
          hasSafeStructures: seedIdx % 2 === 0,
          shelterTypes: JSON.stringify(['Tents', 'Temporary shelters', 'Public buildings']),
          requiredShelterType: JSON.stringify(['Tents', 'Emergency shelters']),
          numberSheltersRequired: seedIdx * 10 + 15,
          areOvercrowded: seedIdx % 3 === 1,
          provideWeatherProtection: seedIdx % 3 !== 0
        }
      })
    } else if (assessment.rapidAssessmentType === 'SECURITY') {
      await prisma.securityAssessment.create({
        data: {
          rapidAssessmentId: createdAssessment.id,
          isSafeFromViolence: seedIdx % 4 !== 0,
          gbvCasesReported: seedIdx % 5 === 0,
          hasSecurityPresence: seedIdx % 2 === 0,
          hasProtectionReportingMechanism: seedIdx % 3 !== 0,
          vulnerableGroupsHaveAccess: seedIdx % 2 === 0,
          hasLighting: seedIdx % 2 === 0
        }
      })
    }
  }

  // Create sample donor commitments for testing Story 4.3
  console.log('💰 Creating sample donor commitments...')
  
  // Create sample commitments using hardcoded entity IDs to avoid variable conflicts
  console.log('💰 Creating sample commitments using entity-1 and entity-2...')

    // Create sample donor
    const unDonor = await prisma.donor.upsert({
      where: { id: 'donor-un-001' },
      update: {},
      create: {
        id: 'donor-un-001',
        name: 'United Nations Office for the Coordination of Humanitarian Affairs',
        type: 'ORGANIZATION',
        contactEmail: 'ocha.nigeria@un.org',
        contactPhone: '+234-9-461-4000',
        organization: 'UN OCHA',
        isActive: true,
      },
    })

    const ngoCareDonor = await prisma.donor.upsert({
      where: { id: 'donor-care-001' },
      update: {},
      create: {
        id: 'donor-care-001', 
        name: 'CARE International Nigeria',
        type: 'ORGANIZATION',
        contactEmail: 'nigeria@careinternational.org',
        contactPhone: '+234-9-290-3000',
        organization: 'CARE International',
        isActive: true,
      },
    })

    // Create sample commitments
    const sampleCommitments = [
      {
        id: 'commitment-flood-001',
        donorId: unDonor.id,
        entityId: 'entity-1',
        incidentId: floodIncident.id,
        status: 'PLANNED',
        items: [
          { name: 'Emergency Food Rations', unit: 'packages', quantity: 500 },
          { name: 'Clean Water Containers', unit: 'jerrycans', quantity: 1000 },
          { name: 'Emergency Shelter Kits', unit: 'kits', quantity: 200 },
          { name: 'Medical Supplies', unit: 'boxes', quantity: 50 }
        ],
        totalCommittedQuantity: 1750,
        deliveredQuantity: 0,
        verifiedDeliveredQuantity: 0,
        notes: 'Emergency response package for flood-affected families in Maiduguri',
      },
      {
        id: 'commitment-flood-002',
        donorId: ngoCareDonor.id,
        entityId: 'entity-1',
        incidentId: floodIncident.id,
        status: 'PLANNED',
        items: [
          { name: 'Hygiene Kits', unit: 'kits', quantity: 300 },
          { name: 'Blankets', unit: 'pieces', quantity: 800 },
          { name: 'Cooking Utensils Set', unit: 'sets', quantity: 250 }
        ],
        totalCommittedQuantity: 1350,
        deliveredQuantity: 0,
        verifiedDeliveredQuantity: 0,
        notes: 'Essential household items for displaced families',
      },
      {
        id: 'commitment-drought-001',
        donorId: unDonor.id,
        entityId: 'entity-3',
        incidentId: droughtIncident.id,
        status: 'PLANNED',
        items: [
          { name: 'Drought-Resistant Seeds', unit: 'kg', quantity: 2000 },
          { name: 'Irrigation Equipment', unit: 'sets', quantity: 100 },
          { name: 'Water Storage Tanks', unit: 'pieces', quantity: 25 }
        ],
        totalCommittedQuantity: 2125,
        deliveredQuantity: 0,
        verifiedDeliveredQuantity: 0,
        notes: 'Agricultural support for drought-affected farmers in Gwoza',
      },
      {
        id: 'commitment-partial-001',
        donorId: ngoCareDonor.id,
        entityId: 'entity-1',
        incidentId: floodIncident.id,
        status: 'PARTIAL',
        items: [
          { name: 'Mosquito Nets', unit: 'pieces', quantity: 600 },
          { name: 'Water Purification Tablets', unit: 'boxes', quantity: 100 }
        ],
        totalCommittedQuantity: 700,
        deliveredQuantity: 350,
        verifiedDeliveredQuantity: 300,
        notes: 'Health protection items - partially delivered',
      }
    ]

    for (const commitment of sampleCommitments) {
      await prisma.donorCommitment.upsert({
        where: { id: commitment.id },
        update: {},
        create: commitment as any,
      })
    }

  console.log('💰 Created 4 sample donor commitments')

  // Create E2E test users
  console.log('🎭 Creating E2E test users...')
  
  // E2E Coordinator test user
  const e2eCoordinatorPasswordHash = await bcrypt.hash('testpassword123', 10)
  const e2eCoordinatorUser = await prisma.user.upsert({
    where: { email: 'coordinator@test.com' },
    update: {},
    create: {
      email: 'coordinator@test.com',
      username: 'e2e-coordinator',
      passwordHash: e2eCoordinatorPasswordHash,
      name: 'E2E Test Coordinator',
      organization: 'Test Organization',
    },
  })

  // Assign coordinator role to E2E user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: e2eCoordinatorUser.id, roleId: coordinatorRole.id } },
    update: {},
    create: {
      userId: e2eCoordinatorUser.id,
      roleId: coordinatorRole.id,
      assignedBy: adminUser.id,
    },
  })

  // Update E2E assessor test user password
  const e2eAssessorPasswordHash = await bcrypt.hash('testpassword123', 10)
  const e2eAssessorUser = await prisma.user.upsert({
    where: { email: 'assessor@test.com' },
    update: { 
      passwordHash: e2eAssessorPasswordHash,
      username: 'e2e-assessor' 
    },
    create: {
      email: 'assessor@test.com',
      username: 'e2e-assessor',
      passwordHash: e2eAssessorPasswordHash,
      name: 'E2E Test Assessor',
      organization: 'Test Organization',
    },
  })

  // Ensure assessor role is assigned
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: e2eAssessorUser.id, roleId: assessorRole.id } },
    update: {},
    create: {
      userId: e2eAssessorUser.id,
      roleId: assessorRole.id,
      assignedBy: adminUser.id,
    },
  })

  console.log('✅ Database seed completed successfully!')
  console.log('📧 Admin credentials: admin@dms.gov.ng / admin123!')
  console.log('📧 Coordinator credentials: coordinator@dms.gov.ng / coordinator123!')
  console.log('📧 Responder credentials: responder@dms.gov.ng / responder123!')
  console.log('📧 Assessor credentials: assessor@test.com / test-password')
  console.log('📧 Donor credentials: donor@test.com / donor123! (DONOR role only)')
  console.log('📧 Multi-role credentials: multirole@dms.gov.ng / multirole123! (ASSESSOR, COORDINATOR, DONOR, RESPONDER)')
  console.log('🎭 E2E Test Credentials:')
  console.log('   📧 E2E Coordinator: coordinator@test.com / testpassword123')
  console.log('   📧 E2E Assessor: assessor@test.com / testpassword123')
  console.log('📋 Created 5 sample assessments for verification workflow testing')
  console.log('💰 Created 4 sample donor commitments for testing Story 4.3')
  console.log('🏢 Created donor organization for testing Story 5.1')

  // Create Gap Field Severities - all start as MEDIUM
  console.log('🎯 Creating gap field severities...')
  
  const gapFieldSeverities = [
    // Health Assessment Fields
    { fieldName: 'hasFunctionalClinic', assessmentType: 'HEALTH', displayName: 'Functional Clinic', description: 'Availability of functional medical clinic' },
    { fieldName: 'hasEmergencyServices', assessmentType: 'HEALTH', displayName: 'Emergency Services', description: 'Emergency medical response capability' },
    { fieldName: 'hasTrainedStaff', assessmentType: 'HEALTH', displayName: 'Trained Medical Staff', description: 'Availability of trained medical personnel' },
    { fieldName: 'hasMedicineSupply', assessmentType: 'HEALTH', displayName: 'Medicine Supply', description: 'Adequate supply of essential medicines' },
    { fieldName: 'hasMedicalSupplies', assessmentType: 'HEALTH', displayName: 'Medical Supplies', description: 'Availability of medical equipment and supplies' },
    { fieldName: 'hasMaternalChildServices', assessmentType: 'HEALTH', displayName: 'Maternal & Child Services', description: 'Specialized maternal and child health services' },

    // Food Security Assessment Fields  
    { fieldName: 'isFoodSufficient', assessmentType: 'FOOD', displayName: 'Food Sufficiency', description: 'Adequate food supply for population needs' },
    { fieldName: 'hasRegularMealAccess', assessmentType: 'FOOD', displayName: 'Regular Meal Access', description: 'Consistent access to regular meals' },
    { fieldName: 'hasInfantNutrition', assessmentType: 'FOOD', displayName: 'Infant Nutrition', description: 'Specialized nutrition for infants and children' },

    // WASH Assessment Fields
    { fieldName: 'isWaterSufficient', assessmentType: 'WASH', displayName: 'Water Sufficiency', description: 'Adequate water supply for basic needs' },
    { fieldName: 'hasCleanWaterAccess', assessmentType: 'WASH', displayName: 'Clean Water Access', description: 'Access to safe, clean drinking water' },
    { fieldName: 'areLatrinesSufficient', assessmentType: 'WASH', displayName: 'Latrine Sufficiency', description: 'Adequate sanitation facilities' },
    { fieldName: 'hasHandwashingFacilities', assessmentType: 'WASH', displayName: 'Handwashing Facilities', description: 'Available handwashing stations with soap' },
    { fieldName: 'hasOpenDefecationConcerns', assessmentType: 'WASH', displayName: 'Open Defecation Concerns', description: 'Issues with open defecation practices' },

    // Shelter Assessment Fields
    { fieldName: 'areSheltersSufficient', assessmentType: 'SHELTER', displayName: 'Shelter Sufficiency', description: 'Adequate shelter capacity for displaced population' },
    { fieldName: 'hasSafeStructures', assessmentType: 'SHELTER', displayName: 'Safe Structures', description: 'Structurally safe and secure shelter buildings' },
    { fieldName: 'areOvercrowded', assessmentType: 'SHELTER', displayName: 'Overcrowding Issues', description: 'Overcrowding in available shelters' },
    { fieldName: 'provideWeatherProtection', assessmentType: 'SHELTER', displayName: 'Weather Protection', description: 'Adequate protection from weather conditions' },

    // Security Assessment Fields
    { fieldName: 'isSafeFromViolence', assessmentType: 'SECURITY', displayName: 'Safety from Violence', description: 'Protection from violence and conflict' },
    { fieldName: 'gbvCasesReported', assessmentType: 'SECURITY', displayName: 'GBV Cases Reported', description: 'Reports of gender-based violence cases' },
    { fieldName: 'hasSecurityPresence', assessmentType: 'SECURITY', displayName: 'Security Presence', description: 'Adequate security personnel deployment' },
    { fieldName: 'hasProtectionReportingMechanism', assessmentType: 'SECURITY', displayName: 'Protection Reporting', description: 'Mechanisms for reporting protection concerns' },
    { fieldName: 'vulnerableGroupsHaveAccess', assessmentType: 'SECURITY', displayName: 'Vulnerable Groups Access', description: 'Priority access for vulnerable populations' },
    { fieldName: 'hasLighting', assessmentType: 'SECURITY', displayName: 'Adequate Lighting', description: 'Sufficient lighting in high-risk areas' }
  ] as const

  for (const field of gapFieldSeverities) {
    await prisma.gapFieldSeverity.upsert({
      where: {
        unique_field_assessment: {
          fieldName: field.fieldName,
          assessmentType: field.assessmentType
        }
      },
      update: {},
      create: {
        fieldName: field.fieldName,
        assessmentType: field.assessmentType,
        severity: 'MEDIUM', // All start as MEDIUM per requirements
        displayName: field.displayName,
        description: field.description,
        isActive: true,
        createdBy: coordinatorUser.id
      }
    })
  }

  console.log('✅ Created gap field severities (all set to MEDIUM)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })