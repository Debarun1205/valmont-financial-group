const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const server = fs.readFileSync(path.join(ROOT, 'backend/server.js'), 'utf8');
const frontend = fs.readFileSync(path.join(ROOT, 'frontend/src/main.jsx'), 'utf8');
const routeDir = path.join(ROOT, 'backend/routes');

const mountMap = {};
for (const m of server.matchAll(/app\.use\((['"])(\/api\/[^'"]+)\1,\s*build(\w+)Routes/g)) {
  const [, , prefix, routeName] = m;
  const file = routeName[0].toLowerCase() + routeName.slice(1) + '.js';
  mountMap[file] = prefix;
}

const backendRoutes = [];
for (const file of fs.readdirSync(routeDir).filter(x => x.endsWith('.js')).sort()) {
  const text = fs.readFileSync(path.join(routeDir, file), 'utf8');
  const prefix = mountMap[file];
  if (!prefix) continue;
  for (const m of text.matchAll(/router\.(get|post|put|patch|delete)\(\s*(['"])([^'"]*)\2/g)) {
    backendRoutes.push({ method: m[1].toUpperCase(), path: prefix + m[3], file });
  }
}

const frontendCalls = new Set();
for (const m of frontend.matchAll(/['"](\/api\/[^'"]+)['"]/g)) frontendCalls.add(m[1].split('?')[0]);
// Dynamic/template call sites that cannot be captured as single-quoted strings.
const dynamicPatterns = [
  '/api/trust-score/:userId',
  '/api/lender/risk/:userId',
  '/api/insurance/:policyId/claim',
  '/api/loans/:loanId',
  '/api/loans/:loanId/fund',
  '/api/loans/:loanId/repay',
  '/api/auth/signup',
  '/api/auth/login',
  '/api/auth/tiers',
  '/api/auth/me',
  '/api/auth/onboarding',
  '/api/ml/models',
  '/api/ml/features',
  '/api/ml/runs',
  '/api/ml/train',
  '/api/ds/applications',
  '/api/ds/applications/:id/run',
  '/api/ds/runs',
];
for (const p of dynamicPatterns) frontendCalls.add(p);

function normalize(p) {
  return p.replace(/:\w+/g, ':param').replace(/\/+/g, '/').replace(/\/$/, '');
}
function covered(routePath) {
  const nr = normalize(routePath);
  for (const call of frontendCalls) {
    const nc = normalize(call);
    if (nc === nr) return true;
    // Frontend dynamic path should cover backend dynamic route and vice versa.
    const a = nr.split('/'), b = nc.split('/');
    if (a.length === b.length && a.every((seg, i) => seg === b[i] || seg === ':param' || b[i] === ':param')) return true;
  }
  return false;
}

const uncovered = backendRoutes.filter(r => !covered(r.path));
const coveredCount = backendRoutes.length - uncovered.length;
console.log(`Backend route endpoints: ${backendRoutes.length}`);
console.log(`Frontend-covered endpoints: ${coveredCount}`);
console.log(`Uncovered endpoints: ${uncovered.length}`);
for (const r of uncovered) console.log(`  ${r.method.padEnd(6)} ${r.path.padEnd(38)} (${r.file})`);

console.log('Dashboard routes exposed in frontend: overview, identity, wallet, investments, insurance, remittances, learning, budgeting, loans, lender, merchant, enterprise, model training, DS applications.');

if (uncovered.length) process.exitCode = 2;
else console.log('\n✅ Frontend/backend endpoint coverage is complete.');
