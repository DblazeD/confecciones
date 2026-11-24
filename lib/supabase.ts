import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export function publicClient() {
  const settings = config();
  if (!settings) return null;
  return createClient(settings.url, settings.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

export async function sessionClient() {
  const settings = config();
  if (!settings) return null;
  const jar = await cookies();
  return createServerClient(settings.url, settings.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try {
          for (const { name, value, options } of values) jar.set(name, value, options);
        } catch {
          // Server Components only read cookies. The Next.js proxy refreshes them.
        }
      },
    },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

export const requireOwner = cache(async () => {
  const db = await sessionClient();
  if (!db) redirect("/acceso");
  const { data: claims } = await db.auth.getClaims();
  if (!claims?.claims.sub) redirect("/acceso");
  const { data: owner } = await db.rpc("is_owner");
  if (!owner) redirect("/acceso");
  return db;
});
