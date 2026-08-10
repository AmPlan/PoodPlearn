import { getBaseUrl } from "@/lib/baseUrl";
import type { TherapistServiceResult } from "../../types/therapist.types";

export type ServerContext = { origin: string; cookieHeader?: string };

async function resolveServerContext(
  serverContext?: ServerContext
): Promise<ServerContext | undefined> {
  if (serverContext) {
    return serverContext;
  }

  if (typeof window !== "undefined") {
    return undefined;
  }

  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const origin = getBaseUrl();

    return {
      origin,
      cookieHeader: cookieStore.toString(),
    };
  } catch {
    return undefined;
  }
}

/**
 * Unified fetch helper used by all API modules.  Returns
 * `TherapistServiceResult<T>` so callers never have to handle raw errors.
 */
export async function request<T>(
  basePath: string,
  endpoint: string,
  options?: RequestInit,
  serverContext?: ServerContext
): Promise<TherapistServiceResult<T>> {
  try {
    const resolvedContext = await resolveServerContext(serverContext);
    const cookieHeader = resolvedContext?.cookieHeader;
    const origin =
      resolvedContext?.origin ||
      (typeof window !== "undefined"
        ? window.location.origin
        : getBaseUrl());

    const normalizedBasePath = basePath.startsWith("/") ? basePath : `/${basePath}`;
    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const requestUrl =
      endpoint.startsWith("http://") || endpoint.startsWith("https://")
        ? endpoint
        : new URL(`${normalizedBasePath}${normalizedEndpoint}`, origin).toString();

    const response = await fetch(requestUrl, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        errorMessage:
          errorData.error || errorData.message || `Request failed with status ${response.status}`,
      };
    }

    const data = (await response.json()) as T;
    return { success: true, data };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      errorMessage: "Network error. Please check your connection and try again.",
    };
  }
}
