import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserService } from './user.service';
import { environment } from '../../environments/environment';

export interface Marcador {
  id?: string;
  user_id?: string;
  lat: number;
  lng: number;
  categoria: 'alerta' | 'peligro' | 'informacion';
  descripcion: string;
  archivo?: string | null;
  timestamp?: string;
  created_at?: string;
  updated_at?: string;
  usuario_nombre?: string;
  usuario_plataforma?: string;
  usuario_num?: number;
}

export interface CoordenadaGPS {
  id?: number;
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: string;
  created_at?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) {}

  // ==================== MARCADORES ====================

  /**
   * Obtiene todos los marcadores
   */
  getMarcadores(): Observable<ApiResponse<Marcador[]>> {
    return this.http.get<ApiResponse<Marcador[]>>(`${this.apiUrl}/marcadores`);
  }

  /**
   * Obtiene un marcador por ID
   */
  getMarcadorById(id: string): Observable<ApiResponse<Marcador>> {
    return this.http.get<ApiResponse<Marcador>>(`${this.apiUrl}/marcadores/${id}`);
  }

  /**
   * Crea un nuevo marcador (con soporte para archivos)
   */
  createMarcador(marcador: Omit<Marcador, 'id' | 'timestamp' | 'created_at' | 'updated_at'>, archivo?: File): Observable<ApiResponse<Marcador>> {
    const formData = new FormData();
    formData.append('lat', marcador.lat.toString());
    formData.append('lng', marcador.lng.toString());
    formData.append('categoria', marcador.categoria);
    formData.append('descripcion', marcador.descripcion);
    
    // Agregar userId si está disponible
    const userId = this.userService.getUserIdSync();
    if (userId) {
      formData.append('user_id', userId);
    }
    
    if (archivo) {
      formData.append('archivo', archivo);
    }
    
    return this.http.post<ApiResponse<Marcador>>(`${this.apiUrl}/marcadores`, formData);
  }

  /**
   * Actualiza un marcador existente (con soporte para archivos)
   */
  updateMarcador(id: string, marcador: Partial<Marcador>, archivo?: File): Observable<ApiResponse<Marcador>> {
    const formData = new FormData();
    
    if (marcador.lat !== undefined) formData.append('lat', marcador.lat.toString());
    if (marcador.lng !== undefined) formData.append('lng', marcador.lng.toString());
    if (marcador.categoria) formData.append('categoria', marcador.categoria);
    if (marcador.descripcion) formData.append('descripcion', marcador.descripcion);
    
    if (archivo) {
      formData.append('archivo', archivo);
    }
    
    return this.http.put<ApiResponse<Marcador>>(`${this.apiUrl}/marcadores/${id}`, formData);
  }

  /**
   * Elimina un marcador
   */
  deleteMarcador(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/marcadores/${id}`);
  }

  /**
   * Obtiene estadísticas de marcadores
   */
  getEstadisticasMarcadores(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/marcadores/stats/estadisticas`);
  }

  // ==================== COORDENADAS GPS ====================

  /**
   * Guarda una coordenada GPS
   */
  saveCoordenadaGPS(coordenada: Omit<CoordenadaGPS, 'id' | 'created_at'>): Observable<ApiResponse<CoordenadaGPS>> {
    return this.http.post<ApiResponse<CoordenadaGPS>>(`${this.apiUrl}/coordenadas`, coordenada);
  }

  /**
   * Obtiene las últimas coordenadas GPS
   */
  getCoordenadas(limit: number = 100): Observable<ApiResponse<CoordenadaGPS[]>> {
    return this.http.get<ApiResponse<CoordenadaGPS[]>>(`${this.apiUrl}/coordenadas?limit=${limit}`);
  }

  /**
   * Obtiene coordenadas por rango de tiempo
   */
  getCoordenadasPorRango(fechaInicio: string, fechaFin: string): Observable<ApiResponse<CoordenadaGPS[]>> {
    return this.http.get<ApiResponse<CoordenadaGPS[]>>(
      `${this.apiUrl}/coordenadas/rango?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
    );
  }

  // ==================== HEALTH CHECK ====================

  /**
   * Verifica el estado del servidor
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }
}

