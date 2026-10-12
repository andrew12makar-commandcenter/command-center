import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Command Center', description: 'Private business operations system' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
