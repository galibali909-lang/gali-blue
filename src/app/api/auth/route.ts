import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, HttpError } from "@/lib/auth";
import { apiError, checkOrigin, jsonBody, rateLimit } from "@/lib/http";
import { withBookingLock } from "@/lib/booking";

const schema = z.object({ email: z.email().transform(value => value.toLowerCase()), password: z.string().min(1).max(72), name: z.string().min(2).max(100).optional(), setup: z.boolean().optional() }).superRefine((input, context) => {
  if ((input.setup || process.env.NODE_ENV === "production") && input.password.length < 12) context.addIssue({ code: "custom", path: ["password"], message: "Au moins 12 caracteres." });
});
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = schema.parse(await jsonBody(request));
    await rateLimit(`login:${input.email}`, 8, 900);
    let staff;
    if (input.setup) {
      if (process.env.NODE_ENV === "production" || process.env.LOCAL_SETUP_ENABLED !== "true" || !["localhost", "127.0.0.1"].includes(new URL(request.url).hostname)) throw new HttpError("Initialisation locale desactivee.", 403);
      const passwordHash = await hash(input.password, 12);
      staff = await withBookingLock(async transaction => {
        if (await transaction.staff.count({ where: { passwordHash: { not: null } } })) throw new HttpError("Un compte existe deja.", 409);
        return transaction.staff.create({ data: { name: input.name || "Administrateur", email: input.email, role: "ADMIN", job: "Direction", passwordHash } });
      });
    } else {
      staff = await db.staff.findUnique({ where: { email: input.email } });
      if (!staff?.active || !staff.passwordHash || !await compare(input.password, staff.passwordHash)) throw new HttpError("Identifiants incorrects.", 401);
    }
    const session = await getSession();
    session.staffId = staff.id; session.version = staff.sessionVersion;
    await session.save();
    await db.audit.create({ data: { actor: staff.name, action: "CONNEXION", detail: input.setup ? "Creation du premier administrateur." : "Connexion au dashboard." } });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request) {
  try { checkOrigin(request); (await getSession()).destroy(); return Response.json({ ok: true }); }
  catch (error) { return apiError(error); }
}