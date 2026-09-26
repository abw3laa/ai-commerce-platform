import fs from "node:fs";

const reportPath = process.argv[2] ?? "/tmp/npm-audit.json";
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const allowed = new Set(["@prisma/config", "prisma", "deepmerge-ts", "mysql2"]);

for (const [name, item] of Object.entries(report.vulnerabilities ?? {})) {
  if (!["high", "critical"].includes(item.severity)) continue;
  const via = (item.via ?? []).filter((v) => typeof v === "object");
  console.log(JSON.stringify({
    package: name,
    severity: item.severity,
    range: item.range,
    fixes: item.fixAvailable,
    advisories: via.map((v) => ({
      title: v.title,
      url: v.url,
      severity: v.severity,
      range: v.range
    }))
  }));
}

console.log(JSON.stringify({ metadata: report.metadata?.vulnerabilities ?? {} }));

const unexpected = Object.entries(report.vulnerabilities ?? {})
  .filter(([name, item]) => ["high", "critical"].includes(item.severity) && !allowed.has(name));

if (unexpected.length > 0) {
  console.error("Unexpected high/critical dependency findings:", unexpected.map(([name, item]) => ({
    name,
    severity: item.severity,
    range: item.range
  })));
  process.exit(1);
}

console.log("Only documented Prisma 7.10 devOptional findings remain in the full audit tree.");
