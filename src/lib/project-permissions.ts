import { prisma } from "./db";

export async function getUserProjectRole(userId: string, projectId: number) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      ProjectMember: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!project) {
    return null;
  }

  const isOwner = project.ownerId === userId;
  const memberRole = project.ProjectMember[0]?.role;

  return {
    isOwner,
    role: isOwner ? 'owner' : memberRole || null,
    canView: isOwner || !!memberRole,
    canEdit: isOwner || memberRole === 'editor',
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
