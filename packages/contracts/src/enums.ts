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

export const PUBLIC_REGISTRATION_ROLES = [
  RoleType.INNOVATOR,
  RoleType.SPONSOR,
] as const;

export const ADMIN_ROLES = [
  RoleType.SUPER_ADMIN,
  RoleType.NATIONAL_ADMIN,
  RoleType.STATE_ADMIN,
] as const;

export enum AccountStatus {
  PENDING_VERIFICATION = "PENDING_VERIFICATION",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DEACTIVATED = "DEACTIVATED",
}

export const ACCOUNT_STATUSES = Object.values(AccountStatus) as [
  AccountStatus,
  ...AccountStatus[],
];

export enum ScopeType {
  GLOBAL = "GLOBAL",
  COUNTRY = "COUNTRY",
  STATE = "STATE",
}

export const SCOPE_TYPES = Object.values(ScopeType) as [
  ScopeType,
  ...ScopeType[],
];

export enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  ACCESS = "ACCESS",
  REGISTER = "REGISTER",
  EMAIL_VERIFY = "EMAIL_VERIFY",
  PASSWORD_RESET = "PASSWORD_RESET",
  PASSWORD_CHANGE = "PASSWORD_CHANGE",
  SESSION_REVOKE = "SESSION_REVOKE",
  ROLE_ASSIGN = "ROLE_ASSIGN",
  ROLE_REVOKE = "ROLE_REVOKE",
  USER_SUSPEND = "USER_SUSPEND",
  USER_REACTIVATE = "USER_REACTIVATE",
  REFRESH_REUSE = "REFRESH_REUSE",
  BOOTSTRAP = "BOOTSTRAP",
}

export const AUDIT_ACTIONS = Object.values(AuditAction) as [
  AuditAction,
  ...AuditAction[],
];

export const DEFAULT_COUNTRY_CODE = "NG";
