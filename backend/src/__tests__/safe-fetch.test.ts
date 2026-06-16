import { describe, it, expect } from 'vitest';
import { isPrivateIp, safeFetchBuffer, SafeFetchError } from '../lib/safe-fetch.js';

describe('safe-fetch SSRF guards', () => {
  describe('isPrivateIp', () => {
    it('blocks loopback / private / link-local / metadata IPv4', () => {
      for (const ip of [
        '127.0.0.1',
        '10.0.0.1',
        '172.16.5.4',
        '172.31.255.255',
        '192.168.1.1',
        '169.254.169.254', // cloud metadata
        '100.64.0.1', // CGNAT
        '0.0.0.0',
      ]) {
        expect(isPrivateIp(ip), ip).toBe(true);
      }
    });

    it('blocks loopback / ULA / link-local IPv6 (incl. v4-mapped)', () => {
      for (const ip of ['::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', '::ffff:127.0.0.1']) {
        expect(isPrivateIp(ip), ip).toBe(true);
      }
    });

    it('allows public IPs', () => {
      for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111']) {
        expect(isPrivateIp(ip), ip).toBe(false);
      }
    });

    it('treats non-IP strings as unsafe', () => {
      expect(isPrivateIp('not-an-ip')).toBe(true);
    });
  });

  describe('safeFetchBuffer', () => {
    it('rejects non-http(s) schemes', async () => {
      await expect(safeFetchBuffer('file:///etc/passwd')).rejects.toBeInstanceOf(SafeFetchError);
      await expect(safeFetchBuffer('ftp://example.com/x')).rejects.toBeInstanceOf(SafeFetchError);
    });

    it('rejects literal private-host URLs without making a request', async () => {
      await expect(safeFetchBuffer('http://127.0.0.1/')).rejects.toBeInstanceOf(SafeFetchError);
      await expect(
        safeFetchBuffer('http://169.254.169.254/latest/meta-data/'),
      ).rejects.toBeInstanceOf(SafeFetchError);
      await expect(safeFetchBuffer('http://[::1]/')).rejects.toBeInstanceOf(SafeFetchError);
    });

    it('rejects malformed URLs', async () => {
      await expect(safeFetchBuffer('http://')).rejects.toBeInstanceOf(SafeFetchError);
    });
  });
});
