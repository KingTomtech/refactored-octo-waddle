import { Suspense } from 'react';
import BrowseClient from './BrowseClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 text-text-muted">Loading browse…</div>}>
      <BrowseClient />
    </Suspense>
  );
}
