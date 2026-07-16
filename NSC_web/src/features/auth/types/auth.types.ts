export type AuthRole = "patient" | "therapist";

export type AuthUser = {
  id: number;
  accessCode: string;
  role: AuthRole;
  displayName: string;
  patientId?: number | null;
  therapistId?: number | null;
};

export type LoginSuccessResult = {
  success: true;
  role: AuthRole;
  user: AuthUser;
  redirectPath: string;
  errorMessage?: never;
};

export type LoginFailureResult = {
  success: false;
  role?: never;
  user?: never;
  redirectPath?: never;
  errorMessage: string;
};

export type LoginResult = LoginSuccessResult | LoginFailureResult;
