export function validOrigin(origin: string | null, expected: string): boolean {
  return origin === expected;
}
export function validPassword(password: string): boolean {
  return password.length >= 12 && password.length <= 128;
}
export function safeNext(value: string | null): string {
  return value === '/account/password' ? value : '/account';
}
export async function boundedForm(request: Request): Promise<URLSearchParams> {
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) throw new Error('Unsupported form');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing form');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 16384) { await reader.cancel(); throw new Error('Form too large'); } chunks.push(part.value); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new URLSearchParams(new TextDecoder().decode(bytes));
}
