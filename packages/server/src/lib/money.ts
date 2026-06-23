/**
 * The shared GST engine works in `number` paise (safe well past any realistic
 * hotel bill — Number.MAX_SAFE_INTEGER is ~90 trillion paise = ₹900 billion).
 * Postgres stores paise as BigInt. These helpers bridge the two at the edges.
 */

export function toBig(paise: number): bigint {
  if (!Number.isInteger(paise)) {
    throw new Error(`Refusing to store non-integer paise: ${paise}`);
  }
  return BigInt(paise);
}

export function fromBig(paise: bigint): number {
  if (paise > BigInt(Number.MAX_SAFE_INTEGER) || paise < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error(`Paise value out of safe integer range: ${paise}`);
  }
  return Number(paise);
}
