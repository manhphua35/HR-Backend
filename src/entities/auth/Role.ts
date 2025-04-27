import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { User } from "../core/User";
import { RolePermission } from "./RolePermission";

export enum RoleType {
    SYSTEM_ADMIN = "SYSTEM_ADMIN",
    HR_STAFF = "HR_STAFF",
    DEPARTMENT_HEAD = "DEPARTMENT_HEAD",
    EMPLOYEE = "EMPLOYEE"
}

@Entity("roles")
export class Role {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: "enum",
        enum: RoleType,
        default: RoleType.EMPLOYEE
    })
    roleType: RoleType;

    @Column({ length: 50 })
    name: string;

    @Column({ type: "text", nullable: true })
    description: string;

    @OneToMany(() => User, user => user.role)
    users: User[];

    @OneToMany(() => RolePermission, rp => rp.role)
    rolePermissions: RolePermission[];

    @Column({ name: "created_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    createdAt: Date;

    @Column({ name: "updated_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    updatedAt: Date;

    permissions?: string[];
}
