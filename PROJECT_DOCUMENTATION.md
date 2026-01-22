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
8. [Sistema de Rescate de Ventas](#8-sistema-de-rescate-de-ventas)

---

## 1. Visión General del Proyecto

El sistema es una aplicación web diseñada para gestionar reservas de turnos en un lavadero de autos. Su objetivo principal es simplificar la captación de reservas mediante una interfaz mobile-first para clientes y proporcionar un panel de administración robusto para el negocio.

### Características Clave
*   **Para Clientes:**
    *   Interfaz simple tipo "Wizard" (paso a paso).
    *   Selección visual de servicios, fechas y horarios.
    *   Validación de disponibilidad en tiempo real.
    *   Generación automática de ticket y pantalla de "Éxito" antes de redirigir a WhatsApp.
*   **Para Administradores:**
    *   Dashboard con KPIs (Ingresos, Reservas, Cancelaciones).
    *   Calendario de ocupación.
    *   Gestión CRUD de Servicios y Clientes (CRM).
    *   Configuración parametrizable (Horarios, Capacidad).

---

## 2. Arquitectura Técnica

El proyecto utiliza una arquitectura moderna basada en **Islands Architecture** (Arquitectura de Islas) proporcionada por Astro, permitiendo interactividad selectiva con React.

### Stack Tecnológico
*   **Frontend Framework:** [Astro v5](https://astro.build/)
    *   Estrategia de renderizado: **SSR (Server-Side Rendering)** con adaptador Node.js.
    *   Componentes Interactivos: **React v19**.
    *   Estilos: **Tailwind CSS v3** (Tema oscuro "Luxury").
    > [!WARNING]
    > **Nota de Versiones**: El proyecto utiliza **Astro v5** y **React v19**. Si se presentan incompatibilidades con librerías de terceros, se recomienda utilizar las versiones LTS (Astro v4.15+ y React v18.3).
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

#### 0. User (Admin)
Usuarios con acceso al panel de administración.
*   **id**: Identificador único (CUID).
*   **email**: Correo electrónico (Único).
*   **password**: Hash de bcrypt.
*   **role**: `ADMIN` por defecto.
*   **createdAt**: Fecha de creación.

#### 1. Booking (Reserva)
Es la entidad central del sistema.
*   **id**: Identificador único (CUID).
*   **referenceCode**: Código legible para el usuario (ej. `LAV-XYZ-1234`).
*   **status**: `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
*   **Relaciones**: Pertenece a un `Customer` y a un `Vehicle`.
*   **Restricciones**: Combinación única de fecha/hora validada por lógica de negocio.

#### 2. Customer (Cliente)
Identifica a los clientes recurrentes.
*   **phone** (Único): El teléfono celular es el identificador principal.
*   **name**: Nombre del cliente.
*   **vehicles**: Relación 1-N con `Vehicle`.

#### 3. Vehicle (Vehículo)
Permite que un cliente tenga múltiples vehículos.
*   **plate** (Único): La patente/placa.
*   **model**: Modelo opcional (ej. "Toyota Corolla").
*   **customer**: Relación N-1 con `Customer`.

#### 4. Service (Servicio)
Catálogo de servicios ofrecidos.
*   **duration**: Duración estimada en minutos.
*   **price**: Precio base.
*   **active**: Soft-delete para ocultar servicios sin borrarlos.

#### 5. Settings (Configuración)
Singleton (registro único `id="main"`) que controla las reglas de negocio globales.
*   `openTime`/`closeTime`: Rango operativo del negocio.
*   `maxSlotsPerTime`: Capacidad de atención simultánea (concurrencia).
*   `slotDuration`: Duración base de cada turno (15-60 min).
*   `workingDays`: Días habilitados (0=Dom, 1=Lun, ..., 6=Sab).
*   **bookingBufferMinutes**: Tiempo de corte antes del inicio de un turno (ej. 10 min) para no permitir reservas de último momento.
*   **timezone**: Zona horaria del negocio (ej. `America/Asuncion`). Crucial para sincronizar "Hoy" entre el cliente y el servidor.

#### 6. PaymentMethod (Método de Pago)
Catálogo dinámico de formas de pago aceptadas.
*   **name**: Etiqueta (ej. "Efectivo", "QR").
*   **active**: Determina si se muestra en el widget de cliente.

---

## 4. Lógica de Negocio

### Gestión de Tiempos y Zonas Horarias
El sistema está diseñado para ser **Timezone-Aware**. 
*   **Normalización**: El Administrador define la zona horaria del negocio. Todas los cálculos de "ahora" (para determinar si un slot ya pasó o está por cerrar) se realizan relativos a esta zona horaria, utilizando `Intl.DateTimeFormat` con el parámetro `timeZone`.
*   **Sincronización de Calendario**: La generación de los 14 días disponibles comienza desde el "Hoy" calculado en la zona horaria del negocio, evitando saltos de fecha causados por la diferencia horaria entre el servidor (UTC) y el cliente local.

### Flujo de Reserva (Booking Flow)
1.  **Selección de Servicio**: El usuario elige un servicio activo.
2.  **Selección de Fecha**:
    *   Se generan los próximos 14 días.
    *   Se filtran días no laborales según `Settings.workingDays`.
    *   Las fechas se manejan en hora local visualmente y formato `YYYY-MM-DD` en API.
3.  **Selección de Hora**:
    *   Se consultan los slots generados entre `openTime` y `closeTime`.
    *   **Validación de Disponibilidad**: Se consulta la API `/api/availability`.
4.  **Datos del Cliente y Vehículo**:
    *   Se solicita Nombre, Teléfono y Placa.
    *   **Lógica Atómica**:
        *   Se busca/crea el Cliente por teléfono.
        *   Se busca/crea el Vehículo por placa y se asocia al cliente.
        *   Se crea la Reserva.
    *   **Transacciones**: Todo este proceso ocurre dentro de una `prisma.$transaction` para evitar condiciones de carrera (Race Conditions) y sobreventa de slots.
5.  **Confirmación y WhatsApp (Nivel 1)**:
    *   Se muestra una pantalla de "Éxito" con el código de reserva.
    *   Botón para abrir WhatsApp con un mensaje pre-formateado.
    *   **Rescue Level 2**: Botón "Copiar Ticket" en caso de que la redirección falle.

### Proceso de Rescate de Ventas (Triple Nivel)
El sistema implementa una estrategia proactiva para minimizar la pérdida de ventas por fallas técnicas o distracciones del cliente:

1.  **Nivel 1 (Automático)**: Redirección asistida tras completar el formulario.
2.  **Nivel 2 (Manual Cliente)**: Si el cliente no es redirigido, dispone de un botón para copiar el ticket al portapapeles y pegarlo manualmente.
3.  **Nivel 3 (Administrativo)**: Si la reserva queda en estado `PENDING` (sin confirmación manual del admin), el administrador dispone de un botón de **Rescate** en su panel que genera un mensaje proactivo de WhatsApp orientado a cerrar la venta.

### Lógica de Disponibilidad (Scarcity UX)
La disponibilidad se gestiona mediante estados explícitos para fomentar la conversión ("Efecto Museo"):

*   **AVAILABLE**: Slot listo para reservar.
*   **PAST**: El horario ya transcurrió.
*   **EXPIRED (CERRADO)**: El slot está dentro del `bookingBufferMinutes` (ej: faltan 10 min para el inicio) y ya no acepta reservas.
*   **FULL (COMPLETO)**: Se alcanzó el cupo máximo definido en `maxSlotsPerTime`.

Visualmente, los estados `PAST`, `EXPIRED` y `FULL` se unifican bajo un diseño de "inactividad" (grisáceo y tachado) para transmitir escasez.

---

## 5. API y Endpoints

El backend expone una API RESTful consumida por el frontend (React).

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| **GET** | `/api/availability` | Retorna slots no disponibles para una fecha específica. |
| **GET** | `/api/services` | Lista todos los servicios activos. |
| **POST** | `/api/bookings` | Crea una nueva reserva (Transaccional). upsert Cliente/Vehículo. |

| **PATCH** | `/api/bookings/:id` | Actualiza una reserva existente (Ej: Cambiar estado, agregar notas). |
| **DELETE** | `/api/bookings/:id` | Elimina una reserva. |
| **GET** | `/api/bookings` | (Admin) Lista reservas con filtros. |
| **GET** | `/api/customers` | (Admin) Búsqueda de clientes por nombre, teléfono o placa (vía relación). |
| **GET** | `/api/admin/payment-methods` | (Admin) Lista todos los métodos de pago (incl. inactivos). |
| **POST** | `/api/admin/payment-methods` | (Admin) Crea un nuevo método de pago. |
| **PUT** | `/api/admin/payment-methods/:id` | (Admin) Actualiza un método de pago. |
| **DELETE** | `/api/admin/payment-methods/:id` | (Admin) Elimina un método de pago. |

---

## 6. Seguridad y Autenticación

### Panel de Administración
*   **Mecanismo**: Autenticación basada en **JWT (JSON Web Tokens)**.
*   **Session Token**: Token firmado con expiración de 8 horas. No se almacena estado en servidor (Stateless).
*   **Cookies**: Se utilizan cookies seguras con flags `HttpOnly`, `SameSite=Strict`, `Secure`.
*   **Middleware**: Astro Middleware protege las rutas bajo `/admin/*` verificando la firma del token.

### Hashing
*   Las contraseñas de los usuarios administradores (tabla `User`) se almacenan hasheadas utilizando **bcryptjs**.

---

## 7. Configuración y Despliegue

### Variables de Entorno (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/lavadero"
JWT_SECRET="tu_secreto_super_seguro"
TZ="America/Asuncion" # O tu zona horaria local. Importante para que las fechas se guarden correctamente.
```

> [!IMPORTANT]
> **Zonas Horarias**: Asegúrese de configurar la variable `TZ` correcta en el servidor o contenedor Docker. Idealmente, la base de datos debe almacenar fechas en UTC, pero para este sistema simplificado, garantizar que el runtime de Node.js tenga la zona horaria correcta es crucial para las validaciones de fecha/hora.

### Scripts Principales (package.json)
*   `npm run dev`: Inicia servidor de desarrollo (Astro).
*   `npm run build`: Compila la aplicación para producción.
*   `npm run db:push`: Sincroniza el esquema de Prisma con la BD.
*   `npm run db:generate`: Regenera el cliente de Prisma (necesario tras cambios de esquema).

### Despliegue con Docker
El archivo `docker-compose.yml` orquesta la base de datos PostgreSQL. Para producción, se recomienda ejecutar `npm run build` y servir con `node ./dist/server/entry.mjs`.
