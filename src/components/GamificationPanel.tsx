'use client';

import { useEffect, useRef, useState } from 'react';

interface GamificationPanelProps {
  count: number;
}

const BADGES = [
  { threshold: 5, icon: '🥉', label: 'Novice' },
  { threshold: 20, icon: '🥈', label: 'Skilled' },
  { threshold: 50, icon: '🥇', label: 'Expert' },
];

export default function GamificationPanel({ count }: GamificationPanelProps) {
  const prevCount = useRef(0);
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    for (const { threshold } of BADGES) {
      if (prevCount.current < threshold && count >= threshold) {
        setShowBurst(true);
        const timer = setTimeout(() => setShowBurst(false), 1000);
        return () => clearTimeout(timer);
      }
    }
    prevCount.current = count;
  }, [count]);

  return (
    <div className="relative mt-4 flex flex-col items-center">
      <div className="text-lg font-semibold">Analyses: {count}</div>
      <div className="mt-2 flex gap-2">
        {BADGES.map(({ threshold, icon, label }) => (
          <span
            key={threshold}
            title={`${label} (${threshold})`}
            className={`text-2xl transition-opacity duration-300 ${
              count >= threshold ? 'opacity-100' : 'opacity-20'
            }`}
          >
            {icon}
          </span>
        ))}
      </div>
      {showBurst && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg className="h-24 w-24 animate-[burst_1s_ease-out_forwards]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="10" stroke="gold" strokeWidth="4" fill="none" />
          </svg>
          <style jsx>{`
            @keyframes burst {
              from { transform: scale(0); opacity: 1; }
              to { transform: scale(3); opacity: 0; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
