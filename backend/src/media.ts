import { publicClient, sessionClient } from "./supabase";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9-]{36}\.webp$/.test(name)) return new Response(null, { status: 404 });

  const anonymous = publicClient();
  const publicRead = await anonymous?.storage.from("catalog-media").download(name);
  let file = publicRead?.data;
  if (!file) {
    const authenticated = await sessionClient();
    const { data } = await authenticated?.auth.getClaims() ?? {};
    if (data?.claims.sub) {
      const privateRead = await authenticated?.storage.from("catalog-media").download(name);
      file = privateRead?.data;
    }
  }
  if (!file) return new Response(null, { status: 404 });
  return new Response(file, {
    headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store" },
  });
}
