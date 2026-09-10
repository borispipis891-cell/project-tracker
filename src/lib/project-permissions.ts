import { prisma } from "./prisma";

export async function getUserProjectRole(userId: string, projectId: number) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) {
    return null;
  }

  const isOwner = project.ownerId === userId;

  return {
    isOwner,
    role: isOwner ? 'owner' : 'editor',
    // Every authenticated user can work with every project.
    canView: true,
    canEdit: true,
    canDelete: isOwner,
    canInvite: isOwner,
    canManageTeam: isOwner,
  };
}

export async function checkProjectAccess(userId: string, projectId: number) {
  const permissions = await getUserProjectRole(userId, projectId);
  return permissions?.canView || false;
}

export async function checkProjectEditAccess(userId: string, projectId: number) {
  const permissions = await getUserProjectRole(userId, projectId);
  return permissions?.canEdit || false;
}
