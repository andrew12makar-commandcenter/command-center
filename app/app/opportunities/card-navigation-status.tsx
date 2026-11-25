'use client';

import {useLinkStatus} from 'next/link';

// Scoped to the enclosing Next.js Link, so the clicked tile shows activity
// immediately while the server re-renders its filtered results.
export default function CardNavigationStatus(){
 const {pending}=useLinkStatus();
 return <span role="status" aria-live="polite" className="inline-flex min-h-4 items-center gap-2 text-xs text-cyan-200">
  {pending&&<>
   <span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-100"/>
   Opening results…
  </>}
 </span>;
}
