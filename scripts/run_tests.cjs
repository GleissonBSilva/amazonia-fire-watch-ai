const { execSync } = require('child_process');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const esbuildPath = path.join(projectDir, 'node_modules', '.bin', 'esbuild');
const testFile = path.join(projectDir, 'scripts', 'test_engine.ts');

try {
  // Executa bundle em memória e roda com node
  execSync(`"${esbuildPath}" "${testFile}" --bundle --platform=node | node -`, {
    cwd: projectDir,
    stdio: 'inherit',
    shell: true
  });
} catch (error) {
  process.exit(1);
}
