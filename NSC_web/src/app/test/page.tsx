"use client";

import { createAuthClient } from "better-auth/client";
import { useEffect } from "react";

const authClient = createAuthClient();

export default function Test() {
  useEffect(() => {
    void authClient.signIn.social({
      provider: "google",
    });
  }, []);

  return null;
}
