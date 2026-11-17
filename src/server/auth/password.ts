import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt parameters (OWASP-recommended range). Stored with each hash so they
// can be raised later without breaking existing passwords.
const N = 2 ** 15;
const r = 8;
const p = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 128 * N * r * 2;

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, { N, r, p, maxmem: MAX_MEMORY });
  return ["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, nText, rText, pText, saltText, keyText] = stored.split("$");
  if (algorithm !== "scrypt" || !saltText || !keyText) return false;
  const cost = Number(nText);
  const blockSize = Number(rText);
  const parallelism = Number(pText);
  if (![cost, blockSize, parallelism].every(Number.isInteger)) return false;

  const expected = Buffer.from(keyText, "base64");
  const actual = await derive(password, Buffer.from(saltText, "base64"), {
    N: cost,
    r: blockSize,
    p: parallelism,
    maxmem: 128 * cost * blockSize * 2,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A real hash of a random password, compared against when an email isn't found (equal timing). */
let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}
