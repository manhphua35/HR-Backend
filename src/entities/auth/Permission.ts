import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from "typeorm";
import { Role } from "./Role";

export enum PermissionType {
  // User Management
  VIEW_USERS = "VIEW_USERS",
  CREATE_USER = "CREATE_USER",
  UPDATE_USER = "UPDATE_USER",
  DELETE_USER = "DELETE_USER",

  // Leave Management
  VIEW_LEAVES = "VIEW_LEAVES",
  APPROVE_LEAVES = "APPROVE_LEAVES",
  CREATE_LEAVE = "CREATE_LEAVE",
  
  // Performance Management
  VIEW_PERFORMANCE = "VIEW_PERFORMANCE",
  CREATE_PERFORMANCE_REVIEW = "CREATE_PERFORMANCE_REVIEW",
  UPDATE_PERFORMANCE_REVIEW = "UPDATE_PERFORMANCE_REVIEW",

  // Payroll Management
  VIEW_PAYROLL = "VIEW_PAYROLL",
  MANAGE_PAYROLL = "MANAGE_PAYROLL",

  // Department Management
  VIEW_DEPARTMENTS = "VIEW_DEPARTMENTS",
  MANAGE_DEPARTMENTS = "MANAGE_DEPARTMENTS",

  // System Administration
  MANAGE_ROLES = "MANAGE_ROLES",
  MANAGE_PERMISSIONS = "MANAGE_PERMISSIONS"
}

@Entity("permissions")
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @ManyToMany(() => Role, role => role.permissions)
  roles: Role[];
}
