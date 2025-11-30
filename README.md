# Fleet Tracking - Aplicación de Rastreo y Navegación

## 📋 Descripción General

**Fleet Tracking** es una aplicación web moderna desarrollada con Angular 20 que proporciona funcionalidades avanzadas de geolocalización, búsqueda de direcciones, visualización de mapas interactivos y gestión de marcadores personalizados. La aplicación utiliza Leaflet para la visualización de mapas, geolib para cálculos GPS, y Tailwind CSS + DaisyUI para una interfaz de usuario moderna y responsiva.

---

## 🚀 Características Principales

### 1. **Geolocalización en Tiempo Real**
- Seguimiento continuo de la ubicación del usuario usando la API nativa del navegador
- Marcador premium con animación pulse que muestra la ubicación GPS en tiempo real
- Actualización suave del marcador sin saltos bruscos
- Alta precisión con `enableHighAccuracy: true`
- Actualización automática cada 500ms

### 2. **Búsqueda de Direcciones**
- Barra de búsqueda con autocompletado inteligente
- Búsqueda automática después de 1 segundo de inactividad (debounce)
- Múltiples resultados de búsqueda con selector desplegable
- Integración con Nominatim (OpenStreetMap) para geocodificación
- Búsqueda inversa (reverse geocoding) al arrastrar marcadores
- Sin borde negro en el focus para mejor experiencia visual

### 3. **Marcadores Interactivos**

#### Marcador de Ubicación GPS (Azul)
- Marcador premium con efecto glow y animación pulse
- Muestra la ubicación real del usuario en tiempo real
- Se mueve suavemente cuando cambia la ubicación
- Independiente del marcador de búsqueda
- No interfiere con otras funcionalidades

#### Marcador de Búsqueda (Rojo - Arrastrable)
- Marcador arrastrable para seleccionar ubicaciones manualmente
- Se inicializa automáticamente con las coordenadas GPS al cargar
- Actualiza la barra de búsqueda con la dirección completa al arrastrarlo
- Muestra información detallada: calle, número, barrio, ciudad, estado, código postal, país y coordenadas

#### Marcadores Guardados Personalizados
- **Sistema de marcadores personalizados** con categorías:
  - ⚠️ **Alerta** (Amarillo): Para alertas y advertencias
  - 🔥 **Peligro** (Rojo): Para situaciones de peligro
  - ℹ️ **Información** (Azul): Para información general
- Iconos personalizados con colores distintivos según categoría
- Almacenamiento persistente en `localStorage`
- Popups informativos con descripción, coordenadas, fecha y archivos adjuntos
- Carga masiva de marcadores guardados desde el menú radial

### 4. **Modal de Agregar Marcador**
- Diseño moderno con componentes DaisyUI
- Selección de categoría con cards interactivas
- Formulario completo con:
  - Descripción (mínimo 10 caracteres, con contador en tiempo real)
  - Adjuntar archivos (imágenes o PDF)
  - Visualización de coordenadas actuales
- Validación en tiempo real
- Preview de archivos adjuntos
- Guardado automático en localStorage

### 5. **Selector de Capas de Mapa**
- 5 capas de mapa diferentes sin necesidad de tokens:
  - **OpenStreetMap Standard**: Capa estándar de OSM
  - **OpenStreetMap Humanitarian (HOT)**: Estilo solidario para mapas urbanos
  - **OpenTopoMap**: Ideal para zonas montañosas
  - **CartoDB Positron (Light)**: Estilo limpio profesional para dashboards
  - **CartoDB Dark Matter**: Estilo oscuro moderno para tracking nocturno
- Cambio rápido entre capas desde el menú radial

### 6. **Menú Radial (Speed Dial)**
- Menú flotante premium con 7 botones de acción:
  - **📍 Mi ubicación** (90° arriba): Centra el mapa en la ubicación GPS actual
  - **⚙️ Abrir filtros** (45° arriba-derecha): Abre panel de filtros (preparado para futuras funcionalidades)
  - **🎨 Cambiar estilo** (0° derecha): Cambia entre las diferentes capas de mapa
  - **🎯 Centrar mapa** (135° arriba-izquierda): Centra el mapa en la ubicación actual
  - **🚚 Lista de vehículos** (180° izquierda): Muestra lista de vehículos (preparado para futuras funcionalidades)
  - **📌 Agregar marcador** (225° abajo-izquierda): Abre modal para agregar marcador personalizado
  - **🗺️ Cargar marcadores** (270° abajo): Carga todos los marcadores guardados en el mapa
- Animaciones suaves de entrada/salida
- Diseño premium con gradientes y sombras profundas
- Totalmente responsivo para móvil y escritorio
- Posición ajustable (bottom: 70px, right: 45px)

### 7. **Barra de Búsqueda Avanzada**
- Diseño moderno con bordes redondeados
- Sin borde negro en el focus para mejor UX
- Indicadores visuales:
  - 🔍 Icono de búsqueda
  - ⏳ Spinner de carga durante la búsqueda
  - ✔️ Indicador verde cuando la dirección es válida
  - ❗ Indicador rojo cuando no se encuentra la dirección
- Botón "X" para limpiar la búsqueda (aparece cuando hay texto)
- Ancho responsivo que se adapta al tamaño de pantalla

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- **Angular 20.3.0**: Framework principal con componentes standalone
- **TypeScript 5.8.0**: Lenguaje de programación
- **Tailwind CSS 3.4.17**: Framework de utilidades CSS
- **DaisyUI 5.0.0**: Componentes UI basados en Tailwind

### Mapas y Geolocalización
- **Leaflet 1.9.4**: Biblioteca de mapas interactivos
- **geolib 3.3.4**: Librería para cálculos matemáticos GPS
- **Nominatim API**: Servicio de geocodificación de OpenStreetMap

### Utilidades
- **uuid 13.0.0**: Generación de IDs únicos para marcadores
- **PostCSS 8.5.6**: Procesador de CSS
- **Autoprefixer 10.4.22**: Prefijos CSS automáticos

### APIs y Servicios
- **OpenStreetMap**: Mapas y geocodificación
- **Nominatim**: Búsqueda y geocodificación inversa
- **Geolocation API**: API nativa del navegador para ubicación
- **localStorage**: Almacenamiento local de marcadores

---

## 📁 Estructura del Proyecto

```
fleet-tracking/
├── src/
│   ├── app/
│   │   ├── services/
│   │   │   └── geo.service.ts          # Servicio de geolocalización
│   │   ├── map-view/
│   │   │   ├── map-view.component.ts   # Componente principal del mapa
│   │   │   ├── map-view.component.html # Template del mapa y modal
│   │   │   └── map-view.component.css  # Estilos del mapa y marcadores
│   │   ├── speed-dial/
│   │   │   ├── speed-dial.component.ts # Componente del menú radial
│   │   │   ├── speed-dial.component.html
│   │   │   └── speed-dial.component.css
│   │   └── app.component.ts            # Componente raíz
│   ├── styles.css                       # Estilos globales Tailwind
│   └── index.html
├── angular.json
├── tailwind.config.js                   # Configuración Tailwind + DaisyUI
├── postcss.config.js                    # Configuración PostCSS
└── package.json
```

---

## 🎯 Funcionalidades Detalladas

### Geolocalización

#### Servicio de Geolocalización (`geo.service.ts`)
- **BehaviorSubject** para emitir ubicación en tiempo real
- **watchPosition** con configuración optimizada:
  - `enableHighAccuracy: true`
  - `maximumAge: 500ms`
  - `timeout: 10000ms`
- Funciones de cálculo GPS usando geolib:
  - `calcularDistancia()`: Calcula distancia entre dos puntos en metros
  - `calcularRumbo()`: Calcula bearing entre dos puntos en grados
  - `obtenerDireccionCompass()`: Obtiene dirección de brújula (N, NE, E, etc.)
  - `validarCoordenada()`: Valida coordenadas geográficas

#### Marcador de Ubicación GPS
- **Tamaño**: 32x32 píxeles
- **Estilo**: Círculo azul con gradiente radial
- **Efectos**: 
  - Glow effect con múltiples sombras
  - Animación pulse continua (1.8s)
  - Punto blanco central brillante
  - Borde blanco de 3px
- **Comportamiento**:
  - Se crea automáticamente al obtener ubicación
  - Se mueve suavemente con animación de 300ms
  - Interpolación ease-out para movimiento fluido

### Búsqueda de Direcciones

#### Barra de Búsqueda
- **Debounce**: 1 segundo de espera antes de buscar
- **Resultados**: Hasta 5 resultados mostrados en lista desplegable
- **Formato de dirección**: Información completa incluyendo:
  - Número de casa/edificio
  - Calle/Vía
  - Barrio/Localidad
  - Municipio/Distrito
  - Ciudad
  - Estado/Provincia
  - Código postal
  - País
  - Coordenadas (lat, lng)
- **Sin borde en focus**: Mejor experiencia visual sin bordes negros

#### Marcador de Búsqueda
- **Inicialización**: Se crea automáticamente con coordenadas GPS al cargar
- **Arrastrable**: El usuario puede arrastrarlo para seleccionar ubicaciones
- **Actualización automática**: Al arrastrarlo, actualiza la barra con la dirección completa
- **Reverse geocoding**: Obtiene la dirección completa de las coordenadas

### Sistema de Marcadores Personalizados

#### Agregar Marcador
1. Hacer clic en el botón **📌 Agregar marcador** del menú radial
2. Seleccionar una categoría (Alerta, Peligro, Información)
3. Completar la descripción (mínimo 10 caracteres)
4. Opcionalmente adjuntar un archivo (imagen o PDF)
5. Las coordenadas se toman automáticamente del marcador de búsqueda actual
6. Guardar el marcador

#### Cargar Marcadores Guardados
1. Hacer clic en el botón **🗺️ Cargar marcadores** del menú radial
2. Se cargan todos los marcadores guardados en `localStorage`
3. Cada marcador se muestra con su icono según la categoría:
   - ⚠️ Amarillo para Alertas
   - 🔥 Rojo para Peligros
   - ℹ️ Azul para Información
4. El mapa se ajusta automáticamente para mostrar todos los marcadores
5. Hacer clic en cualquier marcador para ver su información completa

#### Almacenamiento
- Los marcadores se guardan en `localStorage` con la clave `'fleet-tracking-marcadores'`
- Cada marcador incluye:
  - ID único (UUID)
  - Coordenadas (lat, lng)
  - Categoría
  - Descripción
  - Archivo adjunto (Base64)
  - Timestamp de creación

### Selector de Capas

El menú radial permite cambiar entre 5 capas de mapa:

1. **OpenStreetMap Standard**
   - URL: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
   - Estilo estándar, más común

2. **OpenStreetMap Humanitarian (HOT)**
   - URL: `https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png`
   - Estilo solidario, perfecto para mapas urbanos

3. **OpenTopoMap**
   - URL: `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png`
   - Ideal para zonas montañosas, totalmente libre

4. **CartoDB Positron (Light)**
   - URL: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`
   - Estilo limpio profesional, ideal para dashboards

5. **CartoDB Dark Matter**
   - URL: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`
   - Estilo oscuro moderno, perfecto para tracking nocturno

---

## 🎨 Diseño y UI

### Estilos Premium
- **Gradientes modernos**: Violeta-azul para FAB principal, colores diferenciados para cada botón
- **Sombras profundas**: `shadow-2xl` con efectos glow sutiles
- **Animaciones suaves**: Transiciones de 200-300ms con ease-in-out
- **Bordes elegantes**: Bordes circulares (`rounded-full`) con transparencia
- **Efectos hover**: Escalado y sombras mejoradas al pasar el mouse

### Componentes DaisyUI
- **Modal**: Diseño moderno con cards, dividers y badges
- **Cards**: Para selección de categorías con efectos hover
- **Form Controls**: Inputs, textareas y file inputs estilizados
- **Alerts**: Feedback visual para archivos seleccionados
- **Badges**: Indicadores de estado y validación
- **Avatars**: Iconos circulares para mejor presentación

### Responsividad
- Diseño mobile-first
- Adaptación automática a diferentes tamaños de pantalla
- Menú radial optimizado para touch en dispositivos móviles
- Modal responsive con ancho máximo adaptativo

---

## 📱 Uso de la Aplicación

### Inicio
1. Al cargar la aplicación, se solicita permiso de geolocalización
2. Si se permite, se obtiene la ubicación GPS actual
3. El mapa se centra en la ubicación (opcional, configurable)
4. Aparecen dos marcadores:
   - **Azul**: Ubicación GPS en tiempo real
   - **Rojo**: Marcador de búsqueda arrastrable

### Búsqueda de Direcciones
1. Escribe una dirección o nombre de lugar en la barra de búsqueda
2. Espera 1 segundo (búsqueda automática)
3. Selecciona un resultado de la lista desplegable
4. El mapa se centra en la ubicación seleccionada
5. El marcador rojo se mueve a la nueva ubicación

### Arrastrar Marcador
1. Haz clic y arrastra el marcador rojo en el mapa
2. Al soltarlo, se obtiene automáticamente la dirección completa
3. La barra de búsqueda se actualiza con la información completa

### Agregar Marcador Personalizado
1. Posiciona el marcador de búsqueda en la ubicación deseada
2. Haz clic en el botón **📌 Agregar marcador** del menú radial
3. Selecciona una categoría (Alerta, Peligro, Información)
4. Completa la descripción (mínimo 10 caracteres)
5. Opcionalmente adjunta un archivo (imagen o PDF)
6. Haz clic en "Guardar Marcador"
7. El marcador se guarda en localStorage

### Cargar Marcadores Guardados
1. Haz clic en el botón **🗺️ Cargar marcadores** del menú radial
2. Se cargan todos los marcadores guardados
3. Cada marcador aparece con su color según la categoría
4. Haz clic en cualquier marcador para ver su información
5. El mapa se ajusta automáticamente para mostrar todos

### Cambiar Capa de Mapa
1. Haz clic en el botón FAB (esquina inferior derecha)
2. Selecciona el botón 🎨 "Cambiar estilo"
3. El mapa cambia a la siguiente capa disponible
4. Se rota entre las 5 capas disponibles

### Limpiar Búsqueda
1. Haz clic en el botón "X" en la barra de búsqueda
2. Se limpia el texto y los resultados
3. El marcador de búsqueda permanece en su posición

---

## 🔧 Configuración Técnica

### Versiones Configuradas

#### Angular
- **Angular Core**: ^20.3.0
- **Angular CLI**: ^20.3.3
- **Angular Build**: ^20.3.3
- **TypeScript**: ~5.8.0
- **Zone.js**: ~0.15.0

#### Tailwind CSS
- **Tailwind CSS**: ^3.4.17
- **DaisyUI**: 5.0.0
- **PostCSS**: ^8.5.6
- **Autoprefixer**: ^10.4.22

### Dependencias Principales

```json
{
  "dependencies": {
    "@angular/core": "^20.3.0",
    "leaflet": "^1.9.4",
    "@types/leaflet": "^1.9.21",
    "geolib": "^3.3.4",
    "uuid": "^13.0.0",
    "zone.js": "~0.15.0"
  },
  "devDependencies": {
    "@angular/cli": "^20.3.3",
    "@angular-devkit/build-angular": "^20.3.3",
    "tailwindcss": "^3.4.17",
    "daisyui": "5.0.0",
    "postcss": "^8.5.6",
    "autoprefixer": "^10.4.22",
    "typescript": "~5.8.0"
  }
}
```

### Configuración de Leaflet

- Iconos personalizados para evitar errores 404
- Uso de CDN para imágenes de marcadores
- Configuración de capas base múltiples
- Manejo de eventos de arrastre
- Iconos DivIcon personalizados para marcadores guardados

### Configuración de Tailwind + DaisyUI

- DaisyUI integrado con temas "light" y "dark"
- Contenido escaneado: `./src/**/*.{html,ts}`
- Utilidades personalizadas para animaciones
- Configuración optimizada para DaisyUI 5.0.0

---

## 🚦 Permisos Requeridos

### Geolocalización
- La aplicación requiere permiso de geolocalización del navegador
- Se solicita automáticamente al cargar
- Si se deniega, el mapa usa coordenadas por defecto
- El seguimiento continuo solo funciona con permiso concedido

### Almacenamiento Local
- La aplicación usa `localStorage` para guardar marcadores
- No requiere permisos especiales
- Los datos persisten entre sesiones
- Límite aproximado: 5-10MB según el navegador

---

## 🐛 Solución de Problemas

### El marcador GPS no aparece
- Verifica que hayas concedido permiso de geolocalización
- Revisa la consola del navegador para errores
- Asegúrate de estar en un contexto seguro (HTTPS o localhost)

### La búsqueda no funciona
- Verifica la conexión a internet
- Revisa que Nominatim esté disponible
- Comprueba que no haya errores en la consola

### Los marcadores se superponen
- Los marcadores tienen z-index diferentes
- El marcador GPS tiene z-index 1000
- El marcador de búsqueda tiene z-index estándar
- Los marcadores guardados tienen z-index estándar

### Los marcadores guardados no se cargan
- Verifica que haya marcadores guardados en localStorage
- Abre las herramientas de desarrollador y revisa `localStorage`
- Verifica que la clave sea `'fleet-tracking-marcadores'`
- Comprueba que el formato JSON sea válido

### El modal no se muestra correctamente
- Verifica que DaisyUI esté correctamente instalado
- Revisa que los estilos de Tailwind se estén compilando
- Asegúrate de que el tema esté configurado en `index.html`

---

## 🔮 Funcionalidades Futuras

### Preparadas para Implementar
- **Filtros avanzados**: Panel de filtros desde el botón ⚙️
- **Lista de vehículos**: Gestión de flota desde el botón 🚚
- **Rutas y navegación**: Cálculo de rutas entre puntos
- **Historial de ubicaciones**: Guardar ubicaciones visitadas
- **Compartir ubicación**: Enviar coordenadas a otros usuarios
- **Modo offline**: Funcionalidad básica sin conexión
- **Exportar marcadores**: Descargar marcadores como JSON/CSV
- **Importar marcadores**: Cargar marcadores desde archivo
- **Editar marcadores**: Modificar marcadores guardados
- **Eliminar marcadores**: Borrar marcadores individuales o masivos
- **Grupos de marcadores**: Organizar marcadores en grupos/categorías
- **Búsqueda de marcadores**: Buscar entre marcadores guardados

---

## 📝 Notas de Desarrollo

### Arquitectura
- Componentes standalone de Angular 20
- Servicios inyectables con `providedIn: 'root'`
- Observables RxJS para comunicación reactiva
- TypeScript estricto para type safety
- EventEmitters para comunicación entre componentes

### Optimizaciones
- Debounce en búsquedas para reducir llamadas API
- Animaciones con `requestAnimationFrame` para suavidad
- Lazy loading de componentes cuando sea necesario
- Almacenamiento local para persistencia
- Limpieza de marcadores antes de cargar nuevos

### Mejores Prácticas
- Separación de responsabilidades
- Código limpio y documentado
- Manejo de errores robusto
- Accesibilidad (aria-labels, títulos)
- Validación de formularios en tiempo real
- Feedback visual para todas las acciones

### Estructura de Datos

#### Marcador Guardado
```typescript
{
  id: string;              // UUID único
  lat: number;             // Latitud
  lng: number;             // Longitud
  categoria: string;        // 'alerta' | 'peligro' | 'informacion'
  descripcion: string;     // Descripción del marcador
  archivo: string | null;  // Base64 del archivo adjunto
  timestamp: string;       // ISO string de fecha/hora
}
```

---

## 🚀 Instalación y Desarrollo

### Requisitos Previos
- Node.js 18+ y npm
- Angular CLI 20.3.3+

### Instalación
```bash
# Clonar el repositorio
git clone <repository-url>
cd fleet-tracking

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start

# La aplicación estará disponible en http://localhost:4200
```

### Build de Producción
```bash
npm run build
```

### Testing
```bash
npm test
```

---

## 👨‍💻 Autor

Desarrollado con Angular 20, Leaflet, Tailwind CSS y DaisyUI

---

## 📄 Licencia

Este proyecto es de uso libre para desarrollo y aprendizaje.

---

## 🎯 Versión Actual

**v2.0.0** - Versión con sistema de marcadores personalizados y modal mejorado

### Changelog

#### v2.0.0 (2024)
- ✅ Sistema de marcadores personalizados con categorías
- ✅ Modal rediseñado con DaisyUI
- ✅ Almacenamiento persistente en localStorage
- ✅ Carga masiva de marcadores guardados
- ✅ Iconos personalizados por categoría
- ✅ Validación de formularios mejorada
- ✅ Actualización a Angular 20.3.0
- ✅ Actualización a DaisyUI 5.0.0
- ✅ Mejoras en UX de la barra de búsqueda

#### v1.0.0 (2024)
- ✅ Versión inicial con geolocalización
- ✅ Búsqueda de direcciones
- ✅ Selector de capas de mapa
- ✅ Menú radial básico

---

## 📞 Soporte

Para problemas o sugerencias, revisa la consola del navegador para mensajes de debug y errores.

---

**Última actualización**: Noviembre 2024
#   m a p 1  
 