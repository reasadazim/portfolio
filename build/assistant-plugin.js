import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { profile } from "../src/data/profile.js";
import { projects } from "../src/data/projects.js";
import { services } from "../src/data/services.js";
import { seo } from "../src/data/seo.js";
import { enquiryRecipient } from "../src/data/assistant.js";

export function assistantPlugin() {
  return {
    name: "portfolio-assistant-knowledge",
    buildStart() {
      const directory = fileURLToPath(new URL("../server/", import.meta.url));
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        `${directory}/knowledge.json`,
        JSON.stringify(
          {
            ...profile,
            email: seo.email,
            enquiryEmail: enquiryRecipient,
            url: seo.url,
            profiles: seo.profiles,
            services: services.map(({ title, description }) => ({
              title,
              description,
            })),
            projects: projects.map(({ title, description, tags, url }) => ({
              title,
              description,
              tags,
              url,
            })),
          },
          null,
          2,
        ),
      );
    },
  };
}
