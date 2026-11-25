import type { NextRequest } from "next/server";
import { refreshSession } from "@confecciones/backend/session-proxy";

export function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = { matcher: ["/admin/:path*", "/acceso", "/media/:path*"] };
