import Image from "next/image";
import { cn } from "@timeo/ui/web";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

// Height-only sizing — width is unconstrained so the natural aspect ratio is preserved.
const heightMap: Record<LogoSize, number> = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 44,
  xl: 56,
};

export function TimeoLogo({
  size = "md",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  const h = heightMap[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/timeo-logo.png"
      alt="Timeo"
      style={{ height: h, width: "auto" }}
      className={cn("block", className)}
    />
  );
}
