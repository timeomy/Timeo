"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="border-t border-border/30 py-12 relative overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full opacity-5 blur-[100px]" style={{ background: "hsl(42, 100%, 50%)" }} />

      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        <motion.div whileHover={{ scale: 1.05 }}>
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl overflow-hidden" style={{ background: "var(--gradient-gold)" }}>
              <Zap className="h-4 w-4 text-primary-foreground relative z-10" />
              <div className="absolute inset-0 rounded-xl opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-60" style={{ background: "var(--gradient-gold)" }} />
            </div>
            <span className="text-lg font-bold font-display text-gradient-gold">Timeo</span>
          </Link>
        </motion.div>
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Timeo. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
