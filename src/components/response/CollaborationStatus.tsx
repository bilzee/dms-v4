'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Icons
import { Users, Edit, Clock, Shield, AlertTriangle } from '@/lib/icons'

interface CollaborationStatusProps {
  collaboration: {
    isActive: boolean
    collaborators: Array<{
      userId: string
      userName: string
      email: string
      isEditing: boolean
      joinedAt: Date
      lastSeen: Date
    }>
    totalCollaborators: number
    isCurrentUserCollaborating: boolean
    canEdit: boolean
  }
  currentUserId?: string
  onJoin?: () => void
  onLeave?: () => void
  onStartEditing?: () => void
  onStopEditing?: () => void
}

export function CollaborationStatus({ 
  collaboration, 
  currentUserId,
  onJoin,
  onLeave,
  onStartEditing,
  onStopEditing
}: CollaborationStatusProps) {
  const {
    isActive,
    collaborators,
    totalCollaborators,
    isCurrentUserCollaborating,
    canEdit
  } = collaboration

  if (!isActive) {
    return (
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">No Active Collaboration</p>
            <p className="text-xs text-muted-foreground">You can start collaborating on this response</p>
          </div>
        </div>
        {canEdit && (
          <Button
            onClick={onJoin}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Start Collaborating
          </Button>
        )}
      </div>
    )
  }

  const otherCollaborators = collaborators.filter(c => c.userId !== currentUserId)
  const activeEditors = collaborators.filter(c => c.isEditing)

  return (
    <div className="space-y-4">
      {/* Collaboration Header */}
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Users className="h-5 w-5 text-blue-600" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">
              Active Collaboration
            </p>
            <p className="text-xs text-blue-700">
              {totalCollaborators} {totalCollaborators === 1 ? 'responder' : 'responders'} working together
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-700 border-blue-300">
            LIVE
          </Badge>
          {isCurrentUserCollaborating && (
            <Button
              onClick={onLeave}
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-300 hover:bg-blue-100"
            >
              Leave
            </Button>
          )}
        </div>
      </div>

      {/* Editing Status */}
      {activeEditors.length > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <Edit className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {activeEditors.length === 1 ? 'Someone is editing' : 'People are editing'} this response.
              </span>
              {isCurrentUserCollaborating && !activeEditors.find(c => c.userId === currentUserId) && (
                <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                  <Clock className="h-3 w-3 mr-1" />
                  Wait for current editor to finish
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Collaborators List */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Collaborators</h4>
        
        {/* Current User */}
        {isCurrentUserCollaborating && collaborators.find(c => c.userId === currentUserId) && (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-green-600 text-white text-xs">
                  {collaborators.find(c => c.userId === currentUserId)?.userName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-green-900">
                  You
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    {collaborators.find(c => c.userId === currentUserId)?.isEditing ? 'Editing' : 'Viewing'}
                  </Badge>
                  <span className="text-xs text-green-600">
                    Joined {new Date(collaborators.find(c => c.userId === currentUserId)?.joinedAt || new Date()).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && !collaborators.find(c => c.userId === currentUserId)?.isEditing && (
                <Button
                  onClick={onStartEditing}
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
              {collaborators.find(c => c.userId === currentUserId)?.isEditing && (
                <Button
                  onClick={onStopEditing}
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-300 hover:bg-green-50"
                >
                  Done Editing
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Other Collaborators */}
        {otherCollaborators.map((collaborator) => (
          <div key={collaborator.userId} className="flex items-center justify-between p-3 bg-muted border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted-foreground text-white text-xs">
                  {collaborator.userName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {collaborator.userName}
                </p>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={collaborator.isEditing ? "destructive" : "outline"}
                    className={collaborator.isEditing ? "" : "text-muted-foreground border-border"}
                  >
                    {collaborator.isEditing ? 'Editing' : 'Viewing'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(collaborator.joinedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {collaborator.isEditing && (
                <div className="flex items-center gap-1">
                  <Edit className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-500">Editing</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                Last seen {new Date(collaborator.lastSeen).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Non-collaborator Join Option */}
      {!isCurrentUserCollaborating && canEdit && (
        <Alert className="bg-blue-50 border-blue-200">
          <Users className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="flex items-center justify-between">
              <span>
                Join this collaboration to work together on this response plan.
              </span>
              <Button
                onClick={onJoin}
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Join Collaboration
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Read-only Notice */}
      {isCurrentUserCollaborating && !canEdit && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This response is currently being edited by another responder. Please wait for them to finish.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}