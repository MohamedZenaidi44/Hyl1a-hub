const https = require('https');
const url = "https://mii-unsecure.ariankordi.net/miis/image.glb?data=AwEAAAAAAAAAAAAAgP9wmQAAAAAAAAAAAABNAGkAaQAAAAAAAAAAAAAAAAAAAEBAAAAhAQJoRBgmNEYUgRIXaA0AACkAUkhQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMNn&verifyCharInfo=0&shaderType=wiiu&type=all_body";

https.get(url, (res) => {
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
}).on('error', e => console.error(e));
