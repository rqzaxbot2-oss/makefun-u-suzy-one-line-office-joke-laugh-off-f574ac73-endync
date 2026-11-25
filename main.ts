import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

interface JokeArtifact {
  readonly joke: string;
}

const OFFICE_JOKE =
  "I disguised my lunch break as 'Strategic Alignment' on my calendar, and now a VP wants to see the deck.";

const CONTROL_OR_LINE_BREAK_RE = /[\u0000-\u001f\u007f\u2028\u2029]/;

function validateOneLineJoke(text: string): string {
  const normalized = text.trim();
  if (normalized.length === 0) {
    throw new Error("Joke must not be empty.");
  }
  if (CONTROL_OR_LINE_BREAK_RE.test(normalized)) {
    throw new Error("Joke must be a single line with no control characters.");
  }
  return normalized;
}

function resolveOutputDir(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.MAKEFUN_OUTPUT_DIR;
  if (typeof raw !== "string") {
    return resolve(process.cwd(), "output");
  }
  if (raw.includes("\0")) {
    throw new Error("MAKEFUN_OUTPUT_DIR must not contain null bytes.");
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return resolve(process.cwd(), "output");
  }
  return resolve(trimmed);
}

function ensureOutputDirectory(outputDir: string): void {
  const existing = statSync(outputDir, { throwIfNoEntry: false });
  if (existing !== undefined && !existing.isDirectory()) {
    throw new Error(
      `Output path exists and is not a directory: ${outputDir}`,
    );
  }
  mkdirSync(outputDir, { recursive: true });
}

function writeUtf8File(filePath: string, content: string): void {
  writeFileSync(filePath, content, { encoding: "utf8", flag: "w" });
}

function writeArtifacts(outputDir: string, joke: string): void {
  ensureOutputDirectory(outputDir);

  const artifact: JokeArtifact = { joke };
  writeUtf8File(join(outputDir, "joke.txt"), `${joke}\n`);
  writeUtf8File(
    join(outputDir, "joke.json"),
    `${JSON.stringify(artifact, null, 2)}\n`,
  );
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function main(): void {
  const joke = validateOneLineJoke(OFFICE_JOKE);
  const outputDir = resolveOutputDir();
  writeArtifacts(outputDir, joke);
  process.stdout.write(`${joke}\n`);
}

try {
  main();
} catch (error: unknown) {
  process.stderr.write(`Error: ${formatError(error)}\n`);
  process.exitCode = 1;
}