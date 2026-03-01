import * as React from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { cn } from "../lib/cn";

export interface WebRemoteImageProps {
  url: string | null | undefined;
  alt?: string;
  fallback?: React.ReactNode;
  width?: number | string;
  height?: number | string;
  className?: string;
  rounded?: boolean;
}

export function RemoteImage({
  url,
  alt = "",
  fallback,
  width = "100%",
  height = "100%",
  className,
  rounded = false,
}: WebRemoteImageProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  if (!url || error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/30 border",
          rounded ? "rounded-full" : "rounded-lg",
          className
        )}
        style={{ width, height }}
      >
        {fallback ?? (
          <ImageOff className="h-8 w-8 text-muted-foreground/30" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        rounded ? "rounded-full" : "rounded-lg",
        className
      )}
      style={{ width, height }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <img
        src={url}
        alt={alt}
        className="h-full w-full object-cover"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </div>
  );
}
