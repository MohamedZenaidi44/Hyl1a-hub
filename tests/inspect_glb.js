const fs = require('fs');
const data = fs.readFileSync('test_fullbody.glb');

// GLB header: magic(4) + version(4) + length(4) + JSON chunk header(8)
const jsonLength = data.readUInt32LE(12);
const jsonString = data.toString('utf8', 20, 20 + jsonLength);
const json = JSON.parse(jsonString);

console.log('Meshes:', json.meshes?.length);
console.log('Nodes:', json.nodes?.length);
json.nodes?.forEach((n, i) => {
  console.log(`  Node ${i}: "${n.name || '(unnamed)'}" mesh:${n.mesh ?? 'none'} children:${JSON.stringify(n.children || [])}`);
});
console.log('\nMesh names:');
json.meshes?.forEach((m, i) => {
  console.log(`  Mesh ${i}: "${m.name || '(unnamed)'}" primitives:${m.primitives?.length}`);
});
