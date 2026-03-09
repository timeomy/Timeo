import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, Users, Calendar, Clock, MapPin, Phone, ChevronRight, Zap, Shield, Star, Instagram, Facebook, Package, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import heroImg from '@/assets/hero-gym.jpg';
import logo from '@/assets/wsfitness-logo.jpg';

/* ─── Scroll-reveal hook ─── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ─── Parallax hook ─── */
function useParallax(speed = 0.3) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const handler = () => setOffset(window.scrollY * speed);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [speed]);
  return offset;
}

/* ─── Data ─── */
const SERVICES = [
  { icon: Dumbbell, title: 'Fully Equipped Gym', desc: 'State-of-the-art strength & cardio equipment in a spacious, motivating environment.' },
  { icon: Users, title: 'Personal Training', desc: 'Certified coaches build custom programmes and track your progress session by session.' },
  { icon: Calendar, title: 'Group Classes', desc: 'Functional training, circuit, and more — all included with your membership.' },
  { icon: Zap, title: 'Day Pass / Walk-In', desc: 'Not ready to commit? Grab a day pass and experience the gym with no strings attached.' },
  { icon: Package, title: 'Equipment Wholesale', desc: 'We supply professional-grade fitness equipment to businesses and enthusiasts alike.' },
];

const WHY_US = [
  { icon: Shield, label: 'Smart NFC & QR Access' },
  { icon: Clock, label: 'Split-Shift Hours' },
  { icon: Star, label: 'Member Perks & Vouchers' },
  { icon: Users, label: 'Supportive Community' },
];

/* ─── Floating Particle ─── */
function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full bg-primary/20 blur-sm animate-float"
      style={style}
    />
  );
}

/* ─── Section Reveal Wrapper ─── */
function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function Landing() {
  const [hours, setHours] = useState({ s1: '7:30 AM – 12:00 PM', s2: '2:00 PM – 10:00 PM' });
  const [plans, setPlans] = useState<{ title: string; price: number; duration_months: number; duration_days: number; description: string | null; sessions: number | null }[]>([]);
  const [navScrolled, setNavScrolled] = useState(false);
  const heroParallax = useParallax(0.4);

  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    supabase
      .from('company_settings')
      .select('session1_start, session1_end, session2_start, session2_end')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const fmt = (t: string | null) => {
            if (!t) return '';
            const [h, m] = t.split(':').map(Number);
            const p = h >= 12 ? 'PM' : 'AM';
            return `${h % 12 || 12}:${(m || 0).toString().padStart(2, '0')} ${p}`;
          };
          setHours({
            s1: `${fmt(data.session1_start)} – ${fmt(data.session1_end)}`,
            s2: `${fmt(data.session2_start)} – ${fmt(data.session2_end)}`,
          });
        }
      });

    supabase
      .from('membership_plans')
      .select('title, price, duration_months, duration_days, description, sessions')
      .eq('is_active', true)
      .order('display_order')
      .limit(3)
      .then(({ data }) => {
        if (data) setPlans(data);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ─── FLOATING PARTICLES (hero background) ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <Particle style={{ width: 6, height: 6, top: '15%', left: '10%', animationDelay: '0s', animationDuration: '5s' }} />
        <Particle style={{ width: 4, height: 4, top: '30%', right: '15%', animationDelay: '1.5s', animationDuration: '6s' }} />
        <Particle style={{ width: 8, height: 8, top: '60%', left: '80%', animationDelay: '0.8s', animationDuration: '4.5s' }} />
        <Particle style={{ width: 5, height: 5, top: '75%', left: '25%', animationDelay: '2s', animationDuration: '5.5s' }} />
        <Particle style={{ width: 3, height: 3, top: '45%', left: '55%', animationDelay: '3s', animationDuration: '7s' }} />
      </div>

      {/* ─── NAV ─── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        navScrolled
          ? 'bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-background/50'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <img src={logo} alt="WS Fitness" className="h-9 w-9 rounded-lg object-cover ring-1 ring-primary/20" />
            <div className="flex flex-col">
              <span className="font-display text-2xl text-gradient tracking-wider leading-tight">WS FITNESS</span>
              <span className="text-[10px] text-muted-foreground/50 tracking-[0.2em] uppercase leading-tight">powered by WS | OXLOZ</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            {['Services', 'Plans', 'Hours', 'Contact'].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="relative hover:text-foreground transition-colors duration-300 after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
              >
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Member Login
            </Link>
            <Link to="/auth">
              <Button size="sm" variant="neon" className="relative overflow-hidden group">
                <span className="relative z-10">Join Now</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-teal to-primary bg-[length:200%_100%] animate-gradient-x opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Parallax background */}
        <div
          className="absolute inset-0 bg-cover bg-center scale-110 will-change-transform"
          style={{
            backgroundImage: `url(${heroImg})`,
            transform: `translateY(${heroParallax}px) scale(1.1)`,
          }}
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
        {/* Radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm mb-8 animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium tracking-wider text-primary uppercase">Now Open in Sitiawan</span>
          </div>

          <h1 className="text-7xl sm:text-9xl font-display leading-[0.85] mb-8 animate-slide-up">
            <span className="text-gradient">YOUR STATION</span>
            <br />
            <span className="text-foreground">TO</span>{' '}
            <span className="relative inline-block text-gradient">
              TRANSFORM
              <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-neon rounded-full opacity-60" />
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-in leading-relaxed" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            Your premier fitness destination — comprehensive gym experience, expert coaches,
            and professional-grade equipment wholesale, all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
            <Link to="/auth">
              <Button size="xl" variant="neon" className="w-full sm:w-auto group relative overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  Start Your Journey
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </Link>
            <a href="#plans">
              <Button size="xl" variant="glass" className="w-full sm:w-auto backdrop-blur-sm border-border/60 hover:border-primary/40 transition-all duration-300">
                View Plans
              </Button>
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 rounded-full bg-primary/60 animate-pulse" />
          </div>
        </div>
      </section>

      {/* ─── SERVICES ─── */}
      <section id="services" className="relative py-32 px-6">
        {/* Background accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative">
          <RevealSection className="text-center mb-20">
            <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase mb-4">What We Offer</p>
            <h2 className="text-5xl sm:text-6xl font-display text-gradient mb-6">PREMIUM SERVICES</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Personal fitness and professional-grade wholesale solutions under one roof.
            </p>
          </RevealSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s, i) => (
              <RevealSection key={s.title} delay={i * 100}>
                <div className="group relative h-full rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-8 transition-all duration-500 hover:border-primary/40 hover:shadow-[0_0_30px_hsl(174_72%_56%/0.08)] hover:-translate-y-1">
                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/15 transition-all duration-500">
                      <s.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-display text-2xl tracking-wide text-foreground mb-3">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY US ─── */}
      <section className="py-16 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <RevealSection>
            <div className="rounded-2xl border border-border/30 bg-card/20 backdrop-blur-sm p-8">
              <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
                {WHY_US.map((w, i) => (
                  <div
                    key={w.label}
                    className="flex items-center gap-3 group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <w.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{w.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── PLANS ─── */}
      {plans.length > 0 && (
        <section id="plans" className="relative py-32 px-6">
          {/* Background accent */}
          <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

          <div className="max-w-5xl mx-auto relative">
            <RevealSection className="text-center mb-20">
              <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase mb-4">Pricing</p>
              <h2 className="text-5xl sm:text-6xl font-display text-gradient mb-6">MEMBERSHIP PLANS</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Flexible plans to match your lifestyle. No hidden fees.
              </p>
            </RevealSection>

            <div className="grid sm:grid-cols-3 gap-6">
              {plans.map((plan, i) => {
                const isPopular = i === 1;
                const durationLabel = plan.duration_months > 0 && plan.duration_days > 0
                  ? `${plan.duration_months}mo + ${plan.duration_days}d`
                  : plan.duration_months > 0
                    ? plan.duration_months === 1 ? 'mo' : `${plan.duration_months}mo`
                    : `${plan.duration_days} days`;

                return (
                  <RevealSection key={plan.title} delay={i * 150}>
                    <div className={`relative group rounded-2xl p-[1px] transition-all duration-500 hover:-translate-y-2 ${
                      isPopular
                        ? 'bg-gradient-to-b from-primary/60 via-primary/20 to-primary/60 animate-glow-pulse'
                        : 'bg-border/40 hover:bg-primary/30'
                    }`}>
                      {/* Popular badge */}
                      {isPopular && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                          <div className="px-4 py-1 rounded-full bg-gradient-neon text-primary-foreground text-xs font-bold tracking-wider uppercase shadow-lg shadow-primary/30">
                            Popular
                          </div>
                        </div>
                      )}

                      <div className={`relative rounded-2xl p-8 h-full flex flex-col items-center text-center gap-4 ${
                        isPopular ? 'bg-card' : 'bg-card/60 backdrop-blur-sm'
                      }`}>
                        <h3 className="font-display text-2xl tracking-wide text-foreground">{plan.title}</h3>

                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-display text-gradient">RM{plan.price}</span>
                          <span className="text-sm text-muted-foreground">/{durationLabel}</span>
                        </div>

                        <div className="w-full h-px bg-border/40 my-2" />

                        <Link to="/auth" className="w-full mt-auto">
                          <Button
                            variant={isPopular ? 'neon' : 'outline'}
                            className={`w-full group/btn ${isPopular ? '' : 'hover:border-primary/60 hover:text-primary'}`}
                          >
                            <span className="flex items-center gap-2">
                              Get Started
                              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                            </span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </RevealSection>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── HOURS + CONTACT ─── */}
      <section id="hours" className="relative py-32 px-6">
        <div className="absolute top-0 left-0 w-[500px] h-[400px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-5xl mx-auto relative grid md:grid-cols-2 gap-16">
          {/* Hours */}
          <RevealSection>
            <div>
              <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase mb-4">Schedule</p>
              <h2 className="text-4xl sm:text-5xl font-display text-gradient mb-10">OPERATING HOURS</h2>
              <div className="space-y-4">
                {[
                  { label: 'Morning Session', time: hours.s1 },
                  { label: 'Afternoon / Evening', time: hours.s2 },
                ].map((session, i) => (
                  <div
                    key={session.label}
                    className="group flex items-start gap-4 p-5 rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_20px_hsl(174_72%_56%/0.06)]"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{session.label}</p>
                      <p className="text-muted-foreground text-sm mt-0.5">{session.time}</p>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground/60 pl-1 pt-1">Rest period between sessions. Staff may access early.</p>
              </div>
            </div>
          </RevealSection>

          {/* Contact */}
          <RevealSection delay={200}>
            <div id="contact">
              <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase mb-4">Contact</p>
              <h2 className="text-4xl sm:text-5xl font-display text-gradient mb-10">GET IN TOUCH</h2>
              <div className="space-y-4">
                <a
                  href="https://maps.google.com/?q=PT8240+Jalan+Besar+Kampung+Koh+32000+Sitiawan+Perak"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 p-5 rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_20px_hsl(174_72%_56%/0.06)]"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Location</p>
                    <p className="text-muted-foreground text-sm mt-0.5">PT8240, 1st Floor, Jln Besar Kampung Koh,<br />32000 Sitiawan, Perak, Malaysia</p>
                  </div>
                </a>
                <a
                  href="tel:+60198909118"
                  className="group flex items-start gap-4 p-5 rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_20px_hsl(174_72%_56%/0.06)]"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Phone</p>
                    <p className="text-muted-foreground text-sm mt-0.5">019-890 9118</p>
                  </div>
                </a>
                <div className="flex gap-3 pt-3">
                  {[
                    { href: 'https://www.instagram.com/workoutstationfitness', icon: Instagram },
                    { href: 'https://www.facebook.com/workoutstationfitness', icon: Facebook },
                  ].map(({ href, icon: Icon }) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-11 w-11 rounded-xl bg-card/60 border border-border/40 flex items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 hover:scale-110 group"
                    >
                      <Icon className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── MAP ─── */}
      <RevealSection>
        <section className="h-72 md:h-96 w-full relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background to-transparent z-10 h-16 pointer-events-none" />
          <iframe
            title="WS Fitness Location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3978.5!2d100.7!3d4.22!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNCwgSmxuIEJlc2FyIEthbXB1bmcgS29oLCAzMjAwMCBTaXRpYXdhbg!5e0!3m2!1sen!2smy!4v1700000000000!5m2!1sen!2smy"
            className="w-full h-full border-0 grayscale opacity-70 hover:opacity-90 hover:grayscale-0 transition-all duration-700"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </section>
      </RevealSection>

      {/* ─── FOOTER ─── */}
      <footer className="relative py-12 px-6 border-t border-border/20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <span className="font-display text-lg text-gradient">WS FITNESS</span>
          </div>
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} WS Fitness, Sitiawan. All rights reserved.
          </p>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 group">
            Member Login
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
