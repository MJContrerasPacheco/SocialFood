# SocialFood

SocialFood es una plataforma digital que conecta comercios con excedentes alimentarios con ONG, voluntarios y entidades sociales. Facilita la redistribucion eficiente de alimentos y reduce el desperdicio alimentario.

El sistema actua como intermediario digital y ofrece:

- Coordinacion en tiempo real
- Trazabilidad de donaciones
- Metricas de impacto social

## 1. Vision del proyecto

Reducir el desperdicio alimentario y mejorar el acceso a alimentos a traves de una red digital segura entre comercios y ONG.

## 2. Propuesta de valor

### Comercios

- Cumplimiento normativo
- Reduccion del desperdicio
- Informes legales automaticos
- Mejora reputacional (ESG)

### ONG

- Acceso a comida en tiempo real
- Mejora logistica
- Optimizacion de recursos

### Administraciones

- Impacto social medible
- Digitalizacion de procesos
- Datos auditables

## 3. Modelo de negocio

### SaaS (principal)

- 10-25 EUR/mes por comercio

### B2G (ayuntamientos)

- Licencias institucionales

### Subvenciones

- ENISA
- CDTI
- Next Generation EU

### Premium

- Informes avanzados
- Certificados ESG

## 4. Marco legal

Cumplimiento de:

- Ley de desperdicio alimentario (Espana)
- GDPR
- Normativa europea

### Responsabilidad

- Comercio -> calidad del alimento
- ONG -> transporte
- Plataforma -> intermediacion

### Medidas

- Registro de operaciones
- Confirmacion digital
- Terminos legales claros

## 5. Arquitectura tecnica

### Stack

- Frontend: Next.js (App Router, PWA)
- Backend: Server Actions en Next.js
- Base de datos: PostgreSQL (Supabase)
- Auth: Supabase Auth (email y OAuth)
- Hosting: Vercel + Supabase

## 6. Diagrama de arquitectura

Usuario (web/app)

-> Next.js (Frontend + API)

-> Supabase (Auth + DB)

-> PostgreSQL

## 7. Modelo de base de datos

### Tabla users

- id
- role (comercio / ong / admin)
- name
- email

### Tabla donations

- id
- user_id (comercio)
- title
- description
- kg
- status (available / pending / collected)

### Tabla organizations

- user_id
- role
- name
- contact_email
- telefono
- whatsapp
- address
- city
- region
- postal_code
- lat
- lng

### Tabla organizations_public

- user_id
- role
- name
- city
- region
- lat
- lng

### Tabla donation_requests

- id
- donation_id
- ong_user_id
- status
- created_at

## 8. Funcionalidades

### Comercios

- Publicar excedentes
- Ver historial
- Marcar recogidas
- Descargar informes (fase posterior)

### ONG

- Ver mapa y distancia
- Filtrar y solicitar donaciones
- Ver contacto tras solicitud

### Admin y sistema

- Gestion de usuarios y roles
- RLS para proteger datos
- Registro de actividad

## 9. Mapa

- OpenStreetMap + Leaflet
- Distancia automatica (Haversine)
- Geocoding con Nominatim

## 10. Notificaciones

- Email (SMTP)
- Push (fase futura)
- WhatsApp (fase futura)

## 11. Flujo principal

1. Comercio publica excedente
2. ONG ve disponible y solicita
3. Estado pasa a Pendiente
4. Comercio marca Recogida
5. Sistema registra la operacion

## 12. Sistema de impacto

### Metricas

- Kg de comida salvada
- Numero de recogidas
- Beneficiarios estimados

### Rankings

- Comercios mas activos
- ONG mas activas

## 13. Informes

- Generacion mensual automatica
- Kg donados
- Numero de recogidas
- Fechas y tipologia

Formato: PDF descargable (fase posterior)

## 14. Roadmap

### Fase 1 (0-3 meses)

- MVP funcional

### Fase 2 (3-6 meses)

- Subvenciones
- Mejoras UX

### Fase 3 (6-12 meses)

- Escalado nacional
- Expansion europea

## 15. Puesta en marcha

### Requisitos

- Node.js 18+
- Cuenta en Supabase

### Variables de entorno

Crea un archivo `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # opcional, solo para panel admin
```

### Base de datos

Ejecuta en el SQL Editor de Supabase:

1. `supabase/schema.sql`
2. `supabase/rls.sql`

### Desarrollo local

```
npm install
npm run dev
```

La app corre en `http://localhost:3000`.

## 16. Notas de geolocalizacion

Para que el mapa muestre ubicaciones exactas, usa "Buscar por direccion" y selecciona una sugerencia o "Usar mi ubicacion". La direccion sola puede producir resultados aproximados si es ambigua.

## 17. Contribucion

- Issues y PRs son bienvenidos.
- Mantener las politicas RLS al cambiar tablas.
