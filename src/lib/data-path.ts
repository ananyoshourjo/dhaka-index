import path from "node:path";

export function getDataDirectory() {
  return path.resolve(
    process.env.DHAKA_INDEX_DATA_DIR ?? path.join(process.cwd(), "data"),
  );
}
