import type { Block } from "payload";

export const ContactBlock: Block = {
  slug: "contact",
  labels: { singular: "Contact", plural: "Contact" },
  fields: [
    {
      name: "heading",
      type: "text",
      defaultValue: "Get in Touch",
    },
    {
      name: "description",
      type: "textarea",
    },
    {
      name: "email",
      type: "email",
    },
    {
      name: "phone",
      type: "text",
    },
    {
      name: "address",
      type: "textarea",
    },
    {
      name: "showForm",
      type: "checkbox",
      defaultValue: true,
      label: "Show contact form",
    },
    {
      name: "mapEmbedUrl",
      type: "text",
      label: "Google Maps Embed URL",
      admin: { description: "Paste the Google Maps iframe src URL" },
    },
  ],
};
