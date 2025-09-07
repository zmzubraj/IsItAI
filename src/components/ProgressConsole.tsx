import { useEffect, useRef } from 'react';

interface Step {
  step: string;
  progress: number;
}

export default function ProgressConsole({ steps }: { steps: Step[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [steps]);

  return (
    <div
      ref={ref}
      className="mt-4 h-32 w-full overflow-y-auto rounded bg-black p-2 font-mono text-green-400 text-sm"
    >
      {steps.map((s, i) => (
        <p key={i} className="typing">
          {s.step}
        </p>
      ))}
      <style jsx>{`
        .typing {
          overflow: hidden;
          white-space: nowrap;
          animation: typing 0.8s steps(40, end);
        }
        @keyframes typing {
          from { width: 0 }
          to { width: 100% }
        }
      `}</style>
    </div>
  );
}
