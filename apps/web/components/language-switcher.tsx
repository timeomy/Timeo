"use client";

import { Globe } from "lucide-react";
import { useLanguage, type Language } from "@/language-context";
import { useState, useRef, useEffect } from "react";
import { cn } from "@timeo/ui/web";

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ms", label: "Melayu", flag: "🇲🇾" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors"
        title="Change language"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline text-xs font-medium">{current.flag} {current.label}</span>
        <span className="sm:hidden text-xs">{current.flag}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-36 rounded-xl border border-white/[0.08] bg-[#1a1a2e] p-1 shadow-xl">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  language === lang.code
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
                )}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
                {language === lang.code && (
                  <span className="ml-auto text-xs text-primary">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
