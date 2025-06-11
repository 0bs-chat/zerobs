import { verifyJwt } from "../utils/encryption";

export async function verifyEnv(env: string[]): Promise<Record<string, string>> {
  const envJwts = await Promise.all(env.map(async (env) => verifyJwt(env)));
  return envJwts.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);
}