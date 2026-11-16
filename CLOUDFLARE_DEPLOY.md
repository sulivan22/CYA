# Despliegue en Cloudflare Workers desde GitHub

## Conectar el repositorio

1. En Cloudflare, abre **Workers & Pages** y crea o conecta un Worker con **GitHub**.
2. Selecciona `sulivan22/CYA`, la rama `main` y el nombre de Worker `carmen-alfonso`.
3. Configura el comando de compilación como `npm run build` y el comando de despliegue como `npx --yes wrangler deploy`.
4. Usa `.` como directorio raíz. El proyecto genera `dist/server/index.js` durante la compilación, que es la entrada declarada en `wrangler.jsonc`.

## Variables secretas

En el Worker, abre **Settings → Variables and Secrets** y añade estos valores como secretos:

- `RESEND_API_KEY`: clave API de Resend de la cuenta que envía los correos.
- `RSVP_FROM`: `Carmen y Alfonso <boda@carmenyalfonso.com>`.
- `RSVP_TO_EMAIL`: `sulivan22@gmail.com`.

No guardes los valores secretos en GitHub ni en archivos del proyecto. Después de añadirlos, vuelve a desplegar el Worker.

## Dominio

En **Settings → Domains & Routes**, añade `carmenyalfonso.com` como Custom Domain cuando el Worker esté desplegado y el dominio esté disponible en la cuenta de Cloudflare.
