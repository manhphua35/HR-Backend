import { Entity, PrimaryColumn, Column, OneToMany, BeforeInsert, ManyToOne, JoinColumn } from "typeorm"; // Added ManyToOne, JoinColumn
import { User } from "./User";
import { v4 as uuidv4 } from 'uuid';
import { Department } from "./Department"; // Added Department import

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

    // Define the relationship to Department
    @ManyToOne(() => Department, department => department.positions)
    @JoinColumn({ name: "department_id" }) // Links this relationship to the departmentId column
    department: Department;

    @OneToMany(() => User, user => user.position)
    users: User[];

    @BeforeInsert()
    generateId() {
        this.id = uuidv4();
    }
}
