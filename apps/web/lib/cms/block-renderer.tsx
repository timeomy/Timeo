"use client";

import type {
  CMSBlock,
  HeroBlockData,
  FeaturesBlockData,
  TestimonialsBlockData,
  PricingBlockData,
  FAQBlockData,
  ContactBlockData,
  GalleryBlockData,
} from "@timeo/cms";

// --- Individual Block Renderers ---

function HeroBlockRenderer({ block }: { block: HeroBlockData }) {
  const alignClass =
    block.style === "left"
      ? "text-left"
      : block.style === "split"
        ? "text-left md:flex md:items-center md:gap-12"
        : "text-center";

  return (
    <section className={`py-16 md:py-24 ${alignClass}`}>
      <div className={block.style === "split" ? "md:flex-1" : ""}>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          {block.heading}
        </h1>
        {block.subheading && (
          <p className="mt-4 text-lg text-muted-foreground md:text-xl">
            {block.subheading}
          </p>
        )}
        {block.ctaLabel && block.ctaLink && (
          <a
            href={block.ctaLink}
            className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {block.ctaLabel}
          </a>
        )}
      </div>
      {block.image && (
        <div className={block.style === "split" ? "mt-8 md:mt-0 md:flex-1" : "mt-8"}>
          <img
            src={block.image.url}
            alt={block.image.alt}
            className="mx-auto rounded-lg"
          />
        </div>
      )}
    </section>
  );
}

function FeaturesBlockRenderer({ block }: { block: FeaturesBlockData }) {
  const cols = block.columns || "3";
  const gridClass =
    cols === "2"
      ? "grid-cols-1 md:grid-cols-2"
      : cols === "4"
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="py-16">
      {block.heading && (
        <h2 className="text-center text-3xl font-bold">{block.heading}</h2>
      )}
      {block.description && (
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          {block.description}
        </p>
      )}
      <div className={`mt-10 grid gap-8 ${gridClass}`}>
        {block.features?.map((feature, i) => (
          <div key={i} className="rounded-lg border p-6">
            {feature.icon && (
              <div className="mb-3 text-2xl">{feature.icon}</div>
            )}
            <h3 className="font-semibold">{feature.title}</h3>
            {feature.description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function TestimonialsBlockRenderer({ block }: { block: TestimonialsBlockData }) {
  return (
    <section className="py-16">
      {block.heading && (
        <h2 className="text-center text-3xl font-bold">{block.heading}</h2>
      )}
      <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {block.testimonials?.map((t, i) => (
          <div key={i} className="rounded-lg border p-6">
            {t.rating && (
              <div className="mb-2 text-yellow-500">
                {"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}
              </div>
            )}
            <blockquote className="text-sm italic text-muted-foreground">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <div className="mt-4 flex items-center gap-3">
              {t.avatar && (
                <img
                  src={t.avatar.url}
                  alt={t.avatar.alt}
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}
              <div>
                <div className="text-sm font-medium">{t.author}</div>
                {t.role && (
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingBlockRenderer({ block }: { block: PricingBlockData }) {
  return (
    <section className="py-16">
      {block.heading && (
        <h2 className="text-center text-3xl font-bold">{block.heading}</h2>
      )}
      {block.description && (
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          {block.description}
        </p>
      )}
      <div className="mx-auto mt-10 grid max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-3">
        {block.plans?.map((plan, i) => (
          <div
            key={i}
            className={`rounded-lg border p-6 ${plan.highlighted ? "border-primary ring-2 ring-primary" : ""}`}
          >
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <div className="mt-2 text-3xl font-bold">{plan.price}</div>
            {plan.description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {plan.description}
              </p>
            )}
            {plan.features && plan.features.length > 0 && (
              <ul className="mt-4 space-y-2">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-green-500">✓</span>
                    {f.feature}
                  </li>
                ))}
              </ul>
            )}
            {plan.ctaLabel && plan.ctaLink && (
              <a
                href={plan.ctaLink}
                className="mt-6 block w-full rounded-md bg-primary py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {plan.ctaLabel}
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQBlockRenderer({ block }: { block: FAQBlockData }) {
  return (
    <section className="py-16">
      {block.heading && (
        <h2 className="text-center text-3xl font-bold">{block.heading}</h2>
      )}
      <div className="mx-auto mt-10 max-w-3xl space-y-4">
        {block.items?.map((item, i) => (
          <details key={i} className="group rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">
              {item.question}
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function ContactBlockRenderer({ block }: { block: ContactBlockData }) {
  return (
    <section className="py-16">
      {block.heading && (
        <h2 className="text-center text-3xl font-bold">{block.heading}</h2>
      )}
      {block.description && (
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          {block.description}
        </p>
      )}
      <div className="mx-auto mt-10 grid max-w-4xl gap-8 md:grid-cols-2">
        <div className="space-y-4">
          {block.email && (
            <div>
              <div className="text-sm font-medium">Email</div>
              <a href={`mailto:${block.email}`} className="text-sm text-primary hover:underline">
                {block.email}
              </a>
            </div>
          )}
          {block.phone && (
            <div>
              <div className="text-sm font-medium">Phone</div>
              <a href={`tel:${block.phone}`} className="text-sm text-primary hover:underline">
                {block.phone}
              </a>
            </div>
          )}
          {block.address && (
            <div>
              <div className="text-sm font-medium">Address</div>
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {block.address}
              </p>
            </div>
          )}
          {block.mapEmbedUrl && (
            <iframe
              src={block.mapEmbedUrl}
              className="h-48 w-full rounded-lg border-0"
              loading="lazy"
              title="Location map"
            />
          )}
        </div>
        {block.showForm && (
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Message</label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm"
                rows={4}
                placeholder="How can we help?"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function GalleryBlockRenderer({ block }: { block: GalleryBlockData }) {
  const cols = block.columns || "3";
  const gridClass =
    cols === "2"
      ? "grid-cols-1 sm:grid-cols-2"
      : cols === "4"
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="py-16">
      {block.heading && (
        <h2 className="text-center text-3xl font-bold">{block.heading}</h2>
      )}
      <div className={`mt-10 grid gap-4 ${gridClass}`}>
        {block.images?.map((item, i) => (
          <div key={i} className="group overflow-hidden rounded-lg">
            <img
              src={item.image.url}
              alt={item.image.alt}
              className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
            />
            {item.caption && (
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {item.caption}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Main Block Renderer ---

export function BlockRenderer({ blocks }: { blocks: CMSBlock[] }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <>
      {blocks.map((block, index) => {
        switch (block.blockType) {
          case "hero":
            return <HeroBlockRenderer key={index} block={block} />;
          case "features":
            return <FeaturesBlockRenderer key={index} block={block} />;
          case "testimonials":
            return <TestimonialsBlockRenderer key={index} block={block} />;
          case "pricing":
            return <PricingBlockRenderer key={index} block={block} />;
          case "faq":
            return <FAQBlockRenderer key={index} block={block} />;
          case "contact":
            return <ContactBlockRenderer key={index} block={block} />;
          case "gallery":
            return <GalleryBlockRenderer key={index} block={block} />;
          default:
            return null;
        }
      })}
    </>
  );
}
