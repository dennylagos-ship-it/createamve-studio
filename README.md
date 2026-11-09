# CREATEAMVE Studio

App de gestión de producción audiovisual de Createamve: **cliente → lote → video → guion → clips originales → responsables → estado → entrega**. Sin módulo de Pagos.

- App web instalable (PWA) para iPhone, iPad y PC: React + TypeScript + Vite.
- Base de datos, inicio de sesión y sincronización en tiempo real: Supabase (Postgres + Auth + Realtime + RLS).
- Arquitectura y plan por etapas: ver el documento del proyecto.

## Probar sin base de datos

```bash
npm install
npm run demo        # abre una vista previa con datos de ejemplo, guardados solo en el navegador
```

## Puesta en marcha con Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Aplica la migración `supabase/migrations/20261109000001_esquema_inicial.sql`
   (SQL Editor → pegar y ejecutar, o `supabase db push` con la CLI).
3. En **Authentication → URL Configuration**, pon la URL donde se publicará la app como *Site URL*.
4. Copia `.env.example` a `.env.local` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
   (Project Settings → API). La clave anon/publishable es pública; nunca uses la `service_role` en la app.
5. `npm run dev`.

La **primera cuenta** que se registra queda como administrador. El resto entra por invitación desde **Equipo**
(se registran con el correo invitado) o pide acceso y un admin la aprueba.

## Publicar

`npm run build` genera `dist/`, un sitio estático. Sirve en Vercel, Netlify o Hostinger
(en Hostinger, sube `dist/` a `public_html` y redirige todas las rutas a `index.html`).

## Estructura

- `supabase/migrations/` — esquema, triggers (historial de estados, alta de perfiles) y políticas RLS.
- `src/lib/` — cliente de Supabase, tipos, estados/checklist, datos en tiempo real, modo demo.
- `src/pages/` — Inicio, Clientes, Producción (tablero/lista), ficha del video (Resumen, Guion, Material bruto, Checklist, Entrega), Ideas, Calendario, Equipo, Ajustes.

## Estados

Un solo estado manda: Idea → Por grabar → Grabado → En edición → Editado → En correcciones → Entregado.
El checklist de la ficha se deriva de ese estado, así ficha y tablero nunca se contradicen, y cada cambio queda en el historial con quién y cuándo.

## Google Fotos

Etapa actual: cada toma se vincula con su enlace compartido de Google Fotos (o de un álbum compartido), con nombre, orden, nota y tipo; una toma puede pertenecer a varios videos sin duplicarse.
El selector oficial (Google Photos Picker API) se evaluará con una prueba técnica: sus `baseUrl` caducan en ~60 minutos y no sirven como enlaces permanentes.

## Google Calendar

- Cada fecha de un video (y cada evento del Calendario) tiene un botón **+ Google Calendar** para agregarlo como evento suelto.
- **Suscripción automática:** en Ajustes, cada persona copia su enlace personal y lo agrega en Google Calendar → *Desde URL*.
  El enlace lo sirve la Edge Function `calendario` (feed `.ics`, solo lectura). Despliegue:

  ```bash
  supabase db push                                    # incluye la migración calendar_feeds
  supabase functions deploy calendario --no-verify-jwt
  supabase secrets set STUDIO_APP_URL=https://<url-de-la-app>   # opcional: enlaces a cada video
  ```

  Google refresca los calendarios suscritos cada varias horas; no es instantáneo.

## WhatsApp con clientes

Cada cliente tiene su número de WhatsApp (Ficha creativa). Desde la ficha del cliente o de un video, el botón **WhatsApp**
abre un mensaje listo (guion para aprobar, fecha de grabación, video para revisión, entrega o mensaje libre) que se puede
editar y se envía desde la propia app de WhatsApp (`wa.me`). Opcionalmente queda copia en los comentarios del video.
No usa la API de WhatsApp Business: no hay costo ni verificación de Meta, pero tampoco envíos automáticos ni lectura de respuestas.
