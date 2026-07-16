import type { TherapistServiceResult } from "../../types/therapist.types";
import { request, type ServerContext } from "./apiClient";

const BASE = "/api/v1";

export function fetchSessionsApi<T>(
  endpoint: string,
  options?: RequestInit,
  serverContext?: ServerContext
): Promise<TherapistServiceResult<T>> {
  return request<T>(BASE, endpoint, options, serverContext);
}
