import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db/client'
import type { User, Role, Permission } from '@prisma/client'

export interface AuthTokenPayload {
  userId: string
  email: string
  roles: string[]
  permissions: string[]
  iat: number
  exp: number
}

export interface UserWithRoles extends User {
  roles: Array<{
    role: Role & {
      permissions: Array<{
        permission: Permission
      }>
    }
  }>
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key'
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
  private static readonly SALT_ROUNDS = 10

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS)
  }

  /**
   * Compare a password with its hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * Generate a JWT token with user data and roles
   */
  static generateToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as jwt.SignOptions)
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as AuthTokenPayload
    } catch (error) {
      throw new Error('Invalid or expired token')
    }
  }

  /**
   * Get user with all roles and permissions
   */
  static async getUserWithRoles(userId: string): Promise<UserWithRoles | null> {
    return db.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    })
  }

  /**
   * Get user by email with roles and permissions
   */
  static async getUserByEmail(email: string): Promise<UserWithRoles | null> {
    return db.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    })
  }

  /**
   * Authenticate user with email and password
   */
  static async authenticate(email: string, password: string): Promise<{
    user: UserWithRoles
    token: string
  } | null> {
    const user = await this.getUserByEmail(email)

    if (!user) {
      return null
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated')
    }

    if (user.isLocked) {
      throw new Error('Account is locked')
    }

    const isPasswordValid = await this.comparePassword(password, user.passwordHash)

    if (!isPasswordValid) {
      return null
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    // Extract roles and permissions
    const roles = user.roles.map(ur => ur.role.name)
    const permissions = Array.from(
      new Set(
        user.roles.flatMap(ur => 
          ur.role.permissions.map(rp => rp.permission.code)
        )
      )
    )

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      roles,
      permissions
    })

    return { user, token }
  }

  /**
   * Check if user has a specific permission
   */
  static async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    const user = await this.getUserWithRoles(userId)
    
    if (!user) {
      return false
    }

    const permissions = user.roles.flatMap(ur => 
      ur.role.permissions.map(rp => rp.permission.code)
    )

    return permissions.includes(permissionCode)
  }

  /**
   * Check if user has a specific role
   */
  static async hasRole(userId: string, roleName: string): Promise<boolean> {
    const user = await this.getUserWithRoles(userId)
    
    if (!user) {
      return false
    }

    const roles = user.roles.map(ur => ur.role.name)
    return roles.includes(roleName as any)
  }

  /**
   * Create a new user with roles
   */
  static async createUser(data: {
    email: string
    username: string
    password: string
    name: string
    phone?: string
    organization?: string
    roleIds: string[]
    assignedBy: string
  }): Promise<UserWithRoles> {
    const passwordHash = await this.hashPassword(data.password)

    // Create user and assign roles in a transaction
    const user = await db.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          username: data.username,
          passwordHash,
          name: data.name,
          phone: data.phone,
          organization: data.organization,
        }
      })

      // Assign roles
      await tx.userRole.createMany({
        data: data.roleIds.map(roleId => ({
          userId: newUser.id,
          roleId,
          assignedBy: data.assignedBy
        }))
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: data.assignedBy,
          action: 'CREATE_USER',
          resource: 'User',
          resourceId: newUser.id,
          newValues: {
            email: data.email,
            username: data.username,
            name: data.name,
            roles: data.roleIds
          }
        }
      })

      return newUser
    })

    // Return user with roles
    return this.getUserWithRoles(user.id) as Promise<UserWithRoles>
  }

  /**
   * Assign roles to a user
   */
  static async assignRoles(userId: string, roleIds: string[], assignedBy: string): Promise<void> {
    await db.$transaction(async (tx) => {
      // Remove existing role assignments
      await tx.userRole.deleteMany({
        where: { userId }
      })

      // Add new role assignments
      await tx.userRole.createMany({
        data: roleIds.map(roleId => ({
          userId,
          roleId,
          assignedBy
        }))
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: assignedBy,
          action: 'ASSIGN_ROLES',
          resource: 'User',
          resourceId: userId,
          newValues: { roles: roleIds }
        }
      })
    })
  }

  /**
   * Refresh token with updated user data
   */
  static async refreshToken(userId: string): Promise<string> {
    const user = await this.getUserWithRoles(userId)
    
    if (!user || !user.isActive || user.isLocked) {
      throw new Error('User not found or inactive')
    }

    const roles = user.roles.map(ur => ur.role.name)
    const permissions = Array.from(
      new Set(
        user.roles.flatMap(ur => 
          ur.role.permissions.map(rp => rp.permission.code)
        )
      )
    )

    return this.generateToken({
      userId: user.id,
      email: user.email,
      roles,
      permissions
    })
  }
}