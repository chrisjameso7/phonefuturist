/**
 * Public release smoke test.
 * Usage: node scripts/smoke-public-release.mjs https://your-staging-host
 * No authentication, secrets or write requests. Never treats a 3xx login as a success.
 */
const rawBase = process.argv[2];
if (!rawBase) {
  console.error('Usage: node scripts/smoke-public-release.mjs https://staging-host');
  process.exit(2);
}
const base = new URL(rawBase);
if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) {
  throw new Error('Provide an HTTP(S) origin without credentials.');
}
const origin = base.origin;
const cases = [
  {path:'/',expected:200,contains:'PhoneFuturist'},
  {path:'/articles',expected:200,contains:'PhoneFuturist'},
  {path:'/interactive-leaks',expected:200,contains:'Interactive'},
  {path:'/pro',expected:200,contains:'14-day free trial',alsoContains:['$4.99','39.99','payments are coming soon']},
  {path:'/assets/phonefuturist-mark.svg',expected:200,contains:'<svg'},
  {path:'/interactive-leaks/simulate',expected:302,location:'/interactive-leaks'},
];
let failures = 0;
for (const check of cases) {
  const url = new URL(check.path, origin);
  try {
    const response = await fetch(url, {
      redirect:'manual',
      signal:AbortSignal.timeout(15000),
      headers:{'Accept':'text/html, image/svg+xml'},
    });
    const body = await response.text();
    const actualLocation = response.headers.get('location');
    const redirectOk = !check.location || (actualLocation && new URL(actualLocation,url).pathname === check.location);
    const bodyOk = (!check.contains || body.toLowerCase().includes(check.contains.toLowerCase())) &&
      (!check.alsoContains || check.alsoContains.every(value => body.toLowerCase().includes(value.toLowerCase())));
    const securityOk = check.path.startsWith('/assets/') || (response.headers.get('x-content-type-options') === 'nosniff' && response.headers.get('x-frame-options') === 'DENY');
    const ok = response.status === check.expected && redirectOk && bodyOk && securityOk;
    console.log(`${ok?'PASS':'FAIL'} ${check.path}: HTTP ${response.status}${actualLocation?' -> '+actualLocation:''}`);
    if (!securityOk) console.error('  Missing mandatory security response headers.');
    if (!ok) failures++;
  } catch (error) {
    console.error(`FAIL ${check.path}: ${error instanceof Error?error.message:String(error)}`);
    failures++;
  }
}
if (failures) {
  console.error(`Release smoke test failed: ${failures} of ${cases.length} checks.`);
  process.exitCode=1;
} else {
  console.log(`Release smoke test passed: ${cases.length} public checks.`);
}
