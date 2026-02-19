import { buildConfig } from "payload";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { Pages } from "./collections/Pages";
import { Media } from "./collections/Media";
import { Navigation } from "./collections/Navigation";
import { TenantSettings } from "./collections/TenantSettings";

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || "CHANGE-ME-IN-PRODUCTION",
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || "mongodb://localhost:27017/timeo-cms",
  }),
  editor: lexicalEditor(),
  collections: [Pages, Media, Navigation, TenantSettings],
  cors: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ].filter(Boolean),
  csrf: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ].filter(Boolean),
  typescript: {
    outputFile: "./src/payload-types.ts",
  },
});
