import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private userIdKey = 'user_id';
  private userNameKey = 'user_name';
  private platformKey = 'user_platform';
  private userNumKey = 'user_num';
  private cachedUserId: string | null = null;
  private cachedUserNum: number | null = null;

  constructor() {
    // Cargar userId en caché al inicializar
    this.getUserId();
  }

  /**
   * Obtiene el ID del usuario (UUID persistente)
   * Si no existe, genera uno nuevo y lo guarda
   */
  async getUserId(): Promise<string> {
    // Si ya está en caché, devolverlo
    if (this.cachedUserId) {
      return this.cachedUserId;
    }

    // Intentar obtener del localStorage
    try {
      const stored = localStorage.getItem(this.userIdKey);
      if (stored) {
        this.cachedUserId = stored;
        return stored;
      }
    } catch (error) {
      console.warn('Error al leer localStorage:', error);
    }

    // Si no existe, generar uno nuevo
    const newId = uuidv4();
    this.cachedUserId = newId;

    // Guardarlo en localStorage
    try {
      localStorage.setItem(this.userIdKey, newId);
    } catch (error) {
      console.warn('Error al guardar userId en localStorage:', error);
    }

    return newId;
  }

  /**
   * Obtiene el ID del usuario de forma síncrona (desde caché)
   */
  getUserIdSync(): string {
    if (this.cachedUserId) {
      return this.cachedUserId;
    }

    try {
      const stored = localStorage.getItem(this.userIdKey);
      if (stored) {
        this.cachedUserId = stored;
        return stored;
      }
    } catch (error) {
      console.warn('Error al leer localStorage:', error);
    }

    // Si no está en caché ni en localStorage, generar y guardar
    const newId = uuidv4();
    this.cachedUserId = newId;

    try {
      localStorage.setItem(this.userIdKey, newId);
    } catch (error) {
      console.warn('Error al guardar userId en localStorage:', error);
    }

    return newId;
  }

  /**
   * Obtiene o establece el nombre del usuario
   */
  getUserName(): string | null {
    try {
      return localStorage.getItem(this.userNameKey);
    } catch (error) {
      console.warn('Error al leer userName del localStorage:', error);
      return null;
    }
  }

  setUserName(name: string): void {
    try {
      localStorage.setItem(this.userNameKey, name);
    } catch (error) {
      console.warn('Error al guardar userName en localStorage:', error);
    }
  }

  /**
   * Detecta la plataforma del usuario
   */
  detectPlatform(): string {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    // Detectar Android
    if (/android/i.test(userAgent)) {
      return 'android';
    }
    
    // Detectar iOS
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      return 'ios';
    }
    
    // Por defecto, web
    return 'web';
  }

  /**
   * Obtiene o establece el número de usuario
   */
  getUserNum(): number | null {
    if (this.cachedUserNum !== null) {
      return this.cachedUserNum;
    }

    try {
      const stored = localStorage.getItem(this.userNumKey);
      if (stored) {
        const num = parseInt(stored, 10);
        if (!isNaN(num)) {
          this.cachedUserNum = num;
          return num;
        }
      }
    } catch (error) {
      console.warn('Error al leer userNum del localStorage:', error);
    }

    return null;
  }

  setUserNum(num: number): void {
    try {
      this.cachedUserNum = num;
      localStorage.setItem(this.userNumKey, num.toString());
    } catch (error) {
      console.warn('Error al guardar userNum en localStorage:', error);
    }
  }

  /**
   * Obtiene información completa del usuario
   */
  getUserInfo(): { id: string; nombre: string | null; plataforma: string; numUsuario: number | null } {
    return {
      id: this.getUserIdSync(),
      nombre: this.getUserName(),
      plataforma: this.detectPlatform(),
      numUsuario: this.getUserNum()
    };
  }

  /**
   * Resetea el ID del usuario (útil para testing)
   * ADVERTENCIA: Esto cambiará el ID del usuario permanentemente
   */
  resetUserId(): void {
    try {
      localStorage.removeItem(this.userIdKey);
      this.cachedUserId = null;
    } catch (error) {
      console.warn('Error al resetear userId:', error);
    }
  }
}

