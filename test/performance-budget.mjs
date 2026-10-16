import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../.next/static/", import.meta.url);
async function walk(directory) { const entries = await readdir(directory, { withFileTypes: true }); const output = []; for (const entry of entries) { const path = join(directory, entry.name); if (entry.isDirectory()) output.push(...await walk(path)); else output.push(path); } return output; }
const paths = await walk(root.pathname);
const sizes = await Promise.all(paths.map(async (path) => ({ path, bytes: (await stat(path)).size })));
const total = sizes.reduce((sum, item) => sum + item.bytes, 0), largestJs = Math.max(0, ...sizes.filter((item) => item.path.endsWith(".js")).map((item) => item.bytes)), largestCss = Math.max(0, ...sizes.filter((item) => item.path.endsWith(".css")).map((item) => item.bytes));
const budgets = { totalStaticBytes: 2_000_000, largestJavaScriptBytes: 300_000, largestCssBytes: 100_000 };
const measured = { totalStaticBytes: total, largestJavaScriptBytes: largestJs, largestCssBytes: largestCss };
console.log(JSON.stringify({ measured, budgets }));
if (total > budgets.totalStaticBytes || largestJs > budgets.largestJavaScriptBytes || largestCss > budgets.largestCssBytes) process.exitCode = 1;
