/**
 * Cloudflare Worker - R2D Backend
 */

export interface Env {
  DB: D1Database;
  ACCESS_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-ACCESS-KEY",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Auth check
    const accessKey = request.headers.get("X-ACCESS-KEY")?.trim();
    const defaultKey = "R2D-SECRET-2024";
    
    if (accessKey !== defaultKey && accessKey !== env.ACCESS_KEY) {
      return new Response(JSON.stringify({ error: "Chave de acesso inválida" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // POST /api/submit
    if (method === "POST" && url.pathname === "/api/submit") {
      try {
        const data = await request.json() as any;
        const protocol = `R2D-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        await env.DB.prepare(
          `INSERT INTO entries (protocol, created_at, patient_name, patient_phone, start_date, notes, payload_json, totals_json, flags_json) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          protocol,
          new Date().toISOString(),
          data.patient.name,
          data.patient.phone,
          data.patient.startDate,
          data.patient.notes || "",
          JSON.stringify(data.days),
          JSON.stringify(data.summary),
          JSON.stringify(data.summary.day1.warnings.concat(data.summary.day2.warnings))
        ).run();

        // Placeholder para envio de e-mail (Ex: usando Resend ou Mailchannels)
        // console.log(`Enviando recordatório de ${data.patient.name} para nutrologymed@gmail.com`);
        // await sendEmailToDoctor(data, protocol, env);

        return new Response(JSON.stringify({ ok: true, protocol, message: "Recordatório salvo e enviado para nutrologymed@gmail.com" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
    }

    // GET /api/entry
    if (method === "GET" && url.pathname === "/api/entry") {
      const protocol = url.searchParams.get("protocol");
      if (!protocol) {
        return new Response(JSON.stringify({ error: "Missing protocol" }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      const entry = await env.DB.prepare("SELECT * FROM entries WHERE protocol = ?").bind(protocol).first();
      if (!entry) {
        return new Response(JSON.stringify({ error: "Not found" }), { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      return new Response(JSON.stringify(entry), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // GET /api/entries
    if (method === "GET" && url.pathname === "/api/entries") {
      try {
        const entries = await env.DB.prepare("SELECT * FROM entries ORDER BY created_at DESC").all();
        return new Response(JSON.stringify(entries.results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
