# 🚗 Sistema de Reservas para Lavadero de Autos

Sistema completo de reservas con Astro SSR, PostgreSQL, Prisma ORM, y Tailwind CSS.

## ✨ Características

- **Landing Page** - Diseño moderno mobile-first con calendario interactivo
- **Reservas con WhatsApp** - Tickets automáticos via `wa.me/` URL scheme
- **Dashboard Admin** - KPIs, gráficos, y gestión de reservas
- **CRM de Clientes** - Historial y clientes frecuentes
- **Scarcity UX (Efecto Museo)** - Visualización de slots ocupados/expirados para fomentar reserva
- **Configuración Avanzada** - Zona horaria, buffer de corte, y métodos de pago dinámicos

## 🚀 Inicio Rápido

### 1. Requisitos
- Node.js 18+
- Docker (para PostgreSQL)

### 2. Instalar dependencias
```bash
npm install
```

### 3. Levantar PostgreSQL
```bash
docker-compose up -d
```

### 4. Configurar base de datos
```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migración inicial
npx prisma db push

# Cargar datos de ejemplo
npm run db:seed
```

### 5. Ejecutar en desarrollo
```bash
npm run dev
```

Abrir en navegador:
- **Cliente**: http://localhost:4321
- **Admin**: http://localhost:4321/admin/login

### 6. Credenciales de Admin
```
Email: admin@lavadero.com
Password: admin123
```

## 📁 Estructura del Proyecto

```
├── prisma/
│   ├── schema.prisma      # Esquema de base de datos
│   └── seed.ts            # Datos iniciales
├── src/
│   ├── components/        # React components (Islands)
│   ├── layouts/           # Astro layouts
│   ├── lib/               # Utilities (prisma, auth, whatsapp)
│   ├── pages/
│   │   ├── admin/         # Dashboard pages
│   │   ├── api/           # API endpoints
│   │   └── index.astro    # Landing page
│   └── styles/            # CSS global
├── docker-compose.yml     # PostgreSQL config
└── package.json
```

## ⚙️ Configuración

Toda la configuración del negocio se gestiona desde **Admin → Configuración**:

- Número de WhatsApp
- Horario de apertura/cierre
- Duración de turnos (15, 30, 45, 60 min)
- Días de trabajo
- **Zona Horaria** (Sincronización de calendario y slots)
- **Buffer de Corte** (Cierre automático de slots próximos)
- Nombre y dirección del negocio

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build producción
npm run build

# Prisma Studio (GUI de BD)
npm run db:studio

# Reset y re-seed
npx prisma db push --force-reset && npm run db:seed
```

## 📱 Flujo de Reserva

1. Cliente selecciona **servicio** → **fecha/hora** → **datos personales**
2. Sistema crea reserva con estado `PENDIENTE`
3. Redirección automática a WhatsApp con ticket formateado
4. Admin confirma y actualiza estado manualmente

## 🎨 Stack Tecnológico

- **Frontend**: Astro + React Islands
- **Estilos**: Tailwind CSS
- **Backend**: Astro SSR + API Routes
- **Base de Datos**: PostgreSQL + Prisma ORM
- **Gráficos**: Chart.js
- **Deploy**: Docker Compose

---

Desarrollado con ❤️ para lavaderos de autos modernos.
