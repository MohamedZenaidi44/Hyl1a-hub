const https = require('https');
const url = "https://mii-unsecure.ariankordi.net/miis/image.glb?data=AwEAAAAAAAAAAAAAgP9wmQAAAAAAAAAAAABNAGkAaQAAAAAAAAAAAAAAAAAAAEBAAAAhAQJoRBgmNEYUgRIXaA0AACkAUkhQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMNn&verifyCharInfo=0&shaderType=wiiu&type=all_body";

https.get(url, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  let chunks = [];
  res.on('data', d => chunks.push(d));
  res.on('end', () => {
    let body = Buffer.concat(chunks);
    console.log('Size:', body.length);
    if(body.length < 1000) {
      console.log('Response body:', body.toString());
    }
  });
}).on('error', e => console.error(e));
