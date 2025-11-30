import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { getDistance, getGreatCircleBearing, getCompassDirection, getRhumbLineBearing } from 'geolib';
import { SocketService } from './socket.service';
import { UserService } from './user.service';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeoService {
  private watchId: number | null = null;
  private currentPositionSubject = new BehaviorSubject<GeoPosition | null>(null);
  public currentPosition$: Observable<GeoPosition | null> = this.currentPositionSubject.asObservable();
  private lastSentPosition: { lat: number; lng: number } | null = null;
  private readonly MIN_DISTANCE_TO_SEND = 5; // Enviar si se movió al menos 5 metros

  constructor(
    private socketService: SocketService,
    private userService: UserService
  ) {
    // Detectar cuando la app vuelve del background (reanudar)
    this.setupVisibilityChangeListener();
    // Detectar cambios de red
    this.setupNetworkChangeListener();
    // Enviar ubicación cuando el socket se conecta
    this.setupSocketConnectionListener();
  }

  /**
   * Inicia el seguimiento de ubicación en tiempo real
   */
  startTracking(): void {
    if (this.watchId !== null) {
      console.warn('El seguimiento de ubicación ya está activo');
      return;
    }

    if (!navigator.geolocation) {
      console.error('Geolocalización no está soportada en este navegador');
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 500,
      timeout: 10000
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position: GeolocationPosition) => {
        const geoPosition: GeoPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp
        };

        this.currentPositionSubject.next(geoPosition);
        
        // Enviar ubicación vía socket cuando se mueve
        this.enviarUbicacionSiNecesario(geoPosition);
      },
      (error: GeolocationPositionError) => {
        console.error('Error de geolocalización:', error);
        this.currentPositionSubject.next(null);
      },
      options
    );
  }

  /**
   * Detiene el seguimiento de ubicación
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.currentPositionSubject.next(null);
    }
  }

  /**
   * Obtiene la posición actual una sola vez
   */
  getCurrentPosition(): Promise<GeoPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no está soportada'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      };

      navigator.geolocation.getCurrentPosition(
        (position: GeolocationPosition) => {
          const geoPosition: GeoPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: position.timestamp
          };
          resolve(geoPosition);
        },
        (error: GeolocationPositionError) => {
          reject(error);
        },
        options
      );
    });
  }

  /**
   * Calcula la distancia entre dos puntos en metros usando geolib
   */
  calcularDistancia(
    punto1: { lat: number; lng: number },
    punto2: { lat: number; lng: number }
  ): number {
    return getDistance(
      { latitude: punto1.lat, longitude: punto1.lng },
      { latitude: punto2.lat, longitude: punto2.lng }
    );
  }

  /**
   * Calcula el rumbo (bearing) entre dos puntos en grados usando geolib
   */
  calcularRumbo(
    punto1: { lat: number; lng: number },
    punto2: { lat: number; lng: number }
  ): number {
    return getGreatCircleBearing(
      { latitude: punto1.lat, longitude: punto1.lng },
      { latitude: punto2.lat, longitude: punto2.lng }
    );
  }

  /**
   * Obtiene la dirección de la brújula (N, NE, E, etc.) usando geolib
   */
  obtenerDireccionCompass(
    punto1: { lat: number; lng: number },
    punto2: { lat: number; lng: number }
  ): string {
    return getCompassDirection(
      { latitude: punto1.lat, longitude: punto1.lng },
      { latitude: punto2.lat, longitude: punto2.lng }
    );
  }

  /**
   * Valida si una coordenada es válida
   */
  validarCoordenada(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  /**
   * Obtiene las coordenadas actuales (alias para compatibilidad)
   */
  async getCurrentCoords(): Promise<{ lat: number; lng: number; speed: number }> {
    const position = await this.getCurrentPosition();
    return {
      lat: position.lat,
      lng: position.lng,
      speed: position.speed || 0
    };
  }

  /**
   * Envía la ubicación actual vía socket
   */
  async enviarMiUbicacionActual(): Promise<void> {
    try {
      const coords = await this.getCurrentCoords();
      const userId = await this.userService.getUserId();
      const socket = this.socketService.getSocket();

      if (socket && socket.connected) {
        socket.emit('ubicacion-actual', {
          userId,
          lat: coords.lat,
          lng: coords.lng,
          speed: coords.speed || 0,
          timestamp: Date.now()
        });
        console.log('📍 Ubicación inicial enviada:', { userId, lat: coords.lat, lng: coords.lng, speed: coords.speed });
      }
    } catch (error) {
      console.error('Error al enviar ubicación inicial:', error);
    }
  }

  /**
   * Envía ubicación vía socket si es necesario (cuando se mueve significativamente)
   */
  private async enviarUbicacionSiNecesario(position: GeoPosition): Promise<void> {
    try {
      const socket = this.socketService.getSocket();
      if (!socket || !socket.connected) {
        return;
      }

      // Verificar si se movió lo suficiente para enviar
      let shouldSend = false;
      if (!this.lastSentPosition) {
        // Primera vez, siempre enviar
        shouldSend = true;
      } else {
        // Calcular distancia desde última posición enviada
        const distance = this.calcularDistancia(
          { lat: position.lat, lng: position.lng },
          { lat: this.lastSentPosition.lat, lng: this.lastSentPosition.lng }
        );
        // Enviar si se movió más de MIN_DISTANCE_TO_SEND metros
        shouldSend = distance >= this.MIN_DISTANCE_TO_SEND;
      }

      if (shouldSend) {
        const userId = await this.userService.getUserId();
        const speed = position.speed || 0;

        socket.emit('ubicacion-actual', {
          userId,
          lat: position.lat,
          lng: position.lng,
          speed: speed,
          timestamp: Date.now()
        });

        // Actualizar última posición enviada
        this.lastSentPosition = { lat: position.lat, lng: position.lng };
      }
    } catch (error) {
      console.error('Error al enviar ubicación:', error);
    }
  }

  /**
   * Configura listener para cuando la app vuelve del background
   */
  private setupVisibilityChangeListener(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
          // La app volvió al foreground, enviar ubicación actual
          console.log('📱 App reanudada desde background, enviando ubicación...');
          await this.enviarMiUbicacionActual();
        }
      });
    }
  }

  /**
   * Configura listener para cambios de red
   */
  private setupNetworkChangeListener(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        connection.addEventListener('change', async () => {
          console.log('🌐 Cambio de red detectado, enviando ubicación...');
          await this.enviarMiUbicacionActual();
        });
      }
    }

    // También escuchar eventos online/offline
    if (typeof window !== 'undefined') {
      window.addEventListener('online', async () => {
        console.log('🌐 Conexión restaurada, enviando ubicación...');
        await this.enviarMiUbicacionActual();
      });
    }
  }

  /**
   * Configura listener para cuando el socket se conecta
   */
  private setupSocketConnectionListener(): void {
    const socket = this.socketService.getSocket();
    socket.on('connect', async () => {
      console.log('🔌 Socket conectado, enviando ubicación inicial...');
      // Pequeño delay para asegurar que el socket esté completamente listo
      setTimeout(async () => {
        await this.enviarMiUbicacionActual();
      }, 500);
    });
  }
}

