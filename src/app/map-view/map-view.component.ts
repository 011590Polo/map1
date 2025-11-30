import { AfterViewInit, Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import * as L from 'leaflet';
import { SpeedDialComponent } from '../speed-dial/speed-dial.component';
import { NotificationsPanelComponent } from '../notifications-panel/notifications-panel.component';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeoService, GeoPosition } from '../services/geo.service';
import { ApiService, Marcador } from '../services/api.service';
import { SocketService } from '../services/socket.service';
import { NotificationService } from '../services/notification.service';
import { UserService } from '../services/user.service';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [SpeedDialComponent, NotificationsPanelComponent, NgIf, NgFor, FormsModule],
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.css'
})
export class MapViewComponent implements AfterViewInit, OnDestroy {
  private map?: L.Map;
  private baseLayers: Record<string, L.TileLayer> = {};
  private currentBaseKey: string = 'osmStandard';
  private readonly defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
  });

  // Búsqueda de direcciones
  searchQuery: string = '';
  searchResultValid: boolean | null = null;
  searchInProgress: boolean = false;
  searchError: string | null = null;
  searchResults: { displayName: string; lat: number; lon: number }[] = [];
  private searchMarker?: L.Marker;
  private searchTimeout: any;
  searchBarVisible: boolean = false; // Controla la visibilidad de la barra de búsqueda

  // Geolocalización
  private userLocationMarker?: L.Marker;
  private geoSubscription?: Subscription;
  private readonly userLocationIcon: L.DivIcon;
  private smoothMoveAnimation?: any;
  private hasInitializedDraggable: boolean = false;
  private mapCenteredOnce: boolean = false;

  // Modal de marcador
  modalMarcadorAbierto: boolean = false;
  selectedCategory: 'alerta' | 'peligro' | 'informacion' = 'alerta';
  descripcionMarcador: string = '';
  archivoSeleccionado?: File;
  coordenadasMarcador?: { lat: number; lng: number };

  // Modal de gestión de marcadores
  modalGestionMarcadoresAbierto: boolean = false;
  marcadoresGuardados: Marcador[] = [];
  marcadorEditando?: Marcador;
  modalEditarMarcadorAbierto: boolean = false;
  cargandoMarcadores: boolean = false;

  // Sistema de alertas DaisyUI
  alertaVisible: boolean = false;
  alertaMensaje: string = '';
  alertaTipo: 'success' | 'error' | 'warning' | 'info' = 'info';

  // Sistema de loading global
  loadingVisible: boolean = false;
  loadingMensaje: string = 'Cargando...';

  // Modal de video
  modalVideoAbierto: boolean = false;
  videoUrlActual: string | null = null;

  // Modal de GPS
  modalGPSAbierto: boolean = false;
  gpsPermisoDenegado: boolean = false;
  mensajeGPS: string = 'Por favor, para conocer todos los lugares del mundo es necesario que actives el GPS.';
  verificandoGPS: boolean = false;
  gpsValidado: boolean = false; // Flag para evitar validaciones repetidas

  // Sistema de notificaciones
  notificationsPanelVisible: boolean = false;
  unreadNotificationsCount: number = 0;
  // No necesitamos lastLocationNotification ya que no notificamos nuestra propia ubicación

  // Marcadores guardados
  private savedMarkers: L.Marker[] = [];
  private readonly categoryIcons: Record<string, L.DivIcon | L.Icon> = {};

  // Marcadores de usuarios en tiempo real
  private markers: { [userId: string]: L.Marker } = {};
  private iconPersona: L.Icon;
  private iconCarro: L.Icon;

  // Suscripciones de socket para tiempo real
  private socketSubscriptions: Subscription[] = [];
  private socketListenersInicializados: boolean = false;

  constructor(
    private geoService: GeoService,
    private apiService: ApiService,
    private socketService: SocketService,
    private notificationService: NotificationService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {
    // Crear icono premium para ubicación del usuario
    this.userLocationIcon = L.divIcon({
      className: 'user-location-marker',
      html: '<div class="user-location"></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    // Crear iconos personalizados para cada categoría usando DivIcon con colores
    this.categoryIcons = {
      'alerta': L.divIcon({
        className: 'custom-marker',
        html: '<div style="background-color: #fbbf24; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><div style="transform: rotate(45deg); color: white; font-size: 18px; text-align: center; line-height: 24px; font-weight: bold;">⚠</div></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
      }),
      'peligro': L.divIcon({
        className: 'custom-marker',
        html: '<div style="background-color: #ef4444; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><div style="transform: rotate(45deg); color: white; font-size: 18px; text-align: center; line-height: 24px; font-weight: bold;">🔥</div></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
      }),
      'informacion': L.divIcon({
        className: 'custom-marker',
        html: '<div style="background-color: #3b82f6; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><div style="transform: rotate(45deg); color: white; font-size: 18px; text-align: center; line-height: 24px; font-weight: bold;">ℹ</div></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
      }),
    };

    // Crear íconos para usuarios en tiempo real
    this.iconPersona = L.icon({
      iconUrl: 'assets/icons/person-static.svg',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });

    this.iconCarro = L.icon({
      iconUrl: 'assets/icons/car-moving.svg',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -19]
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
    // Validar GPS antes de inicializar geolocalización
    this.validarYActivarGPS().then(() => {
      if (this.gpsValidado) {
        this.initGeolocation();
      }
    }).catch(() => {
      // Si falla la validación, aún inicializar geolocalización para que funcione cuando se active
      this.initGeolocation();
    });
    this.initNotifications();
    this.initUbicacionesTiempoReal();
  }

  ngOnDestroy(): void {
    // Detener geolocalización
    this.geoService.stopTracking();
    if (this.geoSubscription) {
      this.geoSubscription.unsubscribe();
    }

    // Cancelar animación si está activa
    if (this.smoothMoveAnimation) {
      cancelAnimationFrame(this.smoothMoveAnimation);
    }

    // Limpiar mapa
    if (this.map) {
      this.map.remove();
    }

    // Limpiar suscripciones de socket
    this.socketSubscriptions.forEach(sub => sub.unsubscribe());
    this.socketSubscriptions = [];

    // Limpiar marcadores de usuarios
    Object.values(this.markers).forEach(marker => {
      if (this.map) {
        this.map.removeLayer(marker);
      }
    });
    this.markers = {};
  }

  private initMap(): void {
    // Coordenadas por defecto (se actualizarán con la ubicación real)
    const defaultCenter: L.LatLngExpression = [11.0049, -74.8060];

    this.map = L.map('map', {
      center: defaultCenter,
      zoom: 13
    });

    // Definir capas base (todas sin token, basadas en OpenStreetMap y Carto)
    this.baseLayers = {
      // 1) OpenStreetMap Standard
      osmStandard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }),
      // 2) OpenStreetMap Humanitarian (HOT)
      osmHot: L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors, Humanitarian OSM Team'
      }),
      // 4) OpenTopoMap
      osmTopo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Style: &copy; OpenTopoMap'
      }),
      // 5) CartoDB Positron (Light)
      cartoPositron: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors, &copy; CartoDB'
      }),
      // 6) CartoDB Dark Matter
      cartoDark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors, &copy; CartoDB'
      }),
    };

    // Agregar capa base inicial
    this.baseLayers[this.currentBaseKey].addTo(this.map);
  }

  cambiarCapa(baseKey: string): void {
    if (!this.map || !this.baseLayers[baseKey]) return;
    // Remover capa actual
    const actual = this.baseLayers[this.currentBaseKey];
    if (actual) {
      this.map.removeLayer(actual);
    }
    // Agregar nueva capa
    this.currentBaseKey = baseKey;
    this.baseLayers[this.currentBaseKey].addTo(this.map);
  }

  async buscarDireccion(): Promise<void> {
    if (!this.map || !this.searchQuery.trim()) {
      return;
    }
    this.searchInProgress = true;
    this.searchError = null;
    this.searchResultValid = null;
    this.searchResults = [];

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        this.searchQuery.trim()
      )}&limit=5`;

      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'es',
        },
      });

      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        this.searchResultValid = false;
        this.searchError = 'No se encontraron resultados para esa dirección.';
        return;
      }

      this.searchResults = data.map((item: any) => ({
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));

      // Marcar como "hay resultados" pero esperar a que el usuario seleccione uno
      this.searchResultValid = null;
    } catch (error) {
      console.error('Error al buscar dirección:', error);
      this.searchResultValid = false;
      this.searchError = 'Ocurrió un error al buscar la dirección.';
    } finally {
      this.searchInProgress = false;
    }
  }

  seleccionarResultado(result: { displayName: string; lat: number; lon: number }): void {
    if (!this.map) return;
    const coords: L.LatLngExpression = [result.lat, result.lon];
    this.map.setView(coords, 16);

    this.setupSearchMarker(coords);

    this.searchQuery = result.displayName;
    this.searchResults = [];
    this.searchResultValid = true;
    this.searchError = null;
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    // Cancelar búsqueda anterior programada
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Si el usuario borró el texto, limpiamos estado y no buscamos
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      this.searchError = null;
      this.searchResultValid = null;
      return;
    }

    // Debounce de 1 segundo antes de lanzar la búsqueda
    this.searchTimeout = setTimeout(() => {
      this.buscarDireccion();
    }, 1000);
  }

  limpiarBusqueda(): void {
    // Cancelar búsqueda programada si existe
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }

    // Limpiar todos los estados de búsqueda
    this.searchQuery = '';
    this.searchResults = [];
    this.searchError = null;
    this.searchResultValid = null;
    this.searchInProgress = false;

    // NO remover el marcador para que el usuario pueda seguir arrastrándolo
  }

  /**
   * Muestra u oculta la barra de búsqueda
   */
  toggleSearchBar(): void {
    this.searchBarVisible = !this.searchBarVisible;
    // Si se oculta, limpiar la búsqueda
    if (!this.searchBarVisible) {
      this.limpiarBusqueda();
    }
  }

  private setupSearchMarker(coords: L.LatLngExpression): void {
    if (!this.map) return;

    if (!this.searchMarker) {
      this.searchMarker = L.marker(coords, {
        icon: this.defaultIcon,
        draggable: true,
      });
      this.searchMarker.addTo(this.map);
      this.searchMarker.on('dragend', () => this.onMarkerDragEnd());
    } else {
      this.searchMarker.setLatLng(coords);
    }
  }

  private async onMarkerDragEnd(): Promise<void> {
    if (!this.map || !this.searchMarker) return;
    const { lat, lng } = this.searchMarker.getLatLng();

    this.searchInProgress = true;
    this.searchError = null;

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'es',
        },
      });
      const data = await res.json();

      if (!data) {
        // Si no hay datos, mostrar coordenadas
        this.searchQuery = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        this.searchResultValid = true;
        this.searchResults = [];
        return;
      }

      this.searchQuery = this.formatReverseAddress(data, lat, lng);
      this.searchResults = [];
      this.searchResultValid = true;
    } catch (error) {
      console.error('Error en reverse geocoding:', error);
      // En caso de error, mostrar coordenadas
      const { lat, lng } = this.searchMarker!.getLatLng();
      this.searchQuery = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      this.searchResultValid = true;
      this.searchError = null;
    } finally {
      this.searchInProgress = false;
    }
  }

  private formatReverseAddress(data: any, lat: number, lng: number): string {
    if (!data) {
      return `Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    
    const addr = data.address || {};
    const parts: string[] = [];

    // Número de casa/edificio
    if (addr.house_number) {
      parts.push(`#${addr.house_number}`);
    }

    // Calle/Vía principal
    if (addr.road) {
      parts.push(addr.road);
    } else if (addr.pedestrian) {
      parts.push(addr.pedestrian);
    } else if (addr.footway) {
      parts.push(addr.footway);
    } else if (addr.street) {
      parts.push(addr.street);
    } else if (addr.path) {
      parts.push(addr.path);
    }

    // Barrio/Localidad
    if (addr.neighbourhood) {
      parts.push(addr.neighbourhood);
    } else if (addr.suburb) {
      parts.push(addr.suburb);
    } else if (addr.quarter) {
      parts.push(addr.quarter);
    }

    // Municipio/Distrito
    if (addr.municipality) {
      parts.push(addr.municipality);
    } else if (addr.county) {
      parts.push(addr.county);
    } else if (addr.district) {
      parts.push(addr.district);
    }

    // Ciudad
    if (addr.city) {
      parts.push(addr.city);
    } else if (addr.town) {
      parts.push(addr.town);
    } else if (addr.village) {
      parts.push(addr.village);
    } else if (addr.hamlet) {
      parts.push(addr.hamlet);
    }

    // Estado/Provincia/Región
    if (addr.state) {
      parts.push(addr.state);
    } else if (addr.region) {
      parts.push(addr.region);
    } else if (addr.province) {
      parts.push(addr.province);
    }

    // Código postal
    if (addr.postcode) {
      parts.push(`C.P. ${addr.postcode}`);
    }

    // País
    if (addr.country) {
      parts.push(addr.country);
    }

    // Construir dirección completa
    let direccionCompleta = '';
    if (parts.length > 0) {
      direccionCompleta = parts.join(', ');
    } else if (data.display_name) {
      // Si no hay estructura pero hay display_name, usarlo
      direccionCompleta = data.display_name;
    }

    // Siempre agregar coordenadas al final
    const coordenadas = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    if (direccionCompleta) {
      return `${direccionCompleta} | Coordenadas: ${coordenadas}`;
    } else {
      return `Coordenadas: ${coordenadas}`;
    }
  }

  /**
   * Inicializa el seguimiento de geolocalización
   * El marcador de geolocalización es INDEPENDIENTE del marcador de búsqueda
   */
  private initGeolocation(): void {
    // Suscribirse a cambios de ubicación
    this.geoSubscription = this.geoService.currentPosition$.subscribe(
      (position: GeoPosition | null) => {
        if (position && this.map) {
          // Solo actualizar el marcador GPS, NO centrar el mapa ni actualizar la barra de búsqueda
          this.updateUserLocation(position);
        }
      }
    );

    // Intentar obtener ubicación actual primero
    this.geoService.getCurrentPosition()
      .then((position: GeoPosition) => {
        if (this.map) {
          // Centrar el mapa solo UNA VEZ al inicio en la ubicación real
          if (!this.mapCenteredOnce) {
            const initialCoords: L.LatLngExpression = [position.lat, position.lng];
            this.map.setView(initialCoords, 13);
            this.mapCenteredOnce = true;
          }
          // Inicializar marcadores
          this.updateUserLocation(position);
        }
        // Iniciar seguimiento continuo
        this.geoService.startTracking();
      })
      .catch((error) => {
        console.warn('No se pudo obtener la ubicación inicial:', error);
        // Iniciar seguimiento de todas formas (puede que el usuario permita después)
        this.geoService.startTracking();
      });
  }

  /**
   * Actualiza la posición del marcador de ubicación del usuario
   * Solo inicializa el marcador draggable UNA VEZ con la primera ubicación
   * Después solo actualiza el marcador real sin mover el mapa
   */
  private updateUserLocation(position: GeoPosition): void {
    if (!this.map) return;

    const newLatLng: L.LatLngExpression = [position.lat, position.lng];

    if (!this.userLocationMarker) {
      // Crear marcador GPS si no existe
      console.log('Creando marcador de ubicación GPS en:', newLatLng);
      this.userLocationMarker = L.marker(newLatLng, {
        icon: this.userLocationIcon,
        zIndexOffset: 1000,
        interactive: false, // No interactivo para evitar conflictos
      }).addTo(this.map);

      console.log('Marcador GPS creado:', this.userLocationMarker);

      // Inicializar el marcador draggable SOLO UNA VEZ con la posición inicial
      // IMPORTANTE: Solo inicializar si NO existe y NO se ha inicializado antes
      if (!this.hasInitializedDraggable && !this.searchMarker) {
        this.setupSearchMarker(newLatLng);
        // Actualizar la barra de búsqueda con la dirección de la ubicación GPS
        this.updateSearchQueryFromPosition(position);
        this.hasInitializedDraggable = true;
        console.log('Marcador draggable inicializado UNA VEZ en:', newLatLng);
      } else if (this.hasInitializedDraggable) {
        // Si ya se inicializó, NO hacer nada con el marcador draggable
        // NO moverlo, NO actualizarlo, NO cambiar sus coordenadas
      }
    } else {
      // Solo actualizar la posición del marcador real sin mover el mapa
      // Usar setLatLng directamente para actualización fluida
      this.userLocationMarker.setLatLng(newLatLng);
      
      // NO mostrar notificación de ubicación propia
      // Solo otros usuarios recibirán notificación cuando este usuario actualice su ubicación
      
      // GARANTIZAR que NO se actualice el marcador draggable
      // GARANTIZAR que NO se mueva la vista del mapa
      // GARANTIZAR que NO se aplique setView, flyTo, ni centrar automáticamente
      
      // Asegurar que hasInitializedDraggable esté en true para prevenir reinicialización
      if (!this.hasInitializedDraggable && this.searchMarker) {
        this.hasInitializedDraggable = true;
      }
    }
  }

  /**
   * Mueve un marcador suavemente entre dos posiciones
   */
  private smoothMoveMarker(marker: L.Marker, targetLatLng: L.LatLngExpression): void {
    if (!marker) return;

    const startLatLng = marker.getLatLng();
    const target = L.latLng(targetLatLng);
    const duration = 300; // ms
    const startTime = performance.now();

    // Cancelar animación anterior si existe
    if (this.smoothMoveAnimation) {
      cancelAnimationFrame(this.smoothMoveAnimation);
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Interpolación lineal (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      // Calcular posición intermedia
      const currentLat = startLatLng.lat + (target.lat - startLatLng.lat) * easeOut;
      const currentLng = startLatLng.lng + (target.lng - startLatLng.lng) * easeOut;

      marker.setLatLng([currentLat, currentLng]);

      if (progress < 1) {
        this.smoothMoveAnimation = requestAnimationFrame(animate);
      } else {
        // Animación completada
        marker.setLatLng(target);
        this.smoothMoveAnimation = undefined;
      }
    };

    this.smoothMoveAnimation = requestAnimationFrame(animate);
  }

  /**
   * Actualiza la barra de búsqueda con la dirección de la posición actual
   */
  private async updateSearchQueryFromPosition(position: GeoPosition): Promise<void> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.lat}&lon=${position.lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'es',
        },
      });
      const data = await res.json();

      if (data) {
        setTimeout(() => {
          this.searchQuery = this.formatReverseAddress(data, position.lat, position.lng);
          this.searchResultValid = true;
        }, 0);
      }
    } catch (error) {
      console.error('Error al obtener dirección de la ubicación:', error);
    }
  }

  /**
   * Abre el modal para agregar un marcador
   */
  abrirModalMarcador(): void {
    // Obtener coordenadas del marcador de búsqueda actual
    if (this.searchMarker) {
      const latLng = this.searchMarker.getLatLng();
      this.coordenadasMarcador = {
        lat: latLng.lat,
        lng: latLng.lng
      };
    } else {
      // Si no hay marcador de búsqueda, usar coordenadas por defecto
      this.coordenadasMarcador = {
        lat: 11.0049,
        lng: -74.8060
      };
    }

    // Resetear formulario
    this.selectedCategory = 'alerta';
    this.descripcionMarcador = '';
    this.archivoSeleccionado = undefined;

    // Abrir modal
    this.modalMarcadorAbierto = true;
  }

  /**
   * Cierra el modal de marcador
   */
  cerrarModalMarcador(): void {
    this.modalMarcadorAbierto = false;
    // Limpiar formulario
    this.selectedCategory = 'alerta';
    this.descripcionMarcador = '';
    this.archivoSeleccionado = undefined;
    // NO limpiar coordenadasMarcador para evitar que afecte el marcador draggable
    // NO mover el mapa
    // NO cambiar la posición del marcador draggable
  }

  /**
   * Obtiene el nombre de la categoría
   */
  getCategoryName(category: string): string {
    const names: Record<string, string> = {
      'alerta': 'Alerta',
      'peligro': 'Peligro',
      'informacion': 'Información'
    };
    return names[category] || category;
  }

  /**
   * Muestra una alerta usando DaisyUI
   */
  mostrarAlerta(mensaje: string, tipo: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    this.alertaMensaje = mensaje;
    this.alertaTipo = tipo;
    this.alertaVisible = true;
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      this.alertaVisible = false;
    }, 5000);
  }

  /**
   * Cierra la alerta manualmente
   */
  cerrarAlerta(): void {
    this.alertaVisible = false;
  }

  /**
   * Obtiene la URL completa del archivo
   */
  getFileUrl(archivo: string | null | undefined): string | null {
    if (!archivo) return null;
    // Si es una URL relativa del servidor, construir la URL completa
    if (archivo.startsWith('/api/files/')) {
      // Extraer el dominio base del socketUrl (sin /api)
      const baseUrl = environment.socketUrl;
      return `${baseUrl}${archivo}`;
    }
    // Si es Base64 (legacy), devolverlo tal cual
    if (archivo.startsWith('data:')) {
      return archivo;
    }
    return archivo;
  }

  /**
   * Verifica si el archivo es una imagen
   */
  isImage(archivo: string | null | undefined): boolean {
    if (!archivo) return false;
    return archivo.includes('/imagenes/') || archivo.startsWith('data:image/');
  }

  /**
   * Verifica si el archivo es un video
   */
  isVideo(archivo: string | null | undefined): boolean {
    if (!archivo) return false;
    // Verificar por ruta de videos en el servidor
    const esRutaVideo = archivo.includes('/videos/') || archivo.includes('/api/files/videos/');
    // Verificar por extensión de archivo (común en nombres de archivo)
    const extensionesVideo = /\.(mp4|webm|ogg|ogv|mov|avi|wmv|flv|mkv|3gp|m4v|mpg|mpeg)(\?|$)/i;
    const esExtensionVideo = extensionesVideo.test(archivo);
    // Verificar por tipo MIME (Base64 o data URLs)
    const esMimeVideo = archivo.startsWith('data:video/');
    return esRutaVideo || esExtensionVideo || esMimeVideo;
  }

  /**
   * Maneja la selección de archivo
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.archivoSeleccionado = input.files[0];
      // El archivo se enviará directamente como File, no se convierte a Base64
    }
  }


  /**
   * Guarda el marcador en el servidor
   */
  guardarMarcador(): void {
    if (!this.coordenadasMarcador || !this.selectedCategory || !this.descripcionMarcador.trim() || this.descripcionMarcador.trim().length < 10) {
      return;
    }

    const marcadorData = {
      lat: this.coordenadasMarcador.lat,
      lng: this.coordenadasMarcador.lng,
      categoria: this.selectedCategory,
      descripcion: this.descripcionMarcador.trim()
    };

    // Activar loading
    this.loadingVisible = true;
    this.loadingMensaje = 'Guardando marcador...';

    // Guardar en el servidor (enviar archivo como File, no Base64)
    this.apiService.createMarcador(marcadorData, this.archivoSeleccionado || undefined).subscribe({
      next: (response) => {
        this.loadingVisible = false;
        if (response.success && response.data) {
          console.log('Marcador guardado en servidor:', response.data);
          
          // IMPORTANTE: Guardar la posición actual del mapa y del marcador draggable
          // antes de cualquier operación para evitar que se muevan después de guardar
          const currentMapCenter = this.map?.getCenter();
          const currentMapZoom = this.map?.getZoom();
          const currentSearchMarkerPos = this.searchMarker?.getLatLng();
          
          // Cerrar modal y limpiar formulario
          this.cerrarModalMarcador();
          
          // Si hay marcadores cargados en el mapa, agregar el nuevo marcador en tiempo real
          if (this.savedMarkers.length > 0 && response.data) {
            this.agregarMarcadorAlMapa(response.data);
            
            // RESTAURAR la posición del mapa después de agregar el marcador (usar setTimeout para asegurar que se ejecute después)
            setTimeout(() => {
              if (this.map && currentMapCenter && currentMapZoom !== undefined) {
                const newCenter = this.map.getCenter();
                const distance = this.map.distance(currentMapCenter, newCenter);
                // Si el mapa se movió más de 1 metro, restaurar la posición original
                if (distance > 1) {
                  this.map.setView(currentMapCenter, currentMapZoom, { animate: false });
                  console.log('Mapa restaurado a posición original después de guardar marcador');
                }
              }
              
              // ASEGURAR que el marcador draggable no cambió de posición
              if (this.searchMarker && currentSearchMarkerPos) {
                const currentPos = this.searchMarker.getLatLng();
                const distance = this.map?.distance(currentSearchMarkerPos, currentPos) || 0;
                // Si el marcador se movió más de 1 metro, restaurar la posición original
                if (distance > 1) {
                  this.searchMarker.setLatLng(currentSearchMarkerPos);
                  console.log('Marcador draggable restaurado a posición original después de guardar');
                }
              }
            }, 100); // Pequeño delay para asegurar que cualquier operación asíncrona termine
            
            this.mostrarAlerta('Marcador guardado y agregado al mapa en tiempo real', 'success');
          } else {
            // Si no hay marcadores cargados, solo mostrar mensaje
            this.mostrarAlerta('Marcador guardado exitosamente en el servidor', 'success');
          }
        } else {
          this.mostrarAlerta('Error al guardar: ' + (response.error || 'Error desconocido'), 'error');
        }
      },
      error: (error) => {
        this.loadingVisible = false;
        console.error('Error al guardar en servidor:', error);
        this.mostrarAlerta('Error al guardar el marcador. Verifica la conexión al servidor.', 'error');
      }
    });
  }


  /**
   * Carga y muestra todos los marcadores guardados desde la API
   */
  cargarMarcadoresGuardados(): void {
    this.cargandoMarcadores = true;
    this.loadingVisible = true;
    this.loadingMensaje = 'Cargando marcadores...';
    this.modalGestionMarcadoresAbierto = true;

    this.apiService.getMarcadores().subscribe({
      next: (response) => {
        this.cargandoMarcadores = false;
        this.loadingVisible = false;
        if (response.success && response.data) {
          this.marcadoresGuardados = response.data;
          if (this.marcadoresGuardados.length === 0) {
            this.mostrarAlerta('No hay marcadores guardados en el servidor', 'info');
          }
        } else {
          this.mostrarAlerta('Error al cargar marcadores: ' + (response.error || 'Error desconocido'), 'error');
        }
      },
      error: (error) => {
        this.cargandoMarcadores = false;
        this.loadingVisible = false;
        console.error('Error al cargar marcadores:', error);
        this.mostrarAlerta('Error al conectar con el servidor. Verifica que el servidor esté ejecutándose.', 'error');
      }
    });
  }

  /**
   * Cierra el modal de gestión de marcadores
   */
  cerrarModalGestionMarcadores(): void {
    this.modalGestionMarcadoresAbierto = false;
    this.marcadoresGuardados = [];
  }

  /**
   * Carga los marcadores en el mapa
   */
  cargarMarcadoresEnMapa(): void {
    if (!this.map) return;

    // Limpiar marcadores anteriores (sin mostrar mensaje)
    this.limpiarMarcadoresGuardadosInterno();

    if (this.marcadoresGuardados.length === 0) {
      this.mostrarAlerta('No hay marcadores para cargar', 'warning');
      return;
    }

    // Activar loading
    this.loadingVisible = true;
    this.loadingMensaje = 'Cargando marcadores en el mapa...';

    // Crear y agregar marcadores al mapa
    this.marcadoresGuardados.forEach((marcadorData) => {
      const icono = this.categoryIcons[marcadorData.categoria] || this.defaultIcon;
      
      const marker = L.marker([marcadorData.lat, marcadorData.lng], {
        icon: icono,
      });

      // Crear contenido del popup
      const categoriaNombre = this.getCategoryName(marcadorData.categoria);
      const fecha = marcadorData.timestamp 
        ? new Date(marcadorData.timestamp).toLocaleString('es-ES')
        : 'Fecha no disponible';
      
      let popupContent = `
        <div class="popup-content" style="min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937;">
            ${categoriaNombre}
          </h3>
          <p style="margin: 0 0 8px 0; color: #4b5563;">${marcadorData.descripcion}</p>
          <div style="margin: 8px 0; padding: 8px; background: #f3f4f6; border-radius: 4px;">
            <p style="margin: 0; font-size: 11px; color: #6b7280;">
              <strong>Coordenadas:</strong><br>
              ${marcadorData.lat.toFixed(6)}, ${marcadorData.lng.toFixed(6)}
            </p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280;">
              <strong>Fecha:</strong> ${fecha}
            </p>
          </div>
      `;

      // Si hay archivo adjunto y es una imagen, mostrarla directamente
      if (marcadorData.archivo && this.isImage(marcadorData.archivo)) {
        const archivoUrl = this.getFileUrl(marcadorData.archivo);
        if (archivoUrl) {
          popupContent += `
            <div style="margin-top: 8px;">
              <img src="${archivoUrl}" 
                   alt="Imagen adjunta" 
                   style="max-width: 200px; max-height: 150px; border-radius: 4px; object-fit: cover; display: block;">
            </div>
          `;
        }
      }

      popupContent += `</div>`;

      marker.bindPopup(popupContent);
      if (this.map) {
        marker.addTo(this.map);
      }
      this.savedMarkers.push(marker);
    });

    // Ajustar vista del mapa para mostrar todos los marcadores
    if (this.savedMarkers.length > 0) {
      const group = new L.FeatureGroup(this.savedMarkers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }

    // Desactivar loading
    this.loadingVisible = false;
    this.cerrarModalGestionMarcadores();
    this.mostrarAlerta(`Se cargaron ${this.marcadoresGuardados.length} marcador(es) en el mapa`, 'success');

    // Inicializar listeners de socket para tiempo real (solo si hay marcadores cargados)
    this.initSocketListeners();
  }

  /**
   * Agrega un marcador individual al mapa (helper para tiempo real)
   */
  private agregarMarcadorAlMapa(marcadorData: Marcador): void {
    if (!this.map || !marcadorData.id) return;

    // Verificar si el marcador ya existe en el mapa
    const existeMarcador = this.savedMarkers.some((marker: any) => {
      const markerData = marker.options?.marcadorData;
      return markerData?.id === marcadorData.id;
    });

    if (existeMarcador) return;

    const icono = this.categoryIcons[marcadorData.categoria] || this.defaultIcon;
    
    const marker = L.marker([marcadorData.lat, marcadorData.lng], {
      icon: icono,
    });

    // Crear contenido del popup
    const categoriaNombre = this.getCategoryName(marcadorData.categoria);
    const fecha = marcadorData.timestamp 
      ? new Date(marcadorData.timestamp).toLocaleString('es-ES')
      : marcadorData.created_at
      ? new Date(marcadorData.created_at).toLocaleString('es-ES')
      : 'Fecha no disponible';
    
    let popupContent = `
      <div class="popup-content" style="min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937;">
          ${categoriaNombre}
        </h3>
        <p style="margin: 0 0 8px 0; color: #4b5563;">${marcadorData.descripcion}</p>
        <div style="margin: 8px 0; padding: 8px; background: #f3f4f6; border-radius: 4px;">
          <p style="margin: 0; font-size: 11px; color: #6b7280;">
            <strong>Coordenadas:</strong><br>
            ${marcadorData.lat.toFixed(6)}, ${marcadorData.lng.toFixed(6)}
          </p>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #6b7280;">
            <strong>Fecha:</strong> ${fecha}
          </p>
        </div>
    `;

    // Si hay archivo adjunto y es una imagen, mostrarla directamente
    if (marcadorData.archivo && this.isImage(marcadorData.archivo)) {
      const archivoUrl = this.getFileUrl(marcadorData.archivo);
      if (archivoUrl) {
        popupContent += `
          <div style="margin-top: 8px;">
            <img src="${archivoUrl}" 
                 alt="Imagen adjunta" 
                 style="max-width: 200px; max-height: 150px; border-radius: 4px; object-fit: cover; display: block;">
          </div>
        `;
      }
    }

    // Si hay archivo adjunto y es un video, mostrar indicador
    if (marcadorData.archivo && this.isVideo(marcadorData.archivo)) {
      popupContent += `
        <div style="margin-top: 8px; padding: 6px; background: #eff6ff; border-radius: 4px; font-size: 11px; color: #1e40af;">
          🎥 Video adjunto
        </div>
      `;
    }

    popupContent += `</div>`;

    marker.bindPopup(popupContent);
    
    // Guardar datos del marcador en el marker para referencia
    (marker as any).options.marcadorData = marcadorData;
    
    if (this.map) {
      marker.addTo(this.map);
    }
    this.savedMarkers.push(marker);

    // Actualizar lista de marcadores guardados si no existe
    const existeEnLista = this.marcadoresGuardados.some(m => m.id === marcadorData.id);
    if (!existeEnLista) {
      this.marcadoresGuardados.push(marcadorData);
    }
  }

  /**
   * Abre el modal para editar un marcador
   */
  abrirModalEditarMarcador(marcador: Marcador): void {
    this.marcadorEditando = { ...marcador };
    this.selectedCategory = marcador.categoria;
    this.descripcionMarcador = marcador.descripcion;
    this.coordenadasMarcador = { lat: marcador.lat, lng: marcador.lng };
    // El archivo existente se muestra desde la URL del servidor
    this.archivoSeleccionado = undefined;
    this.modalEditarMarcadorAbierto = true;
  }

  /**
   * Cierra el modal de edición
   */
  cerrarModalEditarMarcador(): void {
    this.modalEditarMarcadorAbierto = false;
    this.marcadorEditando = undefined;
    this.selectedCategory = 'alerta';
    this.descripcionMarcador = '';
    this.archivoSeleccionado = undefined;
  }

  /**
   * Guarda los cambios del marcador editado
   */
  guardarMarcadorEditado(): void {
    if (!this.marcadorEditando || !this.marcadorEditando.id) return;
    if (!this.descripcionMarcador.trim() || this.descripcionMarcador.trim().length < 10) {
      this.mostrarAlerta('La descripción debe tener al menos 10 caracteres', 'warning');
      return;
    }

    const marcadorActualizado = {
      lat: this.coordenadasMarcador?.lat || this.marcadorEditando.lat,
      lng: this.coordenadasMarcador?.lng || this.marcadorEditando.lng,
      categoria: this.selectedCategory,
      descripcion: this.descripcionMarcador.trim()
    };

    // Activar loading
    this.loadingVisible = true;
    this.loadingMensaje = 'Actualizando marcador...';

    // Enviar archivo como File si hay uno nuevo, no Base64
    this.apiService.updateMarcador(this.marcadorEditando.id, marcadorActualizado, this.archivoSeleccionado || undefined).subscribe({
      next: (response) => {
        this.loadingVisible = false;
        if (response.success && response.data) {
          // Actualizar en la lista local
          const index = this.marcadoresGuardados.findIndex(m => m.id === this.marcadorEditando?.id);
          if (index !== -1) {
            this.marcadoresGuardados[index] = response.data;
          }

          // Si hay marcadores cargados, actualizar el marcador en el mapa en tiempo real
          if (this.savedMarkers.length > 0 && response.data) {
            // Buscar y remover el marcador antiguo
            const markerIndex = this.savedMarkers.findIndex((marker: any) => {
              return marker.options?.marcadorData?.id === response.data?.id;
            });

            if (markerIndex !== -1) {
              const oldMarker = this.savedMarkers[markerIndex];
              if (this.map) {
                this.map.removeLayer(oldMarker);
              }
              this.savedMarkers.splice(markerIndex, 1);
            }

            // Agregar el marcador actualizado
            this.agregarMarcadorAlMapa(response.data);
          }

          this.cerrarModalEditarMarcador();
          this.mostrarAlerta('Marcador actualizado correctamente', 'success');
        } else {
          this.mostrarAlerta('Error al actualizar: ' + (response.error || 'Error desconocido'), 'error');
        }
      },
      error: (error) => {
        this.loadingVisible = false;
        console.error('Error al actualizar marcador:', error);
        this.mostrarAlerta('Error al actualizar el marcador', 'error');
      }
    });
  }

  /**
   * Elimina un marcador
   */
  eliminarMarcador(marcador: Marcador): void {
    if (!marcador.id) return;

    if (!confirm(`¿Estás seguro de eliminar el marcador "${marcador.descripcion.substring(0, 30)}..."?`)) {
      return;
    }

    // Activar loading
    this.loadingVisible = true;
    this.loadingMensaje = 'Eliminando marcador...';

    this.apiService.deleteMarcador(marcador.id).subscribe({
      next: (response) => {
        this.loadingVisible = false;
        if (response.success) {
          // Remover de la lista local
          this.marcadoresGuardados = this.marcadoresGuardados.filter(m => m.id !== marcador.id);
          this.mostrarAlerta('Marcador eliminado correctamente', 'success');
        } else {
          this.mostrarAlerta('Error al eliminar: ' + (response.error || 'Error desconocido'), 'error');
        }
      },
      error: (error) => {
        this.loadingVisible = false;
        console.error('Error al eliminar marcador:', error);
        this.mostrarAlerta('Error al eliminar el marcador', 'error');
      }
    });
  }

  /**
   * Limpia todos los marcadores guardados del mapa (versión privada sin feedback)
   */
  private limpiarMarcadoresGuardadosInterno(): void {
    this.savedMarkers.forEach(marker => {
      if (this.map) {
        this.map.removeLayer(marker);
      }
    });
    this.savedMarkers = [];
  }

  /**
   * Limpia todos los marcadores guardados del mapa (versión pública con feedback)
   */
  limpiarMarcadoresGuardados(): void {
    // Verificar si hay marcadores para limpiar
    if (this.savedMarkers.length === 0) {
      this.mostrarAlerta('No hay marcadores en el mapa para limpiar', 'info');
      return;
    }

    const cantidadEliminados = this.savedMarkers.length;
    
    // Limpiar todos los marcadores del mapa
    this.limpiarMarcadoresGuardadosInterno();

    // Desactivar listeners de socket ya que no hay marcadores cargados
    this.desactivarSocketListeners();

    // Mostrar feedback al usuario
    this.mostrarAlerta(`${cantidadEliminados} marcador${cantidadEliminados > 1 ? 'es' : ''} eliminado${cantidadEliminados > 1 ? 's' : ''} del mapa`, 'success');
  }

  /**
   * Abre la modal de reproducción de video
   */
  abrirModalVideo(archivo: string | null | undefined): void {
    if (!archivo) return;
    const videoUrl = this.getFileUrl(archivo);
    if (!videoUrl) return;
    this.videoUrlActual = videoUrl;
    this.modalVideoAbierto = true;
  }

  /**
   * Cierra la modal de video
   */
  cerrarModalVideo(): void {
    this.modalVideoAbierto = false;
    this.videoUrlActual = null;
  }

  /**
   * Inicializa los listeners de socket para recibir marcadores en tiempo real
   * Solo para actualización del mapa (las notificaciones se manejan en initNotifications)
   * NOTA: Este método ahora solo maneja otros eventos de socket relacionados con marcadores,
   * las notificaciones de marcadores creados se manejan en initNotifications para estar siempre activas
   */
  private initSocketListeners(): void {
    // Solo inicializar si hay marcadores cargados y no se han inicializado ya
    if (this.savedMarkers.length === 0 || this.socketListenersInicializados) {
      return;
    }

    this.socketListenersInicializados = true;

    // NOTA: El listener de marcador:creado está en initNotifications() para estar siempre activo

    // Escuchar marcadores actualizados por otros usuarios
    const subActualizado = this.socketService.onMarcadorActualizado().subscribe((marcador: Marcador) => {
      // Solo actualizar si hay marcadores cargados
      if (this.savedMarkers.length > 0 && marcador.id) {
        console.log('📝 Marcador actualizado en tiempo real:', marcador);
        
        // Buscar y remover el marcador antiguo
        const markerIndex = this.savedMarkers.findIndex((marker: any) => {
          return marker.options?.marcadorData?.id === marcador.id;
        });

        if (markerIndex !== -1) {
          const oldMarker = this.savedMarkers[markerIndex];
          if (this.map) {
            this.map.removeLayer(oldMarker);
          }
          this.savedMarkers.splice(markerIndex, 1);
        }

        // Agregar el marcador actualizado
        this.agregarMarcadorAlMapa(marcador);
        
        // Actualizar en la lista también
        const listaIndex = this.marcadoresGuardados.findIndex(m => m.id === marcador.id);
        if (listaIndex !== -1) {
          this.marcadoresGuardados[listaIndex] = marcador;
        }
      }
    });
    this.socketSubscriptions.push(subActualizado);

    // Escuchar marcadores eliminados por otros usuarios
    const subEliminado = this.socketService.onMarcadorEliminado().subscribe((data: { id: string }) => {
      // Solo eliminar si hay marcadores cargados
      if (this.savedMarkers.length > 0) {
        console.log('🗑️ Marcador eliminado en tiempo real:', data.id);
        
        // Buscar y remover el marcador
        const markerIndex = this.savedMarkers.findIndex((marker: any) => {
          return marker.options?.marcadorData?.id === data.id;
        });

        if (markerIndex !== -1) {
          const marker = this.savedMarkers[markerIndex];
          if (this.map) {
            this.map.removeLayer(marker);
          }
          this.savedMarkers.splice(markerIndex, 1);
        }

        // Remover de la lista también
        this.marcadoresGuardados = this.marcadoresGuardados.filter(m => m.id !== data.id);
        this.mostrarAlerta('Marcador eliminado en tiempo real', 'info');
      }
    });
    this.socketSubscriptions.push(subEliminado);
  }

  /**
   * Desactiva los listeners de socket cuando se limpian los marcadores
   */
  private desactivarSocketListeners(): void {
    if (!this.socketListenersInicializados) return;

    // Limpiar suscripciones
    this.socketSubscriptions.forEach(sub => sub.unsubscribe());
    this.socketSubscriptions = [];
    this.socketListenersInicializados = false;
  }

  /**
   * Inicializa el sistema de notificaciones
   */
  private initNotifications(): void {
    // Usar setTimeout para inicializar después del ciclo de detección actual
    // Esto evita ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      // Suscribirse a cambios en las notificaciones para actualizar el contador
      const subNotifications = this.notificationService.getNotifications().subscribe(
        notifications => {
          this.unreadNotificationsCount = notifications.filter(n => !n.read).length;
          this.cdr.markForCheck();
        }
      );
      this.socketSubscriptions.push(subNotifications);

      // Escuchar cuando un cliente se conecta (solo primera vez, no reconexiones)
      const subClienteConectado = this.socketService.onClienteConectado().subscribe((data: any) => {
        const myUserId = this.userService.getUserIdSync();
        const connectedUserId = data?.userId;
        
        // Solo mostrar notificación si NO es el usuario actual
        if (connectedUserId && connectedUserId !== myUserId) {
          const numUsuario = data?.numUsuario;
          const plataforma = data?.plataforma || 'web';
          const identificador = numUsuario ? `${numUsuario}-${plataforma}` : plataforma;
          this.notificationService.pushNotification(`Cliente conectado: ${identificador}`, 'info');
        }
      });
      this.socketSubscriptions.push(subClienteConectado);

      // Escuchar cuando un cliente se desconecta
      const subClienteDesconectado = this.socketService.onClienteDesconectado().subscribe((data: any) => {
        const myUserId = this.userService.getUserIdSync();
        const disconnectedUserId = data?.userId;
        
        // Solo mostrar notificación si NO es el usuario actual
        if (disconnectedUserId && disconnectedUserId !== myUserId) {
          const numUsuario = data?.numUsuario;
          const plataforma = data?.plataforma || 'web';
          const identificador = numUsuario ? `${numUsuario}-${plataforma}` : plataforma;
          this.notificationService.pushNotification(`Cliente desconectado: ${identificador}`, 'warning');
        }
      });
      this.socketSubscriptions.push(subClienteDesconectado);

      // Escuchar nuevos marcadores creados por otros usuarios
      // IMPORTANTE: Este listener SIEMPRE funciona para notificaciones
      const subMarcadorCreado = this.socketService.onMarcadorCreado().subscribe((marcador: Marcador) => {
        console.log('🔔 Evento marcador:creado recibido:', marcador);
        
        const myUserId = this.userService.getUserIdSync();
        const marcadorUserId = (marcador as any).user_id;
        
        console.log(`🔍 Verificando marcador - Mi userId: ${myUserId}, Marcador userId: ${marcadorUserId}`);
        
        // VERIFICACIÓN CRÍTICA: Si el marcador es del usuario actual, NO procesarlo
        if (marcadorUserId && marcadorUserId === myUserId) {
          console.log(`📝 Marcador creado por mí (${myUserId}), ignorando evento de socket para evitar notificación propia`);
          return; // Salir temprano - no procesar ni notificar
        }
        
        // El marcador es de otro usuario, procesarlo
        console.log('📥 Marcador nuevo recibido en tiempo real (de otro usuario):', marcador);
        
        // Solo agregar al mapa si hay marcadores cargados
        if (this.savedMarkers.length > 0) {
          this.agregarMarcadorAlMapa(marcador);
          this.mostrarAlerta('Nuevo marcador agregado en tiempo real', 'info');
        }
        
        // SIEMPRE mostrar notificación si es de otro usuario (independientemente de si hay marcadores cargados)
        if (marcadorUserId && marcadorUserId !== myUserId) {
          const numUsuario = (marcador as any).usuario_num;
          const plataforma = marcador.usuario_plataforma || 'web';
          const identificador = numUsuario ? `${numUsuario}-${plataforma}` : plataforma;
          console.log(`✅ Mostrando notificación para marcador de usuario: ${identificador}`);
          this.notificationService.pushNotification(`Nuevo marcador guardado por cliente: ${identificador}`, 'success');
        } else {
          console.log('⚠️  No se muestra notificación - marcador sin user_id o del mismo usuario');
        }
      });
      this.socketSubscriptions.push(subMarcadorCreado);
    }, 0);

    // La notificación de marcador guardado se maneja en initSocketListeners
    // para evitar duplicados y solo mostrar cuando es de otro cliente
  }

  /**
   * Muestra u oculta el panel de notificaciones
   */
  toggleNotifications(): void {
    this.notificationsPanelVisible = !this.notificationsPanelVisible;
  }

  /**
   * Inicializa el sistema de ubicaciones en tiempo real
   */
  private initUbicacionesTiempoReal(): void {
    const socket = this.socketService.getSocket();
    
    // Escuchar ubicaciones de otros usuarios
    socket.on('ubicacion-usuario', (data: { userId: string; lat: number; lng: number; speed: number; timestamp: number }) => {
      this.pintarOActualizarUbicacion(data);
    });
  }

  /**
   * Pinta o actualiza la ubicación de un usuario en el mapa
   */
  private pintarOActualizarUbicacion(data: { userId: string; lat: number; lng: number; speed: number; timestamp: number }): void {
    if (!this.map) return;

    const { userId, lat, lng, speed } = data;

    // Verificar que no sea el usuario actual (no debería pasar, pero por seguridad)
    const myUserId = this.userService.getUserIdSync();
    if (userId === myUserId) {
      return; // No mostrar nuestra propia ubicación como marcador adicional
    }

    // Regla de detección de movimiento: speed > 1 m/s
    const isMoving = speed && speed > 1;

    // Seleccionar ícono según el estado de movimiento
    const icon = isMoving ? this.iconCarro : this.iconPersona;

    // Si no existe el marcador, crearlo
    if (!this.markers[userId]) {
      this.markers[userId] = L.marker([lat, lng], { icon }).addTo(this.map);
      
      // Agregar popup con información del usuario
      const speedKmh = speed ? (speed * 3.6).toFixed(1) : '0.0';
      const estado = isMoving ? 'En movimiento' : 'Detenido';
      this.markers[userId].bindPopup(`
        <div style="min-width: 150px;">
          <strong>Usuario: ${userId.substring(0, 8)}...</strong><br>
          <small>Estado: ${estado}</small><br>
          <small>Velocidad: ${speedKmh} km/h</small>
        </div>
      `);
      
      console.log(`📍 Marcador creado para usuario ${userId} en [${lat}, ${lng}] - ${estado}`);
    } else {
      // Solo actualizar ubicación e ícono
      this.markers[userId]
        .setLatLng([lat, lng])
        .setIcon(icon);
      
      // Actualizar popup con nueva información
      const speedKmh = speed ? (speed * 3.6).toFixed(1) : '0.0';
      const estado = isMoving ? 'En movimiento' : 'Detenido';
      this.markers[userId].setPopupContent(`
        <div style="min-width: 150px;">
          <strong>Usuario: ${userId.substring(0, 8)}...</strong><br>
          <small>Estado: ${estado}</small><br>
          <small>Velocidad: ${speedKmh} km/h</small>
        </div>
      `);
    }
  }

  /**
   * Verifica el estado de los permisos de geolocalización
   */
  private async verificarPermisosGPS(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
    // Intentar usar la API de Permissions si está disponible
    if ('permissions' in navigator) {
      try {
        const result = await (navigator as any).permissions.query({ name: 'geolocation' });
        return result.state;
      } catch (error) {
        console.warn('No se pudo verificar permisos con Permissions API:', error);
        return 'unknown';
      }
    }
    return 'unknown';
  }

  /**
   * Valida y activa el GPS al iniciar la aplicación
   */
  private async validarYActivarGPS(): Promise<void> {
    // Verificar si el navegador soporta geolocalización
    if (!navigator.geolocation) {
      this.mostrarModalGPS('Geolocalización no está soportada en este navegador');
      return;
    }

    // Verificar estado de permisos primero
    const estadoPermisos = await this.verificarPermisosGPS();
    
    // Si los permisos están denegados, mostrar mensaje específico
    if (estadoPermisos === 'denied') {
      this.mostrarModalGPS('Por favor, para conocer todos los lugares del mundo es necesario que actives el GPS. Por favor, permite el acceso a la ubicación en la configuración de tu navegador.');
      this.gpsPermisoDenegado = true;
      return;
    }

    this.verificandoGPS = true;

    try {
      // Intentar obtener la posición actual (esto solicita permisos automáticamente si es necesario)
      const position = await this.geoService.getCurrentPosition();
      
      let me=this;
      //si LOS MARACDORES INICIALES  EL DRAGGABLE Y EL MARCADOR  REALTIME  ESTAN TAN NULOS O VACIOS  llmaar sus funciones para actualizarlos
      if(this.searchMarker==null || this.userLocationMarker==null){
        me.updateUserLocation(position);
        me.setupSearchMarker([position.lat, position.lng]);
        me.updateSearchQueryFromPosition(position);
      }
      // Si se obtuvo la posición, el GPS está activado
      console.log('✅ GPS 1'+JSON.stringify(navigator.geolocation));
      console.log('✅ GPS 2'+JSON.stringify(estadoPermisos));
      console.log('✅ GPS 3'+JSON.stringify(this.verificandoGPS));

      this.gpsPermisoDenegado = false;
      this.modalGPSAbierto = false;
      this.verificandoGPS = false;
      this.gpsValidado = true;
      return; // Salir exitosamente
    } catch (error: any) {
      this.verificandoGPS = false;
      
      // Manejar diferentes tipos de errores
      let mensaje = 'Por favor, para conocer todos los lugares del mundo es necesario que actives el GPS';
      
      // Códigos de error de geolocalización:
      // 1 = PERMISSION_DENIED
      // 2 = POSITION_UNAVAILABLE
      // 3 = TIMEOUT
      if (error.code === 1 || error.message?.includes('permission') || error.message?.includes('denied')) {
        mensaje = 'Por favor, para conocer todos los lugares del mundo es necesario que actives el GPS. Por favor, permite el acceso a la ubicación en la configuración de tu navegador.';
        this.gpsPermisoDenegado = true;
      } else if (error.code === 2) {
        mensaje = 'No se pudo obtener tu ubicación. Por favor, verifica que el GPS esté activado en tu dispositivo.';
        this.gpsPermisoDenegado = false;
      } else if (error.code === 3) {
        mensaje = 'Tiempo de espera agotado. Por favor, verifica que el GPS esté activado y vuelve a intentar.';
        this.gpsPermisoDenegado = false;
      }
      
      console.warn('⚠️ Error al obtener ubicación:', error);
      this.mostrarModalGPS(mensaje);
    }
  }

  /**
   * Muestra el modal de alerta de GPS
   */
  private mostrarModalGPS(mensaje: string): void {
    this.mensajeGPS = mensaje;
    this.modalGPSAbierto = true;
  }

  /**
   * Cierra el modal de GPS
   */
  cerrarModalGPS(): void {
    this.modalGPSAbierto = false;
    // Si el usuario cierra el modal sin dar permisos, marcar como validado para no mostrar de nuevo
    // (el usuario puede usar "Intentar de nuevo" si cambia de opinión)
    if (!this.gpsValidado && !this.verificandoGPS) {
      this.gpsValidado = true;
    }
  }

  /**
   * Intenta activar el GPS nuevamente
   */
  async intentarActivarGPS(): Promise<void> {
    if (this.verificandoGPS) {
      return; // Evitar múltiples intentos simultáneos
    }

    this.modalGPSAbierto = false;
    // Esperar un momento para que el modal se cierre visualmente
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Intentar validar nuevamente
    await this.validarYActivarGPS();
  }
}
