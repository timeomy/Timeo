import type { Block } from "payload";

export const FeaturesBlock: Block = {
  slug: "features",
  labels: { singular: "Features", plural: "Features" },
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
      name: "columns",
      type: "select",
      defaultValue: "3",
      options: [
        { label: "2 Columns", value: "2" },
        { label: "3 Columns", value: "3" },
        { label: "4 Columns", value: "4" },
      ],
    },
    {
      name: "features",
      type: "array",
      minRows: 1,
      maxRows: 12,
      fields: [
        {
          name: "icon",
          type: "text",
          admin: { description: "Lucide icon name (e.g. 'calendar', 'star')" },
        },
        {
          name: "title",
          type: "text",
          required: true,
        },
        {
          name: "description",
          type: "textarea",
        },
      ],
    },
  ],
};
