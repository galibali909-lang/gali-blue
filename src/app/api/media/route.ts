import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { contentRoles, HttpError, requireStaff } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/http";

export async function POST(request: Request) {
  let target: string | undefined;
  try {
    checkOrigin(request);
    const staff = await requireStaff(contentRoles);
    if (Number(request.headers.get("content-length") || 0) > 30 * 1024 * 1024) throw new HttpError("Fichier trop volumineux (30 Mo maximum).", 413);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 30 * 1024 * 1024 || !file.size) throw new HttpError("Fichier invalide (30 Mo maximum).", 413);
    const bytes = Buffer.from(await file.arrayBuffer());
    let extension = "";
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) extension = "jpg";
    else if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extension = "png";
    else if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") extension = "webp";
    else if (file.type === "video/mp4" && bytes.toString("ascii", 4, 8) === "ftyp") extension = "mp4";
    if (!extension) throw new HttpError("Formats acceptes : JPEG, PNG, WebP et MP4.");
    if (extension !== "mp4" && file.size > 8 * 1024 * 1024) throw new HttpError("Image trop volumineuse (8 Mo maximum).");
    const directory = path.join(process.cwd(), "storage", "uploads");
    await mkdir(directory, { recursive: true });
    const name = `${randomUUID()}.${extension}`;
    target = path.join(directory, name);
    await writeFile(target, bytes, { flag: "wx" });
    const media = await db.media.create({ data: { url: `/api/media/${name}`, title: file.name.slice(0, 120), kind: extension === "mp4" ? "video" : "image" } });
    target = undefined;
    await db.audit.create({ data: { actor: staff.name, action: "MEDIA", detail: "Fichier ajoute a la mediatheque." } });
    return Response.json(media, { status: 201 });
  } catch (error) {
    if (target) await unlink(target).catch(() => {});
    return apiError(error);
  }
}