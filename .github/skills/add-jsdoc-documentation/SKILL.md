---
name: add-jsdoc-documentation
description: "Add or improve concise JSDoc-style inline documentation in source files that lack it. Use when asked to document code, add JSDoc comments, explain undocumented functions or APIs, or fill gaps in inline documentation."
---

# Add JSDoc Documentation

Add accurate, useful JSDoc comments to undocumented code while preserving behavior.

## Workflow

1. Identify the requested files or scope. Read each target file and nearby types, callers, tests, or related implementation needed to understand its contracts.
2. Inventory existing comments. Keep accurate documentation, improve incomplete or misleading comments, and avoid duplicating comments that already explain the code.
3. Add JSDoc blocks for undocumented exported functions, classes, interfaces, types, and other meaningful APIs. Document non-exported helpers when their purpose or constraints are not clear from their name and implementation.
4. Describe intent, behavior, meaningful constraints, side effects, and edge cases that a caller or maintainer needs to know. Use `@param`, `@returns`, `@throws`, and other tags when they add useful detail; omit redundant tags for obvious cases.
5. Do not narrate individual statements, restate type signatures, or add comments to every property or line. Do not invent guarantees, rules, or error behavior that the code does not establish.
6. Make documentation-only edits unless the user separately requests code changes. Preserve existing behavior and local formatting.
7. Review the diff for accuracy, redundancy, and unintended changes. Run relevant project checks when practical; documentation-only edits do not require a full test suite unless the project requires it.

## Documentation Style

- Use `/** ... */` JSDoc blocks for declarations and APIs.
- Prefer concise descriptions in present tense, with details focused on the contract rather than implementation narration.
- Include parameter and return descriptions when they clarify non-obvious meaning or behavior.
- Keep terminology consistent with the codebase and link related symbols using the repository's existing conventions.
