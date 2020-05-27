import glob from "glob";
import { join } from "path";
import type { Config } from "./config";

export function getSources(config: Config) {
  const include = config.include || [];
  const exclude = config.exclude || [];
  return glob.sync(include.join(), {
    cwd: config.workingDirectory,
    dot: true,
    ignore: exclude
  });
}