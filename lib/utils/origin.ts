import "server-only";
import { headers } from "next/headers";

export function getRequestOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}
