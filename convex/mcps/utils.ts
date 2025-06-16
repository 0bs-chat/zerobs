import { verifyJwt } from "../utils/encryption";

export async function verifyEnv(
  env: Record<string, string>,
): Promise<Record<string, string>> {
  const envJwts: Record<string, string> = {};
  await Promise.all(
    Object.entries(env).map(async ([key, value]) => {
      const { value: decryptedValue } = await verifyJwt(value);
      envJwts[key] = decryptedValue;
    }),
  );
  return envJwts;
}
