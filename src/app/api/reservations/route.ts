import { createBooking } from "@/lib/booking";
import { apiError, checkOrigin, jsonBody, rateLimit } from "@/lib/http";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = await jsonBody(request);
    await rateLimit("public-bookings", 100, 60);
    await rateLimit(`booking:${String(input.phone).replace(/\D/g, "")}`, 5, 3600);
    return Response.json(await createBooking(input), { status: 201 });
  } catch (error) { return apiError(error); }
}