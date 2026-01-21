# 📘 Documentación Técnica y de Negocio - Sistema de Reservas para Lavadero

Este documento detalla el funcionamiento integral del sistema "Lavadero Reservas", cubriendo aspectos de negocio, arquitectura técnica, y guías de implementación.

---

## 📑 Índice
1. [Visión General del Proyecto](#visión-general-del-proyecto)
2. [Arquitectura Técnica](#arquitectura-técnica)
3. [Modelo de Datos](#modelo-de-datos)
4. [Lógica de Negocio](#lógica-de-negocio)
5. [API y Endpoints](#api-y-endpoints)
6. [Seguridad y Autenticación](#seguridad-y-autenticación)
7. [Configuración y Despliegue](#configuración-y-despliegue)

---

## 1. Visión General del Proyecto

El sistema es una aplicación web diseñada para gestionar reservas de turnos en un lavadero de autos. Su objetivo principal es simplificar la captación de reservas mediante una interfaz mobile-first para clientes y proporcionar un panel de administración robusto para el negocio.

### Características Clave
*   **Para Clientes:**
    *   Interfaz simple tipo "Wizard" (paso a paso).
    *   Selección visual de servicios, fechas y horarios.
    *   Validación de disponibilidad en tiempo real.
    *   Generación automática de ticket y redirección a WhatsApp.
*   **Para Administradores:**
    *   Dashboard con KPIs (Ingresos, Reservas, Cancelaciones).
    *   Calendario de ocupación.
    *   Gestión CRUD de Servicios y Clientes.
    *   Configuración parametrizable (Horarios, Capacidad).

---

## 2. Arquitectura Técnica

El proyecto utiliza una arquitectura moderna basada en **Islands Architecture** (Arquitectura de Islas) proporcionada por Astro, permitiendo interactividad selectiva con React.

### Stack Tecnológico
*   **Frontend Framework:** [Astro v5](https://astro.build/)
    *   Estrategia de renderizado: **SSR (Server-Side Rendering)** con adaptador Node.js.
    *   Componentes Interactivos: **React v19**.
    *   Estilos: **Tailwind CSS v3**.
*   **Backend:**
    *   API Routes: Endpoints nativos de Astro (`src/pages/api/`).
    *   ORM: **Prisma v6**.
    *   Base de Datos: **PostgreSQL**.
*   **Infraestructura:**
    *   Containerización: **Docker Compose** (para PostgreSQL).
    *   Runtime: Node.js 18+.

### Estructura de Directorios
*   `src/components/`: Componentes de React (BookingWidget, Gráficos).
*   `src/pages/api/`: Controladores del Backend (Endpoints REST).
*   `src/lib/`: Utilidades compartidas (Cliente Prisma, Auth, Helpers).
*   `src/layers/`: Plantillas base de Astro.
*   `prisma/`: Definición de esquema de base de datos y seeds.

---

## 3. Modelo de Datos

El modelo de datos está definido en `prisma/schema.prisma` y consta de las siguientes entidades principales:

### Entidades Principales

#### 1. Booking (Reserva)
Es la entidad central del sistema.
*   **id**: Identificador único (CUID).
*   **referenceCode**: Código legible para el usuario (ej. `LAV-XYZ-1234`).
*   **status**: `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
*   **Relaciones**: Pertenece a un `Customer` y a un `Service`.
*   **Restricciones**: Combinación única de fecha/hora validada por lógica de negocio.

#### 2. Customer (Cliente)
Identifica a los clientes recurrentes.
*   **plate** (Único): La patente/placa del vehículo funge como identificador principal.
*   **phone**: Teléfono de contacto.
*   **bookings**: Historial de reservas asociadas.

#### 3. Service (Servicio)
Catálogo de servicios ofrecidos.
*   **duration**: Duración estimada en minutos (usada para calcular slots, aunque el sistema actual usa slots fijos).
*   **price**: Precio base.
*   **active**: Soft-delete para ocultar servicios sin borrarlos.

#### 4. Settings (Configuración)
Singleton (registro único `id="main"`) que controla las reglas de negocio globales.
*   `openTime`/`closeTime`: Rango operativo.
*   `slotDuration`: Comúnmente 30 o 60 min.
*   `maxSlotsPerTime`: Capacidad de atención simultánea (concurrencia).
*   `workingDays`: Días habilitados (e.g., "1,2,3,4,5,6" para Lun-Sab).

---

## 4. Lógica de Negocio

### Flujo de Reserva (Booking Flow)
1.  **Selección de Servicio**: El usuario elige un servicio activo.
2.  **Selección de Fecha**:
    *   Se generan los próximos 14 días.
    *   Se filtran días no laborales según `Settings.workingDays`.
3.  **Selección de Hora**:
    *   Se consultan los slots generados entre `openTime` y `closeTime`.
    *   **Validación de Disponibilidad**: Se consulta la API `/api/availability`. Un slot se marca como *no disponible* si `conteo_reservas >= maxSlotsPerTime`.
4.  **Datos del Cliente**:
    *   Se solicita Nombre, Teléfono y Placa.
    *   Si la placa ya existe en BD, se actualizan los datos del cliente; si no, se crea uno nuevo (Upsert logic).
5.  **Confirmación y WhatsApp**:
    *   Se crea la reserva en estado `PENDIENTE`.
    *   Se genera una URL de WhatsApp (`wa.me`) con un mensaje pre-formateado que incluye los detalles de la reserva.

### Lógica de Disponibilidad
La disponibilidad no es binaria (libre/ocupado), sino basada en **capacidad**.
*   **Fórmula**: `Disponible = (ReservasActivasEnSlot < MaxSlotsPerTime)`
*   Las reservas con estado `CANCELLED` no ocupan lugar.

---

## 5. API y Endpoints

El backend expone una API RESTful consumida por el frontend (React).

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| **GET** | `/api/availability` | Retorna slots no disponibles para una fecha específica. |
| **GET** | `/api/services` | Lista todos los servicios activos. |
| **POST** | `/api/bookings` | Crea una nueva reserva. Realiza "upsert" de cliente y valida cupo. |
| **GET** | `/api/bookings` | (Admin) Lista reservas con filtros (fecha, estado, paginación). |
| **GET** | `/api/stats` | Retorna métricas para el dashboard (Ingresos, Top Clientes). |

---

## 6. Seguridad y Autenticación

### Panel de Administración
*   **Mecanismo**: Autenticación basada en Cookies.
*   **Session Token**: Un JSON codificado en Base64 (Implementación simple en `src/lib/auth.ts`). **Nota:** En un entorno de producción de alta seguridad, esto debería reemplazarse por JWT firmados o sesiones de base de datos.
*   **Middleware**: Astro Middleware protege las rutas bajo `/admin/*` verificando la presencia y validez de la cookie `admin_session`.

### Hashing
*   Las contraseñas de los usuarios administradores (tabla `User`) se almacenan hasheadas utilizando **bcryptjs**.

---

## 7. Configuración y Despliegue

### Variables de Entorno (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/lavadero"
```

### Scripts Principales (package.json)
*   `npm run dev`: Inicia servidor de desarrollo (Astro).
*   `npm run build`: Compila la aplicación para producción (genera carpeta `dist/`).
*   `npm run db:push`: Sincroniza el esquema de Prisma con la BD (útil para prototipado rápido).
*   `npm run db:seed`: Puebla la base de datos con datos iniciales (Admin por defecto, servicios de prueba).

### Despliegue con Docker
El archivo `docker-compose.yml` orquesta la base de datos PostgreSQL. Para producción, se recomienda contenerizar también la aplicación Astro.
