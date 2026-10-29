import { counts } from '../digest/reader.js';
import { readNight } from '../digest/reader.js';
import type { Status } from '../status.js';

function summarize(runsDir: string, night: string): string {
  const data = readNight(runsDir, night);
  if (!data) return '—';
  const c = counts(data.rows);
  return `ok ${c.ok} · retry ${c.retry} · fail ${c.fail}`;
}

export function StatusBoard({ status, runsDir }: { status: Status; runsDir: string }) {
  return (
    <>
      <h1>status</h1>
      <table>
        <tbody>
          <tr><th>adapter</th><td>{status.adapter}</td></tr>
          <tr><th>installed</th><td>{status.installed}</td></tr>
          <tr>
            <th>last beat</th>
            <td>{status.lastBeat ? `${status.lastBeat.at} · pid ${status.lastBeat.pid}` : <span class="warn">none</span>}</td>
          </tr>
        </tbody>
      </table>
      <h2>nights on disk</h2>
      {status.nights.length === 0 ? (
        <p class="mute">nothing in runs/</p>
      ) : (
        <ul>
          {status.nights.map((n) => (
            <li>
              <a href={`/digest/${n}`}>{n}</a>{' '}
              <span class="mute">{summarize(runsDir, n)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
