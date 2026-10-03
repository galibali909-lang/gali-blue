import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, HttpError, requireStaff } from "@/lib/auth";
import { apiError, checkOrigin, jsonBody, rateLimit } from "@/lib/http";
import { withBookingLock } from "@/lib/booking";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const staff = await requireStaff(undefined, { allowPasswordChange: true });
    await rateLimit(`password:${staff.id}`, 5, 900);
    const input = z.object({ currentPassword: z.string().min(1).max(72), password: z.string().min(12).max(72).refine(value => Buffer.byteLength(value, "utf8") <= 72, "Mot de passe trop long."), confirmPassword: z.string().max(72) }).refine(value => value.password === value.confirmPassword, "Les mots de passe ne correspondent pas.").parse(await jsonBody(request));
    const existing = await db.staff.findUniqueOrThrow({ where: { id: staff.id }, select: { passwordHash: true } });
    if (!existing.passwordHash || !await compare(input.currentPassword, existing.passwordHash)) throw new HttpError("Mot de passe actuel incorrect.", 403);
    if (await compare(input.password, existing.passwordHash)) throw new HttpError("Choisissez un nouveau mot de passe different.");
    const passwordHash = await hash(input.password, 12);
    await withBookingLock(async transaction => {
      const changed = await transaction.staff.updateMany({ where: { id: staff.id, active: true, sessionVersion: staff.sessionVersion, passwordHash: existing.passwordHash }, data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } } });
      if (changed.count !== 1) throw new HttpError("Votre acces a change. Reconnectez-vous.", 409);
      await transaction.audit.create({ data: { actor: staff.name, action: "PASSWORD_CHANGE", detail: "Mot de passe personnel renouvele. Les anciennes sessions sont invalidees." } });
    });
    const session = await getSession();
    session.staffId = staff.id;
    session.version = staff.sessionVersion + 1;
    await session.save();
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}