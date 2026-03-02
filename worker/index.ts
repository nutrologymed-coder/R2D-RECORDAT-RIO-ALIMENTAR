/**
 * Cloudflare Worker for R2D (Recordatório Alimentar)
 * Features: API for submissions, Admin Panel with Session Management (HMAC)
 */

export interface Env {
  DB: D1Database;
  ACCESS_KEY: string;
  SESSION_SECRET: string;
}

const SESSION_COOKIE_NAME = "r2d_session";
const SESSION_DURATION = 4 * 60 * 60 * 1000; // 4 hours

// --- Crypto Helpers ---

async function getCryptoKey(secret: string) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signSession(payload: string, secret: string) {
  const enc = new TextEncoder();
  const key = await getCryptoKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const b64Payload = btoa(payload);
  const b64Sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${b64Payload}.${b64Sig}`;
}

async function verifySession(token: string, secret: string): Promise<any | null> {
  try {
    const [b64Payload, b64Sig] = token.split(".");
    if (!b64Payload || !b64Sig) return null;

    const payload = atob(b64Payload);
    const sigArray = new Uint8Array(
      atob(b64Sig)
        .split("")
        .map((c) => c.charCodeAt(0))
    );

    const key = await getCryptoKey(secret);
    const enc = new TextEncoder();
    const isValid = await crypto.subtle.verify("HMAC", key, sigArray, enc.encode(payload));

    if (!isValid) return null;

    const data = JSON.parse(payload);
    if (data.exp < Date.now()) return null;

    return data;
  } catch {
    return null;
  }
}

// --- Utils ---

function getCookie(request: Request, name: string) {
  const cookieString = request.headers.get("Cookie");
  if (!cookieString) return null;
  const cookies = cookieString.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${name}=`)) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-ACCESS-KEY",
  };
}

// --- HTML Templates ---

const LOGIN_HTML = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>R2D Admin - Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 flex items-center justify-center min-h-screen">
    <div class="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <h1 class="text-2xl font-bold text-slate-800 mb-6 text-center">Acesso Médico</h1>
        <form action="/admin/login" method="POST" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-slate-600 mb-1">Chave de Acesso</label>
                <input type="password" name="password" required class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all">
            </div>
            <button type="submit" class="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">Entrar</button>
        </form>
    </div>
</body>
</html>
`;

function getDashboardHTML(submissions: any[]) {
  const rows = submissions.map(s => `
    <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <td class="px-6 py-4 text-sm text-slate-500 font-mono">${s.id}</td>
        <td class="px-6 py-4 text-sm font-medium text-slate-800">${s.patient_name}</td>
        <td class="px-6 py-4 text-sm text-slate-600 font-mono">${s.protocol}</td>
        <td class="px-6 py-4 text-sm text-slate-500">${new Date(s.created_at).toLocaleString('pt-BR')}</td>
        <td class="px-6 py-4 text-right">
            <button onclick="viewDetails('${s.id}')" class="text-blue-600 hover:text-blue-800 font-medium text-sm">Ver JSON</button>
        </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>R2D Admin - Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <nav class="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div class="max-w-6xl mx-auto flex justify-between items-center">
            <h1 class="text-xl font-bold text-slate-900">R2D <span class="text-slate-400 font-normal">| Painel Médico</span></h1>
            <form action="/admin/logout" method="POST">
                <button type="submit" class="text-sm font-semibold text-red-500 hover:text-red-700">Sair</button>
            </form>
        </div>
    </nav>

    <main class="max-w-6xl mx-auto p-6">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 class="font-bold text-slate-800">Últimas Submissões</h2>
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">${submissions.length} registros</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                            <th class="px-6 py-3">ID</th>
                            <th class="px-6 py-3">Paciente</th>
                            <th class="px-6 py-3">Protocolo</th>
                            <th class="px-6 py-3">Data</th>
                            <th class="px-6 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="5" class="px-6 py-12 text-center text-slate-400 italic">Nenhum registro encontrado</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    </main>

    <script>
        function viewDetails(id) {
            alert('Funcionalidade de visualização detalhada pode ser implementada via modal ou nova rota.');
        }
    </script>
</body>
</html>
  `;
}

// --- Main Handler ---

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle Preflight
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // --- API Routes ---

    // POST /api/submit
    if (path === "/api/submit" && method === "POST") {
      try {
        const body = await request.json() as any;
        const protocol = `R2D-${Date.now()}`;
        
        await env.DB.prepare(
          "INSERT INTO submissions (patient_name, data_json, protocol) VALUES (?, ?, ?)"
        )
          .bind(body.patient_name || "Anônimo", JSON.stringify(body), protocol)
          .run();

        return new Response(JSON.stringify({ ok: true, protocol }), {
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        });
      }
    }

    // GET /api/submissions (JSON API)
    if (path === "/api/submissions" && method === "GET") {
      const token = getCookie(request, SESSION_COOKIE_NAME);
      const session = token ? await verifySession(token, env.SESSION_SECRET) : null;

      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        });
      }

      const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
      const { results } = await env.DB.prepare(
        "SELECT * FROM submissions ORDER BY created_at DESC LIMIT ?"
      )
        .bind(limit)
        .all();

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    // --- Admin Routes ---

    // GET /admin
    if (path === "/admin" && method === "GET") {
      const token = getCookie(request, SESSION_COOKIE_NAME);
      const session = token ? await verifySession(token, env.SESSION_SECRET) : null;

      if (!session) {
        return new Response(LOGIN_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      const { results } = await env.DB.prepare(
        "SELECT id, patient_name, protocol, created_at FROM submissions ORDER BY created_at DESC LIMIT 50"
      ).all();

      return new Response(getDashboardHTML(results), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // POST /admin/login
    if (path === "/admin/login" && method === "POST") {
      const formData = await request.formData();
      const password = formData.get("password");

      if (password === env.ACCESS_KEY) {
        const payload = JSON.stringify({
          user: "admin",
          exp: Date.now() + SESSION_DURATION,
        });
        const token = await signSession(payload, env.SESSION_SECRET);

        return new Response(null, {
          status: 302,
          headers: {
            "Location": "/admin",
            "Set-Cookie": `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION / 1000}`,
          },
        });
      }

      return new Response("Chave incorreta", { status: 401 });
    }

    // POST /admin/logout
    if (path === "/admin/logout" && method === "POST") {
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/admin",
          "Set-Cookie": `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
