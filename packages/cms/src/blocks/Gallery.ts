import type { Block } from "payload";

export const GalleryBlock: Block = {
  slug: "gallery",
  labels: { singular: "Gallery", plural: "Galleries" },
  fields: [
    {
      name: "heading",
      type: "text",
    },
    {
      name: "layout",
      type: "select",
      defaultValue: "grid",
      options: [
        { label: "Grid", value: "grid" },
        { label: "Masonry", value: "masonry" },
        { label: "Carousel", value: "carousel" },
      ],
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
      name: "images",
      type: "array",
      minRows: 1,
      maxRows: 24,
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          required: true,
        },
        {
          name: "caption",
          type: "text",
        },
      ],
    },
  ],
};
