import dns from 'node:dns/promises';
import net from 'node:net';

// ─── SSRF-hardened fetch ───────────────────────────────────
// Used for downloading user-supplied URLs (e.g. account logos). Blocks requests
// to private / loopback / link-local / cloud-metadata addresses, restricts the
// scheme to http(s), re-validates the host on every redirect hop, and caps the
// response size. Residual TOCTOU note: Node's fetch re-resolves DNS internally,
// so a rebinding attacker could in theory race the lookup — acceptable for this
// low-value logo-import path; the metadata/internal-host vectors are closed.

const MAX_REDIRECTS = 3;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export class SafeFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafeFetchError';
  }
}

function ipToLong(ip: string): number {
  return (
    ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0
  );
}

function inRange(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipToLong(ip) & mask) === (ipToLong(base) & mask);
}

// RFC 1918 / 5735 / 6598 / link-local / metadata / multicast / reserved
const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // link-local + 169.254.169.254 cloud metadata
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function isPrivateV4(ip: string): boolean {
  return BLOCKED_V4.some(([base, bits]) => inRange(ip, base, bits));
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  const mapped = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateV4(mapped[1]);
  const first = parseInt(lower.split(':')[0] || '0', 16);
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  return false;
}

/** True if the literal IP is in a private / reserved / loopback range. */
export function isPrivateIp(ip: string): boolean {
  const fam = net.isIP(ip);
  if (fam === 4) return isPrivateV4(ip);
  if (fam === 6) return isPrivateV6(ip);
  return true; // not a parseable IP → treat as unsafe
}

async function assertPublicHost(hostname: string): Promise<void> {
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new SafeFetchError('Blocked private address');
    return;
  }
  let records: Array<{ address: string }>;
  try {
    records = await dns.lookup(hostname, { all: true });
  } catch {
    throw new SafeFetchError('DNS resolution failed');
  }
  if (records.length === 0) throw new SafeFetchError('DNS resolution failed');
  for (const r of records) {
    if (isPrivateIp(r.address)) throw new SafeFetchError('Blocked private address');
  }
}

async function readCapped(resp: Response, maxBytes: number): Promise<Buffer> {
  const declared = resp.headers.get('content-length');
  if (declared && Number(declared) > maxBytes) {
    throw new SafeFetchError('Response too large');
  }
  const reader = resp.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new SafeFetchError('Response too large');
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks);
}

export interface SafeFetchOptions {
  maxBytes?: number;
  maxRedirects?: number;
}

/**
 * Fetch a user-supplied URL into a Buffer with SSRF protections.
 * Throws SafeFetchError on a blocked host, bad scheme, oversize body, or
 * unreachable upstream.
 */
export async function safeFetchBuffer(
  rawUrl: string,
  opts: SafeFetchOptions = {},
): Promise<Buffer> {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = opts.maxRedirects ?? MAX_REDIRECTS;

  let target = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    let url: URL;
    try {
      url = new URL(target);
    } catch {
      throw new SafeFetchError('Invalid URL');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new SafeFetchError('Only http(s) URLs are allowed');
    }
    await assertPublicHost(url.hostname);

    const resp = await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': 'SalvaDash-logo-fetch' },
    });

    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get('location');
      if (!location) throw new SafeFetchError('Redirect without Location header');
      target = new URL(location, url).toString();
      continue;
    }
    if (!resp.ok) throw new SafeFetchError(`Upstream responded ${resp.status}`);
    return readCapped(resp, maxBytes);
  }
  throw new SafeFetchError('Too many redirects');
}
