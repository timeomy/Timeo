import type { Block } from "payload";

export const TestimonialsBlock: Block = {
  slug: "testimonials",
  labels: { singular: "Testimonials", plural: "Testimonials" },
  fields: [
    {
      name: "heading",
      type: "text",
    },
    {
      name: "testimonials",
      type: "array",
      minRows: 1,
      maxRows: 12,
      fields: [
        {
          name: "quote",
          type: "textarea",
          required: true,
        },
        {
          name: "author",
          type: "text",
          required: true,
        },
        {
          name: "role",
          type: "text",
          label: "Author Role/Title",
        },
        {
          name: "avatar",
          type: "upload",
          relationTo: "media",
        },
        {
          name: "rating",
          type: "number",
          min: 1,
          max: 5,
        },
      ],
    },
  ],
};
