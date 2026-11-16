# Despliegue en Cloudflare Workers desde GitHub

## Conectar el repositorio

1. En Cloudflare, abre **Workers & Pages** y conecta un Worker con **GitHub**.
2. Selecciona `sulivan22/CYA`, la rama `main` y el nombre `carmen-alfonso`.
3. Usa `npm run build` como comando de compilación y `npx --yes wrangler deploy` como comando de despliegue.
4. Usa `.` como directorio raíz. La compilación genera `dist/server/index.js`, la entrada indicada en `wrangler.jsonc`.

## Variables secretas

En **Settings → Variables and Secrets**, añade como secretos:

- `RESEND_API_KEY`: clave API de Resend.
- `RSVP_FROM`: `Carmen y Alfonso <boda@carmenyalfonso.com>`.
- `RSVP_TO_EMAIL`: `sulivan22@gmail.com`.

No guardes los valores secretos en GitHub ni en archivos del proyecto. Después de añadirlos, vuelve a desplegar el Worker.

## Dominio

En **Settings → Domains & Routes**, añade `carmenyalfonso.com` como Custom Domain cuando el Worker esté desplegado y el dominio esté disponible en Cloudflare.
