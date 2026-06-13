import { Hono } from "hono";

const proxy = new Hono();

// Known streaming CDN → correct Referer mapping
// These CDN servers check the Referer to make sure requests come from an allowed site
const REFERER_MAP: Record<string, string> = {
  "server.digitalsun.app": "https://cineby.ru/",
  "digitalsun.app": "https://cineby.ru/",
  "rabbitstream.net": "https://cineby.ru/",
  "dokicloud.one": "https://cineby.ru/",
  "megacloud.tv": "https://cineby.ru/",
};

function getRefererForUrl(targetUrl: string, customReferer?: string): string {
  if (customReferer) return customReferer;

  try {
    const hostname = new URL(targetUrl).hostname;
    // Check exact match first, then check if any key is part of the hostname
    for (const [cdnDomain, referer] of Object.entries(REFERER_MAP)) {
      if (hostname === cdnDomain || hostname.endsWith("." + cdnDomain)) {
        return referer;
      }
    }
  } catch {}

  // Default: use the target URL's own origin as referer
  try {
    return new URL(targetUrl).origin + "/";
  } catch {
    return "";
  }
}

// Proxy endpoint: GET /api/proxy?url=<encoded-url>&referer=<optional-referer>
// Fetches the given URL server-side to bypass CORS restrictions.
proxy.get("/", async (c) => {
  const targetUrl = c.req.query("url");
  const customReferer = c.req.query("referer");

  if (!targetUrl) {
    return c.json({ error: "Missing 'url' query parameter" }, 400);
  }

  try {
    const referer = getRefererForUrl(targetUrl, customReferer);
    const origin = referer ? new URL(referer).origin : new URL(targetUrl).origin;

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": referer,
        "Origin": origin,
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
      },
    });

    if (!response.ok) {
      // Log the failure for debugging
      console.error(`[proxy] Upstream returned ${response.status} for ${targetUrl} (Referer: ${referer})`);
      return c.json(
        { error: `Upstream returned ${response.status}: ${response.statusText}` },
        response.status as any
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const body = await response.arrayBuffer();

    // If it's an m3u8 playlist, rewrite internal URLs to also go through the proxy
    if (contentType.includes("mpegurl") || targetUrl.includes(".m3u8")) {
      let text = new TextDecoder().decode(body);
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

      // Build the referer param to pass along to sub-requests
      const refererParam = customReferer ? `&referer=${encodeURIComponent(customReferer)}` : "";

      // Rewrite relative URLs in the playlist to absolute proxy URLs
      // Match .ts segments, .m3u8 sub-playlists, and key URIs
      text = text.replace(/^(?!#)(.+)$/gm, (match) => {
        const trimmed = match.trim();
        if (!trimmed || trimmed.startsWith("#")) return match;
        const absoluteUrl = trimmed.startsWith("http") ? trimmed : baseUrl + trimmed;
        return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}${refererParam}`;
      });

      // Also rewrite URI= references inside #EXT-X-KEY and similar tags
      text = text.replace(/URI="([^"]+)"/g, (_match, uri) => {
        const absoluteUrl = uri.startsWith("http") ? uri : baseUrl + uri;
        return `URI="/api/proxy?url=${encodeURIComponent(absoluteUrl)}${refererParam}"`;
      });

      return new Response(text, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    }

    // For .ts segments and other binary data, pass through directly
    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    console.error("[proxy] Error fetching:", err.message);
    return c.json({ error: "Failed to fetch: " + err.message }, 502);
  }
});

export default proxy;
