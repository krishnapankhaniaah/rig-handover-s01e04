import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { readNight } from '../src/digest/reader.js';

function appWith(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return createApp({ adapter: 'shim', installed: 'x', beatEverySeconds: 60, runsDir: dir });
}

const ok = '{"at":"2026-10-28T23:00:02+01:00","job":"b/job","status":"ok","owner":"rook"}\n';
const fail = '{"at":"2026-10-28T23:01:02+01:00","job":"a/job","status":"fail","owner":null,"error":"boom"}\n';

describe('reader on the real night', () => {
  it('gives 5 jobs and 1 bad line', () => {
    const n = readNight('runs', '2026-10-28');
    expect(n?.rows).toHaveLength(5);
    expect(n?.badLines).toBe(1);
    const fx = n?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(fx).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok' });
  });
});

describe('digest page', () => {
  it('renders sorted rows with warnings', async () => {
    const res = await appWith({ '2026-10-28.jsonl': ok + fail }).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html.indexOf('a/job')).toBeLessThan(html.indexOf('b/job'));
    expect(html).toContain('fail !');
    expect(html).toContain('—');
  });

  it('404 for a night with no file', async () => {
    const res = await appWith({}).request('/digest/2026-10-01');
    expect(res.status).toBe(404);
  });

  it('renders "nothing ran" for an empty file', async () => {
    const res = await appWith({ '2026-10-02.jsonl': '' }).request('/digest/2026-10-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('counts a bad line and still renders', async () => {
    const res = await appWith({ '2026-10-03.jsonl': ok + '{"at":"2026-10-2' }).request('/digest/2026-10-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('b/job');
    expect(html).toContain('1 unreadable');
  });
});

describe('digest json', () => {
  it('has the same jobs in the same order as the page', async () => {
    const app = appWith({ '2026-10-28.jsonl': ok + fail });
    const rows = (await (await app.request('/api/digest/2026-10-28')).json()) as { job: string }[];
    expect(rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
    const html = await (await app.request('/digest/2026-10-28')).text();
    expect(html.indexOf(rows[0]!.job)).toBeLessThan(html.indexOf(rows[1]!.job));
  });

  it('404 for a night with no file', async () => {
    expect((await appWith({}).request('/api/digest/2026-10-01')).status).toBe(404);
  });

  it('empty night is an empty list', async () => {
    const res = await appWith({ '2026-10-02.jsonl': '' }).request('/api/digest/2026-10-02');
    expect(await res.json()).toEqual([]);
  });
});

describe('board links', () => {
  it('links each night with counts', async () => {
    const html = await (await appWith({ '2026-10-28.jsonl': ok + fail }).request('/')).text();
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('ok 1 · retry 0 · fail 1');
  });
});
