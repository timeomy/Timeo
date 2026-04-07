import { cn } from "@timeo/ui/web";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeConfig: Record<LogoSize, { fontSize: string; dotSize: string }> = {
  xs: { fontSize: "text-base", dotSize: "w-1 h-1" },
  sm: { fontSize: "text-lg", dotSize: "w-1 h-1" },
  md: { fontSize: "text-2xl", dotSize: "w-1.5 h-1.5" },
  lg: { fontSize: "text-3xl", dotSize: "w-2 h-2" },
  xl: { fontSize: "text-4xl", dotSize: "w-2.5 h-2.5" },
};

export function TimeoLogo({
  size = "md",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  const cfg = sizeConfig[size];
  return (
    <span className={cn("inline-flex items-end gap-[1px]", className)}>
      <span
        className={cn("font-extrabold tracking-tight leading-none", cfg.fontSize)}
        style={{ letterSpacing: "-0.03em" }}
      >
        timeo
      </span>
      <span
        className={cn("rounded-full bg-[#0066FF] inline-block flex-shrink-0", cfg.dotSize)}
        style={{ marginBottom: "0.18em" }}
      />
    </span>
  );
}

export function TimeoIcon({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const dotSize = Math.max(3, size * 0.08);
  const fontSize = size * 0.5;
  return (
    <div
      className={cn("inline-flex items-center justify-center rounded-2xl bg-[#0A0F1E]", className)}
      style={{ width: size, height: size }}
    >
      <span className="inline-flex items-end gap-[1px]">
        <span
          style={{
            fontSize,
            fontWeight: 800,
            color: "white",
            lineHeight: 1,
          }}
        >
          t
        </span>
        <span
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            backgroundColor: "#0066FF",
            display: "inline-block",
            flexShrink: 0,
            marginBottom: fontSize * 0.15,
          }}
        />
      </span>
    </div>
  );
}
