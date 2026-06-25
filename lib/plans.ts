import { PlanTier, UsageEventType, WorkspaceRole } from "@prisma/client";

export type PlanConfig = {
  name: string;
  tier: PlanTier;
  monthlyPrice: string;
  limits: Record<UsageEventType | "members" | "sso", number | "unlimited">;
};

export const plans: Record<PlanTier, PlanConfig> = {
  FREE: {
    name: "Free",
    tier: "FREE",
    monthlyPrice: "$0",
    limits: {
      members: 1,
      sso: 0,
      MEETING_SYNC: 10,
      AI_SUMMARY: 5,
      AI_CHAT: 25,
      VECTOR_INDEX: 20,
      KNOWLEDGE_DOCUMENT: 5,
      FOLLOW_UP_EMAIL: 5
    }
  },
  PRO: {
    name: "Pro",
    tier: "PRO",
    monthlyPrice: "$19",
    limits: {
      members: 3,
      sso: 0,
      MEETING_SYNC: 100,
      AI_SUMMARY: 100,
      AI_CHAT: 1000,
      VECTOR_INDEX: 500,
      KNOWLEDGE_DOCUMENT: 100,
      FOLLOW_UP_EMAIL: 100
    }
  },
  BUSINESS: {
    name: "Business",
    tier: "BUSINESS",
    monthlyPrice: "$49",
    limits: {
      members: 25,
      sso: 1,
      MEETING_SYNC: 1000,
      AI_SUMMARY: 1000,
      AI_CHAT: 10000,
      VECTOR_INDEX: 5000,
      KNOWLEDGE_DOCUMENT: 1000,
      FOLLOW_UP_EMAIL: 1000
    }
  },
  ENTERPRISE: {
    name: "Enterprise",
    tier: "ENTERPRISE",
    monthlyPrice: "Custom",
    limits: {
      members: "unlimited",
      sso: "unlimited",
      MEETING_SYNC: "unlimited",
      AI_SUMMARY: "unlimited",
      AI_CHAT: "unlimited",
      VECTOR_INDEX: "unlimited",
      KNOWLEDGE_DOCUMENT: "unlimited",
      FOLLOW_UP_EMAIL: "unlimited"
    }
  }
};

export const roleRank: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1
};

export function canManageWorkspace(role: WorkspaceRole) {
  return roleRank[role] >= roleRank.ADMIN;
}

export function canEditWorkspace(role: WorkspaceRole) {
  return roleRank[role] >= roleRank.MEMBER;
}
