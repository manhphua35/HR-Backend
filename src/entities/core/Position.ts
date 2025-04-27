import { Entity, PrimaryColumn, Column, OneToMany, BeforeInsert } from "typeorm";
import { User } from "./User";
import { v4 as uuidv4 } from 'uuid';

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

    @OneToMany(() => User, user => user.position)
    users: User[];

    @BeforeInsert()
    generateId() {
        this.id = uuidv4();
    }
}
