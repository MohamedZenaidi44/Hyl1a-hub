import Mii from "./js/external/mii.js";
import { Buffer } from "buffer";

const base64Mii = "AwEAAAAAAAAAAAAAgP9wmQAAAAAAAAAAAABNAGkAaQAAAAAAAAAAAAAAAAAAAEBAAAAhAQJoRBgmNEYUgRIXaA0AACkAUkhQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMNn";
const buf = Buffer.from(base64Mii, "base64");
const miiInfo = new Mii(buf);

console.log("Mii Name:", miiInfo.miiName);
console.log("Hair Type:", miiInfo.hairType);
console.log("URL:", miiInfo.studioAssetUrlHeadshot());
