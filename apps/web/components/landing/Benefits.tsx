"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Clock, ShieldCheck, Radio } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Save 10+ hours/week",
    description: "Automate repetitive admin tasks and focus on what matters.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise security",
    description: "Multi-tenant isolation with role-based access control.",
  },
  {
    icon: Radio,
    title: "Real-time everything",
    description: "Live updates across all devices. Never miss a booking.",
  },
];

const Benefits = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="why-timeo" className="relative py-32 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-10 blur-[120px]" style={{ background: "hsl(42, 100%, 50%)" }} />

      <div className="container mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-heading text-foreground mb-4">Why Timeo?</h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Built from the ground up for modern service businesses.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="glass-card p-8 text-center group cursor-default"
            >
              <motion.div
                className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6 group-hover:bg-primary/20 transition-colors duration-300"
                whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.5 } }}
              >
                <benefit.icon className="h-8 w-8 text-primary" />
              </motion.div>
              <h3 className="text-xl font-bold font-display text-foreground mb-3">{benefit.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
