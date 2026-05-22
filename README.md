# ServiCall – Pizzería Roberto

PWA de llamada de clientes para restaurantes de autoservicio.  
Dos vistas: **`/cliente`** (el cliente espera su pedido) y **`/negocio`** (el personal marca pedidos listos).

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Estilos | Tailwind CSS |
| Backend / DB | Supabase (Postgres + Realtime + Auth) |
| Notificaciones | Web Push API con VAPID + polling fallback |
| Vibración | Vibration API nativa |
| Edge Functions | Supabase Edge Functions (Deno) |
| Hosting | Vercel |
| PWA | vite-plugin-pwa + Workbox |

---

## Setup paso a paso

### 1. Clonar e instalar

```bash
git clone <repo>
cd servi-call
npm install
```

### 2. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo.
2. En **SQL Editor** ejecuta el contenido completo de `supabase/schema.sql`.
3. En **Project Settings → API** copia:
   - `URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`

### 3. Crear el usuario de negocio

En **Authentication → Users → Add user**:
- Email: `roberto@pizzeria.com`
- Password: la contraseña que quieras (guárdala en `VITE_BUSINESS_PASSWORD`)
- Marca **"Auto Confirm User"**

O vía curl (reemplaza los valores):
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/auth/v1/admin/users \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"roberto@pizzeria.com","password":"TU_CLAVE","email_confirm":true}'
```

### 4. Generar VAPID keys

```bash
npx web-push generate-vapid-keys
```

Guarda la salida:
```
Public Key: Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Private Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 5. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y completa todos los valores.

### 6. Generar iconos PNG

1. Abre `scripts/create-icons.html` en Chrome.
2. Haz clic en **"Descargar iconos"**.
3. Mueve los archivos descargados a `public/icons/`.

### 7. Ejecutar en desarrollo

```bash
npm run dev
```

Visita:
- **`http://localhost:5173/cliente`** – Vista del cliente
- **`http://localhost:5173/negocio`** – Panel de negocio

---

## Deploy en Vercel

### Frontend

```bash
# Instala Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Agrega las variables de entorno en Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_VAPID_PUBLIC_KEY`
- `VITE_BUSINESS_EMAIL`
- `VITE_BUSINESS_PASSWORD`

### Edge Function (envío de push notifications)

```bash
# Instala Supabase CLI
npm install -g supabase

# Login y link
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Configurar secrets de la función
supabase secrets set VAPID_PUBLIC_KEY="tu-public-key"
supabase secrets set VAPID_PRIVATE_KEY="tu-private-key"
supabase secrets set VAPID_EMAIL="admin@pizzeriaroberto.com"

# Deploy
supabase functions deploy send-notification
```

---

## Flujo de uso

```
Cliente llega → recibe ticket físico (ej. "A23")
     ↓
Abre ServiCall en su móvil → /cliente
     ↓
Escribe "A23" → acepta notificaciones push
     ↓
Pantalla de espera /cliente/espera/A23
     ↓
Personal en cocina → /negocio → inicia sesión
     ↓
Ve ticket "A23" en el panel
     ↓
Toca "🍕 Pedido Listo"
     ↓
Edge Function: actualiza status → envía Web Push
     ↓
Cliente recibe notificación + vibración + sonido
     ↓
Cliente toca "✅ Ya lo recogí" → ticket se cierra
```

---

## Estructura del proyecto

```
servi-call/
├── src/
│   ├── views/
│   │   ├── ClientView.tsx       # Input del código de ticket
│   │   ├── WaitingView.tsx      # Pantalla de espera del cliente
│   │   └── BusinessView.tsx     # Panel de cocina (login + tickets)
│   ├── hooks/
│   │   ├── usePushNotifications.ts
│   │   └── useTicketPolling.ts  # Fallback polling cada 4s
│   ├── lib/
│   │   └── supabase.ts
│   ├── sw.ts                    # Service Worker (precache + push)
│   └── App.tsx
├── supabase/
│   ├── schema.sql               # Ejecutar en Supabase SQL Editor
│   └── functions/
│       └── send-notification/
│           └── index.ts         # Edge Function (Deno)
├── public/
│   └── icons/                   # icon.svg + icon-192.png + icon-512.png
├── scripts/
│   └── create-icons.html        # Generador de iconos PNG
├── .env.example
├── vercel.json
└── README.md
```

---

## Notas técnicas

- **Notificaciones**: Web Push con VAPID. Si el cliente deniega el permiso o el navegador no soporta push, la app hace polling a Supabase cada 4 segundos automáticamente.
- **Realtime**: Supabase Realtime actualiza la lista de tickets del panel de cocina al instante sin recargar.
- **Sin registro de clientes**: Los clientes no necesitan cuenta. El ticket es la única identificación.
- **Un solo negocio**: MVP hardcodeado para Pizzería Roberto. Para multi-tenant se necesitaría añadir una tabla `businesses` y columna `business_id` en `tickets`.
- **Limpieza automática**: Los tickets con status `collected` se pueden limpiar periódicamente con una función programada de Supabase.
