import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";

// In-memory HTTPS doubles: never contacts a third party or bypasses production DNS policy.
export function attachmentTransport(fixtures = new Map()) {
  const calls = [];
  const dependencies = {
    allowedHosts: () => ["attachments.example.com"],
    lookup: async () => [{ address: "93.184.216.34", family: 4 }],
    request(url, options, callback) {
      calls.push(url.pathname);
      assert.equal(options.agent, false);
      assert.notEqual(options.rejectUnauthorized, false);
      assert(!options.headers.Authorization && !options.headers.Cookie);
      options.lookup(url.hostname, { family: 4 }, (error, address, family) => {
        assert.equal(error, null); assert.equal(address, "93.184.216.34"); assert.equal(family, 4);
      });
      const req = new EventEmitter();
      req.end = () => {
        const fixture = fixtures.get(url.pathname);
        if (fixture?.hang) return;
        const response = Readable.from(fixture?.chunks ?? [fixture?.bytes ?? Buffer.from("missing")]);
        response.statusCode = fixture?.status ?? (fixture ? 200 : 404);
        response.headers = fixture?.headers ?? { "content-type": fixture?.mime ?? "application/octet-stream" };
        callback(response);
      };
      options.signal.addEventListener("abort", () => req.emit("error", new Error("Test request aborted")), { once: true });
      return req;
    }
  };
  return { dependencies, calls, fixtures };
}

export function attachmentRef(name, mime) {
  return { download_url: `https://attachments.example.com/${name}?temporary=fixture-only`, file_id: `file_${name.replace(/[^a-zA-Z0-9]/g, "_")}`, ...(mime ? { mime_type: mime } : {}), file_name: name };
}
