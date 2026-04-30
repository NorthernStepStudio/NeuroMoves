import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageDir = path.resolve(__dirname, '..');
const kitDir = path.join(packageDir, 'offline-kit');
const artifactsDir = path.join(kitDir, 'artifacts');
const installerDir = path.join(kitDir, 'installer');

buildOfflineKit();

function buildOfflineKit() {
  const pkg = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8'));

  log('Building @nss/response-os ...');
  run('npm run build', packageDir);

  log('Packing npm tarball ...');
  const tarballName = run('npm pack --silent', packageDir).split(/\r?\n/).filter(Boolean).at(-1);
  if (!tarballName) {
    throw new Error('npm pack did not return a tarball name.');
  }

  rmSync(kitDir, { recursive: true, force: true });
  mkdirSync(artifactsDir, { recursive: true });
  mkdirSync(installerDir, { recursive: true });

  const tarballSource = path.join(packageDir, tarballName);
  const tarballTarget = path.join(artifactsDir, tarballName);
  copyFileSync(tarballSource, tarballTarget);
  rmSync(tarballSource, { force: true });

  copyFileSync(path.join(__dirname, 'install-from-kit.mjs'), path.join(installerDir, 'install-from-kit.mjs'));
  copyFileSync(path.join(__dirname, 'install-responseos.ps1'), path.join(installerDir, 'install-responseos.ps1'));

  const manifest = {
    product: '@nss/response-os',
    version: pkg.version,
    createdAt: new Date().toISOString(),
    tarball: `artifacts/${tarballName}`,
  };

  writeFileSync(path.join(kitDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  writeFileSync(path.join(kitDir, 'README.txt'), buildReadme(tarballName, pkg.version));

  log(`Offline kit created: ${kitDir}`);
  log('Copy this entire folder to your external drive.');
}

function run(command, cwd) {
  return execSync(command, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function buildReadme(tarballName, version) {
  return [
    'ResponseOS Offline Install Kit',
    '==============================',
    '',
    `Package: @nss/response-os`,
    `Version: ${version}`,
    `Tarball: artifacts/${tarballName}`,
    '',
    'Use on client machine (Windows PowerShell):',
    '1. Open PowerShell in this folder.',
    '2. Run:',
    '   .\\installer\\install-responseos.ps1 -AppDir "C:\\path\\to\\client-app" -AppId "client-app-id"',
    '',
    'Requirements on client machine:',
    '- Node.js 20+',
    '- npm',
    '- Existing app folder with package.json',
    '',
    'What installer does:',
    '- Installs @nss/response-os from local tarball (offline)',
    '- Creates a starter responseos/client.js integration file (unless disabled)',
  ].join('\n');
}

function log(message) {
  process.stdout.write(`[responseos-kit] ${message}\n`);
}
