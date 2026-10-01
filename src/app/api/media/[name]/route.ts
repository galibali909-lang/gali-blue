import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|mp4)$/.test(name)) return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(path.join(process.cwd(), "storage", "uploads", name));
    const mime: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4" };
    const headers = { "Content-Type": mime[name.split(".").pop()!], "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=31536000, immutable", "Accept-Ranges": "bytes" };
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!match) return new Response(null, { status: 416 });
      const start = Number(match[1]); const end = match[2] ? Number(match[2]) : bytes.length - 1;
      if (start > end || end >= bytes.length) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${bytes.length}` } });
      return new Response(bytes.subarray(start, end + 1), { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${bytes.length}`, "Content-Length": String(end - start + 1) } });
    }
    return new Response(bytes, { headers: { ...headers, "Content-Length": String(bytes.length) } });
  } catch { return new Response(null, { status: 404 }); }
}