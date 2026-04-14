import * as React from "react";
import { cn } from "../lib/cn";

type AvatarImageStatus = "idle" | "loading" | "loaded" | "error";

type AvatarContextValue = {
  imageStatus: AvatarImageStatus;
  setImageStatus: (status: AvatarImageStatus) => void;
};

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

function useAvatarContext(component: string) {
  const context = React.useContext(AvatarContext);

  if (!context) {
    throw new Error(`${component} must be used within Avatar`);
  }

  return context;
}

const Avatar = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  const [imageStatus, setImageStatus] = React.useState<AvatarImageStatus>("idle");
  const contextValue = React.useMemo(() => ({ imageStatus, setImageStatus }), [imageStatus]);

  return (
    <AvatarContext.Provider value={contextValue}>
      <span
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
    </AvatarContext.Provider>
  );
});
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, alt, onLoad, onError, src, ...props }, ref) => {
  const { imageStatus, setImageStatus } = useAvatarContext("AvatarImage");

  React.useEffect(() => {
    setImageStatus(src ? "loading" : "idle");
  }, [setImageStatus, src]);

  return (
    <img
      ref={ref}
      className={cn(
        "aspect-square h-full w-full object-cover",
        imageStatus === "loaded" ? "block" : "hidden",
        className
      )}
      alt={alt}
      src={src}
      onLoad={(event) => {
        setImageStatus("loaded");
        onLoad?.(event);
      }}
      onError={(event) => {
        setImageStatus("error");
        onError?.(event);
      }}
      {...props}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
  const { imageStatus } = useAvatarContext("AvatarFallback");

  return (
    <span
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium",
        imageStatus === "loaded" ? "hidden" : "flex",
        className
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
