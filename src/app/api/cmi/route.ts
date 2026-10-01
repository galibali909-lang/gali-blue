export async function POST() {
  return Response.json({ error: "Integration CMI non configuree. Aucun paiement accepte." }, { status: 503 });
}