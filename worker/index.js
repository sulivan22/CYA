const assets = __ASSET_MAP__;
const requestWindow = new Map();
const allowedAttendance = new Set(["Sí, allí estaré", "Lo siento, no podré"]);
const allowedOutboundBus = new Set(["si", "ninguno"]);
const allowedReturnBus = new Set(["pozuelo", "moncloa", "ninguno"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function clean(value, maxLength) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength)
    : "";
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function labelForBus(value, direction) {
  if (direction === "ida") return value === "si" ? "Sí, salida a las 14:00/14:30" : "No necesita autobús de ida";
  return ({
    pozuelo: "Finca → Pozuelo",
    moncloa: "Finca → Moncloa",
    ninguno: "No necesita autobús de vuelta",
  })[value];
}

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const previous = requestWindow.get(ip);
  if (previous && now - previous.startedAt < windowMs) {
    if (previous.count >= 6) return false;
    previous.count += 1;
  } else {
    requestWindow.set(ip, { startedAt: now, count: 1 });
  }
  if (requestWindow.size > 1000) {
    for (const [key, entry] of requestWindow) {
      if (now - entry.startedAt >= windowMs) requestWindow.delete(key);
    }
  }
  return true;
}

async function submitRsvp(request, env) {
  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Origen no permitido." }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ error: "Formato no válido." }, 415);
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 16000) return json({ error: "La respuesta es demasiado larga." }, 413);

  let input;
  try {
    const body = await request.text();
    if (body.length > 16000) return json({ error: "La respuesta es demasiado larga." }, 413);
    input = JSON.parse(body);
  } catch {
    return json({ error: "No se pudo leer la respuesta." }, 400);
  }

  // Quietly accept bot submissions without sending them.
  if (clean(input.website, 200)) return json({ ok: true });

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (!checkRateLimit(ip)) return json({ error: "Has enviado varias respuestas seguidas. Espera un momento." }, 429);

  const data = {
    nombre: clean(input.nombre, 80),
    apellidos: clean(input.apellidos, 100),
    acompanante: clean(input.acompanante, 160),
    asistencia: clean(input.asistencia, 40),
    menu: clean(input.menu, 800),
    ida: clean(input["bus-ida"], 20),
    vuelta: clean(input["bus-vuelta"], 20),
    talla: clean(input["talla-zapato"], 10),
  };

  if (!data.nombre || !data.apellidos || !allowedAttendance.has(data.asistencia)
      || !allowedOutboundBus.has(data.ida) || !allowedReturnBus.has(data.vuelta)) {
    return json({ error: "Faltan datos obligatorios o alguna opción no es válida." }, 400);
  }
  if (data.talla && !/^\d{1,2}$/.test(data.talla)) return json({ error: "Revisa la talla de zapatos." }, 400);

  if (!env.RESEND_API_KEY || !env.RSVP_TO_EMAIL || !env.RSVP_FROM) {
    return json({ error: "El envío no está disponible ahora mismo." }, 503);
  }

  const guest = `${data.nombre} ${data.apellidos}`.trim();
  const rows = [
    ["Nombre", guest],
    ["Acompañante", data.acompanante || "No indicado"],
    ["Asistencia", data.asistencia],
    ["Alergias / menú", data.menu || "Ninguna indicada"],
    ["Autobús de ida", labelForBus(data.ida, "ida")],
    ["Autobús de vuelta", labelForBus(data.vuelta, "vuelta")],
    ["Talla de zapatos", data.talla || "No indicada"],
  ];
  const text = ["Nueva confirmación de asistencia", "", ...rows.map(([label, value]) => `${label}: ${value}`)].join("\n");
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Nueva confirmación</title></head><body style="margin:0;background:#faf8f1;color:#403c32;font-family:Arial,Helvetica,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td align="center" style="padding:24px 12px"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;background:#fffdf7"><tr><td style="padding:28px 24px"><h1 style="font-size:24px;line-height:1.3;color:#8d5842">Nueva confirmación</h1><p style="font-size:16px;line-height:1.5">${escapeHtml(guest)} ha enviado su respuesta.</p><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">${rows.map(([label, value]) => `<tr><td style="padding:10px 8px;border-top:1px solid #e9e3d7;font-size:14px;line-height:1.5;color:#716755"><strong>${escapeHtml(label)}</strong></td><td style="padding:10px 8px;border-top:1px solid #e9e3d7;font-size:15px;line-height:1.5">${escapeHtml(value)}</td></tr>`).join("")}</table></td></tr></table></td></tr></table></body></html>`;
  const idempotencyKey = crypto.randomUUID();
  let result;
  try {
    result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        from: env.RSVP_FROM,
        to: [env.RSVP_TO_EMAIL],
        subject: `Confirmación de boda · ${guest}`,
        text,
        html,
      }),
    });
  } catch {
    return json({ error: "No se pudo conectar con el servicio de correo. Inténtalo de nuevo." }, 502);
  }
  if (!result.ok) {
    console.error("Resend request failed with status", result.status);
    return json({ error: "No se pudo enviar la respuesta. Inténtalo de nuevo más tarde." }, 502);
  }
  return json({ ok: true });
}

function staticAsset(pathname) {
  let path = decodeURIComponent(pathname);
  if (path === "/") path = "/index.html";
  if (!path.startsWith("/") || path.includes("..")) return null;
  if (!assets[path] && !path.includes(".")) path += ".html";
  return assets[path] || null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/rsvp") return submitRsvp(request, env);
    if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Método no permitido." }, 405);

    let asset;
    try {
      asset = staticAsset(url.pathname);
    } catch {
      return new Response("No encontrado", { status: 404 });
    }
    if (!asset) return new Response("No encontrado", { status: 404 });
    const bytes = Uint8Array.from(atob(asset.body), char => char.charCodeAt(0));
    const headers = new Headers({
      "content-type": asset.type,
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "cache-control": /^(text\/|application\/javascript)/.test(asset.type) ? "no-cache" : "public, max-age=3600",
    });
    return new Response(request.method === "HEAD" ? null : bytes, { headers });
  },
};
