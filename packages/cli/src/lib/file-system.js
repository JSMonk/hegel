// @flow
import readdirp from "readdirp";
import type { Config } from "./config";

export function getSources(config: Config) {
  const templateToBeIncluded = config.include || [];
  const templateToBeExlude = config.exclude || [];
  const dirFilter = templateToBeExlude.map(a => `!${a}`);
  return readdirp.promise(config.workingDirectory, {
    fileFilter: [...templateToBeIncluded, ...dirFilter],
    type: "files",
    directoryFilter: ["!node_modules", ...dirFilter]
  });
}
