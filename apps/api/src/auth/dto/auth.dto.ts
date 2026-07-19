import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  Equals,
  IsIn,
  MaxLength,
  MinLength,
} from "class-validator";
import { RoleType, ScopeType, AccountStatus, PUBLIC_REGISTRATION_ROLES, NIGERIAN_STATE_CODES } from "@pitchdeck/contracts";

export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsEnum(PUBLIC_REGISTRATION_ROLES)
  role!: (typeof PUBLIC_REGISTRATION_ROLES)[number];

  @IsString()
  @IsNotEmpty()
  @IsIn(NIGERIAN_STATE_CODES)
  stateCode!: (typeof NIGERIAN_STATE_CODES)[number];

  @IsBoolean()
  @Equals(true, { message: "You must accept the terms of service" })
  acceptedTerms!: true;
}

export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class ResendVerificationDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class AssignRoleDto {
  @IsEnum(RoleType)
  role!: RoleType;

  @IsEnum(ScopeType)
  scopeType!: ScopeType;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  countryCode?: string;

  @IsOptional()
  @IsString()
  stateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  stateCode?: string;
}

export class AdminCreateUserDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  roles!: AssignRoleDto[];
}

export class AdminUpdateStatusDto {
  @IsEnum([AccountStatus.ACTIVE, AccountStatus.SUSPENDED, AccountStatus.DEACTIVATED])
  accountStatus!: AccountStatus.ACTIVE | AccountStatus.SUSPENDED | AccountStatus.DEACTIVATED;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  suspendedReason?: string;
}
