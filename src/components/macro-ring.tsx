import { cn } from "@/lib/utils";
import type { Nutrients, Targets } from "@/lib/types";

export function MacroRing({
  consumed,
  targets,
  className,
}: {
  consumed: Nutrients;
  targets: Targets;
  className?: string;
}) {
  const pct = targets.kcal > 0 ? Math.min(consumed.kcal / targets.kcal, 1.15) : 0;
  const r = 54;
  const c = 2 * Math.PI * r;
  const over = pct > 1;
  const dash = Math.min(pct, 1) * c;
  return (
    <div className={cn("relative mx-auto size-44", className)}>
      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" className="stroke-muted" strokeWidth="8" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          className={over ? "stroke-clay" : "stroke-primary"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif text-3xl font-medium tabular-nums leading-none">
          {Math.round(consumed.kcal)}
        </div>
        <div className="mt-1 text-xs text-muted-foreground tabular-nums">
          / {targets.kcal} kcal
        </div>
      </div>
    </div>
  );
}

export function MacroRow({
  label,
  value,
  target,
  unit = "g",
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {Math.round(value)}
          <span className="text-muted-foreground">
            /{target}
            {unit}
          </span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
