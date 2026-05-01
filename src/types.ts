export interface Env {
  DB: D1Database;
  JWT_PUBLIC_KEY: string;
}

export interface JwtPayload {
  sub: string;
  app: string;
  roles: string[];
  email: string;
  org_unit: string;
  department: string;
  manager_cuid: string | null;
  iat: number;
  exp: number;
}
