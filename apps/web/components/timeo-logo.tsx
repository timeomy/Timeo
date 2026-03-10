import Image from "next/image";
import { cn } from "@timeo/ui/web";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeMap: Record<LogoSize, { height: number; width: number }> = {
  xs: { height: 16, width: 36 },
  sm: { height: 24, width: 55 },
  md: { height: 32, width: 73 },
  lg: { height: 40, width: 91 },
  xl: { height: 48, width: 110 },
};

export function TimeoLogo({
  size = "md",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  const { height, width } = sizeMap[size];
  return (
    <Image
      src="/timeo-logo.png"
      alt="Timeo"
      width={width}
      height={height}
      className={cn("object-contain", className)}
      priority
    />
  );
}
