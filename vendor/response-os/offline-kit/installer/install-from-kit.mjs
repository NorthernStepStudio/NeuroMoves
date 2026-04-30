import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const kitRoot = path.resolve(__dirname, '..');
const artifactsDir = path.join(kitRoot, 'artifacts');

const args = parseArgs(process.argv.slice(2));
const appDirArg = args['app-dir'];
if (!appDirArg) {
  fail('Missing required --app-dir argument.');
}

const appDir = path.resolve(process.cwd(), appDirArg);
const appId = args['app-id'] || 'client-app';
const doScaffold = !hasFlag(args, 'no-scaffold');
const force = hasFlag(args, 'force');

ensureAppDir(appDir);
const tarball = resolveTarballPath(args.tarball);

log(`Installing tarball: ${tarball}`);
runNpmInstall(appDir, tarball);

if (doScaffold) {
  scaffoldClientFiles(appDir, appId, force);
}

log('Install completed.');
if (doScaffold) {
  log(`Next: import runResponseOS from "${path.join('responseos', 'client.js')}"`);
}

function parseArgs(argv) {
  const output = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      output[key] = true;
    } else {
      output[key] = next;
      index += 1;
    }
  }
  return output;
}

function hasFlag(argsObj, key) {
  return argsObj[key] === true;
}

function ensureAppDir(appDirPath) {
  if (!existsSync(appDirPath)) {
    fail(`App directory does not exist: ${appDirPath}`);
  }
  const packageJsonPath = path.join(appDirPath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    fail(`No package.json found in app directory: ${appDirPath}`);
  }
}

function resolveTarballPath(tarballArg) {
  if (tarballArg) {
    const absolute = path.resolve(process.cwd(), tarballArg);
    if (!existsSync(absolute)) {
      fail(`Tarball path does not exist: ${absolute}`);
    }
    return absolute;
  }

  if (!existsSync(artifactsDir)) {
    fail(`Artifacts directory not found: ${artifactsDir}`);
  }

  const tarballs = readdirSync(artifactsDir).filter((name) => name.endsWith('.tgz')).sort();
  if (tarballs.length === 0) {
    fail(`No .tgz files found in: ${artifactsDir}`);
  }

  return path.join(artifactsDir, tarballs[tarballs.length - 1]);
}

function runNpmInstall(appDirPath, tarballPath) {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const quotedTarball = tarballPath.includes(' ') ? `"${tarballPath}"` : tarballPath;
  const command = `${npmCmd} install ${quotedTarball} --save --no-audit --no-fund`;
  execSync(command, {
    cwd: appDirPath,
    stdio: 'inherit',
  });
}

function scaffoldClientFiles(appDirPath, appIdValue, forceWrite) {
  const responseOsDir = path.join(appDirPath, 'responseos');
  mkdirSync(responseOsDir, { recursive: true });

  const clientFile = path.join(responseOsDir, 'client.js');
  const usageFile = path.join(responseOsDir, 'USAGE.txt');

  writeFileUnlessExists(clientFile, buildClientTemplate(appIdValue), forceWrite);
  writeFileUnlessExists(usageFile, buildUsageTemplate(), forceWrite);
}

function writeFileUnlessExists(target, content, forceWrite) {
  if (!forceWrite && existsSync(target)) {
    log(`Skipped existing file: ${target}`);
    return;
  }
  writeFileSync(target, content);
  log(`Wrote: ${target}`);
}

function buildClientTemplate(appIdValue) {
  return [
    "import { createAppClient, createDefaultAppConfig, InMemoryStore } from '@nss/response-os';",
    '',
    `const appConfig = createDefaultAppConfig('${escapeString(appIdValue)}');`,
    "appConfig.defaultProvider = 'off';",
    '',
    'const client = createAppClient({',
    '  appConfig,',
    '  memoryStore: new InMemoryStore(),',
    '});',
    '',
    'export async function runResponseOS({',
    '  message,',
    "  userId = 'anonymous',",
    "  sessionId = 'default-session',",
    "  platform = 'web',",
    "  locale = 'en-US',",
    "  timezone = 'UTC',",
    '  appState,',
    '}) {',
    '  return client.run({',
    '    userMessage: message,',
    '    userId,',
    '    sessionId,',
    '    platform,',
    '    locale,',
    '    timezone,',
    '    appState,',
    '  });',
    '}',
    '',
    'export async function runResponseOSPlan(goal, options = {}) {',
    '  return client.runPlanSaveExport({',
    '    goal,',
    '    userId: options.userId ?? "anonymous",',
    '    sessionId: options.sessionId ?? "default-session",',
    '    platform: options.platform ?? "web",',
    '    locale: options.locale ?? "en-US",',
    '    timezone: options.timezone ?? "UTC",',
    '    exportFormat: options.exportFormat ?? "csv",',
    '    appState: options.appState,',
    '  });',
    '}',
    '',
  ].join('\n');
}

function buildUsageTemplate() {
  return [
    'ResponseOS Client Usage',
    '=======================',
    '',
    '1) Import runResponseOS from responseos/client.js',
    '2) Call:',
    "   const result = await runResponseOS({ message: 'Hello' });",
    '3) Render result.message and optional result.actions/artifacts.',
    '',
    'To run workflow export:',
    "   const result = await runResponseOSPlan('Improve onboarding');",
    '',
    'Default provider is OFF (deterministic mode).',
    'If you want LLM mode later, edit client.js AppConfig defaultProvider.',
  ].join('\n');
}

function escapeString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function fail(message) {
  process.stderr.write(`[responseos-install] ERROR: ${message}\n`);
  process.exit(1);
}

function log(message) {
  process.stdout.write(`[responseos-install] ${message}\n`);
}
