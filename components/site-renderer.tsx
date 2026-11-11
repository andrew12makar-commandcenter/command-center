import type {SiteBlueprint} from '@/lib/site-blueprint';
import type {GeneratedConceptSet} from '@/lib/concept-imagery';
import {renderWiredSite, type RecordedFacts} from './site-design-document.ts';

type RendererProps = {
  site: SiteBlueprint;
  standalone?: boolean;
  conceptMedia?: GeneratedConceptSet;
  recorded?: RecordedFacts | null;
};

/** The preview frame loads the same static document `renderSite` writes. The document itself has no scripts. */
export default function SiteRenderer({site, standalone = false, conceptMedia, recorded = null}: RendererProps) {
  const html = renderWiredSite(site, {conceptMedia, recorded, fontHref: '/fonts/'});
  return <>
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <iframe
      title={`${site.businessName} — Internal concept, not endorsed by the business`}
      srcDoc={html}
      sandbox="allow-same-origin"
      style={{display: 'block', width: '100%', height: standalone ? '100vh' : '80vh', border: 0, background: '#f3eee4'}}
    />
  </>;
}

export type {RecordedFacts};
