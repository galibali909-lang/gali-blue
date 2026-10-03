import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseContent } from "@/lib/content";
import { roleLabels } from "@/lib/domain";
import { AccountForm } from "@/components/account-form";
import "../dashboard/dashboard.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon compte" };
export default async function AccountPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/connexion");
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  return <AccountForm name={staff.name} role={roleLabels[staff.role]} required={staff.mustChangePassword} content={parseContent(settings.content)}/>;
}