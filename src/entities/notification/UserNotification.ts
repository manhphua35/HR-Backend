import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../core/User";
import { Notification } from "./Notification";

@Entity("user_notifications")
export class UserNotification {
  @PrimaryColumn({ name: "notification_id" })
  notificationId: number;

  @PrimaryColumn({ name: "user_id" })
  userId: number;

  @Column({ name: "is_read", default: false })
  isRead: boolean;

  @ManyToOne(() => Notification, notification => notification.userNotifications)
  @JoinColumn({ name: "notification_id" })
  notification: Notification;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;
}
