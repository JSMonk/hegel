import readdirp from "readdirp";
import type { Config } from "./config";

export function getSources(config: Config) { 
  const exclude = config.exclude.map(a => `!${a}`);
  return readdirp.promise(config.workingDirectory, {
    fileFilter: config.include.concat(exclude),//[...templateToBeIncluded, ...dirFilter],
    type: "files",
    directoryFilter: exclude.concat(["!node_modules"])//["!node_modules", ...dirFilter]
  }); 
}
