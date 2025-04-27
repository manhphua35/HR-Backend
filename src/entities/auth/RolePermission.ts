import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import { Role } from "./Role";
import { Permission } from "./Permission";

@Entity("role_permissions")
export class RolePermission {
  @PrimaryColumn({ name: "role_id" })
  roleId: number;

  @PrimaryColumn({ name: "permission_id" })
  permissionId: number;

  @ManyToOne(() => Role, role => role.permissions)
  @JoinColumn({ name: "role_id" })
  role: Role;

  @ManyToOne(() => Permission, permission => permission.roles)
  @JoinColumn({ name: "permission_id" })
  permission: Permission;
}
