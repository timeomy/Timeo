import type { Block } from "payload";

export const PricingBlock: Block = {
  slug: "pricing",
  labels: { singular: "Pricing", plural: "Pricing" },
  fields: [
    {
      name: "heading",
      type: "text",
    },
    {
      name: "description",
      type: "textarea",
    },
    {
      name: "plans",
      type: "array",
      minRows: 1,
      maxRows: 4,
      fields: [
        {
          name: "name",
          type: "text",
          required: true,
        },
        {
          name: "price",
          type: "text",
          required: true,
          admin: { description: "e.g. 'RM 49/mo' or 'Free'" },
        },
        {
          name: "description",
          type: "textarea",
        },
        {
          name: "features",
          type: "array",
          fields: [
            {
              name: "feature",
              type: "text",
              required: true,
            },
          ],
        },
        {
          name: "ctaLabel",
          type: "text",
          defaultValue: "Get Started",
        },
        {
          name: "ctaLink",
          type: "text",
        },
        {
          name: "highlighted",
          type: "checkbox",
          defaultValue: false,
          label: "Highlight this plan",
        },
      ],
    },
  ],
};
