import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, JobStatus, Night } from './types.js';

const STATUSES: readonly string[] = ['ok', 'retry', 'fail'];

type Entry = { at: string; job: string; status: JobStatus; owner: string | null; error: string | null };

function parseLine(line: string): Entry | null {
  try {
    const v: unknown = JSON.parse(line);
    if (typeof v !== 'object' || v === null) return null;
    const o = v as Record<string, unknown>;
    if (typeof o.at !== 'string' || typeof o.job !== 'string') return null;
    if (typeof o.status !== 'string' || !STATUSES.includes(o.status)) return null;
    return {
      at: o.at,
      job: o.job,
      status: o.status as JobStatus,
      owner: typeof o.owner === 'string' ? o.owner : null,
      error: typeof o.error === 'string' ? o.error : null,
    };
  } catch {
    return null;
  }
}

export function readNight(runsDir: string, night: string): Night | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }

  const rows = new Map<string, DigestRow>();
  let badLines = 0;
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    const e = parseLine(line);
    if (!e) {
      badLines++;
      continue;
    }
    const row = rows.get(e.job);
    if (!row) {
      rows.set(e.job, {
        job: e.job,
        owner: e.owner,
        runs: 1,
        retries: e.status === 'retry' ? 1 : 0,
        lastStatus: e.status,
        lastError: e.error,
        firstAt: e.at,
        lastAt: e.at,
      });
      continue;
    }
    row.runs++;
    if (e.status === 'retry') row.retries++;
    row.owner = e.owner ?? row.owner;
    row.lastStatus = e.status;
    row.lastError = e.error;
    row.lastAt = e.at;
  }

  return { rows: [...rows.values()].sort((a, b) => a.job.localeCompare(b.job)), badLines };
}

export function counts(rows: DigestRow[]): Record<JobStatus, number> {
  const c: Record<JobStatus, number> = { ok: 0, retry: 0, fail: 0 };
  for (const r of rows) c[r.lastStatus]++;
  return c;
}
