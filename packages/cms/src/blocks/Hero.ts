import type { Block } from "payload";

export const HeroBlock: Block = {
  slug: "hero",
  labels: { singular: "Hero", plural: "Heroes" },
  fields: [
    {
      name: "heading",
      type: "text",
      required: true,
    },
    {
      name: "subheading",
      type: "textarea",
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "ctaLabel",
      type: "text",
      label: "CTA Button Label",
    },
    {
      name: "ctaLink",
      type: "text",
      label: "CTA Button Link",
    },
    {
      name: "style",
      type: "select",
      defaultValue: "centered",
      options: [
        { label: "Centered", value: "centered" },
        { label: "Left-aligned", value: "left" },
        { label: "Split (image right)", value: "split" },
      ],
    },
  ],
};
