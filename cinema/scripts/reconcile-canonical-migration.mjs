import fs from 'node:fs';
import path from 'node:path';

const arg = name => { const hit = process.argv.find(x => x.startsWith(`--${name}=`)); return hit ? path.resolve(hit.slice(name.length + 3)) : null; };
const inventoryFile = arg('inventory') || '/tmp/cinema-inventory.json';
const conversionFile = arg('conversion') || '/tmp/a-report.json';
const publicManifest = arg('public-manifest') || '/tmp/cinema-public-window/manifest.json';
const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8'));
const conversion = JSON.parse(fs.readFileSync(conversionFile, 'utf8'));
const view = JSON.parse(fs.readFileSync(publicManifest, 'utf8'));
const checks = {
  input_files_match: inventory.totals.files === conversion.input_files,
  input_rows_match: inventory.totals.rows === conversion.input_rows,
  no_unresolved: conversion.unresolved_rows === 0,
  canonical_conserves_rows: conversion.canonical_rows + conversion.unresolved_rows === inventory.totals.rows,
  public_within_canonical: view.public_rows <= conversion.canonical_rows,
  public_window_bounded: view.days === 30,
  public_files_nonempty: view.files > 0
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = { schema: 'canonical-reconciliation-report', generated_at: new Date().toISOString(), checks, failed, input_rows: inventory.totals.rows, canonical_rows: conversion.canonical_rows, unresolved_rows: conversion.unresolved_rows, public_rows: view.public_rows, excluded_by_window: view.excluded_by_window };
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 1;
