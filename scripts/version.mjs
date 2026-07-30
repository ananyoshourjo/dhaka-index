import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const files = {
  rootPackage: path.join(repositoryRoot, "package.json"),
  adminPackage: path.join(repositoryRoot, "admin-portal", "package.json"),
  packageLock: path.join(repositoryRoot, "package-lock.json"),
  changelog: path.join(repositoryRoot, "CHANGELOG.md"),
};
const validImpacts = new Set(["patch", "minor", "major"]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

  if (!match) {
    fail(`Invalid Semantic Version: ${version}`);
  }

  return match.slice(1).map(Number);
}

function nextVersion(version, impact) {
  const [major, minor, patch] = parseVersion(version);

  if (impact === "major") {
    return `${major + 1}.0.0`;
  }

  if (impact === "minor") {
    return `${major}.${minor + 1}.0`;
  }

  return `${major}.${minor}.${patch + 1}`;
}

function loadVersionState() {
  const rootPackage = readJson(files.rootPackage);
  const adminPackage = readJson(files.adminPackage);
  const packageLock = readJson(files.packageLock);
  const versions = {
    rootPackage: rootPackage.version,
    adminPackage: adminPackage.version,
    packageLock: packageLock.version,
    packageLockRoot: packageLock.packages?.[""]?.version,
    packageLockAdmin: packageLock.packages?.["admin-portal"]?.version,
  };

  return { rootPackage, adminPackage, packageLock, versions };
}

function assertSynchronized(versions) {
  const uniqueVersions = new Set(Object.values(versions));

  if (uniqueVersions.size !== 1 || uniqueVersions.has(undefined)) {
    fail(`Version mismatch: ${JSON.stringify(versions)}`);
  }

  return versions.rootPackage;
}

function optionValues(args, option) {
  const values = [];

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === option) {
      const value = args[index + 1]?.trim();

      if (!value || value.startsWith("--")) {
        fail(`${option} requires a value.`);
      }

      values.push(value);
      index += 1;
    }
  }

  return values;
}

function changelogEntry(version) {
  const changelog = fs.readFileSync(files.changelog, "utf8");
  const heading = new RegExp(
    `^## ${version.replaceAll(".", "\\.")}(?: - [^\\r\\n]+)?\\r?$`,
    "m",
  );
  const match = heading.exec(changelog);

  if (!match) {
    fail(`CHANGELOG.md has no entry for ${version}.`);
  }

  const bodyStart = match.index + match[0].length;
  const remaining = changelog.slice(bodyStart);
  const nextHeading = /\r?\n## /.exec(remaining);
  const body = (
    nextHeading ? remaining.slice(0, nextHeading.index) : remaining
  ).trim();

  if (!body) {
    fail(`CHANGELOG.md entry for ${version} is empty.`);
  }

  return body;
}

const [command = "check", ...args] = process.argv.slice(2);
const state = loadVersionState();
const currentVersion = assertSynchronized(state.versions);

if (command === "check") {
  const tag = optionValues(args, "--tag")[0];

  if (tag && tag !== `v${currentVersion}`) {
    fail(`Tag ${tag} does not match repository version v${currentVersion}.`);
  }

  changelogEntry(currentVersion);
  console.log(`Version ${currentVersion} is synchronized.`);
  process.exit(0);
}

if (command === "plan") {
  const impact = args[0];

  if (!validImpacts.has(impact)) {
    fail("Usage: node scripts/version.mjs plan <patch|minor|major>");
  }

  console.log(nextVersion(currentVersion, impact));
  process.exit(0);
}

if (command === "notes") {
  process.stdout.write(`${changelogEntry(currentVersion)}\n`);
  process.exit(0);
}

if (command !== "bump") {
  fail(
    "Usage: node scripts/version.mjs <check|notes|plan|bump> [patch|minor|major]",
  );
}

const impact = args[0];

if (!validImpacts.has(impact)) {
  fail("Usage: node scripts/version.mjs bump <patch|minor|major> --note <text>");
}

const notes = optionValues(args.slice(1), "--note");

if (notes.length === 0) {
  fail("At least one --note is required.");
}

const version = nextVersion(currentVersion, impact);
const changelog = fs.readFileSync(files.changelog, "utf8");

if (new RegExp(`^## ${version.replaceAll(".", "\\.")}(?: |$)`, "m").test(changelog)) {
  fail(`CHANGELOG.md already contains ${version}.`);
}

state.rootPackage.version = version;
state.adminPackage.version = version;
state.packageLock.version = version;
state.packageLock.packages[""].version = version;
state.packageLock.packages["admin-portal"].version = version;

writeJson(files.rootPackage, state.rootPackage);
writeJson(files.adminPackage, state.adminPackage);
writeJson(files.packageLock, state.packageLock);

const firstReleaseHeading = /^## /m.exec(changelog);

if (!firstReleaseHeading) {
  fail("CHANGELOG.md does not contain a release heading.");
}

const date = new Date().toISOString().slice(0, 10);
const entry = [
  `## ${version} - ${date}`,
  "",
  ...notes.map((note) => `- ${note}`),
  "",
  "",
].join("\n");
const updatedChangelog = [
  changelog.slice(0, firstReleaseHeading.index),
  entry,
  changelog.slice(firstReleaseHeading.index),
].join("");

fs.writeFileSync(files.changelog, updatedChangelog);
console.log(`Prepared ${impact} release ${currentVersion} -> ${version}.`);
