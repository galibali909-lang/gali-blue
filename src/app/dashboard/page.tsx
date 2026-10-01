import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth";
import { dashboardData } from "@/lib/dashboard";
import { Dashboard } from "@/components/dashboard/dashboard";
import "./dashboard.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const staff = await currentStaff();
  if (!staff) redirect("/connexion");
  return <Dashboard initial={await dashboardData(staff)} initialView={(await searchParams).view || "overview"}/>;
}