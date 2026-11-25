# Mercado Origen

Marketplace 100% del Huila: café, cacao, miel, artesanías y todo lo que producen los
embajadores de los 37 municipios. Un carrito, un pago (Wompi) y un solo envío.

- **Frontend:** React 18 + Vite (JavaScript/JSX), React Router, TanStack Query, GSAP + Lenis.
- **Backend:** Supabase (Postgres, Auth, Storage, RLS, Edge Functions, pg_cron, pg_net, Vault).
- **Pagos:** Wompi (sandbox y producción). **Correos:** Resend. **Hosting:** Vercel.

> Regla de oro: la llave `service_role` de Supabase y los secretos de Wompi **nunca** van al
> frontend. En el navegador solo viven `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y
> `VITE_WOMPI_PUBLIC_KEY`. Todo lo demás son secretos de Supabase.

---

## 1. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 20 o superior | Vite y scripts |
| Docker Desktop | reciente | Supabase local |
| Supabase CLI | 2.x | migraciones, funciones, base local |
| Cuenta en Supabase, Vercel, Wompi y Resend | — | producción |

```bash
npm install
```

## 2. Entorno local paso a paso

1. **Levantar Supabase** (Docker debe estar abierto):
   ```bash
   npm run db:start
   ```
   Usa los puertos `546xx` (API `http://127.0.0.1:54621`, Studio `http://127.0.0.1:54623`,
   correos de prueba en Mailpit `http://127.0.0.1:54624`).

2. **Variables del frontend:** copia `.env.example` como `.env.local` y llena
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con lo que muestra:
   ```bash
   supabase status -o env      # API_URL y ANON_KEY
   ```

3. **Migraciones y datos** (borra la base local y la vuelve a crear):
   ```bash
   npm run db:reset
   ```
   Aplica `supabase/migrations/*` y luego las semillas de `supabase/seed/` en orden:

   | Semilla | Contenido | ¿Producción? |
   |---|---|---|
   | `01_territory_catalog.sql` | 4 subregiones, 37 municipios, 9 categorías, FAQ, textos, envío | Sí |
   | `02_ambassadors.sql` | 17 embajadores (generada desde la hoja) | Sí |
   | `03_products_kits.sql` | 43 productos reales, 21 presentaciones, 3 kits (generada) | Sí |
   | `private/90_private.sql` | datos privados de embajadores (fuera de git) | Sí |
   | `04_demo_orders.sql` | 3 pedidos de demostración | **No** |
   | `05_test_ambassador.sql` | usuarios cliente y embajador de prueba | **No** |

4. **Crear el administrador** (después de *cada* `db:reset`):
   ```bash
   SUPABASE_URL=http://127.0.0.1:54621 \
   SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY de supabase status> \
   MO_ADMIN_EMAIL=tu-correo@dominio.com MO_ADMIN_PASSWORD='<tu contraseña>' \
   npm run admin:create
   ```
   La contraseña solo pasa por la variable de entorno; no se guarda en ningún archivo.

5. **Edge Functions** (pagos y correos): copia `supabase/functions/.env.example` como
   `supabase/functions/.env` y en otra terminal:
   ```bash
   npm run functions:serve
   ```

6. **Tienda:**
   ```bash
   npm run dev        # http://localhost:5173
   ```

7. **Pruebas de seguridad y lógica de la base** (37 verificaciones de RLS, pagos, stock,
   reseñas, carrito, recomendaciones; no deja datos):
   ```bash
   npm run db:check
   ```

### Credenciales de prueba (solo local)

| Rol | Correo | Contraseña |
|---|---|---|
| Cliente | `cliente@mercadoorigen.test` | `Cliente123*` |
| Embajador (Chocolate Mamá Susana) | `embajador@mercadoorigen.test` | `Embajador123*` |
| Admin | el que crees con `npm run admin:create` | la que elijas |

Wompi sandbox: tarjeta aprobada `4242 4242 4242 4242`, rechazada `4111 1111 1111 1111`
(cualquier fecha futura y CVC). En PSE sandbox elige el banco de prueba y el resultado.

## 3. Supabase en la nube (producción)

1. Crea el proyecto en [supabase.com](https://supabase.com) (región São Paulo recomendada).
2. Enlaza y sube las migraciones:
   ```bash
   supabase login
   supabase link --project-ref <ref-del-proyecto>
   supabase db push
   ```
3. **Semillas de producción** (sin las de demostración): con la cadena de conexión del
   proyecto (*Project Settings → Database → Connection string*):
   ```bash
   psql "<cadena de conexión>" -f supabase/seed/01_territory_catalog.sql
   psql "<cadena de conexión>" -f supabase/seed/02_ambassadors.sql
   psql "<cadena de conexión>" -f supabase/seed/03_products_kits.sql
   psql "<cadena de conexión>" -f supabase/seed/private/90_private.sql
   ```
4. **Auth** (*Authentication → URL Configuration*): `Site URL` = tu dominio
   (p. ej. `https://mercadoorigen.co`) y en *Redirect URLs* agrega `https://mercadoorigen.co/**`.
   Las plantillas de correo en español están en `supabase/templates/`; cópialas en
   *Authentication → Email Templates*. Para que los correos de registro no queden limitados,
   configura SMTP propio (Resend ofrece SMTP: `smtp.resend.com`).
5. **Primer admin en producción:** corre `npm run admin:create` desde tu computador con
   `SUPABASE_URL=https://<ref>.supabase.co` y la `service_role` del proyecto en la terminal
   (nunca la guardes en un archivo del repositorio).

## 4. Edge Functions

| Función | Qué hace | JWT |
|---|---|---|
| `create-order` | Calcula el pedido en el servidor y firma el pago de Wompi | propio |
| `payment-status` | Consulta a Wompi el estado del pago al volver de la pasarela | propio |
| `wompi-webhook` | Recibe los eventos de Wompi (verifica el checksum) | no |
| `admin-users` | Invitar embajadores y activar/desactivar cuentas (solo admin) | sí |
| `send-emails` | Envía los correos pendientes de la cola `email_outbox` | llave propia |

Despliegue:
```bash
supabase secrets set --env-file supabase/functions/.env   # con los valores de producción
supabase functions deploy create-order
supabase functions deploy payment-status
supabase functions deploy wompi-webhook
supabase functions deploy admin-users
supabase functions deploy send-emails
```

Secretos (ver `supabase/functions/.env.example`): `WOMPI_ENV`, `WOMPI_PUBLIC_KEY`,
`WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, `SITE_URL`,
`ALLOWED_ORIGINS`, `RESEND_API_KEY`, `RESEND_FROM`, `EMAIL_CRON_SECRET`.

## 5. Wompi

En [comercios.wompi.co](https://comercios.wompi.co) → *Desarrolladores*:

| | Sandbox | Producción |
|---|---|---|
| `WOMPI_ENV` | `sandbox` | `production` |
| Llave pública (`VITE_WOMPI_PUBLIC_KEY` y `WOMPI_PUBLIC_KEY`) | `pub_test_…` | `pub_prod_…` |
| Llave privada (`WOMPI_PRIVATE_KEY`) | `prv_test_…` | `prv_prod_…` |
| Integridad (`WOMPI_INTEGRITY_SECRET`) | `test_integrity_…` | `prod_integrity_…` |
| Eventos (`WOMPI_EVENTS_SECRET`) | `test_events_…` | `prod_events_…` |

- **URL de eventos (webhook)**, en *Desarrolladores → URL de eventos*:
  `https://<ref>.supabase.co/functions/v1/wompi-webhook`
- **URL de redirección** (la arma el servidor): `<SITE_URL>/pago/resultado`.
- Antes de salir a producción, haz un pago real en sandbox y confirma en los logs de
  `wompi-webhook` que el checksum del evento se valida (el ejemplo de la documentación de
  Wompi es ilustrativo y no sirve para probar).
- El monto, el stock y los descuentos **siempre** los calcula la base (`checkout_build`); lo que
  envíe el navegador se ignora. Los pedidos sin pagar se cancelan solos a las 3 horas.

## 6. Correos transaccionales (Resend)

Los cambios importantes encolan un correo en `email_outbox` (una sola vez por evento):

- pago aprobado → **pedido confirmado** (al cliente);
- pedido **enviado** (con transportadora y guía), **entregado** (invita a calificar),
  **cancelado** y **reembolsado** (al cliente);
- producto **aprobado** o **rechazado** con el motivo (al embajador).

`send-emails` los redacta en español y los envía con Resend. Sin `RESEND_API_KEY` quedan como
`omitido` (no se reenvían después). Para que salgan solos, pg_cron despierta a la función cada
minuto; dale la dirección y la llave guardándolas en Vault (*SQL Editor*):

```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1', 'mo_functions_url');
select vault.create_secret('<el mismo valor de EMAIL_CRON_SECRET>', 'mo_cron_secret');
```

En Resend verifica tu dominio y usa un remitente de ese dominio en `RESEND_FROM`.

## 7. Catálogo: importar productos de la hoja

1. Exporta la hoja "EMBAJADORES ACEPTADOS – PRODUCTOS" como CSV y guárdala en
   `private/productos.csv` (la carpeta `private/` no se sube a git: trae números de identificación).
2. **Fotos:** comparte la carpeta de Drive como "Cualquier persona con el enlace" o descarga
   las fotos a `private/fotos/` con el código como nombre (`EM0001_2.jpg`). Luego:
   ```bash
   npm run catalog:photos    # genera WebP 1200 px, miniatura 400 px y JPG para redes
   ```
   Las que falten quedan listadas en `private/fotos-pendientes.txt`; mientras tanto se
   muestra el empaque ilustrado.
3. Genera la semilla y recarga:
   ```bash
   npm run catalog:seed      # escribe supabase/seed/03_products_kits.sql
   npm run db:reset
   ```
   Las presentaciones (peso, grano/molido, unidades) se agrupan como variantes; la agrupación
   y las correcciones de texto están en `GROUPS` dentro de `scripts/build-product-seed.mjs`.
   Cada producto y variante guarda el código del embajador (`supplier_code`), su empaque y sus
   medidas para cotizar con la transportadora.

Embajadores: `private/embajadores.csv` → `npm run seed:ambassadors`.
Imágenes fijas del sitio (hero, territorio): `node scripts/optimize-site-images.mjs`.

## 8. Despliegue en Vercel

1. Importa el repositorio en Vercel (framework: **Vite**; build `npm run build`; salida `dist`).
2. Variables de entorno (Production y Preview):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WOMPI_PUBLIC_KEY`, `VITE_WHATSAPP`,
   `VITE_AUTH_GOOGLE` (`false` hasta activar Google en Supabase).
3. `vercel.json` ya incluye:
   - rutas de la app (todas van a `index.html`);
   - `/sitemap.xml` y `/robots.txt` generados por `api/sitemap.js` y `api/robots.js`;
   - vista previa para WhatsApp/Facebook/X: sus robots reciben de `api/og.js` el título,
     la descripción y la foto de cada producto, embajador, kit, categoría y zona;
   - caché larga para `/assets` y encabezados de seguridad.
4. Actualiza `SITE_URL` y `ALLOWED_ORIGINS` en los secretos de Supabase con el dominio final.

## 9. Estructura

```
src/
  app/                 router y layout
  components/          piezas visuales compartidas (hero, kits, historia, ui, Img…)
  features/
    auth/ catalog/ territory/ cart/ checkout/ orders/ wishlist/
    ambassador-panel/ admin/ recommendations/ store/ search/ site/ account/
  lib/                 supabase, formato, SEO (useSeo), caché, animaciones
  pages/               home, política de datos, 404
api/                   funciones de Vercel (SEO para redes, sitemap, robots)
supabase/
  migrations/          esquema, RLS, lógica de pedidos, pagos, recomendaciones, correos
  seed/                datos iniciales (ver tabla arriba)
  functions/           Edge Functions
  checks/              pruebas SQL de seguridad y lógica
scripts/               importación de embajadores, productos, fotos, admin
docs/                  modelo de datos (Fase 1)
```

Rendimiento: `/admin` y `/panel` se descargan aparte (no pesan en la tienda), las librerías van
en archivos que el navegador guarda entre despliegues, las imágenes son WebP con `srcset`, el
catálogo público queda en caché local para visitas repetidas y la foto del hero se pinta antes
que el JavaScript.

## 10. Datos personales (Ley 1581 de 2012)

- Registro, checkout, boletín y "Quiero ser embajador" piden autorización expresa y guardan la
  fecha. La política está en `/tratamiento-de-datos` (borrador: revísala con tu abogado).
- Los datos de identificación y bancarios de embajadores viven en `ambassador_private`, solo
  visibles para el admin, y la auditoría los enmascara.
- Los eventos de navegación para recomendaciones se borran a los 12 meses y no se registran si
  el navegador pide "No rastrear" / Global Privacy Control.

## 11. Pendientes antes de abrir

- Llaves reales de Wompi (sandbox → producción) y probar el webhook con un pago real.
- `RESEND_API_KEY`, dominio verificado y secretos de Vault para el envío automático.
- Fotos de productos (56 pendientes por permisos de Drive).
- Tarifas de envío con la transportadora (hoy tarifa plana provisional de $12.000 y envío gratis
  desde $150.000), precios de los kits y comisión de cada embajador.
- Revisar altitudes/ecosistemas de las subregiones y la política de datos.
