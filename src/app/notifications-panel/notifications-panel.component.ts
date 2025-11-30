import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NgIf, NgFor } from '@angular/common';
import { NotificationService, Notification } from '../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe],
  templateUrl: './notifications-panel.component.html',
  styleUrl: './notifications-panel.component.css'
})
export class NotificationsPanelComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription?: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscription = this.notificationService.getNotifications().subscribe(
      notifications => {
        this.notifications = notifications;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  /**
   * Limpia todas las notificaciones
   */
  clearAll(): void {
    this.notificationService.clearAll();
  }

  /**
   * Marca una notificación específica como leída
   */
  markAsRead(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }
  }

  /**
   * Elimina una notificación
   */
  removeNotification(notification: Notification): void {
    this.notificationService.removeNotification(notification.id);
  }

  /**
   * Obtiene el icono según el tipo de notificación
   */
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '•';
    }
  }

  /**
   * Obtiene la clase de color según el tipo
   */
  getNotificationColorClass(type: string): string {
    switch (type) {
      case 'success': return 'border-l-4 border-l-success bg-success/10';
      case 'error': return 'border-l-4 border-l-error bg-error/10';
      case 'warning': return 'border-l-4 border-l-warning bg-warning/10';
      case 'info': return 'border-l-4 border-l-info bg-info/10';
      default: return 'border-l-4 border-l-base-300 bg-base-200';
    }
  }

  /**
   * Obtiene el número de notificaciones no leídas
   */
  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Verifica si hay notificaciones no leídas
   */
  get hasUnreadNotifications(): boolean {
    return this.unreadCount > 0;
  }
}

