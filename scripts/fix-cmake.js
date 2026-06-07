const fs = require('fs');
const path = require('path');

const nodeModulesDir = path.join(__dirname, '..', 'node_modules');

function patchCMakeLists(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      patchCMakeLists(fullPath);
    } else if (file === 'CMakeLists.txt') {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('project(') && !content.includes('CMAKE_OBJECT_PATH_MAX')) {
        content = content.replace(/cmake_minimum_required\(.*?\)/, '$&\nset(CMAKE_OBJECT_PATH_MAX 32000)');
        // Fallback if no cmake_minimum_required
        if (!content.includes('CMAKE_OBJECT_PATH_MAX')) {
            content = 'set(CMAKE_OBJECT_PATH_MAX 32000)\n' + content;
        }
        fs.writeFileSync(fullPath, content);
        console.log(`Patched ${fullPath}`);
      }
    }
  }
}

console.log('Patching all CMakeLists.txt files in node_modules for Windows long paths limit...');
patchCMakeLists(nodeModulesDir);
console.log('Patching complete.');
