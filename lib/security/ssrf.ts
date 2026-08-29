import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    // net.isIPv4(ip) already guarantees exactly 4 numeric octets, so a/b
    // are always defined here — non-null assertions reflect that invariant
    // rather than papering over a real gap (a default like `?? 0` would be
    // the wrong direction for SSRF-blocking logic: it could make a genuinely
    // private address silently fail these checks instead of being caught).
    return a === 10 || a === 127 || (a === 169 && b! === 254) || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b! === 168);
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb");
  }
  return true;
}

export async function assertSafeOutboundUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP(S) URLs are allowed');
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === 'metadata.google.internal') throw new Error('Blocked private hostname');
  const addresses = await dns.lookup(hostname, { all: true });
  if (addresses.length === 0 || addresses.some((entry) => isPrivateIp(entry.address))) throw new Error('Blocked private network target');
  return url;
}
