/**
 * CommonJS shim for the DiagnosticReporter.
 *
 * Jest loads custom reporters via Node's `require()` without going through
 * the test transform chain (SWC). The reporter itself is authored in
 * TypeScript, so we register `@swc-node/register` here first and then
 * re-export the real implementation. This keeps the reporter source in
 * `.ts` (matching the rest of the suite) while still letting Jest load it.
 */
require('@swc-node/register');
module.exports = require('./diagnostic-reporter.ts').default;
