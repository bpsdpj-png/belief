// scripts/patch-rollup.cjs
const fs = require('fs');
const path = require('path');

try {
  // If @rollup/wasm-node is installed, copy its wasm dist into rollup dist if needed
  const wasmDist = path.resolve(__dirname, '../node_modules/@rollup/wasm-node/dist');
  if (fs.existsSync(wasmDist)) {
    const rollupDirs = [];
    const findRollupDirs = (dir) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'rollup' && fs.existsSync(path.join(full, 'dist'))) {
            rollupDirs.push(path.join(full, 'dist'));
          } else if (entry.name.startsWith('rollup@') && fs.existsSync(path.join(full, 'node_modules/rollup/dist'))) {
            rollupDirs.push(path.join(full, 'node_modules/rollup/dist'));
          } else if (entry.name === '.pnpm') {
            findRollupDirs(full);
          }
        }
      }
    };

    findRollupDirs(path.resolve(__dirname, '../node_modules'));

    for (const targetDist of rollupDirs) {
      fs.cpSync(wasmDist, targetDist, { recursive: true, force: true });
    }
  }
} catch (e) {
  // optional patch
}
