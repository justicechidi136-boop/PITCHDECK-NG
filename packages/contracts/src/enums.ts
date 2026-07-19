export enum RoleType {
  SUPER_ADMIN = "SUPER_ADMIN",
  NATIONAL_ADMIN = "NATIONAL_ADMIN",
  STATE_ADMIN = "STATE_ADMIN",
  REVIEWER = "REVIEWER",
  INNOVATOR = "INNOVATOR",
  SPONSOR = "SPONSOR",
  MENTOR = "MENTOR",
}

export const ROLE_TYPES = Object.values(RoleType) as [RoleType, ...RoleType[]];

export enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  ACCESS = "ACCESS",
}

export const AUDIT_ACTIONS = Object.values(AuditAction) as [
  AuditAction,
  ...AuditAction[],
];
