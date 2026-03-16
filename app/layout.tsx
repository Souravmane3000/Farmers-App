import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google'
import Link from 'next/link';
import { Menu, Sprout, MapPin, Package, Settings, ChevronDown } from 'lucide-react';
import { Providers } from '@/components';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Farm Management App',
  description: 'Farm and Herd Management Interface',
};

// SVG for Cow logo placeholder
const CowIcon = ({ className }: {className?: string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 6v12" />
    <path d="M17 6v12" />
    <path d="M3 13h18" />
    <path d="m14 18 3 4" />
    <path d="m10 18-3 4" />
    <path d="m11 5 1-3 1 3" />
    <rect width="14" height="12" x="5" y="6" rx="4" />
  </svg>
)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className={`${inter.className} min-h-screen flex items-center justify-center p-0 md:p-6 lg:p-12`}>
        <Providers>
          {/* Main Application Window Container */}
          <div className="w-full max-w-6xl h-[100dvh] md:h-[90vh] bg-[#f2f8f5] md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row shadow-[#10563e]/20 border border-green-100/50 relative">
            
            {/* Desktop Sidebar (hidden on mobile) */}
            <aside className="hidden md:flex flex-col items-center w-24 bg-gradient-to-b from-[#1b8061] to-[#125c46] py-8 text-white z-10">
              <div className="mb-10 opacity-90 hover:opacity-100 transition-opacity">
                <CowIcon className="w-10 h-10" />
              </div>
              <nav className="flex-1 flex flex-col gap-8 items-center w-full">
                <Link href="/" className="p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-all cursor-pointer">
                  <Menu className="w-6 h-6" />
                </Link>
                <Link href="/plots" className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                  <MapPin className="w-6 h-6" />
                </Link>
                <Link href="/crops" className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                  <Sprout className="w-6 h-6" />
                </Link>
                <Link href="/inventory" className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                  <Package className="w-6 h-6" />
                </Link>
                <button className="p-3 text-white/50 mt-auto hover:text-white transition-all">
                   <ChevronDown className="w-6 h-6" />
                </button>
              </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#ffffff] relative rounded-t-3xl md:rounded-lg md:rounded-l-none">
              {children}
            </main>
            
            {/* Mobile Bottom Navigation Component */}
            <nav className="md:hidden bg-gradient-to-r from-[#1b8061] to-[#125c46] text-white flex justify-around p-4 pb-6 rounded-t-3xl absolute bottom-0 w-full z-50 shadow-[0_-10px_40px_rgba(20,100,70,0.2)]">
              <Link href="/" className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                <div className="p-2 bg-white/20 rounded-full">
                   <Menu className="w-5 h-5" />
                </div>
                <span className="text-[10px] opacity-80 font-medium">Dashboard</span>
              </Link>
              <Link href="/plots" className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                 <div className="p-2 text-white/60">
                   <MapPin className="w-5 h-5" />
                 </div>
                 <span className="text-[10px] opacity-60 font-medium">Plots</span>
              </Link>
              <Link href="/crops" className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                 <div className="p-2 text-white/60">
                   <Sprout className="w-5 h-5" />
                 </div>
                 <span className="text-[10px] opacity-60 font-medium">Crops</span>
              </Link>
              <Link href="/inventory" className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                  <div className="p-2 text-white/60">
                    <Package className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] opacity-60 font-medium">Inventory</span>
              </Link>
            </nav>
          </div>
        </Providers>
      </body>
    </html>
  );
}
