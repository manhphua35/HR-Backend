import { Entity, PrimaryColumn, Column, OneToMany, BeforeInsert } from "typeorm";
import { User } from "./User";
import { v4 as uuidv4 } from 'uuid';

// Stub entity for Position to maintain backward compatibility
// This file exists only to support existing code that references Position
// All functionality has been moved to the User entity's description field
@Entity("positions")
export class Position {
    @PrimaryColumn({ length: 36 })
    id: string;

    @Column({ length: 100 })
    title: string;

    @Column()
    level: number;

    @Column({ name: "department_id" })
    departmentId: number;

    @BeforeInsert()
    generateId() {
        this.id = uuidv4();
    }
}
 