import { Sprout, User } from 'lucide-react';

export type ActiveSection = 'voice' | 'records' | 'market' | 'impact';

interface TopNavProps {
  activeSection: ActiveSection;
  onNavigate: (section: ActiveSection) => void;
  onOpenProfile: () => void;
}

const NAV_ITEMS: Array<{ id: ActiveSection; label: string }> = [
  { id: 'voice', label: 'Voice Studio' },
  { id: 'records', label: 'Farm Records' },
  { id: 'market', label: 'Climate & Mandi' },
  { id: 'impact', label: 'Impact & Docs' },
];

export function TopNav({ activeSection, onNavigate, onOpenProfile }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('voice')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg py-1"
        >
          <span className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
            <Sprout className="w-4 h-4" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900">
            BharatSathi AI
          </span>
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors ${
                  active
                    ? 'text-emerald-700 border-emerald-700'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onOpenProfile}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <User className="w-4 h-4" />
            <span>Farmer Profile</span>
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <div className="md:hidden border-t border-slate-100 px-3 py-1.5 flex items-center justify-between gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
