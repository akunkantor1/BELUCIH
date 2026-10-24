import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_SERVICE_ACCOUNT_JSON = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type NotificationRow = {
  id: string;
  kind: "product_new" | "broadcast";
  title: string;
  body: string;
  image_url: string | null;
  target_url: string | null;
  product_id: string | null;
  status: string;
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function b64url(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function getFirebaseAccount(): FirebaseServiceAccount {
  if (!FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error("Firebase belum dikonfigurasi. Atur secret FIREBASE_SERVICE_ACCOUNT_JSON di Supabase.");
  }
  const account = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON) as FirebaseServiceAccount;
  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error("Secret Firebase service account tidak lengkap.");
  }
  return account;
}

let cachedGoogleToken = "";
let cachedGoogleTokenExpiresAt = 0;

async function getGoogleAccessToken(account: FirebaseServiceAccount): Promise<string> {
  if (cachedGoogleToken && Date.now() < cachedGoogleTokenExpiresAt - 60_000) {
    return cachedGoogleToken;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const pem = account.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );
  const assertion = `${unsigned}.${b64url(signature)}`;

  const oauthResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const oauthData = await oauthResponse.json();
  if (!oauthResponse.ok || !oauthData.access_token) {
    throw new Error(`Gagal mendapatkan token Firebase OAuth: ${oauthData.error_description || oauthData.error || oauthResponse.status}`);
  }

  cachedGoogleToken = oauthData.access_token as string;
  cachedGoogleTokenExpiresAt = Date.now() + Number(oauthData.expires_in || 3600) * 1000;
  return cachedGoogleToken;
}

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireOwner(req: Request): Promise<{ userId: string } | { error: string }> {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return { error: "Sesi Owner diperlukan." };

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const jwt = authorization.slice("Bearer ".length).trim();
  const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
  if (userError || !userData.user) return { error: "Sesi tidak valid. Silakan login kembali." };

  const { data: ownerResult, error: ownerError } = await userClient.rpc("is_owner_check");
  if (ownerError) return { error: "Tidak dapat memverifikasi hak Owner." };
  const isOwner = ownerResult === true ||
    (typeof ownerResult === "object" && ownerResult !== null &&
      ((ownerResult as Record<string, unknown>).is_owner === true ||
       (ownerResult as Record<string, unknown>).is_owner_check === true));
  if (!isOwner) return { error: "Akses hanya untuk Owner." };
  return { userId: userData.user.id };
}

async function sendNotificationById(
  notificationId: string,
  service: ReturnType<typeof getServiceClient>,
  account: FirebaseServiceAccount,
): Promise<{ recipient_count: number; failure_count: number; status: string }> {
  const { data: rowData, error: rowError } = await service
    .from("push_notifications")
    .select("id,kind,title,body,image_url,target_url,product_id,status")
    .eq("id", notificationId)
    .maybeSingle();
  if (rowError || !rowData) throw new Error(`Notifikasi tidak ditemukan: ${rowError?.message || notificationId}`);
  const row = rowData as NotificationRow;

  // Atomic claim: only one invocation may send a queued notification.
  const { data: claimed, error: claimError } = await service
    .from("push_notifications")
    .update({ status: "sending", error_message: null })
    .eq("id", notificationId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (claimError) throw new Error(`Gagal mengambil antrean notifikasi: ${claimError.message}`);
  if (!claimed) {
    const { data: current } = await service.from("push_notifications").select("status").eq("id", notificationId).maybeSingle();
    return { recipient_count: 0, failure_count: 0, status: current?.status || "unknown" };
  }

  try {
    const { data: tokens, error: tokenError } = await service
      .from("push_device_tokens")
      .select("token")
      .eq("enabled", true)
      .limit(5000);
    if (tokenError) throw new Error(`Gagal membaca token perangkat: ${tokenError.message}`);
    if (!tokens?.length) {
      await service.from("push_notifications").update({
        status: "failed",
        recipient_count: 0,
        failure_count: 0,
        error_message: "Belum ada perangkat yang mendaftarkan token notifikasi.",
      }).eq("id", notificationId);
      return { recipient_count: 0, failure_count: 0, status: "failed" };
    }

    const accessToken = await getGoogleAccessToken(account);
    let successCount = 0;
    let failureCount = 0;
    const deadTokens: string[] = [];

    for (let start = 0; start < tokens.length; start += 20) {
      const batch = tokens.slice(start, start + 20);
      const results = await Promise.all(batch.map(async ({ token }) => {
        const message: Record<string, unknown> = {
          token,
          notification: {
            title: row.title,
            body: row.body,
            ...(row.image_url ? { image: row.image_url } : {}),
          },
          data: {
            kind: row.kind,
            targetUrl: row.target_url || "",
            productId: row.product_id || "",
            notificationId: row.id,
          },
          android: {
            priority: "HIGH",
            notification: {
              channel_id: "default",
              ...(row.image_url ? { image: row.image_url } : {}),
            },
          },
        };

        const fcmResponse = await fetch(
          `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message }),
          },
        );
        const fcmBody = await fcmResponse.json().catch(() => ({}));
        if (fcmResponse.ok) return { ok: true, token, dead: false };
        const details = JSON.stringify(fcmBody);
        const dead = details.includes("UNREGISTERED");
        return { ok: false, token, dead };
      }));

      for (const result of results) {
        if (result.ok) successCount++;
        else {
          failureCount++;
          if (result.dead) deadTokens.push(result.token);
        }
      }
    }

    if (deadTokens.length) {
      await service.from("push_device_tokens").update({ enabled: false, updated_at: new Date().toISOString() }).in("token", deadTokens);
    }

    const status = successCount === tokens.length ? "sent" : successCount > 0 ? "partial" : "failed";
    const { error: updateError } = await service.from("push_notifications").update({
      status,
      recipient_count: successCount,
      failure_count: failureCount,
      error_message: failureCount ? `${failureCount} perangkat gagal menerima notifikasi.` : null,
      sent_at: successCount > 0 ? new Date().toISOString() : null,
    }).eq("id", notificationId);
    if (updateError) throw new Error(`Notifikasi dikirim tetapi riwayat gagal diperbarui: ${updateError.message}`);

    return { recipient_count: successCount, failure_count: failureCount, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kesalahan pengiriman tidak diketahui.";
    await service.from("push_notifications").update({
      status: "failed",
      error_message: message.slice(0, 1000),
    }).eq("id", notificationId);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Gunakan POST." }, 405);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return response({ error: "Body JSON tidak valid." }, 400);
  }

  const action = payload.action;
  const service = getServiceClient();

  try {
    if (action === "register_token") {
      const token = typeof payload.token === "string" ? payload.token.trim() : "";
      const platform = payload.platform === "web" ? "web" : "android";
      if (token.length < 30 || token.length > 4096 || /[\r\n]/.test(token)) {
        return response({ error: "Token perangkat tidak valid." }, 400);
      }
      const now = new Date().toISOString();
      const { error } = await service.from("push_device_tokens").upsert({
        token,
        platform,
        enabled: true,
        last_seen_at: now,
        updated_at: now,
      }, { onConflict: "token" });
      if (error) return response({ error: `Gagal menyimpan token perangkat: ${error.message}` }, 500);
      return response({ ok: true });
    }

    if (action === "process_product") {
      const owner = await requireOwner(req);
      if ("error" in owner) return response({ error: owner.error }, 403);
      const productId = typeof payload.product_id === "string" ? payload.product_id : "";
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
        return response({ error: "ID produk tidak valid." }, 400);
      }
      const account = getFirebaseAccount();
      const { data: notification, error } = await service
        .from("push_notifications")
        .select("id,status")
        .eq("kind", "product_new")
        .eq("product_id", productId)
        .maybeSingle();
      if (error || !notification) {
        return response({ error: `Antrean produk tidak ditemukan: ${error?.message || productId}` }, 404);
      }
      const result = await sendNotificationById(notification.id, service, account);
      return response({ ok: true, ...result });
    }

    if (action === "send_broadcast") {
      const owner = await requireOwner(req);
      if ("error" in owner) return response({ error: owner.error }, 403);
      const title = typeof payload.title === "string" ? payload.title.trim() : "";
      const body = typeof payload.body === "string" ? payload.body.trim() : "";
      const imageUrl = typeof payload.image_url === "string" && payload.image_url.trim() ? payload.image_url.trim() : null;
      const targetUrl = typeof payload.target_url === "string" && payload.target_url.trim() ? payload.target_url.trim() : null;
      if (!title || title.length > 100 || !body || body.length > 500) {
        return response({ error: "Judul wajib 1–100 karakter dan pesan 1–500 karakter." }, 400);
      }
      if (imageUrl) {
        try {
          if (new URL(imageUrl).protocol !== "https:") throw new Error("protocol");
        } catch {
          return response({ error: "URL gambar harus menggunakan HTTPS." }, 400);
        }
      }
      if (targetUrl) {
        try {
          if (targetUrl.startsWith("/")) {
            if (targetUrl.startsWith("//")) throw new Error("protocol-relative");
          } else if (new URL(targetUrl).protocol !== "https:") {
            throw new Error("protocol");
          }
        } catch {
          return response({ error: "Tautan harus berupa path internal atau URL HTTPS." }, 400);
        }
      }
      const account = getFirebaseAccount();
      const { data: notification, error } = await service.from("push_notifications").insert({
        kind: "broadcast",
        title,
        body,
        image_url: imageUrl,
        target_url: targetUrl,
        status: "pending",
        created_by: owner.userId,
      }).select("id").single();
      if (error || !notification) {
        return response({ error: `Gagal membuat broadcast: ${error?.message || "tidak ada data"}` }, 500);
      }
      const result = await sendNotificationById(notification.id, service, account);
      return response({ ok: true, notification_id: notification.id, ...result });
    }

    return response({ error: "Aksi tidak dikenal." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kesalahan server.";
    console.error("send-notification:", message);
    return response({ error: message }, 500);
  }
});
