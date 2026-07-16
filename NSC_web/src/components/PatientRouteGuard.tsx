"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession } from "@/features/auth/services/authSession";

export default function PatientRouteGuard() {
  const router = useRouter();

  useEffect(() => {
    const session = getAuthSession();

    if (session?.role === "patient") {
      // Ensure patients are always redirected to the Today Training entry
      router.replace("/patient/training/today");
    }
  }, [router]);

  return null;
}
