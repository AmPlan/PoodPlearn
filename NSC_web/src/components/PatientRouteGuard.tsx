"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession } from "@/features/auth/services/authSession";

export default function PatientRouteGuard() {
  const router = useRouter();

  useEffect(() => {
    const session = getAuthSession();

    if (session?.role === "patient") {
      router.replace("/patient/home");
    }
  }, [router]);

  return null;
}
