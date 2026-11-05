import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

const specificationPath = fileURLToPath(
  new URL("../../openapi.yaml", import.meta.url),
);

export const openApiYaml = readFileSync(specificationPath, "utf8");
export const openApiDocument = parse(openApiYaml) as object;
