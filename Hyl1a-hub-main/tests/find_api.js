async function main() {
  const r = await fetch('https://mii.nxw.pw/');
  const html = await r.text();
  const srcMatches = [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)].map(m => m[1]);
  console.log('JS bundles found:', srcMatches);
  
  for (const src of srcMatches) {
    const url = src.startsWith('http') ? src : 'https://mii.nxw.pw' + (src.startsWith('/') ? '' : '/') + src;
    console.log('\nFetching:', url);
    const jr = await fetch(url);
    const js = await jr.text();
    console.log('Size:', js.length);
    
    // Search for glb-related strings
    const glb = [...js.matchAll(/.{0,80}\.glb.{0,80}/g)].map(m => m[0]);
    glb.forEach(g => console.log('  GLB:', g.substring(0, 120)));
    
    // Search for body type
    const body = [...js.matchAll(/.{0,40}body.{0,40}/gi)].filter(m => m[0].includes('all_body') || m[0].includes('bodyType'));
    body.forEach(b => console.log('  BODY:', b[0].substring(0, 100)));
    
    // Search for render URLs
    const renderUrls = [...js.matchAll(/["'`](https?:\/\/[^"'`\s]*(?:render|miis|ffl|ariankordi|nxw)[^"'`\s]*)/g)].map(m => m[1]);
    if (renderUrls.length) console.log('  URLS:', [...new Set(renderUrls)]);
  }
}
main();
