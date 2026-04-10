"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

type SheetSide = "top" | "bottom" | "left" | "right";

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  onOpenChange: () => {},
});

function useSheetContext() {
  return React.useContext(SheetContext);
}

export interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Sheet({ open = false, onOpenChange, children }: SheetProps) {
  return (
    <SheetContext.Provider
      value={{ open, onOpenChange: onOpenChange ?? (() => {}) }}
    >
      {children}
    </SheetContext.Provider>
  );
}

const SheetTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { onOpenChange } = useSheetContext();

  return (
    <button
      ref={ref}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onOpenChange(true);
        }
      }}
      {...props}
    />
  );
});
SheetTrigger.displayName = "SheetTrigger";

const SheetClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { onOpenChange } = useSheetContext();

  return (
    <button
      ref={ref}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onOpenChange(false);
        }
      }}
      {...props}
    />
  );
});
SheetClose.displayName = "SheetClose";

const SheetOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, onClick, ...props }, ref) => {
  const { onOpenChange } = useSheetContext();

  return (
    <div
      ref={ref}
      className={cn("fixed inset-0 z-50 bg-black/70", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onOpenChange(false);
        }
      }}
      {...props}
    />
  );
});
SheetOverlay.displayName = "SheetOverlay";

const sideClasses: Record<SheetSide, string> = {
  top: "inset-x-0 top-0 border-b",
  bottom: "inset-x-0 bottom-0 border-t",
  left: "left-0 top-0 h-full border-r",
  right: "right-0 top-0 h-full border-l",
};

export interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: SheetSide;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, side = "right", children, onKeyDown, ...props }, ref) => {
    const { open, onOpenChange } = useSheetContext();

    if (!open) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-50">
        <SheetOverlay />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (!event.defaultPrevented && event.key === "Escape") {
              onOpenChange(false);
            }
          }}
          className={cn(
            "fixed z-50 flex flex-col bg-background shadow-xl",
            side === "left" || side === "right" ? "w-3/4 max-w-md" : "max-h-[85vh]",
            sideClasses[side],
            className,
          )}
          {...props}
        >
          {children}
          <SheetClose
            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </SheetClose>
        </div>
      </div>
    );
  },
);
SheetContent.displayName = "SheetContent";

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
