/**
 * The single network boundary of this kit.
 *
 * Every call to the outside world goes through Monid, and Monid is reached
 * through the CLI the official `monid` skill installs. That is deliberate:
 * one key, one balance, one place where cost is visible, and no per vendor
 * signup for Semrush, Reddit, an answer engine or a scraper.
 *
 * The CLI is spawned as `node <cli entry>` rather than as `monid`. On Windows
 * the `monid.cmd` shim goes through cmd.exe, which mangles JSON arguments and
 * rewrites anything that looks like a POSIX path, so `-e /api/v1/exa/answer`
 * arrives as a drive letter. Resolving the package entry and running it under
 * the current node binary with an argv array skips both problems, and it works
 * the same way on macOS and Linux.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

let cachedEntry = null;

/** Every place a global npm install puts its packages, per platform. */
function globalRoots() {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? '';
  const nodeDir = dirname(process.execPath);
  return [
    process.env.NODE_PATH,
    process.env.APPDATA && join(process.env.APPDATA, 'npm', 'node_modules'),
    join(nodeDir, 'node_modules'),
    join(nodeDir, '..', 'lib', 'node_modules'),
    '/usr/local/lib/node_modules',
    '/usr/lib/node_modules',
    home && join(home, '.npm-global', 'lib', 'node_modules'),
    home && join(home, '.nvm', 'versions'),
  ].filter(Boolean);
}

/** Absolute path to the Monid CLI's JS entry point. */
export function resolveCli() {
  if (cachedEntry) return cachedEntry;

  if (process.env.MONID_CLI && existsSync(process.env.MONID_CLI)) {
    return (cachedEntry = process.env.MONID_CLI);
  }

  const fromPackage = (pkgJsonPath) => {
    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.monid;
    if (!bin) return null;
    const entry = join(pkgJsonPath, '..', bin);
    return existsSync(entry) ? entry : null;
  };

  // Installed as a local dependency, or hoisted somewhere above us.
  try {
    const entry = fromPackage(require.resolve('@monid-ai/cli/package.json'));
    if (entry) return (cachedEntry = entry);
  } catch { /* not local, try the global root */ }

  // The normal case: installed globally by `npm install -g @monid-ai/cli`.
  // The global root is derived from known layouts rather than by shelling out
  // to `npm root -g`: spawning npm.cmd on Windows needs a shell, and running
  // one just to learn a directory name is a slow way to be less portable.
  for (const root of globalRoots()) {
    const pkgJson = join(root, '@monid-ai', 'cli', 'package.json');
    if (!existsSync(pkgJson)) continue;
    const entry = fromPackage(pkgJson);
    if (entry) return (cachedEntry = entry);
  }

  throw new Error(
    'Monid CLI not found. Install it and add your key:\n' +
    '  npm install -g @monid-ai/cli@latest\n' +
    '  monid setup\n' +
    '  monid keys add -k <your key from https://app.monid.ai/access/api-keys> -l main\n' +
    'Or point MONID_CLI at the CLI entry file directly.',
  );
}

function cli(args, { timeoutMs = 180_000 } = {}) {
  const entry = resolveCli();
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...args], {
      env: { ...process.env, NO_COLOR: '1' },
      windowsHide: true,
    });
    let out = '', err = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`monid ${args[0]} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(`monid ${args.join(' ')} exited ${code}\n${err || out}`));
      }
      try {
        resolve(JSON.parse(out));
      } catch {
        reject(new Error(`monid ${args[0]} did not return JSON:\n${out.slice(0, 500)}`));
      }
    });
  });
}

/** Free. Search the catalogue in plain language. */
export const discover = (query, limit = 8) =>
  cli(['discover', '-q', query, '-l', String(limit), '-j']);

/** Free. Read an endpoint's real input schema and price before calling it. */
export const inspect = (provider, endpoint) =>
  cli(['inspect', '-p', provider, '-e', endpoint, '-j']);

/** Current wallet balance. */
export const balance = () => cli(['balance', '-j']);

/**
 * The only paid call. `input` mirrors what `inspect` returns:
 *   body        -> -i
 *   queryParams -> --query
 *   pathParams  -> --path
 *
 * Waits inline, then falls back to polling if the wait window closes before
 * the run does. A run that is still RUNNING when the deadline passes is a
 * timeout, never an empty result: silently returning nothing here would be
 * indistinguishable from a genuine zero, which is the failure mode every
 * measurement in this kit is built to avoid.
 */
export async function run(provider, endpoint, input = {}, opts = {}) {
  const { waitSeconds = 120, pollSeconds = 5 } = opts;
  const args = ['run', '-p', provider, '-e', endpoint];
  if (input.body) args.push('-i', JSON.stringify(input.body));
  if (input.queryParams) args.push('--query', JSON.stringify(input.queryParams));
  if (input.pathParams) args.push('--path', JSON.stringify(input.pathParams));
  args.push('-j');

  // Fire and poll, rather than waiting inline. `--wait` looks simpler and is
  // not: when its window closes on a run that is merely slow, the command
  // exits non zero and the run id goes with it, so a job that was about to
  // finish is indistinguishable from one that failed. Firing first means the
  // id is in hand before anything can time out.
  let record = await cli(args, { timeoutMs: 90_000 });

  const deadline = Date.now() + waitSeconds * 1000;
  while (!isTerminal(record.status)) {
    if (Date.now() > deadline) {
      throw new Error(
        `run ${record.runId} still ${record.status} after ${waitSeconds}s on ${provider}${endpoint}. ` +
        `It may still finish: monid runs get -r ${record.runId}`,
      );
    }
    await sleep(pollSeconds * 1000);
    record = await cli(['runs', 'get', '-r', record.runId, '-j']);
  }

  if (record.status !== 'COMPLETED') {
    throw new Error(
      `run ${record.runId} ended ${record.status} on ${provider}${endpoint}` +
      (record.error ? `: ${JSON.stringify(record.error)}` : ''),
    );
  }
  return record;
}

const isTerminal = (s) =>
  ['COMPLETED', 'FAILED', 'BLOCKED', 'STOPPED', 'TIME_OUT'].includes(s);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * What one run actually cost, in dollars.
 *
 * The field depends on which call you are holding: `runs get` returns a `cost`
 * object, while a completed `run` returns `billing.reportedCost` in micro
 * dollars. Reading only one of them reports every run as free, which is worse
 * than reporting nothing at all.
 */
export function costOf(record) {
  if (record?.cost?.value != null) return Number(record.cost.value);

  const reported = record?.billing?.reportedCost;
  if (reported?.value != null) {
    return reported.unit === 'MICRO_DOLLAR'
      ? Number(reported.value) / 1e6
      : Number(reported.value);
  }

  // Last resort: the quoted price times what was billed. Close enough to keep
  // a running total honest, and it never silently reads as zero.
  const unit = Number(record?.price?.amount?.value ?? 0);
  const units = Number(record?.billedUnits ?? record?.resultCount ?? 1);
  return unit * units;
}

/**
 * Running total for one script, so every run can print what it spent.
 *
 * A pipeline that reports rows without reporting cost teaches you nothing
 * about whether to run it again next week.
 */
export function costMeter() {
  let usd = 0, calls = 0;
  return {
    add(record) {
      usd += costOf(record);
      calls += 1;
      return record;
    },
    get usd() { return usd; },
    get calls() { return calls; },
    line() { return `${calls} run(s), $${usd.toFixed(4)}`; },
  };
}
