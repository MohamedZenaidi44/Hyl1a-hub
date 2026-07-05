const https = require('https');
const fs = require('fs');

const url = "https://mii-unsecure.ariankordi.net/miis/image.glb?data=AwEAAAAAAAAAAAAAgP9wmQAAAAAAAAAAAABNAGkAaQAAAAAAAAAAAAAAAAAAAEBAAAAhAQJoRBgmNEYUgRIXaA0AACkAUkhQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMNn&verifyCharInfo=0&shaderType=wiiu&type=face";

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  console.log('Status:', res.statusCode);
  if (res.statusCode === 200) {
    const file = fs.createWriteStream("test_mii.glb");
    res.pipe(file);
    file.on('finish', () => {
      console.log('Downloaded GLB successfully. Size:', fs.statSync("test_mii.glb").size);
    });
  } else {
    res.on('data', d => console.log(d.toString()));
  }
}).on('error', (e) => {
  console.error(e);
});
