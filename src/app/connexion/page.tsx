import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentStaff } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import "../dashboard/dashboard.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Espace equipe" };
export default async function LoginPage() {
  if (await currentStaff()) redirect("/dashboard");
  const setup = process.env.LOCAL_SETUP_ENABLED === "true" && process.env.NODE_ENV !== "production" && await db.staff.count({ where: { passwordHash: { not: null } } }) === 0;
  return <LoginForm setup={setup}/>;
}