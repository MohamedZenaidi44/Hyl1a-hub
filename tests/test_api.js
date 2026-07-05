const fs = require('fs');

async function test(params, label) {
  const base = 'https://mii-unsecure.ariankordi.net/miis/image.glb?data=AwEAAAAAAAAAAAAAgP9wmQAAAAAAAAAAAABNAGkAaQAAAAAAAAAAAAAAAAAAAEBAAAAhAQJoRBgmNEYUgRIXaA0AACkAUkhQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMNn&verifyCharInfo=0';
  const url = base + '&' + params;
  try {
    const r = await fetch(url);
    if (r.ok) {
      const buf = await r.arrayBuffer();
      const data = Buffer.from(buf);
      const magic = data.toString('ascii', 0, 4);
      if (magic === 'glTF') {
        const jsonLength = data.readUInt32LE(12);
        const jsonStr = data.toString('utf8', 20, 20 + jsonLength);
        const json = JSON.parse(jsonStr);
        const meshNames = (json.meshes || []).map(m => m.name);
        console.log(`[${label}] ${buf.byteLength}b | ${meshNames.length} meshes: ${meshNames.join(', ')}`);
        // Save if body meshes found (more than 5 meshes or different size)
        if (meshNames.length > 5 || buf.byteLength > 80000) {
          const fn = `glb_${label.replace(/[^a-z0-9]/gi, '_')}.glb`;
          fs.writeFileSync(fn, data);
          console.log(`   >>> SAVED ${fn} (DIFFERENT!)`);
        }
      } else {
        console.log(`[${label}] ${buf.byteLength}b | NOT GLB`);
      }
    } else {
      const txt = await r.text();
      console.log(`[${label}] HTTP ${r.status}: ${txt.substring(0, 50)}`);
    }
  } catch(e) {
    console.log(`[${label}] ERROR: ${e.message.substring(0, 50)}`);
  }
}

async function main() {
  // Test different combos of drawStageMode and bodyType 
  const drawModes = ['all', 'body_only', 'body_inv_depth_mask'];
  const bodyTypes = ['wiiu', 'switch', '3ds', 'ffliconwithbody'];
  const types = ['face', 'all_body', 'all_body_sugar'];
  
  for (const dm of drawModes) {
    for (const bt of bodyTypes) {
      for (const t of types) {
        await test(`type=${t}&shaderType=wiiu&bodyType=${bt}&drawStageMode=${dm}`, `${t}_${bt}_${dm}`);
      }
    }
  }
  
  // Also test without shaderType
  await test('type=all_body&bodyType=wiiu&drawStageMode=all', 'allbody_wiiu_all_noshader');
  await test('type=all_body&bodyType=ffliconwithbody&drawStageMode=all', 'allbody_ffliconwithbody_all');
  
  // Try clothesColor and pantsColor
  await test('type=all_body&shaderType=wiiu&bodyType=wiiu&drawStageMode=all&clothesColor=red&pantsColor=blue', 'all_body_with_clothes');
}

main().then(() => console.log('\nDONE'));
