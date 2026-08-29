// Vitest runs in a plain Node environment and doesn't have Next.js's
// webpack alias that makes `server-only` a no-op on the server and a
// throwing stub on the client. Since our tests only ever run
// server-side logic, aliasing to this empty module (see
// vitest.config.ts) reproduces that same "no-op on the server" behavior
// instead of the package's default "always throw" behavior.
export {};
