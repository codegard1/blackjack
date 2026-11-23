#!/usr/bin/env node

const [major, minor] = process.versions.node.split('.').map(Number);
const isSupported = (major === 24 && minor >= 15) || major >= 26;

if (!isSupported) {
  console.error(
    `\n❌ Unsupported Node.js version ${process.version}.\n` +
    `   This project requires Node.js 26 (specified in .nvmrc) or 24.15+.\n` +
    `   Please switch your active Node version:\n` +
    `     nvm use\n` +
    `   or:\n` +
    `     nvm use 26\n`
  );
  process.exit(1);
}
