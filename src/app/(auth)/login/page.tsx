import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth";
import LoginLayout from "./LoginLayout";
import { isPlanTier } from "@/lib/plans";
import { isPlanAllowlisted } from "@/lib/plan-access";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user, profile } = await getUserContext();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const confirmedValue = resolvedSearchParams?.confirmed;
  const confirmed =
    confirmedValue === "1" ||
    (Array.isArray(confirmedValue) && confirmedValue.includes("1"));
  const errorValue = resolvedSearchParams?.error;
  const reasonValue = resolvedSearchParams?.reason;
  const authError = Array.isArray(errorValue) ? errorValue[0] : errorValue;
  const authErrorReason = Array.isArray(reasonValue) ? reasonValue[0] : reasonValue;
  const planValue = resolvedSearchParams?.plan;
  const selectedPlan = Array.isArray(planValue) ? planValue[0] : planValue;

  if (user && profile?.role) {
    if (profile.role === "comercio" && selectedPlan && isPlanTier(selectedPlan)) {
      if (isPlanAllowlisted(profile)) {
        redirect("/comercio");
      }
      redirect(`/comercio/planes?plan=${selectedPlan}`);
    }
    redirect(`/${profile.role}`);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("Login auth snapshot", {
      hasUser: !!user,
      hasProfile: !!profile,
      role: profile?.role ?? null,
      plan: selectedPlan ?? null,
    });
  }

  return (
    <LoginLayout
      confirmed={confirmed}
      initialPlan={selectedPlan}
      authError={authError}
      authErrorReason={authErrorReason}
    />
  );
}
