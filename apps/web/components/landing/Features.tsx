"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Calendar, ShoppingBag, Shield, CheckCircle } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Booking Management",
    description: "Let customers book appointments online. Manage schedules, confirmations, and reminders automatically.",
    points: ["Online self-service booking", "Automated confirmations", "Calendar integration"],
  },
  {
    icon: ShoppingBag,
    title: "Product Commerce",
    description: "Sell products alongside your services. Manage inventory, orders, and fulfillment in one place.",
    points: ["Product catalog", "Order management", "Real-time tracking"],
  },
  {
    icon: Shield,
    title: "Team Management",
    description: "Invite team members, assign roles, and manage permissions with built-in RBAC.",
    points: ["Role-based access control", "Multi-tenant isolation", "Activity audit logs"],
  },
];

const FeatureCard = ({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, rotateX: -5 }}
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.2, 0.65, 0.3, 0.9] }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="glass-card p-8 group hover:glow-gold transition-all duration-500"
      style={{ perspective: "800px" }}
    >
      <motion.div
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-6 group-hover:bg-primary/20 transition-colors duration-300"
        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1, transition: { duration: 0.5 } }}
      >
        <feature.icon className="h-6 w-6 text-primary" />
      </motion.div>
      <h3 className="text-xl font-bold font-display text-foreground mb-3">{feature.title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed mb-5">{feature.description}</p>
      <ul className="space-y-2.5">
        {feature.points.map((point, pi) => (
          <motion.li
            key={point}
            initial={{ opacity: 0, x: -10 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: index * 0.15 + 0.3 + pi * 0.1 }}
            className="flex items-center gap-2.5 text-sm text-muted-foreground"
          >
            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
            {point}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
};

const Features = () => {
  const headingRef = useRef(null);
  const isInView = useInView(headingRef, { once: true, margin: "-80px" });

  return (
    <section id="features" className="relative py-32 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full opacity-8 blur-[120px]" style={{ background: "hsl(42, 100%, 50%)" }} />

      <div className="container mx-auto px-6">
        <motion.div
          ref={headingRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-block text-sm font-medium text-primary mb-4 tracking-wider uppercase"
          >
            Features
          </motion.span>
          <h2 className="section-heading text-foreground mb-4">Everything you need</h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            From scheduling to sales, Timeo brings all your operations together.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
