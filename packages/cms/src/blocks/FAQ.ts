import type { Block } from "payload";

export const FAQBlock: Block = {
  slug: "faq",
  labels: { singular: "FAQ", plural: "FAQs" },
  fields: [
    {
      name: "heading",
      type: "text",
      defaultValue: "Frequently Asked Questions",
    },
    {
      name: "items",
      type: "array",
      minRows: 1,
      maxRows: 20,
      fields: [
        {
          name: "question",
          type: "text",
          required: true,
        },
        {
          name: "answer",
          type: "textarea",
          required: true,
        },
      ],
    },
  ],
};
