import type { ClientSite } from '@/lib/client-sites';

const stageTone: Record<ClientSite['stage'], string> = {
  'In build': 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100',
  'In review': 'border-violet-400/40 bg-violet-400/10 text-violet-100',
  Live: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
  Paused: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
};

export function StageBadge({ stage }: { stage: ClientSite['stage'] }) {
  return <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${stageTone[stage]}`}>{stage}</span>;
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET';
}
