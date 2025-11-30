import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { Marcador } from './api.service';
import { UserService } from './user.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private readonly serverUrl = environment.socketUrl;
  private userId: string | null = null;

  constructor(private userService: UserService) {
    // Configuración mejorada de Socket.IO con mejor manejo de errores
    this.socket = io(this.serverUrl, {
      transports: ['polling', 'websocket'], // Intentar polling primero como fallback más confiable
      upgrade: true,
      rememberUpgrade: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      autoConnect: true,
      forceNew: false,
      withCredentials: false
    });

    this.socket.on('connect', async () => {
      console.log('✅ Conectado al servidor Socket.IO', this.socket.id);
      
      // Obtener userId y enviarlo al servidor para registro
      try {
        this.userId = await this.userService.getUserId();
        const userInfo = this.userService.getUserInfo();
        
        // Enviar información del usuario al servidor
        this.socket.emit('usuario-conectado', {
          id: userInfo.id,
          nombre: userInfo.nombre,
          plataforma: userInfo.plataforma,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Error al obtener userId:', error);
      }
    });

    // Escuchar cuando el usuario se registra exitosamente para guardar num_usuario
    this.socket.on('usuario-registrado', (data: any) => {
      if (data.success && data.usuario && data.usuario.num_usuario) {
        this.userService.setUserNum(data.usuario.num_usuario);
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ Desconectado del servidor Socket.IO:', reason);
      if (reason === 'io server disconnect') {
        // El servidor desconectó el socket, necesitamos reconectar manualmente
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      // Solo mostrar el error si no es un error de transporte común
      // Los errores de transporte son esperados y Socket.IO intentará reconectar automáticamente
      if (error.message && !error.message.includes('TransportError') && !error.message.includes('websocket error')) {
        console.warn('⚠️ Error de conexión Socket.IO:', error.message);
      }
      // El socket intentará reconectar automáticamente gracias a reconnection: true
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`🔄 Intentando reconectar (intento ${attemptNumber})...`);
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`✅ Reconexión exitosa después de ${attemptNumber} intentos`);
    });

    this.socket.on('reconnect_error', (error: Error) => {
      console.warn('⚠️ Error al intentar reconectar:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Falló la reconexión después de múltiples intentos');
    });
  }

  /**
   * Obtiene los marcadores iniciales cuando se conecta
   */
  onMarcadoresIniciales(): Observable<Marcador[]> {
    return new Observable(observer => {
      this.socket.on('marcadores:iniciales', (marcadores: Marcador[]) => {
        observer.next(marcadores);
      });
    });
  }

  /**
   * Escucha cuando se crea un nuevo marcador
   */
  onMarcadorCreado(): Observable<Marcador> {
    return new Observable(observer => {
      this.socket.on('marcador:creado', (marcador: Marcador) => {
        observer.next(marcador);
      });
    });
  }

  /**
   * Escucha cuando se actualiza un marcador
   */
  onMarcadorActualizado(): Observable<Marcador> {
    return new Observable(observer => {
      this.socket.on('marcador:actualizado', (marcador: Marcador) => {
        observer.next(marcador);
      });
    });
  }

  /**
   * Escucha cuando se elimina un marcador
   */
  onMarcadorEliminado(): Observable<{ id: string }> {
    return new Observable(observer => {
      this.socket.on('marcador:eliminado', (data: { id: string }) => {
        observer.next(data);
      });
    });
  }

  /**
   * Escucha nuevas coordenadas GPS
   */
  onCoordenadaNueva(): Observable<{ id: number; lat: number; lng: number; accuracy?: number; timestamp: string; user_id?: string; numUsuario?: number; plataforma?: string }> {
    return new Observable(observer => {
      this.socket.on('coordenada:nueva', (data: { id: number; lat: number; lng: number; accuracy?: number; timestamp: string; user_id?: string; numUsuario?: number; plataforma?: string }) => {
        observer.next(data);
      });
    });
  }

  /**
   * Escucha cuando un cliente se conecta
   */
  onClienteConectado(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('cliente-conectado', (data: any) => {
        observer.next(data);
      });
    });
  }

  /**
   * Escucha cuando un cliente se desconecta
   */
  onClienteDesconectado(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('cliente-desconectado', (data: any) => {
        observer.next(data);
      });
    });
  }

  /**
   * Obtiene acceso directo al socket para eventos personalizados
   */
  getSocket(): Socket {
    return this.socket;
  }

  /**
   * Envía una actualización de coordenada GPS
   */
  enviarCoordenada(lat: number, lng: number, accuracy?: number): void {
    const userId = this.userId || this.userService.getUserIdSync();
    this.socket.emit('coordenada:actualizar', { 
      lat, 
      lng, 
      accuracy,
      userId 
    });
  }

  /**
   * Obtiene el userId actual
   */
  getUserId(): string | null {
    return this.userId || this.userService.getUserIdSync();
  }

  /**
   * Desconecta el socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

