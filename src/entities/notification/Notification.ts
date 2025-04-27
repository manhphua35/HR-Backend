import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { User } from "../core/User";
import { UserNotification } from "./UserNotification";

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: "text" })
  content: string;

  @Column({ name: "sender_id" })
  senderId: number;

  @Column({ name: "is_broadcast", default: false })
  isBroadcast: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "sender_id" })
  sender: User;

  @OneToMany(() => UserNotification, userNotification => userNotification.notification)
  userNotifications: UserNotification[];
}
