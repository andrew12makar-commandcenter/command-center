'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  ArrowUpRight,
  Building2,
  Globe,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  PanelsTopLeft,
  PlayCircle,
  ScanSearch,
  Target,
  Upload,
} from 'lucide-react';

const sections = [
  {
    title: 'Jarvis COO',
    icon: LayoutDashboard,
    links: [{ href: '/app', label: 'Operating home', icon: LayoutDashboard }],
  },
  {
    title: 'Lead Engine',
    icon: Target,
    links: [
      { href: '/app/leads', label: 'Business CRM', icon: Building2 },
      { href: '/app/leads/shortlist', label: 'Two-need prospects', icon: Target },
      { href: '/app/discovery', label: 'Prospect Discovery', icon: ScanSearch },
      { href: '/app/discovery/government-map', label: 'Government map', icon: ScanSearch },
      { href: '/app/discovery/overture', label: 'Market map', icon: ScanSearch },
      { href: '/app/leads/import', label: 'Lead intake', icon: Upload },
      { href: '/app/opportunities', label: 'Opportunity Board', icon: ArrowUpRight },
      { href: '/app/rehearsal', label: 'Intake rehearsal', icon: PlayCircle },
    ],
  },
  {
    title: 'Client Delivery',
    icon: PanelsTopLeft,
    links: [
      { href: '/app/intelligence', label: 'Website Intelligence', icon: Activity },
      { href: '/app/demos', label: 'Demo Studio', icon: PanelsTopLeft },
      { href: '/app/client-sites', label: 'Client Builds & Demos', icon: Globe },
    ],
  },
  {
    title: 'Build & Systems',
    icon: ListChecks,
    links: [
      { href: '/app/roadmap', label: 'Build Roadmap', icon: ListChecks },
      { href: '/app/project-status', label: 'Agent Checkpoints', icon: ClipboardList },
    ],
  },
];

function isCurrentPath(pathname: string, href: string) {
  if (href === '/app') return pathname === href;
  if (href === '/app/leads') return pathname === href || pathname.startsWith('/app/leads/') && pathname !== '/app/leads/shortlist' && pathname !== '/app/leads/import';
  return pathname === href || pathname.startsWith(href + '/');
}

export default function CommandCenterNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Command Center sections" className="mt-7 space-y-2">
      {sections.map((section) => {
        const activeSection = section.links.some((link) => isCurrentPath(pathname, link.href));
        const SectionIcon = section.icon;
        return (
          <details key={section.title} className="nav-section rounded-2xl border border-[#243b47] bg-[#0d1922]" open={activeSection}>
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-3.5 py-3.5 text-sm font-semibold text-[#d3e3e8] hover:bg-[#172b36] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
              <SectionIcon size={17} className="text-[#75d6e7]" strokeWidth={1.8} />
              <span className="flex-1">{section.title}</span>
              <span aria-hidden="true" className="nav-chevron text-xs text-[#7f9aa6]">⌄</span>
            </summary>
            <div className="space-y-1 px-2 pb-2">
              {section.links.map((link) => {
                const Icon = link.icon;
                const active = isCurrentPath(pathname, link.href);
                return (
                  <Link
                    href={link.href}
                    key={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${active ? 'bg-[#1a3946] text-white ring-1 ring-inset ring-[#347284]' : 'text-[#a8bfcb] hover:bg-[#192d39] hover:text-white'}`}
                  >
                    <Icon size={15} strokeWidth={1.8} className={active ? 'text-[#75d6e7]' : 'text-[#829eaa]'} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </details>
        );
      })}
    </nav>
  );
}
