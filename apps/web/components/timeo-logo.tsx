import { cn } from "@timeo/ui/web";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const fontSizeMap: Record<LogoSize, string> = {
  xs: "text-base",
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl",
};

const dotSizeMap: Record<LogoSize, string> = {
  xs: "w-1 h-1",
  sm: "w-1 h-1",
  md: "w-1.5 h-1.5",
  lg: "w-2 h-2",
  xl: "w-2.5 h-2.5",
};

export function TimeoLogo({
  size = "md",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  return (
    <span className={cn("flex items-end gap-0.5", className)}>
      <span
        className={cn(
          "font-extrabold tracking-tight leading-none",
          fontSizeMap[size]
        )}
        style={{ letterSpacing: "-0.03em" }}
      >
        timeo
      </span>
      <span
        className={cn(
          "rounded-full bg-blue-600 inline-block flex-shrink-0 mb-0.5",
          dotSizeMap[size]
        )}
      />
    </span>
  );
}
