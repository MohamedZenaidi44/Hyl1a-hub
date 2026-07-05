var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

// mii-creator/node_modules/crypt/crypt.js
var require_crypt = __commonJS((exports, module) => {
  (function() {
    var base64map = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", crypt = {
      rotl: function(n, b) {
        return n << b | n >>> 32 - b;
      },
      rotr: function(n, b) {
        return n << 32 - b | n >>> b;
      },
      endian: function(n) {
        if (n.constructor == Number) {
          return crypt.rotl(n, 8) & 16711935 | crypt.rotl(n, 24) & 4278255360;
        }
        for (var i = 0;i < n.length; i++)
          n[i] = crypt.endian(n[i]);
        return n;
      },
      randomBytes: function(n) {
        for (var bytes = [];n > 0; n--)
          bytes.push(Math.floor(Math.random() * 256));
        return bytes;
      },
      bytesToWords: function(bytes) {
        for (var words = [], i = 0, b = 0;i < bytes.length; i++, b += 8)
          words[b >>> 5] |= bytes[i] << 24 - b % 32;
        return words;
      },
      wordsToBytes: function(words) {
        for (var bytes = [], b = 0;b < words.length * 32; b += 8)
          bytes.push(words[b >>> 5] >>> 24 - b % 32 & 255);
        return bytes;
      },
      bytesToHex: function(bytes) {
        for (var hex = [], i = 0;i < bytes.length; i++) {
          hex.push((bytes[i] >>> 4).toString(16));
          hex.push((bytes[i] & 15).toString(16));
        }
        return hex.join("");
      },
      hexToBytes: function(hex) {
        for (var bytes = [], c = 0;c < hex.length; c += 2)
          bytes.push(parseInt(hex.substr(c, 2), 16));
        return bytes;
      },
      bytesToBase64: function(bytes) {
        for (var base64 = [], i = 0;i < bytes.length; i += 3) {
          var triplet = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
          for (var j = 0;j < 4; j++)
            if (i * 8 + j * 6 <= bytes.length * 8)
              base64.push(base64map.charAt(triplet >>> 6 * (3 - j) & 63));
            else
              base64.push("=");
        }
        return base64.join("");
      },
      base64ToBytes: function(base64) {
        base64 = base64.replace(/[^A-Z0-9+\/]/ig, "");
        for (var bytes = [], i = 0, imod4 = 0;i < base64.length; imod4 = ++i % 4) {
          if (imod4 == 0)
            continue;
          bytes.push((base64map.indexOf(base64.charAt(i - 1)) & Math.pow(2, -2 * imod4 + 8) - 1) << imod4 * 2 | base64map.indexOf(base64.charAt(i)) >>> 6 - imod4 * 2);
        }
        return bytes;
      }
    };
    module.exports = crypt;
  })();
});

// mii-creator/node_modules/charenc/charenc.js
var require_charenc = __commonJS((exports, module) => {
  var charenc = {
    utf8: {
      stringToBytes: function(str) {
        return charenc.bin.stringToBytes(unescape(encodeURIComponent(str)));
      },
      bytesToString: function(bytes) {
        return decodeURIComponent(escape(charenc.bin.bytesToString(bytes)));
      }
    },
    bin: {
      stringToBytes: function(str) {
        for (var bytes = [], i = 0;i < str.length; i++)
          bytes.push(str.charCodeAt(i) & 255);
        return bytes;
      },
      bytesToString: function(bytes) {
        for (var str = [], i = 0;i < bytes.length; i++)
          str.push(String.fromCharCode(bytes[i]));
        return str.join("");
      }
    }
  };
  module.exports = charenc;
});

// mii-creator/node_modules/is-buffer/index.js
var require_is_buffer = __commonJS((exports, module) => {
  /*!
   * Determine if an object is a Buffer
   *
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   */
  module.exports = function(obj) {
    return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer);
  };
  function isBuffer(obj) {
    return !!obj.constructor && typeof obj.constructor.isBuffer === "function" && obj.constructor.isBuffer(obj);
  }
  function isSlowBuffer(obj) {
    return typeof obj.readFloatLE === "function" && typeof obj.slice === "function" && isBuffer(obj.slice(0, 0));
  }
});

// mii-creator/node_modules/md5/md5.js
var require_md5 = __commonJS((exports, module) => {
  (function() {
    var crypt = require_crypt(), utf8 = require_charenc().utf8, isBuffer = require_is_buffer(), bin = require_charenc().bin, md5 = function(message, options) {
      if (message.constructor == String)
        if (options && options.encoding === "binary")
          message = bin.stringToBytes(message);
        else
          message = utf8.stringToBytes(message);
      else if (isBuffer(message))
        message = Array.prototype.slice.call(message, 0);
      else if (!Array.isArray(message) && message.constructor !== Uint8Array)
        message = message.toString();
      var m = crypt.bytesToWords(message), l = message.length * 8, a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
      for (var i = 0;i < m.length; i++) {
        m[i] = (m[i] << 8 | m[i] >>> 24) & 16711935 | (m[i] << 24 | m[i] >>> 8) & 4278255360;
      }
      m[l >>> 5] |= 128 << l % 32;
      m[(l + 64 >>> 9 << 4) + 14] = l;
      var { _ff: FF, _gg: GG, _hh: HH, _ii: II } = md5;
      for (var i = 0;i < m.length; i += 16) {
        var aa = a, bb = b, cc = c, dd = d;
        a = FF(a, b, c, d, m[i + 0], 7, -680876936);
        d = FF(d, a, b, c, m[i + 1], 12, -389564586);
        c = FF(c, d, a, b, m[i + 2], 17, 606105819);
        b = FF(b, c, d, a, m[i + 3], 22, -1044525330);
        a = FF(a, b, c, d, m[i + 4], 7, -176418897);
        d = FF(d, a, b, c, m[i + 5], 12, 1200080426);
        c = FF(c, d, a, b, m[i + 6], 17, -1473231341);
        b = FF(b, c, d, a, m[i + 7], 22, -45705983);
        a = FF(a, b, c, d, m[i + 8], 7, 1770035416);
        d = FF(d, a, b, c, m[i + 9], 12, -1958414417);
        c = FF(c, d, a, b, m[i + 10], 17, -42063);
        b = FF(b, c, d, a, m[i + 11], 22, -1990404162);
        a = FF(a, b, c, d, m[i + 12], 7, 1804603682);
        d = FF(d, a, b, c, m[i + 13], 12, -40341101);
        c = FF(c, d, a, b, m[i + 14], 17, -1502002290);
        b = FF(b, c, d, a, m[i + 15], 22, 1236535329);
        a = GG(a, b, c, d, m[i + 1], 5, -165796510);
        d = GG(d, a, b, c, m[i + 6], 9, -1069501632);
        c = GG(c, d, a, b, m[i + 11], 14, 643717713);
        b = GG(b, c, d, a, m[i + 0], 20, -373897302);
        a = GG(a, b, c, d, m[i + 5], 5, -701558691);
        d = GG(d, a, b, c, m[i + 10], 9, 38016083);
        c = GG(c, d, a, b, m[i + 15], 14, -660478335);
        b = GG(b, c, d, a, m[i + 4], 20, -405537848);
        a = GG(a, b, c, d, m[i + 9], 5, 568446438);
        d = GG(d, a, b, c, m[i + 14], 9, -1019803690);
        c = GG(c, d, a, b, m[i + 3], 14, -187363961);
        b = GG(b, c, d, a, m[i + 8], 20, 1163531501);
        a = GG(a, b, c, d, m[i + 13], 5, -1444681467);
        d = GG(d, a, b, c, m[i + 2], 9, -51403784);
        c = GG(c, d, a, b, m[i + 7], 14, 1735328473);
        b = GG(b, c, d, a, m[i + 12], 20, -1926607734);
        a = HH(a, b, c, d, m[i + 5], 4, -378558);
        d = HH(d, a, b, c, m[i + 8], 11, -2022574463);
        c = HH(c, d, a, b, m[i + 11], 16, 1839030562);
        b = HH(b, c, d, a, m[i + 14], 23, -35309556);
        a = HH(a, b, c, d, m[i + 1], 4, -1530992060);
        d = HH(d, a, b, c, m[i + 4], 11, 1272893353);
        c = HH(c, d, a, b, m[i + 7], 16, -155497632);
        b = HH(b, c, d, a, m[i + 10], 23, -1094730640);
        a = HH(a, b, c, d, m[i + 13], 4, 681279174);
        d = HH(d, a, b, c, m[i + 0], 11, -358537222);
        c = HH(c, d, a, b, m[i + 3], 16, -722521979);
        b = HH(b, c, d, a, m[i + 6], 23, 76029189);
        a = HH(a, b, c, d, m[i + 9], 4, -640364487);
        d = HH(d, a, b, c, m[i + 12], 11, -421815835);
        c = HH(c, d, a, b, m[i + 15], 16, 530742520);
        b = HH(b, c, d, a, m[i + 2], 23, -995338651);
        a = II(a, b, c, d, m[i + 0], 6, -198630844);
        d = II(d, a, b, c, m[i + 7], 10, 1126891415);
        c = II(c, d, a, b, m[i + 14], 15, -1416354905);
        b = II(b, c, d, a, m[i + 5], 21, -57434055);
        a = II(a, b, c, d, m[i + 12], 6, 1700485571);
        d = II(d, a, b, c, m[i + 3], 10, -1894986606);
        c = II(c, d, a, b, m[i + 10], 15, -1051523);
        b = II(b, c, d, a, m[i + 1], 21, -2054922799);
        a = II(a, b, c, d, m[i + 8], 6, 1873313359);
        d = II(d, a, b, c, m[i + 15], 10, -30611744);
        c = II(c, d, a, b, m[i + 6], 15, -1560198380);
        b = II(b, c, d, a, m[i + 13], 21, 1309151649);
        a = II(a, b, c, d, m[i + 4], 6, -145523070);
        d = II(d, a, b, c, m[i + 11], 10, -1120210379);
        c = II(c, d, a, b, m[i + 2], 15, 718787259);
        b = II(b, c, d, a, m[i + 9], 21, -343485551);
        a = a + aa >>> 0;
        b = b + bb >>> 0;
        c = c + cc >>> 0;
        d = d + dd >>> 0;
      }
      return crypt.endian([a, b, c, d]);
    };
    md5._ff = function(a, b, c, d, x, s, t) {
      var n = a + (b & c | ~b & d) + (x >>> 0) + t;
      return (n << s | n >>> 32 - s) + b;
    };
    md5._gg = function(a, b, c, d, x, s, t) {
      var n = a + (b & d | c & ~d) + (x >>> 0) + t;
      return (n << s | n >>> 32 - s) + b;
    };
    md5._hh = function(a, b, c, d, x, s, t) {
      var n = a + (b ^ c ^ d) + (x >>> 0) + t;
      return (n << s | n >>> 32 - s) + b;
    };
    md5._ii = function(a, b, c, d, x, s, t) {
      var n = a + (c ^ (b | ~d)) + (x >>> 0) + t;
      return (n << s | n >>> 32 - s) + b;
    };
    md5._blocksize = 16;
    md5._digestsize = 16;
    module.exports = function(message, options) {
      if (message === undefined || message === null)
        throw new Error("Illegal argument " + message);
      var digestbytes = crypt.wordsToBytes(md5(message, options));
      return options && options.asBytes ? digestbytes : options && options.asString ? bin.bytesToString(digestbytes) : crypt.bytesToHex(digestbytes);
    };
  })();
});

// mii-creator/node_modules/base64-js/index.js
var require_base64_js = __commonJS((exports) => {
  exports.byteLength = byteLength;
  exports.toByteArray = toByteArray;
  exports.fromByteArray = fromByteArray;
  var lookup = [];
  var revLookup = [];
  var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
  var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (i = 0, len = code.length;i < len; ++i) {
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
  }
  var i;
  var len;
  revLookup[45] = 62;
  revLookup[95] = 63;
  function getLens(b64) {
    var len2 = b64.length;
    if (len2 % 4 > 0) {
      throw new Error("Invalid string. Length must be a multiple of 4");
    }
    var validLen = b64.indexOf("=");
    if (validLen === -1)
      validLen = len2;
    var placeHoldersLen = validLen === len2 ? 0 : 4 - validLen % 4;
    return [validLen, placeHoldersLen];
  }
  function byteLength(b64) {
    var lens = getLens(b64);
    var validLen = lens[0];
    var placeHoldersLen = lens[1];
    return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
  }
  function _byteLength(b64, validLen, placeHoldersLen) {
    return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
  }
  function toByteArray(b64) {
    var tmp;
    var lens = getLens(b64);
    var validLen = lens[0];
    var placeHoldersLen = lens[1];
    var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
    var curByte = 0;
    var len2 = placeHoldersLen > 0 ? validLen - 4 : validLen;
    var i2;
    for (i2 = 0;i2 < len2; i2 += 4) {
      tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
      arr[curByte++] = tmp >> 16 & 255;
      arr[curByte++] = tmp >> 8 & 255;
      arr[curByte++] = tmp & 255;
    }
    if (placeHoldersLen === 2) {
      tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
      arr[curByte++] = tmp & 255;
    }
    if (placeHoldersLen === 1) {
      tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
      arr[curByte++] = tmp >> 8 & 255;
      arr[curByte++] = tmp & 255;
    }
    return arr;
  }
  function tripletToBase64(num) {
    return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
  }
  function encodeChunk(uint8, start, end) {
    var tmp;
    var output = [];
    for (var i2 = start;i2 < end; i2 += 3) {
      tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
      output.push(tripletToBase64(tmp));
    }
    return output.join("");
  }
  function fromByteArray(uint8) {
    var tmp;
    var len2 = uint8.length;
    var extraBytes = len2 % 3;
    var parts = [];
    var maxChunkLength = 16383;
    for (var i2 = 0, len22 = len2 - extraBytes;i2 < len22; i2 += maxChunkLength) {
      parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len22 ? len22 : i2 + maxChunkLength));
    }
    if (extraBytes === 1) {
      tmp = uint8[len2 - 1];
      parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "==");
    } else if (extraBytes === 2) {
      tmp = (uint8[len2 - 2] << 8) + uint8[len2 - 1];
      parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "=");
    }
    return parts.join("");
  }
});

// mii-creator/node_modules/ieee754/index.js
var require_ieee754 = __commonJS((exports) => {
  /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
  exports.read = function(buffer, offset, isLE, mLen, nBytes) {
    var e, m;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i = isLE ? nBytes - 1 : 0;
    var d = isLE ? -1 : 1;
    var s = buffer[offset + i];
    i += d;
    e = s & (1 << -nBits) - 1;
    s >>= -nBits;
    nBits += eLen;
    for (;nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}
    m = e & (1 << -nBits) - 1;
    e >>= -nBits;
    nBits += mLen;
    for (;nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}
    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : (s ? -1 : 1) * Infinity;
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
  };
  exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
    var e, m, c;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
    var i = isLE ? 0 : nBytes - 1;
    var d = isLE ? 1 : -1;
    var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
    value = Math.abs(value);
    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }
      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = (value * c - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }
    for (;mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {}
    e = e << mLen | m;
    eLen += mLen;
    for (;eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {}
    buffer[offset + i - d] |= s * 128;
  };
});

// mii-creator/node_modules/has-symbols/shams.js
var require_shams = __commonJS((exports, module) => {
  module.exports = function hasSymbols() {
    if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
      return false;
    }
    if (typeof Symbol.iterator === "symbol") {
      return true;
    }
    var obj = {};
    var sym = Symbol("test");
    var symObj = Object(sym);
    if (typeof sym === "string") {
      return false;
    }
    if (Object.prototype.toString.call(sym) !== "[object Symbol]") {
      return false;
    }
    if (Object.prototype.toString.call(symObj) !== "[object Symbol]") {
      return false;
    }
    var symVal = 42;
    obj[sym] = symVal;
    for (sym in obj) {
      return false;
    }
    if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) {
      return false;
    }
    if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) {
      return false;
    }
    var syms = Object.getOwnPropertySymbols(obj);
    if (syms.length !== 1 || syms[0] !== sym) {
      return false;
    }
    if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
      return false;
    }
    if (typeof Object.getOwnPropertyDescriptor === "function") {
      var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
      if (descriptor.value !== symVal || descriptor.enumerable !== true) {
        return false;
      }
    }
    return true;
  };
});

// mii-creator/node_modules/has-tostringtag/shams.js
var require_shams2 = __commonJS((exports, module) => {
  var hasSymbols = require_shams();
  module.exports = function hasToStringTagShams() {
    return hasSymbols() && !!Symbol.toStringTag;
  };
});

// mii-creator/node_modules/es-errors/index.js
var require_es_errors = __commonJS((exports, module) => {
  module.exports = Error;
});

// mii-creator/node_modules/es-errors/eval.js
var require_eval = __commonJS((exports, module) => {
  module.exports = EvalError;
});

// mii-creator/node_modules/es-errors/range.js
var require_range = __commonJS((exports, module) => {
  module.exports = RangeError;
});

// mii-creator/node_modules/es-errors/ref.js
var require_ref = __commonJS((exports, module) => {
  module.exports = ReferenceError;
});

// mii-creator/node_modules/es-errors/syntax.js
var require_syntax = __commonJS((exports, module) => {
  module.exports = SyntaxError;
});

// mii-creator/node_modules/es-errors/type.js
var require_type = __commonJS((exports, module) => {
  module.exports = TypeError;
});

// mii-creator/node_modules/es-errors/uri.js
var require_uri = __commonJS((exports, module) => {
  module.exports = URIError;
});

// mii-creator/node_modules/has-symbols/index.js
var require_has_symbols = __commonJS((exports, module) => {
  var origSymbol = typeof Symbol !== "undefined" && Symbol;
  var hasSymbolSham = require_shams();
  module.exports = function hasNativeSymbols() {
    if (typeof origSymbol !== "function") {
      return false;
    }
    if (typeof Symbol !== "function") {
      return false;
    }
    if (typeof origSymbol("foo") !== "symbol") {
      return false;
    }
    if (typeof Symbol("bar") !== "symbol") {
      return false;
    }
    return hasSymbolSham();
  };
});

// mii-creator/node_modules/has-proto/index.js
var require_has_proto = __commonJS((exports, module) => {
  var test = {
    __proto__: null,
    foo: {}
  };
  var $Object = Object;
  module.exports = function hasProto() {
    return { __proto__: test }.foo === test.foo && !(test instanceof $Object);
  };
});

// mii-creator/node_modules/function-bind/implementation.js
var require_implementation = __commonJS((exports, module) => {
  var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
  var toStr = Object.prototype.toString;
  var max = Math.max;
  var funcType = "[object Function]";
  var concatty = function concatty2(a, b) {
    var arr = [];
    for (var i = 0;i < a.length; i += 1) {
      arr[i] = a[i];
    }
    for (var j = 0;j < b.length; j += 1) {
      arr[j + a.length] = b[j];
    }
    return arr;
  };
  var slicy = function slicy2(arrLike, offset) {
    var arr = [];
    for (var i = offset || 0, j = 0;i < arrLike.length; i += 1, j += 1) {
      arr[j] = arrLike[i];
    }
    return arr;
  };
  var joiny = function(arr, joiner) {
    var str = "";
    for (var i = 0;i < arr.length; i += 1) {
      str += arr[i];
      if (i + 1 < arr.length) {
        str += joiner;
      }
    }
    return str;
  };
  module.exports = function bind(that) {
    var target = this;
    if (typeof target !== "function" || toStr.apply(target) !== funcType) {
      throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slicy(arguments, 1);
    var bound;
    var binder = function() {
      if (this instanceof bound) {
        var result = target.apply(this, concatty(args, arguments));
        if (Object(result) === result) {
          return result;
        }
        return this;
      }
      return target.apply(that, concatty(args, arguments));
    };
    var boundLength = max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0;i < boundLength; i++) {
      boundArgs[i] = "$" + i;
    }
    bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder);
    if (target.prototype) {
      var Empty = function Empty2() {};
      Empty.prototype = target.prototype;
      bound.prototype = new Empty;
      Empty.prototype = null;
    }
    return bound;
  };
});

// mii-creator/node_modules/function-bind/index.js
var require_function_bind = __commonJS((exports, module) => {
  var implementation = require_implementation();
  module.exports = Function.prototype.bind || implementation;
});

// mii-creator/node_modules/hasown/index.js
var require_hasown = __commonJS((exports, module) => {
  var call = Function.prototype.call;
  var $hasOwn = Object.prototype.hasOwnProperty;
  var bind = require_function_bind();
  module.exports = bind.call(call, $hasOwn);
});

// mii-creator/node_modules/get-intrinsic/index.js
var require_get_intrinsic = __commonJS((exports, module) => {
  var undefined2;
  var $Error = require_es_errors();
  var $EvalError = require_eval();
  var $RangeError = require_range();
  var $ReferenceError = require_ref();
  var $SyntaxError = require_syntax();
  var $TypeError = require_type();
  var $URIError = require_uri();
  var $Function = Function;
  var getEvalledConstructor = function(expressionSyntax) {
    try {
      return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
    } catch (e) {}
  };
  var $gOPD = Object.getOwnPropertyDescriptor;
  if ($gOPD) {
    try {
      $gOPD({}, "");
    } catch (e) {
      $gOPD = null;
    }
  }
  var throwTypeError = function() {
    throw new $TypeError;
  };
  var ThrowTypeError = $gOPD ? function() {
    try {
      arguments.callee;
      return throwTypeError;
    } catch (calleeThrows) {
      try {
        return $gOPD(arguments, "callee").get;
      } catch (gOPDthrows) {
        return throwTypeError;
      }
    }
  }() : throwTypeError;
  var hasSymbols = require_has_symbols()();
  var hasProto = require_has_proto()();
  var getProto = Object.getPrototypeOf || (hasProto ? function(x) {
    return x.__proto__;
  } : null);
  var needsEval = {};
  var TypedArray = typeof Uint8Array === "undefined" || !getProto ? undefined2 : getProto(Uint8Array);
  var INTRINSICS = {
    __proto__: null,
    "%AggregateError%": typeof AggregateError === "undefined" ? undefined2 : AggregateError,
    "%Array%": Array,
    "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? undefined2 : ArrayBuffer,
    "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined2,
    "%AsyncFromSyncIteratorPrototype%": undefined2,
    "%AsyncFunction%": needsEval,
    "%AsyncGenerator%": needsEval,
    "%AsyncGeneratorFunction%": needsEval,
    "%AsyncIteratorPrototype%": needsEval,
    "%Atomics%": typeof Atomics === "undefined" ? undefined2 : Atomics,
    "%BigInt%": typeof BigInt === "undefined" ? undefined2 : BigInt,
    "%BigInt64Array%": typeof BigInt64Array === "undefined" ? undefined2 : BigInt64Array,
    "%BigUint64Array%": typeof BigUint64Array === "undefined" ? undefined2 : BigUint64Array,
    "%Boolean%": Boolean,
    "%DataView%": typeof DataView === "undefined" ? undefined2 : DataView,
    "%Date%": Date,
    "%decodeURI%": decodeURI,
    "%decodeURIComponent%": decodeURIComponent,
    "%encodeURI%": encodeURI,
    "%encodeURIComponent%": encodeURIComponent,
    "%Error%": $Error,
    "%eval%": eval,
    "%EvalError%": $EvalError,
    "%Float32Array%": typeof Float32Array === "undefined" ? undefined2 : Float32Array,
    "%Float64Array%": typeof Float64Array === "undefined" ? undefined2 : Float64Array,
    "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? undefined2 : FinalizationRegistry,
    "%Function%": $Function,
    "%GeneratorFunction%": needsEval,
    "%Int8Array%": typeof Int8Array === "undefined" ? undefined2 : Int8Array,
    "%Int16Array%": typeof Int16Array === "undefined" ? undefined2 : Int16Array,
    "%Int32Array%": typeof Int32Array === "undefined" ? undefined2 : Int32Array,
    "%isFinite%": isFinite,
    "%isNaN%": isNaN,
    "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined2,
    "%JSON%": typeof JSON === "object" ? JSON : undefined2,
    "%Map%": typeof Map === "undefined" ? undefined2 : Map,
    "%MapIteratorPrototype%": typeof Map === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto(new Map()[Symbol.iterator]()),
    "%Math%": Math,
    "%Number%": Number,
    "%Object%": Object,
    "%parseFloat%": parseFloat,
    "%parseInt%": parseInt,
    "%Promise%": typeof Promise === "undefined" ? undefined2 : Promise,
    "%Proxy%": typeof Proxy === "undefined" ? undefined2 : Proxy,
    "%RangeError%": $RangeError,
    "%ReferenceError%": $ReferenceError,
    "%Reflect%": typeof Reflect === "undefined" ? undefined2 : Reflect,
    "%RegExp%": RegExp,
    "%Set%": typeof Set === "undefined" ? undefined2 : Set,
    "%SetIteratorPrototype%": typeof Set === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto(new Set()[Symbol.iterator]()),
    "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? undefined2 : SharedArrayBuffer,
    "%String%": String,
    "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : undefined2,
    "%Symbol%": hasSymbols ? Symbol : undefined2,
    "%SyntaxError%": $SyntaxError,
    "%ThrowTypeError%": ThrowTypeError,
    "%TypedArray%": TypedArray,
    "%TypeError%": $TypeError,
    "%Uint8Array%": typeof Uint8Array === "undefined" ? undefined2 : Uint8Array,
    "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? undefined2 : Uint8ClampedArray,
    "%Uint16Array%": typeof Uint16Array === "undefined" ? undefined2 : Uint16Array,
    "%Uint32Array%": typeof Uint32Array === "undefined" ? undefined2 : Uint32Array,
    "%URIError%": $URIError,
    "%WeakMap%": typeof WeakMap === "undefined" ? undefined2 : WeakMap,
    "%WeakRef%": typeof WeakRef === "undefined" ? undefined2 : WeakRef,
    "%WeakSet%": typeof WeakSet === "undefined" ? undefined2 : WeakSet
  };
  if (getProto) {
    try {
      null.error;
    } catch (e) {
      errorProto = getProto(getProto(e));
      INTRINSICS["%Error.prototype%"] = errorProto;
    }
  }
  var errorProto;
  var doEval = function doEval2(name) {
    var value;
    if (name === "%AsyncFunction%") {
      value = getEvalledConstructor("async function () {}");
    } else if (name === "%GeneratorFunction%") {
      value = getEvalledConstructor("function* () {}");
    } else if (name === "%AsyncGeneratorFunction%") {
      value = getEvalledConstructor("async function* () {}");
    } else if (name === "%AsyncGenerator%") {
      var fn = doEval2("%AsyncGeneratorFunction%");
      if (fn) {
        value = fn.prototype;
      }
    } else if (name === "%AsyncIteratorPrototype%") {
      var gen = doEval2("%AsyncGenerator%");
      if (gen && getProto) {
        value = getProto(gen.prototype);
      }
    }
    INTRINSICS[name] = value;
    return value;
  };
  var LEGACY_ALIASES = {
    __proto__: null,
    "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
    "%ArrayPrototype%": ["Array", "prototype"],
    "%ArrayProto_entries%": ["Array", "prototype", "entries"],
    "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
    "%ArrayProto_keys%": ["Array", "prototype", "keys"],
    "%ArrayProto_values%": ["Array", "prototype", "values"],
    "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
    "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
    "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
    "%BooleanPrototype%": ["Boolean", "prototype"],
    "%DataViewPrototype%": ["DataView", "prototype"],
    "%DatePrototype%": ["Date", "prototype"],
    "%ErrorPrototype%": ["Error", "prototype"],
    "%EvalErrorPrototype%": ["EvalError", "prototype"],
    "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
    "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
    "%FunctionPrototype%": ["Function", "prototype"],
    "%Generator%": ["GeneratorFunction", "prototype"],
    "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
    "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
    "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
    "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
    "%JSONParse%": ["JSON", "parse"],
    "%JSONStringify%": ["JSON", "stringify"],
    "%MapPrototype%": ["Map", "prototype"],
    "%NumberPrototype%": ["Number", "prototype"],
    "%ObjectPrototype%": ["Object", "prototype"],
    "%ObjProto_toString%": ["Object", "prototype", "toString"],
    "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
    "%PromisePrototype%": ["Promise", "prototype"],
    "%PromiseProto_then%": ["Promise", "prototype", "then"],
    "%Promise_all%": ["Promise", "all"],
    "%Promise_reject%": ["Promise", "reject"],
    "%Promise_resolve%": ["Promise", "resolve"],
    "%RangeErrorPrototype%": ["RangeError", "prototype"],
    "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
    "%RegExpPrototype%": ["RegExp", "prototype"],
    "%SetPrototype%": ["Set", "prototype"],
    "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
    "%StringPrototype%": ["String", "prototype"],
    "%SymbolPrototype%": ["Symbol", "prototype"],
    "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
    "%TypedArrayPrototype%": ["TypedArray", "prototype"],
    "%TypeErrorPrototype%": ["TypeError", "prototype"],
    "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
    "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
    "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
    "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
    "%URIErrorPrototype%": ["URIError", "prototype"],
    "%WeakMapPrototype%": ["WeakMap", "prototype"],
    "%WeakSetPrototype%": ["WeakSet", "prototype"]
  };
  var bind = require_function_bind();
  var hasOwn = require_hasown();
  var $concat = bind.call(Function.call, Array.prototype.concat);
  var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
  var $replace = bind.call(Function.call, String.prototype.replace);
  var $strSlice = bind.call(Function.call, String.prototype.slice);
  var $exec = bind.call(Function.call, RegExp.prototype.exec);
  var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
  var reEscapeChar = /\\(\\)?/g;
  var stringToPath = function stringToPath2(string) {
    var first = $strSlice(string, 0, 1);
    var last = $strSlice(string, -1);
    if (first === "%" && last !== "%") {
      throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
    } else if (last === "%" && first !== "%") {
      throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
    }
    var result = [];
    $replace(string, rePropName, function(match, number, quote, subString) {
      result[result.length] = quote ? $replace(subString, reEscapeChar, "$1") : number || match;
    });
    return result;
  };
  var getBaseIntrinsic = function getBaseIntrinsic2(name, allowMissing) {
    var intrinsicName = name;
    var alias;
    if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
      alias = LEGACY_ALIASES[intrinsicName];
      intrinsicName = "%" + alias[0] + "%";
    }
    if (hasOwn(INTRINSICS, intrinsicName)) {
      var value = INTRINSICS[intrinsicName];
      if (value === needsEval) {
        value = doEval(intrinsicName);
      }
      if (typeof value === "undefined" && !allowMissing) {
        throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
      }
      return {
        alias,
        name: intrinsicName,
        value
      };
    }
    throw new $SyntaxError("intrinsic " + name + " does not exist!");
  };
  module.exports = function GetIntrinsic(name, allowMissing) {
    if (typeof name !== "string" || name.length === 0) {
      throw new $TypeError("intrinsic name must be a non-empty string");
    }
    if (arguments.length > 1 && typeof allowMissing !== "boolean") {
      throw new $TypeError('"allowMissing" argument must be a boolean');
    }
    if ($exec(/^%?[^%]*%?$/, name) === null) {
      throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
    }
    var parts = stringToPath(name);
    var intrinsicBaseName = parts.length > 0 ? parts[0] : "";
    var intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing);
    var intrinsicRealName = intrinsic.name;
    var value = intrinsic.value;
    var skipFurtherCaching = false;
    var alias = intrinsic.alias;
    if (alias) {
      intrinsicBaseName = alias[0];
      $spliceApply(parts, $concat([0, 1], alias));
    }
    for (var i = 1, isOwn = true;i < parts.length; i += 1) {
      var part = parts[i];
      var first = $strSlice(part, 0, 1);
      var last = $strSlice(part, -1);
      if ((first === '"' || first === "'" || first === "`" || (last === '"' || last === "'" || last === "`")) && first !== last) {
        throw new $SyntaxError("property names with quotes must have matching quotes");
      }
      if (part === "constructor" || !isOwn) {
        skipFurtherCaching = true;
      }
      intrinsicBaseName += "." + part;
      intrinsicRealName = "%" + intrinsicBaseName + "%";
      if (hasOwn(INTRINSICS, intrinsicRealName)) {
        value = INTRINSICS[intrinsicRealName];
      } else if (value != null) {
        if (!(part in value)) {
          if (!allowMissing) {
            throw new $TypeError("base intrinsic for " + name + " exists, but the property is not available.");
          }
          return;
        }
        if ($gOPD && i + 1 >= parts.length) {
          var desc = $gOPD(value, part);
          isOwn = !!desc;
          if (isOwn && "get" in desc && !("originalValue" in desc.get)) {
            value = desc.get;
          } else {
            value = value[part];
          }
        } else {
          isOwn = hasOwn(value, part);
          value = value[part];
        }
        if (isOwn && !skipFurtherCaching) {
          INTRINSICS[intrinsicRealName] = value;
        }
      }
    }
    return value;
  };
});

// mii-creator/node_modules/es-define-property/index.js
var require_es_define_property = __commonJS((exports, module) => {
  var GetIntrinsic = require_get_intrinsic();
  var $defineProperty = GetIntrinsic("%Object.defineProperty%", true) || false;
  if ($defineProperty) {
    try {
      $defineProperty({}, "a", { value: 1 });
    } catch (e) {
      $defineProperty = false;
    }
  }
  module.exports = $defineProperty;
});

// mii-creator/node_modules/gopd/index.js
var require_gopd = __commonJS((exports, module) => {
  var GetIntrinsic = require_get_intrinsic();
  var $gOPD = GetIntrinsic("%Object.getOwnPropertyDescriptor%", true);
  if ($gOPD) {
    try {
      $gOPD([], "length");
    } catch (e) {
      $gOPD = null;
    }
  }
  module.exports = $gOPD;
});

// mii-creator/node_modules/define-data-property/index.js
var require_define_data_property = __commonJS((exports, module) => {
  var $defineProperty = require_es_define_property();
  var $SyntaxError = require_syntax();
  var $TypeError = require_type();
  var gopd = require_gopd();
  module.exports = function defineDataProperty(obj, property, value) {
    if (!obj || typeof obj !== "object" && typeof obj !== "function") {
      throw new $TypeError("`obj` must be an object or a function`");
    }
    if (typeof property !== "string" && typeof property !== "symbol") {
      throw new $TypeError("`property` must be a string or a symbol`");
    }
    if (arguments.length > 3 && typeof arguments[3] !== "boolean" && arguments[3] !== null) {
      throw new $TypeError("`nonEnumerable`, if provided, must be a boolean or null");
    }
    if (arguments.length > 4 && typeof arguments[4] !== "boolean" && arguments[4] !== null) {
      throw new $TypeError("`nonWritable`, if provided, must be a boolean or null");
    }
    if (arguments.length > 5 && typeof arguments[5] !== "boolean" && arguments[5] !== null) {
      throw new $TypeError("`nonConfigurable`, if provided, must be a boolean or null");
    }
    if (arguments.length > 6 && typeof arguments[6] !== "boolean") {
      throw new $TypeError("`loose`, if provided, must be a boolean");
    }
    var nonEnumerable = arguments.length > 3 ? arguments[3] : null;
    var nonWritable = arguments.length > 4 ? arguments[4] : null;
    var nonConfigurable = arguments.length > 5 ? arguments[5] : null;
    var loose = arguments.length > 6 ? arguments[6] : false;
    var desc = !!gopd && gopd(obj, property);
    if ($defineProperty) {
      $defineProperty(obj, property, {
        configurable: nonConfigurable === null && desc ? desc.configurable : !nonConfigurable,
        enumerable: nonEnumerable === null && desc ? desc.enumerable : !nonEnumerable,
        value,
        writable: nonWritable === null && desc ? desc.writable : !nonWritable
      });
    } else if (loose || !nonEnumerable && !nonWritable && !nonConfigurable) {
      obj[property] = value;
    } else {
      throw new $SyntaxError("This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.");
    }
  };
});

// mii-creator/node_modules/has-property-descriptors/index.js
var require_has_property_descriptors = __commonJS((exports, module) => {
  var $defineProperty = require_es_define_property();
  var hasPropertyDescriptors = function hasPropertyDescriptors2() {
    return !!$defineProperty;
  };
  hasPropertyDescriptors.hasArrayLengthDefineBug = function hasArrayLengthDefineBug() {
    if (!$defineProperty) {
      return null;
    }
    try {
      return $defineProperty([], "length", { value: 1 }).length !== 1;
    } catch (e) {
      return true;
    }
  };
  module.exports = hasPropertyDescriptors;
});

// mii-creator/node_modules/set-function-length/index.js
var require_set_function_length = __commonJS((exports, module) => {
  var GetIntrinsic = require_get_intrinsic();
  var define = require_define_data_property();
  var hasDescriptors = require_has_property_descriptors()();
  var gOPD = require_gopd();
  var $TypeError = require_type();
  var $floor = GetIntrinsic("%Math.floor%");
  module.exports = function setFunctionLength(fn, length) {
    if (typeof fn !== "function") {
      throw new $TypeError("`fn` is not a function");
    }
    if (typeof length !== "number" || length < 0 || length > 4294967295 || $floor(length) !== length) {
      throw new $TypeError("`length` must be a positive 32-bit integer");
    }
    var loose = arguments.length > 2 && !!arguments[2];
    var functionLengthIsConfigurable = true;
    var functionLengthIsWritable = true;
    if ("length" in fn && gOPD) {
      var desc = gOPD(fn, "length");
      if (desc && !desc.configurable) {
        functionLengthIsConfigurable = false;
      }
      if (desc && !desc.writable) {
        functionLengthIsWritable = false;
      }
    }
    if (functionLengthIsConfigurable || functionLengthIsWritable || !loose) {
      if (hasDescriptors) {
        define(fn, "length", length, true, true);
      } else {
        define(fn, "length", length);
      }
    }
    return fn;
  };
});

// mii-creator/node_modules/call-bind/index.js
var require_call_bind = __commonJS((exports, module) => {
  var bind = require_function_bind();
  var GetIntrinsic = require_get_intrinsic();
  var setFunctionLength = require_set_function_length();
  var $TypeError = require_type();
  var $apply = GetIntrinsic("%Function.prototype.apply%");
  var $call = GetIntrinsic("%Function.prototype.call%");
  var $reflectApply = GetIntrinsic("%Reflect.apply%", true) || bind.call($call, $apply);
  var $defineProperty = require_es_define_property();
  var $max = GetIntrinsic("%Math.max%");
  module.exports = function callBind(originalFunction) {
    if (typeof originalFunction !== "function") {
      throw new $TypeError("a function is required");
    }
    var func = $reflectApply(bind, $call, arguments);
    return setFunctionLength(func, 1 + $max(0, originalFunction.length - (arguments.length - 1)), true);
  };
  var applyBind = function applyBind2() {
    return $reflectApply(bind, $apply, arguments);
  };
  if ($defineProperty) {
    $defineProperty(module.exports, "apply", { value: applyBind });
  } else {
    module.exports.apply = applyBind;
  }
});

// mii-creator/node_modules/call-bind/callBound.js
var require_callBound = __commonJS((exports, module) => {
  var GetIntrinsic = require_get_intrinsic();
  var callBind = require_call_bind();
  var $indexOf = callBind(GetIntrinsic("String.prototype.indexOf"));
  module.exports = function callBoundIntrinsic(name, allowMissing) {
    var intrinsic = GetIntrinsic(name, !!allowMissing);
    if (typeof intrinsic === "function" && $indexOf(name, ".prototype.") > -1) {
      return callBind(intrinsic);
    }
    return intrinsic;
  };
});

// mii-creator/node_modules/is-arguments/index.js
var require_is_arguments = __commonJS((exports, module) => {
  var hasToStringTag = require_shams2()();
  var callBound = require_callBound();
  var $toString = callBound("Object.prototype.toString");
  var isStandardArguments = function isArguments(value) {
    if (hasToStringTag && value && typeof value === "object" && Symbol.toStringTag in value) {
      return false;
    }
    return $toString(value) === "[object Arguments]";
  };
  var isLegacyArguments = function isArguments(value) {
    if (isStandardArguments(value)) {
      return true;
    }
    return value !== null && typeof value === "object" && typeof value.length === "number" && value.length >= 0 && $toString(value) !== "[object Array]" && $toString(value.callee) === "[object Function]";
  };
  var supportsStandardArguments = function() {
    return isStandardArguments(arguments);
  }();
  isStandardArguments.isLegacyArguments = isLegacyArguments;
  module.exports = supportsStandardArguments ? isStandardArguments : isLegacyArguments;
});

// mii-creator/node_modules/is-generator-function/index.js
var require_is_generator_function = __commonJS((exports, module) => {
  var toStr = Object.prototype.toString;
  var fnToStr = Function.prototype.toString;
  var isFnRegex = /^\s*(?:function)?\*/;
  var hasToStringTag = require_shams2()();
  var getProto = Object.getPrototypeOf;
  var getGeneratorFunc = function() {
    if (!hasToStringTag) {
      return false;
    }
    try {
      return Function("return function*() {}")();
    } catch (e) {}
  };
  var GeneratorFunction;
  module.exports = function isGeneratorFunction(fn) {
    if (typeof fn !== "function") {
      return false;
    }
    if (isFnRegex.test(fnToStr.call(fn))) {
      return true;
    }
    if (!hasToStringTag) {
      var str = toStr.call(fn);
      return str === "[object GeneratorFunction]";
    }
    if (!getProto) {
      return false;
    }
    if (typeof GeneratorFunction === "undefined") {
      var generatorFunc = getGeneratorFunc();
      GeneratorFunction = generatorFunc ? getProto(generatorFunc) : false;
    }
    return getProto(fn) === GeneratorFunction;
  };
});

// mii-creator/node_modules/is-callable/index.js
var require_is_callable = __commonJS((exports, module) => {
  var fnToStr = Function.prototype.toString;
  var reflectApply = typeof Reflect === "object" && Reflect !== null && Reflect.apply;
  var badArrayLike;
  var isCallableMarker;
  if (typeof reflectApply === "function" && typeof Object.defineProperty === "function") {
    try {
      badArrayLike = Object.defineProperty({}, "length", {
        get: function() {
          throw isCallableMarker;
        }
      });
      isCallableMarker = {};
      reflectApply(function() {
        throw 42;
      }, null, badArrayLike);
    } catch (_) {
      if (_ !== isCallableMarker) {
        reflectApply = null;
      }
    }
  } else {
    reflectApply = null;
  }
  var constructorRegex = /^\s*class\b/;
  var isES6ClassFn = function isES6ClassFunction(value) {
    try {
      var fnStr = fnToStr.call(value);
      return constructorRegex.test(fnStr);
    } catch (e) {
      return false;
    }
  };
  var tryFunctionObject = function tryFunctionToStr(value) {
    try {
      if (isES6ClassFn(value)) {
        return false;
      }
      fnToStr.call(value);
      return true;
    } catch (e) {
      return false;
    }
  };
  var toStr = Object.prototype.toString;
  var objectClass = "[object Object]";
  var fnClass = "[object Function]";
  var genClass = "[object GeneratorFunction]";
  var ddaClass = "[object HTMLAllCollection]";
  var ddaClass2 = "[object HTML document.all class]";
  var ddaClass3 = "[object HTMLCollection]";
  var hasToStringTag = typeof Symbol === "function" && !!Symbol.toStringTag;
  var isIE68 = !(0 in [,]);
  var isDDA = function isDocumentDotAll() {
    return false;
  };
  if (typeof document === "object") {
    all = document.all;
    if (toStr.call(all) === toStr.call(document.all)) {
      isDDA = function isDocumentDotAll(value) {
        if ((isIE68 || !value) && (typeof value === "undefined" || typeof value === "object")) {
          try {
            var str = toStr.call(value);
            return (str === ddaClass || str === ddaClass2 || str === ddaClass3 || str === objectClass) && value("") == null;
          } catch (e) {}
        }
        return false;
      };
    }
  }
  var all;
  module.exports = reflectApply ? function isCallable(value) {
    if (isDDA(value)) {
      return true;
    }
    if (!value) {
      return false;
    }
    if (typeof value !== "function" && typeof value !== "object") {
      return false;
    }
    try {
      reflectApply(value, null, badArrayLike);
    } catch (e) {
      if (e !== isCallableMarker) {
        return false;
      }
    }
    return !isES6ClassFn(value) && tryFunctionObject(value);
  } : function isCallable(value) {
    if (isDDA(value)) {
      return true;
    }
    if (!value) {
      return false;
    }
    if (typeof value !== "function" && typeof value !== "object") {
      return false;
    }
    if (hasToStringTag) {
      return tryFunctionObject(value);
    }
    if (isES6ClassFn(value)) {
      return false;
    }
    var strClass = toStr.call(value);
    if (strClass !== fnClass && strClass !== genClass && !/^\[object HTML/.test(strClass)) {
      return false;
    }
    return tryFunctionObject(value);
  };
});

// mii-creator/node_modules/for-each/index.js
var require_for_each = __commonJS((exports, module) => {
  var isCallable = require_is_callable();
  var toStr = Object.prototype.toString;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var forEachArray = function forEachArray2(array, iterator, receiver) {
    for (var i = 0, len = array.length;i < len; i++) {
      if (hasOwnProperty.call(array, i)) {
        if (receiver == null) {
          iterator(array[i], i, array);
        } else {
          iterator.call(receiver, array[i], i, array);
        }
      }
    }
  };
  var forEachString = function forEachString2(string, iterator, receiver) {
    for (var i = 0, len = string.length;i < len; i++) {
      if (receiver == null) {
        iterator(string.charAt(i), i, string);
      } else {
        iterator.call(receiver, string.charAt(i), i, string);
      }
    }
  };
  var forEachObject = function forEachObject2(object, iterator, receiver) {
    for (var k in object) {
      if (hasOwnProperty.call(object, k)) {
        if (receiver == null) {
          iterator(object[k], k, object);
        } else {
          iterator.call(receiver, object[k], k, object);
        }
      }
    }
  };
  var forEach = function forEach2(list, iterator, thisArg) {
    if (!isCallable(iterator)) {
      throw new TypeError("iterator must be a function");
    }
    var receiver;
    if (arguments.length >= 3) {
      receiver = thisArg;
    }
    if (toStr.call(list) === "[object Array]") {
      forEachArray(list, iterator, receiver);
    } else if (typeof list === "string") {
      forEachString(list, iterator, receiver);
    } else {
      forEachObject(list, iterator, receiver);
    }
  };
  module.exports = forEach;
});

// mii-creator/node_modules/possible-typed-array-names/index.js
var require_possible_typed_array_names = __commonJS((exports, module) => {
  module.exports = [
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Int16Array",
    "Int32Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Uint16Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array"
  ];
});

// mii-creator/node_modules/available-typed-arrays/index.js
var require_available_typed_arrays = __commonJS((exports, module) => {
  var possibleNames = require_possible_typed_array_names();
  var g = typeof globalThis === "undefined" ? global : globalThis;
  module.exports = function availableTypedArrays() {
    var out = [];
    for (var i = 0;i < possibleNames.length; i++) {
      if (typeof g[possibleNames[i]] === "function") {
        out[out.length] = possibleNames[i];
      }
    }
    return out;
  };
});

// mii-creator/node_modules/which-typed-array/index.js
var require_which_typed_array = __commonJS((exports, module) => {
  var forEach = require_for_each();
  var availableTypedArrays = require_available_typed_arrays();
  var callBind = require_call_bind();
  var callBound = require_callBound();
  var gOPD = require_gopd();
  var $toString = callBound("Object.prototype.toString");
  var hasToStringTag = require_shams2()();
  var g = typeof globalThis === "undefined" ? global : globalThis;
  var typedArrays = availableTypedArrays();
  var $slice = callBound("String.prototype.slice");
  var getPrototypeOf = Object.getPrototypeOf;
  var $indexOf = callBound("Array.prototype.indexOf", true) || function indexOf2(array, value) {
    for (var i = 0;i < array.length; i += 1) {
      if (array[i] === value) {
        return i;
      }
    }
    return -1;
  };
  var cache = { __proto__: null };
  if (hasToStringTag && gOPD && getPrototypeOf) {
    forEach(typedArrays, function(typedArray) {
      var arr = new g[typedArray];
      if (Symbol.toStringTag in arr) {
        var proto = getPrototypeOf(arr);
        var descriptor = gOPD(proto, Symbol.toStringTag);
        if (!descriptor) {
          var superProto = getPrototypeOf(proto);
          descriptor = gOPD(superProto, Symbol.toStringTag);
        }
        cache["$" + typedArray] = callBind(descriptor.get);
      }
    });
  } else {
    forEach(typedArrays, function(typedArray) {
      var arr = new g[typedArray];
      var fn = arr.slice || arr.set;
      if (fn) {
        cache["$" + typedArray] = callBind(fn);
      }
    });
  }
  var tryTypedArrays = function tryAllTypedArrays(value) {
    var found = false;
    forEach(cache, function(getter, typedArray) {
      if (!found) {
        try {
          if ("$" + getter(value) === typedArray) {
            found = $slice(typedArray, 1);
          }
        } catch (e) {}
      }
    });
    return found;
  };
  var trySlices = function tryAllSlices(value) {
    var found = false;
    forEach(cache, function(getter, name) {
      if (!found) {
        try {
          getter(value);
          found = $slice(name, 1);
        } catch (e) {}
      }
    });
    return found;
  };
  module.exports = function whichTypedArray(value) {
    if (!value || typeof value !== "object") {
      return false;
    }
    if (!hasToStringTag) {
      var tag = $slice($toString(value), 8, -1);
      if ($indexOf(typedArrays, tag) > -1) {
        return tag;
      }
      if (tag !== "Object") {
        return false;
      }
      return trySlices(value);
    }
    if (!gOPD) {
      return null;
    }
    return tryTypedArrays(value);
  };
});

// mii-creator/node_modules/is-typed-array/index.js
var require_is_typed_array = __commonJS((exports, module) => {
  var whichTypedArray = require_which_typed_array();
  module.exports = function isTypedArray(value) {
    return !!whichTypedArray(value);
  };
});

// mii-creator/node_modules/util/support/types.js
var require_types = __commonJS((exports) => {
  var isArgumentsObject = require_is_arguments();
  var isGeneratorFunction = require_is_generator_function();
  var whichTypedArray = require_which_typed_array();
  var isTypedArray = require_is_typed_array();
  function uncurryThis(f) {
    return f.call.bind(f);
  }
  var BigIntSupported = typeof BigInt !== "undefined";
  var SymbolSupported = typeof Symbol !== "undefined";
  var ObjectToString = uncurryThis(Object.prototype.toString);
  var numberValue = uncurryThis(Number.prototype.valueOf);
  var stringValue = uncurryThis(String.prototype.valueOf);
  var booleanValue = uncurryThis(Boolean.prototype.valueOf);
  if (BigIntSupported) {
    bigIntValue = uncurryThis(BigInt.prototype.valueOf);
  }
  var bigIntValue;
  if (SymbolSupported) {
    symbolValue = uncurryThis(Symbol.prototype.valueOf);
  }
  var symbolValue;
  function checkBoxedPrimitive(value, prototypeValueOf) {
    if (typeof value !== "object") {
      return false;
    }
    try {
      prototypeValueOf(value);
      return true;
    } catch (e) {
      return false;
    }
  }
  exports.isArgumentsObject = isArgumentsObject;
  exports.isGeneratorFunction = isGeneratorFunction;
  exports.isTypedArray = isTypedArray;
  function isPromise(input) {
    return typeof Promise !== "undefined" && input instanceof Promise || input !== null && typeof input === "object" && typeof input.then === "function" && typeof input.catch === "function";
  }
  exports.isPromise = isPromise;
  function isArrayBufferView(value) {
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
      return ArrayBuffer.isView(value);
    }
    return isTypedArray(value) || isDataView(value);
  }
  exports.isArrayBufferView = isArrayBufferView;
  function isUint8Array(value) {
    return whichTypedArray(value) === "Uint8Array";
  }
  exports.isUint8Array = isUint8Array;
  function isUint8ClampedArray(value) {
    return whichTypedArray(value) === "Uint8ClampedArray";
  }
  exports.isUint8ClampedArray = isUint8ClampedArray;
  function isUint16Array(value) {
    return whichTypedArray(value) === "Uint16Array";
  }
  exports.isUint16Array = isUint16Array;
  function isUint32Array(value) {
    return whichTypedArray(value) === "Uint32Array";
  }
  exports.isUint32Array = isUint32Array;
  function isInt8Array(value) {
    return whichTypedArray(value) === "Int8Array";
  }
  exports.isInt8Array = isInt8Array;
  function isInt16Array(value) {
    return whichTypedArray(value) === "Int16Array";
  }
  exports.isInt16Array = isInt16Array;
  function isInt32Array(value) {
    return whichTypedArray(value) === "Int32Array";
  }
  exports.isInt32Array = isInt32Array;
  function isFloat32Array(value) {
    return whichTypedArray(value) === "Float32Array";
  }
  exports.isFloat32Array = isFloat32Array;
  function isFloat64Array(value) {
    return whichTypedArray(value) === "Float64Array";
  }
  exports.isFloat64Array = isFloat64Array;
  function isBigInt64Array(value) {
    return whichTypedArray(value) === "BigInt64Array";
  }
  exports.isBigInt64Array = isBigInt64Array;
  function isBigUint64Array(value) {
    return whichTypedArray(value) === "BigUint64Array";
  }
  exports.isBigUint64Array = isBigUint64Array;
  function isMapToString(value) {
    return ObjectToString(value) === "[object Map]";
  }
  isMapToString.working = typeof Map !== "undefined" && isMapToString(new Map);
  function isMap(value) {
    if (typeof Map === "undefined") {
      return false;
    }
    return isMapToString.working ? isMapToString(value) : value instanceof Map;
  }
  exports.isMap = isMap;
  function isSetToString(value) {
    return ObjectToString(value) === "[object Set]";
  }
  isSetToString.working = typeof Set !== "undefined" && isSetToString(new Set);
  function isSet(value) {
    if (typeof Set === "undefined") {
      return false;
    }
    return isSetToString.working ? isSetToString(value) : value instanceof Set;
  }
  exports.isSet = isSet;
  function isWeakMapToString(value) {
    return ObjectToString(value) === "[object WeakMap]";
  }
  isWeakMapToString.working = typeof WeakMap !== "undefined" && isWeakMapToString(new WeakMap);
  function isWeakMap(value) {
    if (typeof WeakMap === "undefined") {
      return false;
    }
    return isWeakMapToString.working ? isWeakMapToString(value) : value instanceof WeakMap;
  }
  exports.isWeakMap = isWeakMap;
  function isWeakSetToString(value) {
    return ObjectToString(value) === "[object WeakSet]";
  }
  isWeakSetToString.working = typeof WeakSet !== "undefined" && isWeakSetToString(new WeakSet);
  function isWeakSet(value) {
    return isWeakSetToString(value);
  }
  exports.isWeakSet = isWeakSet;
  function isArrayBufferToString(value) {
    return ObjectToString(value) === "[object ArrayBuffer]";
  }
  isArrayBufferToString.working = typeof ArrayBuffer !== "undefined" && isArrayBufferToString(new ArrayBuffer);
  function isArrayBuffer(value) {
    if (typeof ArrayBuffer === "undefined") {
      return false;
    }
    return isArrayBufferToString.working ? isArrayBufferToString(value) : value instanceof ArrayBuffer;
  }
  exports.isArrayBuffer = isArrayBuffer;
  function isDataViewToString(value) {
    return ObjectToString(value) === "[object DataView]";
  }
  isDataViewToString.working = typeof ArrayBuffer !== "undefined" && typeof DataView !== "undefined" && isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1));
  function isDataView(value) {
    if (typeof DataView === "undefined") {
      return false;
    }
    return isDataViewToString.working ? isDataViewToString(value) : value instanceof DataView;
  }
  exports.isDataView = isDataView;
  var SharedArrayBufferCopy = typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : undefined;
  function isSharedArrayBufferToString(value) {
    return ObjectToString(value) === "[object SharedArrayBuffer]";
  }
  function isSharedArrayBuffer(value) {
    if (typeof SharedArrayBufferCopy === "undefined") {
      return false;
    }
    if (typeof isSharedArrayBufferToString.working === "undefined") {
      isSharedArrayBufferToString.working = isSharedArrayBufferToString(new SharedArrayBufferCopy);
    }
    return isSharedArrayBufferToString.working ? isSharedArrayBufferToString(value) : value instanceof SharedArrayBufferCopy;
  }
  exports.isSharedArrayBuffer = isSharedArrayBuffer;
  function isAsyncFunction(value) {
    return ObjectToString(value) === "[object AsyncFunction]";
  }
  exports.isAsyncFunction = isAsyncFunction;
  function isMapIterator(value) {
    return ObjectToString(value) === "[object Map Iterator]";
  }
  exports.isMapIterator = isMapIterator;
  function isSetIterator(value) {
    return ObjectToString(value) === "[object Set Iterator]";
  }
  exports.isSetIterator = isSetIterator;
  function isGeneratorObject(value) {
    return ObjectToString(value) === "[object Generator]";
  }
  exports.isGeneratorObject = isGeneratorObject;
  function isWebAssemblyCompiledModule(value) {
    return ObjectToString(value) === "[object WebAssembly.Module]";
  }
  exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;
  function isNumberObject(value) {
    return checkBoxedPrimitive(value, numberValue);
  }
  exports.isNumberObject = isNumberObject;
  function isStringObject(value) {
    return checkBoxedPrimitive(value, stringValue);
  }
  exports.isStringObject = isStringObject;
  function isBooleanObject(value) {
    return checkBoxedPrimitive(value, booleanValue);
  }
  exports.isBooleanObject = isBooleanObject;
  function isBigIntObject(value) {
    return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
  }
  exports.isBigIntObject = isBigIntObject;
  function isSymbolObject(value) {
    return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
  }
  exports.isSymbolObject = isSymbolObject;
  function isBoxedPrimitive(value) {
    return isNumberObject(value) || isStringObject(value) || isBooleanObject(value) || isBigIntObject(value) || isSymbolObject(value);
  }
  exports.isBoxedPrimitive = isBoxedPrimitive;
  function isAnyArrayBuffer(value) {
    return typeof Uint8Array !== "undefined" && (isArrayBuffer(value) || isSharedArrayBuffer(value));
  }
  exports.isAnyArrayBuffer = isAnyArrayBuffer;
  ["isProxy", "isExternal", "isModuleNamespaceObject"].forEach(function(method) {
    Object.defineProperty(exports, method, {
      enumerable: false,
      value: function() {
        throw new Error(method + " is not supported in userland");
      }
    });
  });
});

// mii-creator/node_modules/util/support/isBufferBrowser.js
var require_isBufferBrowser = __commonJS((exports, module) => {
  module.exports = function isBuffer2(arg) {
    return arg && typeof arg === "object" && typeof arg.copy === "function" && typeof arg.fill === "function" && typeof arg.readUInt8 === "function";
  };
});

// mii-creator/node_modules/inherits/inherits_browser.js
var require_inherits_browser = __commonJS((exports, module) => {
  if (typeof Object.create === "function") {
    module.exports = function inherits(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
          constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
          }
        });
      }
    };
  } else {
    module.exports = function inherits(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function() {};
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor;
        ctor.prototype.constructor = ctor;
      }
    };
  }
});

// mii-creator/node_modules/util/util.js
var require_util = __commonJS((exports) => {
  var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors || function getOwnPropertyDescriptors2(obj) {
    var keys = Object.keys(obj);
    var descriptors = {};
    for (var i = 0;i < keys.length; i++) {
      descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
    }
    return descriptors;
  };
  var formatRegExp = /%[sdj%]/g;
  exports.format = function(f) {
    if (!isString(f)) {
      var objects = [];
      for (var i = 0;i < arguments.length; i++) {
        objects.push(inspect2(arguments[i]));
      }
      return objects.join(" ");
    }
    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function(x2) {
      if (x2 === "%%")
        return "%";
      if (i >= len)
        return x2;
      switch (x2) {
        case "%s":
          return String(args[i++]);
        case "%d":
          return Number(args[i++]);
        case "%j":
          try {
            return JSON.stringify(args[i++]);
          } catch (_) {
            return "[Circular]";
          }
        default:
          return x2;
      }
    });
    for (var x = args[i];i < len; x = args[++i]) {
      if (isNull(x) || !isObject(x)) {
        str += " " + x;
      } else {
        str += " " + inspect2(x);
      }
    }
    return str;
  };
  exports.deprecate = function(fn, msg) {
    if (typeof process !== "undefined" && process.noDeprecation === true) {
      return fn;
    }
    if (typeof process === "undefined") {
      return function() {
        return exports.deprecate(fn, msg).apply(this, arguments);
      };
    }
    var warned = false;
    function deprecated() {
      if (!warned) {
        if (process.throwDeprecation) {
          throw new Error(msg);
        } else if (process.traceDeprecation) {
          console.trace(msg);
        } else {
          console.error(msg);
        }
        warned = true;
      }
      return fn.apply(this, arguments);
    }
    return deprecated;
  };
  var debugs = {};
  var debugEnvRegex = /^$/;
  if (process.env.NODE_DEBUG) {
    debugEnv = process.env.NODE_DEBUG;
    debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".*").replace(/,/g, "$|^").toUpperCase();
    debugEnvRegex = new RegExp("^" + debugEnv + "$", "i");
  }
  var debugEnv;
  exports.debuglog = function(set) {
    set = set.toUpperCase();
    if (!debugs[set]) {
      if (debugEnvRegex.test(set)) {
        var pid = process.pid;
        debugs[set] = function() {
          var msg = exports.format.apply(exports, arguments);
          console.error("%s %d: %s", set, pid, msg);
        };
      } else {
        debugs[set] = function() {};
      }
    }
    return debugs[set];
  };
  function inspect2(obj, opts) {
    var ctx = {
      seen: [],
      stylize: stylizeNoColor
    };
    if (arguments.length >= 3)
      ctx.depth = arguments[2];
    if (arguments.length >= 4)
      ctx.colors = arguments[3];
    if (isBoolean(opts)) {
      ctx.showHidden = opts;
    } else if (opts) {
      exports._extend(ctx, opts);
    }
    if (isUndefined(ctx.showHidden))
      ctx.showHidden = false;
    if (isUndefined(ctx.depth))
      ctx.depth = 2;
    if (isUndefined(ctx.colors))
      ctx.colors = false;
    if (isUndefined(ctx.customInspect))
      ctx.customInspect = true;
    if (ctx.colors)
      ctx.stylize = stylizeWithColor;
    return formatValue(ctx, obj, ctx.depth);
  }
  exports.inspect = inspect2;
  inspect2.colors = {
    bold: [1, 22],
    italic: [3, 23],
    underline: [4, 24],
    inverse: [7, 27],
    white: [37, 39],
    grey: [90, 39],
    black: [30, 39],
    blue: [34, 39],
    cyan: [36, 39],
    green: [32, 39],
    magenta: [35, 39],
    red: [31, 39],
    yellow: [33, 39]
  };
  inspect2.styles = {
    special: "cyan",
    number: "yellow",
    boolean: "yellow",
    undefined: "grey",
    null: "bold",
    string: "green",
    date: "magenta",
    regexp: "red"
  };
  function stylizeWithColor(str, styleType) {
    var style = inspect2.styles[styleType];
    if (style) {
      return "\x1B[" + inspect2.colors[style][0] + "m" + str + "\x1B[" + inspect2.colors[style][1] + "m";
    } else {
      return str;
    }
  }
  function stylizeNoColor(str, styleType) {
    return str;
  }
  function arrayToHash(array) {
    var hash = {};
    array.forEach(function(val, idx) {
      hash[val] = true;
    });
    return hash;
  }
  function formatValue(ctx, value, recurseTimes) {
    if (ctx.customInspect && value && isFunction(value.inspect) && value.inspect !== exports.inspect && !(value.constructor && value.constructor.prototype === value)) {
      var ret = value.inspect(recurseTimes, ctx);
      if (!isString(ret)) {
        ret = formatValue(ctx, ret, recurseTimes);
      }
      return ret;
    }
    var primitive = formatPrimitive(ctx, value);
    if (primitive) {
      return primitive;
    }
    var keys = Object.keys(value);
    var visibleKeys = arrayToHash(keys);
    if (ctx.showHidden) {
      keys = Object.getOwnPropertyNames(value);
    }
    if (isError(value) && (keys.indexOf("message") >= 0 || keys.indexOf("description") >= 0)) {
      return formatError(value);
    }
    if (keys.length === 0) {
      if (isFunction(value)) {
        var name = value.name ? ": " + value.name : "";
        return ctx.stylize("[Function" + name + "]", "special");
      }
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
      }
      if (isDate(value)) {
        return ctx.stylize(Date.prototype.toString.call(value), "date");
      }
      if (isError(value)) {
        return formatError(value);
      }
    }
    var base = "", array = false, braces = ["{", "}"];
    if (isArray(value)) {
      array = true;
      braces = ["[", "]"];
    }
    if (isFunction(value)) {
      var n = value.name ? ": " + value.name : "";
      base = " [Function" + n + "]";
    }
    if (isRegExp(value)) {
      base = " " + RegExp.prototype.toString.call(value);
    }
    if (isDate(value)) {
      base = " " + Date.prototype.toUTCString.call(value);
    }
    if (isError(value)) {
      base = " " + formatError(value);
    }
    if (keys.length === 0 && (!array || value.length == 0)) {
      return braces[0] + base + braces[1];
    }
    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
      } else {
        return ctx.stylize("[Object]", "special");
      }
    }
    ctx.seen.push(value);
    var output;
    if (array) {
      output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
    } else {
      output = keys.map(function(key) {
        return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
      });
    }
    ctx.seen.pop();
    return reduceToSingleString(output, base, braces);
  }
  function formatPrimitive(ctx, value) {
    if (isUndefined(value))
      return ctx.stylize("undefined", "undefined");
    if (isString(value)) {
      var simple = "'" + JSON.stringify(value).replace(/^"|"$/g, "").replace(/'/g, "\\'").replace(/\\"/g, '"') + "'";
      return ctx.stylize(simple, "string");
    }
    if (isNumber(value))
      return ctx.stylize("" + value, "number");
    if (isBoolean(value))
      return ctx.stylize("" + value, "boolean");
    if (isNull(value))
      return ctx.stylize("null", "null");
  }
  function formatError(value) {
    return "[" + Error.prototype.toString.call(value) + "]";
  }
  function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
    var output = [];
    for (var i = 0, l = value.length;i < l; ++i) {
      if (hasOwnProperty(value, String(i))) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
      } else {
        output.push("");
      }
    }
    keys.forEach(function(key) {
      if (!key.match(/^\d+$/)) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
      }
    });
    return output;
  }
  function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
    var name, str, desc;
    desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
    if (desc.get) {
      if (desc.set) {
        str = ctx.stylize("[Getter/Setter]", "special");
      } else {
        str = ctx.stylize("[Getter]", "special");
      }
    } else {
      if (desc.set) {
        str = ctx.stylize("[Setter]", "special");
      }
    }
    if (!hasOwnProperty(visibleKeys, key)) {
      name = "[" + key + "]";
    }
    if (!str) {
      if (ctx.seen.indexOf(desc.value) < 0) {
        if (isNull(recurseTimes)) {
          str = formatValue(ctx, desc.value, null);
        } else {
          str = formatValue(ctx, desc.value, recurseTimes - 1);
        }
        if (str.indexOf(`
`) > -1) {
          if (array) {
            str = str.split(`
`).map(function(line) {
              return "  " + line;
            }).join(`
`).slice(2);
          } else {
            str = `
` + str.split(`
`).map(function(line) {
              return "   " + line;
            }).join(`
`);
          }
        }
      } else {
        str = ctx.stylize("[Circular]", "special");
      }
    }
    if (isUndefined(name)) {
      if (array && key.match(/^\d+$/)) {
        return str;
      }
      name = JSON.stringify("" + key);
      if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
        name = name.slice(1, -1);
        name = ctx.stylize(name, "name");
      } else {
        name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
        name = ctx.stylize(name, "string");
      }
    }
    return name + ": " + str;
  }
  function reduceToSingleString(output, base, braces) {
    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf(`
`) >= 0)
        numLinesEst++;
      return prev + cur.replace(/\u001b\[\d\d?m/g, "").length + 1;
    }, 0);
    if (length > 60) {
      return braces[0] + (base === "" ? "" : base + `
 `) + " " + output.join(`,
  `) + " " + braces[1];
    }
    return braces[0] + base + " " + output.join(", ") + " " + braces[1];
  }
  exports.types = require_types();
  function isArray(ar) {
    return Array.isArray(ar);
  }
  exports.isArray = isArray;
  function isBoolean(arg) {
    return typeof arg === "boolean";
  }
  exports.isBoolean = isBoolean;
  function isNull(arg) {
    return arg === null;
  }
  exports.isNull = isNull;
  function isNullOrUndefined(arg) {
    return arg == null;
  }
  exports.isNullOrUndefined = isNullOrUndefined;
  function isNumber(arg) {
    return typeof arg === "number";
  }
  exports.isNumber = isNumber;
  function isString(arg) {
    return typeof arg === "string";
  }
  exports.isString = isString;
  function isSymbol(arg) {
    return typeof arg === "symbol";
  }
  exports.isSymbol = isSymbol;
  function isUndefined(arg) {
    return arg === undefined;
  }
  exports.isUndefined = isUndefined;
  function isRegExp(re) {
    return isObject(re) && objectToString(re) === "[object RegExp]";
  }
  exports.isRegExp = isRegExp;
  exports.types.isRegExp = isRegExp;
  function isObject(arg) {
    return typeof arg === "object" && arg !== null;
  }
  exports.isObject = isObject;
  function isDate(d) {
    return isObject(d) && objectToString(d) === "[object Date]";
  }
  exports.isDate = isDate;
  exports.types.isDate = isDate;
  function isError(e) {
    return isObject(e) && (objectToString(e) === "[object Error]" || e instanceof Error);
  }
  exports.isError = isError;
  exports.types.isNativeError = isError;
  function isFunction(arg) {
    return typeof arg === "function";
  }
  exports.isFunction = isFunction;
  function isPrimitive(arg) {
    return arg === null || typeof arg === "boolean" || typeof arg === "number" || typeof arg === "string" || typeof arg === "symbol" || typeof arg === "undefined";
  }
  exports.isPrimitive = isPrimitive;
  exports.isBuffer = require_isBufferBrowser();
  function objectToString(o) {
    return Object.prototype.toString.call(o);
  }
  function pad(n) {
    return n < 10 ? "0" + n.toString(10) : n.toString(10);
  }
  var months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];
  function timestamp() {
    var d = new Date;
    var time = [
      pad(d.getHours()),
      pad(d.getMinutes()),
      pad(d.getSeconds())
    ].join(":");
    return [d.getDate(), months[d.getMonth()], time].join(" ");
  }
  exports.log = function() {
    console.log("%s - %s", timestamp(), exports.format.apply(exports, arguments));
  };
  exports.inherits = require_inherits_browser();
  exports._extend = function(origin, add) {
    if (!add || !isObject(add))
      return origin;
    var keys = Object.keys(add);
    var i = keys.length;
    while (i--) {
      origin[keys[i]] = add[keys[i]];
    }
    return origin;
  };
  function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }
  var kCustomPromisifiedSymbol = typeof Symbol !== "undefined" ? Symbol("util.promisify.custom") : undefined;
  exports.promisify = function promisify(original) {
    if (typeof original !== "function")
      throw new TypeError('The "original" argument must be of type Function');
    if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
      var fn = original[kCustomPromisifiedSymbol];
      if (typeof fn !== "function") {
        throw new TypeError('The "util.promisify.custom" argument must be of type Function');
      }
      Object.defineProperty(fn, kCustomPromisifiedSymbol, {
        value: fn,
        enumerable: false,
        writable: false,
        configurable: true
      });
      return fn;
    }
    function fn() {
      var promiseResolve, promiseReject;
      var promise = new Promise(function(resolve, reject) {
        promiseResolve = resolve;
        promiseReject = reject;
      });
      var args = [];
      for (var i = 0;i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      args.push(function(err, value) {
        if (err) {
          promiseReject(err);
        } else {
          promiseResolve(value);
        }
      });
      try {
        original.apply(this, args);
      } catch (err) {
        promiseReject(err);
      }
      return promise;
    }
    Object.setPrototypeOf(fn, Object.getPrototypeOf(original));
    if (kCustomPromisifiedSymbol)
      Object.defineProperty(fn, kCustomPromisifiedSymbol, {
        value: fn,
        enumerable: false,
        writable: false,
        configurable: true
      });
    return Object.defineProperties(fn, getOwnPropertyDescriptors(original));
  };
  exports.promisify.custom = kCustomPromisifiedSymbol;
  function callbackifyOnRejected(reason, cb) {
    if (!reason) {
      var newReason = new Error("Promise was rejected with a falsy value");
      newReason.reason = reason;
      reason = newReason;
    }
    return cb(reason);
  }
  function callbackify(original) {
    if (typeof original !== "function") {
      throw new TypeError('The "original" argument must be of type Function');
    }
    function callbackified() {
      var args = [];
      for (var i = 0;i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      var maybeCb = args.pop();
      if (typeof maybeCb !== "function") {
        throw new TypeError("The last argument must be of type Function");
      }
      var self = this;
      var cb = function() {
        return maybeCb.apply(self, arguments);
      };
      original.apply(this, args).then(function(ret) {
        process.nextTick(cb.bind(null, null, ret));
      }, function(rej) {
        process.nextTick(callbackifyOnRejected.bind(null, rej, cb));
      });
    }
    Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
    Object.defineProperties(callbackified, getOwnPropertyDescriptors(original));
    return callbackified;
  }
  exports.callbackify = callbackify;
});

// mii-creator/src/external/assert/internal/errors.js
var require_errors = __commonJS((exports, module) => {
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  function _defineProperties(target, props) {
    for (var i = 0;i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor)
        descriptor.writable = true;
      Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
    }
  }
  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps)
      _defineProperties(Constructor.prototype, protoProps);
    if (staticProps)
      _defineProperties(Constructor, staticProps);
    Object.defineProperty(Constructor, "prototype", { writable: false });
    return Constructor;
  }
  function _toPropertyKey(arg) {
    var key = _toPrimitive(arg, "string");
    return _typeof(key) === "symbol" ? key : String(key);
  }
  function _toPrimitive(input, hint) {
    if (_typeof(input) !== "object" || input === null)
      return input;
    var prim = input[Symbol.toPrimitive];
    if (prim !== undefined) {
      var res = prim.call(input, hint || "default");
      if (_typeof(res) !== "object")
        return res;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (hint === "string" ? String : Number)(input);
  }
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } });
    Object.defineProperty(subClass, "prototype", { writable: false });
    if (superClass)
      _setPrototypeOf(subClass, superClass);
  }
  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
      o2.__proto__ = p2;
      return o2;
    };
    return _setPrototypeOf(o, p);
  }
  function _createSuper(Derived) {
    var hasNativeReflectConstruct = _isNativeReflectConstruct();
    return function _createSuperInternal() {
      var Super = _getPrototypeOf(Derived), result;
      if (hasNativeReflectConstruct) {
        var NewTarget = _getPrototypeOf(this).constructor;
        result = Reflect.construct(Super, arguments, NewTarget);
      } else {
        result = Super.apply(this, arguments);
      }
      return _possibleConstructorReturn(this, result);
    };
  }
  function _possibleConstructorReturn(self, call) {
    if (call && (_typeof(call) === "object" || typeof call === "function")) {
      return call;
    } else if (call !== undefined) {
      throw new TypeError("Derived constructors may only return object or undefined");
    }
    return _assertThisInitialized(self);
  }
  function _assertThisInitialized(self) {
    if (self === undefined) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return self;
  }
  function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct)
      return false;
    if (Reflect.construct.sham)
      return false;
    if (typeof Proxy === "function")
      return true;
    try {
      Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {}));
      return true;
    } catch (e) {
      return false;
    }
  }
  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf2(o2) {
      return o2.__proto__ || Object.getPrototypeOf(o2);
    };
    return _getPrototypeOf(o);
  }
  var codes = {};
  var assert;
  var util;
  function createErrorType(code, message, Base) {
    if (!Base) {
      Base = Error;
    }
    function getMessage(arg1, arg2, arg3) {
      if (typeof message === "string") {
        return message;
      } else {
        return message(arg1, arg2, arg3);
      }
    }
    var NodeError = /* @__PURE__ */ function(_Base) {
      _inherits(NodeError2, _Base);
      var _super = _createSuper(NodeError2);
      function NodeError2(arg1, arg2, arg3) {
        var _this;
        _classCallCheck(this, NodeError2);
        _this = _super.call(this, getMessage(arg1, arg2, arg3));
        _this.code = code;
        return _this;
      }
      return _createClass(NodeError2);
    }(Base);
    codes[code] = NodeError;
  }
  function oneOf(expected, thing) {
    if (Array.isArray(expected)) {
      var len = expected.length;
      expected = expected.map(function(i) {
        return String(i);
      });
      if (len > 2) {
        return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(", "), ", or ") + expected[len - 1];
      } else if (len === 2) {
        return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
      } else {
        return "of ".concat(thing, " ").concat(expected[0]);
      }
    } else {
      return "of ".concat(thing, " ").concat(String(expected));
    }
  }
  function startsWith(str, search, pos) {
    return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
  }
  function endsWith(str, search, this_len) {
    if (this_len === undefined || this_len > str.length) {
      this_len = str.length;
    }
    return str.substring(this_len - search.length, this_len) === search;
  }
  function includes2(str, search, start) {
    if (typeof start !== "number") {
      start = 0;
    }
    if (start + search.length > str.length) {
      return false;
    } else {
      return str.indexOf(search, start) !== -1;
    }
  }
  createErrorType("ERR_AMBIGUOUS_ARGUMENT", 'The "%s" argument is ambiguous. %s', TypeError);
  createErrorType("ERR_INVALID_ARG_TYPE", function(name, expected, actual) {
    if (assert === undefined)
      assert = require_assert();
    assert(typeof name === "string", "'name' must be a string");
    var determiner;
    if (typeof expected === "string" && startsWith(expected, "not ")) {
      determiner = "must not be";
      expected = expected.replace(/^not /, "");
    } else {
      determiner = "must be";
    }
    var msg;
    if (endsWith(name, " argument")) {
      msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, "type"));
    } else {
      var type = includes2(name, ".") ? "property" : "argument";
      msg = 'The "'.concat(name, '" ').concat(type, " ").concat(determiner, " ").concat(oneOf(expected, "type"));
    }
    msg += ". Received type ".concat(_typeof(actual));
    return msg;
  }, TypeError);
  createErrorType("ERR_INVALID_ARG_VALUE", function(name, value) {
    var reason = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "is invalid";
    if (util === undefined)
      util = require_util();
    var inspected = util.inspect(value);
    if (inspected.length > 128) {
      inspected = "".concat(inspected.slice(0, 128), "...");
    }
    return "The argument '".concat(name, "' ").concat(reason, ". Received ").concat(inspected);
  }, TypeError, RangeError);
  createErrorType("ERR_INVALID_RETURN_VALUE", function(input, name, value) {
    var type;
    if (value && value.constructor && value.constructor.name) {
      type = "instance of ".concat(value.constructor.name);
    } else {
      type = "type ".concat(_typeof(value));
    }
    return "Expected ".concat(input, ' to be returned from the "').concat(name, '"') + " function but got ".concat(type, ".");
  }, TypeError);
  createErrorType("ERR_MISSING_ARGS", function() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0;_key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    if (assert === undefined)
      assert = require_assert();
    assert(args.length > 0, "At least one arg needs to be specified");
    var msg = "The ";
    var len = args.length;
    args = args.map(function(a) {
      return '"'.concat(a, '"');
    });
    switch (len) {
      case 1:
        msg += "".concat(args[0], " argument");
        break;
      case 2:
        msg += "".concat(args[0], " and ").concat(args[1], " arguments");
        break;
      default:
        msg += args.slice(0, len - 1).join(", ");
        msg += ", and ".concat(args[len - 1], " arguments");
        break;
    }
    return "".concat(msg, " must be specified");
  }, TypeError);
  exports.codes = codes;
});

// mii-creator/src/external/assert/internal/assert/assertion_error.js
var require_assertion_error = __commonJS((exports, module) => {
  function ownKeys(e, r) {
    var t = Object.keys(e);
    if (Object.getOwnPropertySymbols) {
      var o = Object.getOwnPropertySymbols(e);
      r && (o = o.filter(function(r2) {
        return Object.getOwnPropertyDescriptor(e, r2).enumerable;
      })), t.push.apply(t, o);
    }
    return t;
  }
  function _objectSpread(e) {
    for (var r = 1;r < arguments.length; r++) {
      var t = arguments[r] != null ? arguments[r] : {};
      r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
        _defineProperty(e, r2, t[r2]);
      }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
        Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
      });
    }
    return e;
  }
  function _defineProperty(obj, key, value) {
    key = _toPropertyKey(key);
    if (key in obj) {
      Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
    } else {
      obj[key] = value;
    }
    return obj;
  }
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  function _defineProperties(target, props) {
    for (var i = 0;i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor)
        descriptor.writable = true;
      Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
    }
  }
  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps)
      _defineProperties(Constructor.prototype, protoProps);
    if (staticProps)
      _defineProperties(Constructor, staticProps);
    Object.defineProperty(Constructor, "prototype", { writable: false });
    return Constructor;
  }
  function _toPropertyKey(arg) {
    var key = _toPrimitive(arg, "string");
    return _typeof(key) === "symbol" ? key : String(key);
  }
  function _toPrimitive(input, hint) {
    if (_typeof(input) !== "object" || input === null)
      return input;
    var prim = input[Symbol.toPrimitive];
    if (prim !== undefined) {
      var res = prim.call(input, hint || "default");
      if (_typeof(res) !== "object")
        return res;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (hint === "string" ? String : Number)(input);
  }
  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } });
    Object.defineProperty(subClass, "prototype", { writable: false });
    if (superClass)
      _setPrototypeOf(subClass, superClass);
  }
  function _createSuper(Derived) {
    var hasNativeReflectConstruct = _isNativeReflectConstruct();
    return function _createSuperInternal() {
      var Super = _getPrototypeOf(Derived), result;
      if (hasNativeReflectConstruct) {
        var NewTarget = _getPrototypeOf(this).constructor;
        result = Reflect.construct(Super, arguments, NewTarget);
      } else {
        result = Super.apply(this, arguments);
      }
      return _possibleConstructorReturn(this, result);
    };
  }
  function _possibleConstructorReturn(self, call) {
    if (call && (_typeof(call) === "object" || typeof call === "function")) {
      return call;
    } else if (call !== undefined) {
      throw new TypeError("Derived constructors may only return object or undefined");
    }
    return _assertThisInitialized(self);
  }
  function _assertThisInitialized(self) {
    if (self === undefined) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return self;
  }
  function _wrapNativeSuper(Class) {
    var _cache = typeof Map === "function" ? new Map : undefined;
    _wrapNativeSuper = function _wrapNativeSuper2(Class2) {
      if (Class2 === null || !_isNativeFunction(Class2))
        return Class2;
      if (typeof Class2 !== "function") {
        throw new TypeError("Super expression must either be null or a function");
      }
      if (typeof _cache !== "undefined") {
        if (_cache.has(Class2))
          return _cache.get(Class2);
        _cache.set(Class2, Wrapper);
      }
      function Wrapper() {
        return _construct(Class2, arguments, _getPrototypeOf(this).constructor);
      }
      Wrapper.prototype = Object.create(Class2.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } });
      return _setPrototypeOf(Wrapper, Class2);
    };
    return _wrapNativeSuper(Class);
  }
  function _construct(Parent, args, Class) {
    if (_isNativeReflectConstruct()) {
      _construct = Reflect.construct.bind();
    } else {
      _construct = function _construct2(Parent2, args2, Class2) {
        var a = [null];
        a.push.apply(a, args2);
        var Constructor = Function.bind.apply(Parent2, a);
        var instance = new Constructor;
        if (Class2)
          _setPrototypeOf(instance, Class2.prototype);
        return instance;
      };
    }
    return _construct.apply(null, arguments);
  }
  function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct)
      return false;
    if (Reflect.construct.sham)
      return false;
    if (typeof Proxy === "function")
      return true;
    try {
      Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {}));
      return true;
    } catch (e) {
      return false;
    }
  }
  function _isNativeFunction(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
  }
  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
      o2.__proto__ = p2;
      return o2;
    };
    return _setPrototypeOf(o, p);
  }
  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf2(o2) {
      return o2.__proto__ || Object.getPrototypeOf(o2);
    };
    return _getPrototypeOf(o);
  }
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  var _require = require_util();
  var inspect2 = _require.inspect;
  var _require2 = require_errors();
  var ERR_INVALID_ARG_TYPE = _require2.codes.ERR_INVALID_ARG_TYPE;
  function endsWith(str, search, this_len) {
    if (this_len === undefined || this_len > str.length) {
      this_len = str.length;
    }
    return str.substring(this_len - search.length, this_len) === search;
  }
  function repeat(str, count) {
    count = Math.floor(count);
    if (str.length == 0 || count == 0)
      return "";
    var maxCount = str.length * count;
    count = Math.floor(Math.log(count) / Math.log(2));
    while (count) {
      str += str;
      count--;
    }
    str += str.substring(0, maxCount - str.length);
    return str;
  }
  var blue = "";
  var green = "";
  var red = "";
  var white = "";
  var kReadableOperator = {
    deepStrictEqual: "Expected values to be strictly deep-equal:",
    strictEqual: "Expected values to be strictly equal:",
    strictEqualObject: 'Expected "actual" to be reference-equal to "expected":',
    deepEqual: "Expected values to be loosely deep-equal:",
    equal: "Expected values to be loosely equal:",
    notDeepStrictEqual: 'Expected "actual" not to be strictly deep-equal to:',
    notStrictEqual: 'Expected "actual" to be strictly unequal to:',
    notStrictEqualObject: 'Expected "actual" not to be reference-equal to "expected":',
    notDeepEqual: 'Expected "actual" not to be loosely deep-equal to:',
    notEqual: 'Expected "actual" to be loosely unequal to:',
    notIdentical: "Values identical but not reference-equal:"
  };
  var kMaxShortLength = 10;
  function copyError(source) {
    var keys = Object.keys(source);
    var target = Object.create(Object.getPrototypeOf(source));
    keys.forEach(function(key) {
      target[key] = source[key];
    });
    Object.defineProperty(target, "message", {
      value: source.message
    });
    return target;
  }
  function inspectValue(val) {
    return inspect2(val, {
      compact: false,
      customInspect: false,
      depth: 1000,
      maxArrayLength: Infinity,
      showHidden: false,
      breakLength: Infinity,
      showProxy: false,
      sorted: true,
      getters: true
    });
  }
  function createErrDiff(actual, expected, operator) {
    var other = "";
    var res = "";
    var lastPos = 0;
    var end = "";
    var skipped = false;
    var actualInspected = inspectValue(actual);
    var actualLines = actualInspected.split(`
`);
    var expectedLines = inspectValue(expected).split(`
`);
    var i = 0;
    var indicator = "";
    if (operator === "strictEqual" && _typeof(actual) === "object" && _typeof(expected) === "object" && actual !== null && expected !== null) {
      operator = "strictEqualObject";
    }
    if (actualLines.length === 1 && expectedLines.length === 1 && actualLines[0] !== expectedLines[0]) {
      var inputLength = actualLines[0].length + expectedLines[0].length;
      if (inputLength <= kMaxShortLength) {
        if ((_typeof(actual) !== "object" || actual === null) && (_typeof(expected) !== "object" || expected === null) && (actual !== 0 || expected !== 0)) {
          return "".concat(kReadableOperator[operator], `

`) + "".concat(actualLines[0], " !== ").concat(expectedLines[0], `
`);
        }
      } else if (operator !== "strictEqualObject") {
        var maxLength = process.stderr && process.stderr.isTTY ? process.stderr.columns : 80;
        if (inputLength < maxLength) {
          while (actualLines[0][i] === expectedLines[0][i]) {
            i++;
          }
          if (i > 2) {
            indicator = `
  `.concat(repeat(" ", i), "^");
            i = 0;
          }
        }
      }
    }
    var a = actualLines[actualLines.length - 1];
    var b = expectedLines[expectedLines.length - 1];
    while (a === b) {
      if (i++ < 2) {
        end = `
  `.concat(a).concat(end);
      } else {
        other = a;
      }
      actualLines.pop();
      expectedLines.pop();
      if (actualLines.length === 0 || expectedLines.length === 0)
        break;
      a = actualLines[actualLines.length - 1];
      b = expectedLines[expectedLines.length - 1];
    }
    var maxLines = Math.max(actualLines.length, expectedLines.length);
    if (maxLines === 0) {
      var _actualLines = actualInspected.split(`
`);
      if (_actualLines.length > 30) {
        _actualLines[26] = "".concat(blue, "...").concat(white);
        while (_actualLines.length > 27) {
          _actualLines.pop();
        }
      }
      return "".concat(kReadableOperator.notIdentical, `

`).concat(_actualLines.join(`
`), `
`);
    }
    if (i > 3) {
      end = `
`.concat(blue, "...").concat(white).concat(end);
      skipped = true;
    }
    if (other !== "") {
      end = `
  `.concat(other).concat(end);
      other = "";
    }
    var printedLines = 0;
    var msg = kReadableOperator[operator] + `
`.concat(green, "+ actual").concat(white, " ").concat(red, "- expected").concat(white);
    var skippedMsg = " ".concat(blue, "...").concat(white, " Lines skipped");
    for (i = 0;i < maxLines; i++) {
      var cur = i - lastPos;
      if (actualLines.length < i + 1) {
        if (cur > 1 && i > 2) {
          if (cur > 4) {
            res += `
`.concat(blue, "...").concat(white);
            skipped = true;
          } else if (cur > 3) {
            res += `
  `.concat(expectedLines[i - 2]);
            printedLines++;
          }
          res += `
  `.concat(expectedLines[i - 1]);
          printedLines++;
        }
        lastPos = i;
        other += `
`.concat(red, "-").concat(white, " ").concat(expectedLines[i]);
        printedLines++;
      } else if (expectedLines.length < i + 1) {
        if (cur > 1 && i > 2) {
          if (cur > 4) {
            res += `
`.concat(blue, "...").concat(white);
            skipped = true;
          } else if (cur > 3) {
            res += `
  `.concat(actualLines[i - 2]);
            printedLines++;
          }
          res += `
  `.concat(actualLines[i - 1]);
          printedLines++;
        }
        lastPos = i;
        res += `
`.concat(green, "+").concat(white, " ").concat(actualLines[i]);
        printedLines++;
      } else {
        var expectedLine = expectedLines[i];
        var actualLine = actualLines[i];
        var divergingLines = actualLine !== expectedLine && (!endsWith(actualLine, ",") || actualLine.slice(0, -1) !== expectedLine);
        if (divergingLines && endsWith(expectedLine, ",") && expectedLine.slice(0, -1) === actualLine) {
          divergingLines = false;
          actualLine += ",";
        }
        if (divergingLines) {
          if (cur > 1 && i > 2) {
            if (cur > 4) {
              res += `
`.concat(blue, "...").concat(white);
              skipped = true;
            } else if (cur > 3) {
              res += `
  `.concat(actualLines[i - 2]);
              printedLines++;
            }
            res += `
  `.concat(actualLines[i - 1]);
            printedLines++;
          }
          lastPos = i;
          res += `
`.concat(green, "+").concat(white, " ").concat(actualLine);
          other += `
`.concat(red, "-").concat(white, " ").concat(expectedLine);
          printedLines += 2;
        } else {
          res += other;
          other = "";
          if (cur === 1 || i === 0) {
            res += `
  `.concat(actualLine);
            printedLines++;
          }
        }
      }
      if (printedLines > 20 && i < maxLines - 2) {
        return "".concat(msg).concat(skippedMsg, `
`).concat(res, `
`).concat(blue, "...").concat(white).concat(other, `
`) + "".concat(blue, "...").concat(white);
      }
    }
    return "".concat(msg).concat(skipped ? skippedMsg : "", `
`).concat(res).concat(other).concat(end).concat(indicator);
  }
  var AssertionError = /* @__PURE__ */ function(_Error, _inspect$custom) {
    _inherits(AssertionError2, _Error);
    var _super = _createSuper(AssertionError2);
    function AssertionError2(options) {
      var _this;
      _classCallCheck(this, AssertionError2);
      if (_typeof(options) !== "object" || options === null) {
        throw new ERR_INVALID_ARG_TYPE("options", "Object", options);
      }
      var { message, operator, stackStartFn } = options;
      var { actual, expected } = options;
      var limit = Error.stackTraceLimit;
      Error.stackTraceLimit = 0;
      if (message != null) {
        _this = _super.call(this, String(message));
      } else {
        if (process.stderr && process.stderr.isTTY) {
          if (process.stderr && process.stderr.getColorDepth && process.stderr.getColorDepth() !== 1) {
            blue = "\x1B[34m";
            green = "\x1B[32m";
            white = "\x1B[39m";
            red = "\x1B[31m";
          } else {
            blue = "";
            green = "";
            white = "";
            red = "";
          }
        }
        if (_typeof(actual) === "object" && actual !== null && _typeof(expected) === "object" && expected !== null && "stack" in actual && actual instanceof Error && "stack" in expected && expected instanceof Error) {
          actual = copyError(actual);
          expected = copyError(expected);
        }
        if (operator === "deepStrictEqual" || operator === "strictEqual") {
          _this = _super.call(this, createErrDiff(actual, expected, operator));
        } else if (operator === "notDeepStrictEqual" || operator === "notStrictEqual") {
          var base = kReadableOperator[operator];
          var res = inspectValue(actual).split(`
`);
          if (operator === "notStrictEqual" && _typeof(actual) === "object" && actual !== null) {
            base = kReadableOperator.notStrictEqualObject;
          }
          if (res.length > 30) {
            res[26] = "".concat(blue, "...").concat(white);
            while (res.length > 27) {
              res.pop();
            }
          }
          if (res.length === 1) {
            _this = _super.call(this, "".concat(base, " ").concat(res[0]));
          } else {
            _this = _super.call(this, "".concat(base, `

`).concat(res.join(`
`), `
`));
          }
        } else {
          var _res = inspectValue(actual);
          var other = "";
          var knownOperators = kReadableOperator[operator];
          if (operator === "notDeepEqual" || operator === "notEqual") {
            _res = "".concat(kReadableOperator[operator], `

`).concat(_res);
            if (_res.length > 1024) {
              _res = "".concat(_res.slice(0, 1021), "...");
            }
          } else {
            other = "".concat(inspectValue(expected));
            if (_res.length > 512) {
              _res = "".concat(_res.slice(0, 509), "...");
            }
            if (other.length > 512) {
              other = "".concat(other.slice(0, 509), "...");
            }
            if (operator === "deepEqual" || operator === "equal") {
              _res = "".concat(knownOperators, `

`).concat(_res, `

should equal

`);
            } else {
              other = " ".concat(operator, " ").concat(other);
            }
          }
          _this = _super.call(this, "".concat(_res).concat(other));
        }
      }
      Error.stackTraceLimit = limit;
      _this.generatedMessage = !message;
      Object.defineProperty(_assertThisInitialized(_this), "name", {
        value: "AssertionError [ERR_ASSERTION]",
        enumerable: false,
        writable: true,
        configurable: true
      });
      _this.code = "ERR_ASSERTION";
      _this.actual = actual;
      _this.expected = expected;
      _this.operator = operator;
      if (Error.captureStackTrace) {
        Error.captureStackTrace(_assertThisInitialized(_this), stackStartFn);
      }
      _this.stack;
      _this.name = "AssertionError";
      return _possibleConstructorReturn(_this);
    }
    _createClass(AssertionError2, [{
      key: "toString",
      value: function toString2() {
        return "".concat(this.name, " [").concat(this.code, "]: ").concat(this.message);
      }
    }, {
      key: _inspect$custom,
      value: function value(recurseTimes, ctx) {
        return inspect2(this, _objectSpread(_objectSpread({}, ctx), {}, {
          customInspect: false,
          depth: 0
        }));
      }
    }]);
    return AssertionError2;
  }(/* @__PURE__ */ _wrapNativeSuper(Error), inspect2.custom);
  module.exports = AssertionError;
});

// mii-creator/node_modules/object-keys/isArguments.js
var require_isArguments = __commonJS((exports, module) => {
  var toStr = Object.prototype.toString;
  module.exports = function isArguments(value) {
    var str = toStr.call(value);
    var isArgs = str === "[object Arguments]";
    if (!isArgs) {
      isArgs = str !== "[object Array]" && value !== null && typeof value === "object" && typeof value.length === "number" && value.length >= 0 && toStr.call(value.callee) === "[object Function]";
    }
    return isArgs;
  };
});

// mii-creator/node_modules/object-keys/implementation.js
var require_implementation2 = __commonJS((exports, module) => {
  var keysShim;
  if (!Object.keys) {
    has = Object.prototype.hasOwnProperty;
    toStr = Object.prototype.toString;
    isArgs = require_isArguments();
    isEnumerable = Object.prototype.propertyIsEnumerable;
    hasDontEnumBug = !isEnumerable.call({ toString: null }, "toString");
    hasProtoEnumBug = isEnumerable.call(function() {}, "prototype");
    dontEnums = [
      "toString",
      "toLocaleString",
      "valueOf",
      "hasOwnProperty",
      "isPrototypeOf",
      "propertyIsEnumerable",
      "constructor"
    ];
    equalsConstructorPrototype = function(o) {
      var ctor = o.constructor;
      return ctor && ctor.prototype === o;
    };
    excludedKeys = {
      $applicationCache: true,
      $console: true,
      $external: true,
      $frame: true,
      $frameElement: true,
      $frames: true,
      $innerHeight: true,
      $innerWidth: true,
      $onmozfullscreenchange: true,
      $onmozfullscreenerror: true,
      $outerHeight: true,
      $outerWidth: true,
      $pageXOffset: true,
      $pageYOffset: true,
      $parent: true,
      $scrollLeft: true,
      $scrollTop: true,
      $scrollX: true,
      $scrollY: true,
      $self: true,
      $webkitIndexedDB: true,
      $webkitStorageInfo: true,
      $window: true
    };
    hasAutomationEqualityBug = function() {
      if (typeof window === "undefined") {
        return false;
      }
      for (var k in window) {
        try {
          if (!excludedKeys["$" + k] && has.call(window, k) && window[k] !== null && typeof window[k] === "object") {
            try {
              equalsConstructorPrototype(window[k]);
            } catch (e) {
              return true;
            }
          }
        } catch (e) {
          return true;
        }
      }
      return false;
    }();
    equalsConstructorPrototypeIfNotBuggy = function(o) {
      if (typeof window === "undefined" || !hasAutomationEqualityBug) {
        return equalsConstructorPrototype(o);
      }
      try {
        return equalsConstructorPrototype(o);
      } catch (e) {
        return false;
      }
    };
    keysShim = function keys(object) {
      var isObject = object !== null && typeof object === "object";
      var isFunction = toStr.call(object) === "[object Function]";
      var isArguments = isArgs(object);
      var isString = isObject && toStr.call(object) === "[object String]";
      var theKeys = [];
      if (!isObject && !isFunction && !isArguments) {
        throw new TypeError("Object.keys called on a non-object");
      }
      var skipProto = hasProtoEnumBug && isFunction;
      if (isString && object.length > 0 && !has.call(object, 0)) {
        for (var i = 0;i < object.length; ++i) {
          theKeys.push(String(i));
        }
      }
      if (isArguments && object.length > 0) {
        for (var j = 0;j < object.length; ++j) {
          theKeys.push(String(j));
        }
      } else {
        for (var name in object) {
          if (!(skipProto && name === "prototype") && has.call(object, name)) {
            theKeys.push(String(name));
          }
        }
      }
      if (hasDontEnumBug) {
        var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);
        for (var k = 0;k < dontEnums.length; ++k) {
          if (!(skipConstructor && dontEnums[k] === "constructor") && has.call(object, dontEnums[k])) {
            theKeys.push(dontEnums[k]);
          }
        }
      }
      return theKeys;
    };
  }
  var has;
  var toStr;
  var isArgs;
  var isEnumerable;
  var hasDontEnumBug;
  var hasProtoEnumBug;
  var dontEnums;
  var equalsConstructorPrototype;
  var excludedKeys;
  var hasAutomationEqualityBug;
  var equalsConstructorPrototypeIfNotBuggy;
  module.exports = keysShim;
});

// mii-creator/node_modules/object-keys/index.js
var require_object_keys = __commonJS((exports, module) => {
  var slice2 = Array.prototype.slice;
  var isArgs = require_isArguments();
  var origKeys = Object.keys;
  var keysShim = origKeys ? function keys(o) {
    return origKeys(o);
  } : require_implementation2();
  var originalKeys = Object.keys;
  keysShim.shim = function shimObjectKeys() {
    if (Object.keys) {
      var keysWorksWithArguments = function() {
        var args = Object.keys(arguments);
        return args && args.length === arguments.length;
      }(1, 2);
      if (!keysWorksWithArguments) {
        Object.keys = function keys(object) {
          if (isArgs(object)) {
            return originalKeys(slice2.call(object));
          }
          return originalKeys(object);
        };
      }
    } else {
      Object.keys = keysShim;
    }
    return Object.keys || keysShim;
  };
  module.exports = keysShim;
});

// mii-creator/node_modules/object.assign/implementation.js
var require_implementation3 = __commonJS((exports, module) => {
  var objectKeys = require_object_keys();
  var hasSymbols = require_shams()();
  var callBound = require_callBound();
  var toObject = Object;
  var $push = callBound("Array.prototype.push");
  var $propIsEnumerable = callBound("Object.prototype.propertyIsEnumerable");
  var originalGetSymbols = hasSymbols ? Object.getOwnPropertySymbols : null;
  module.exports = function assign(target, source1) {
    if (target == null) {
      throw new TypeError("target must be an object");
    }
    var to = toObject(target);
    if (arguments.length === 1) {
      return to;
    }
    for (var s = 1;s < arguments.length; ++s) {
      var from2 = toObject(arguments[s]);
      var keys = objectKeys(from2);
      var getSymbols = hasSymbols && (Object.getOwnPropertySymbols || originalGetSymbols);
      if (getSymbols) {
        var syms = getSymbols(from2);
        for (var j = 0;j < syms.length; ++j) {
          var key = syms[j];
          if ($propIsEnumerable(from2, key)) {
            $push(keys, key);
          }
        }
      }
      for (var i = 0;i < keys.length; ++i) {
        var nextKey = keys[i];
        if ($propIsEnumerable(from2, nextKey)) {
          var propValue = from2[nextKey];
          to[nextKey] = propValue;
        }
      }
    }
    return to;
  };
});

// mii-creator/node_modules/object.assign/polyfill.js
var require_polyfill = __commonJS((exports, module) => {
  var implementation = require_implementation3();
  var lacksProperEnumerationOrder = function() {
    if (!Object.assign) {
      return false;
    }
    var str = "abcdefghijklmnopqrst";
    var letters = str.split("");
    var map = {};
    for (var i = 0;i < letters.length; ++i) {
      map[letters[i]] = letters[i];
    }
    var obj = Object.assign({}, map);
    var actual = "";
    for (var k in obj) {
      actual += k;
    }
    return str !== actual;
  };
  var assignHasPendingExceptions = function() {
    if (!Object.assign || !Object.preventExtensions) {
      return false;
    }
    var thrower = Object.preventExtensions({ 1: 2 });
    try {
      Object.assign(thrower, "xy");
    } catch (e) {
      return thrower[1] === "y";
    }
    return false;
  };
  module.exports = function getPolyfill() {
    if (!Object.assign) {
      return implementation;
    }
    if (lacksProperEnumerationOrder()) {
      return implementation;
    }
    if (assignHasPendingExceptions()) {
      return implementation;
    }
    return Object.assign;
  };
});

// mii-creator/node_modules/object-is/implementation.js
var require_implementation4 = __commonJS((exports, module) => {
  var numberIsNaN2 = function(value) {
    return value !== value;
  };
  module.exports = function is(a, b) {
    if (a === 0 && b === 0) {
      return 1 / a === 1 / b;
    }
    if (a === b) {
      return true;
    }
    if (numberIsNaN2(a) && numberIsNaN2(b)) {
      return true;
    }
    return false;
  };
});

// mii-creator/node_modules/object-is/polyfill.js
var require_polyfill2 = __commonJS((exports, module) => {
  var implementation = require_implementation4();
  module.exports = function getPolyfill() {
    return typeof Object.is === "function" ? Object.is : implementation;
  };
});

// mii-creator/node_modules/define-properties/index.js
var require_define_properties = __commonJS((exports, module) => {
  var keys = require_object_keys();
  var hasSymbols = typeof Symbol === "function" && typeof Symbol("foo") === "symbol";
  var toStr = Object.prototype.toString;
  var concat2 = Array.prototype.concat;
  var defineDataProperty = require_define_data_property();
  var isFunction = function(fn) {
    return typeof fn === "function" && toStr.call(fn) === "[object Function]";
  };
  var supportsDescriptors = require_has_property_descriptors()();
  var defineProperty = function(object, name, value, predicate) {
    if (name in object) {
      if (predicate === true) {
        if (object[name] === value) {
          return;
        }
      } else if (!isFunction(predicate) || !predicate()) {
        return;
      }
    }
    if (supportsDescriptors) {
      defineDataProperty(object, name, value, true);
    } else {
      defineDataProperty(object, name, value);
    }
  };
  var defineProperties = function(object, map) {
    var predicates = arguments.length > 2 ? arguments[2] : {};
    var props = keys(map);
    if (hasSymbols) {
      props = concat2.call(props, Object.getOwnPropertySymbols(map));
    }
    for (var i = 0;i < props.length; i += 1) {
      defineProperty(object, props[i], map[props[i]], predicates[props[i]]);
    }
  };
  defineProperties.supportsDescriptors = !!supportsDescriptors;
  module.exports = defineProperties;
});

// mii-creator/node_modules/object-is/shim.js
var require_shim = __commonJS((exports, module) => {
  var getPolyfill = require_polyfill2();
  var define = require_define_properties();
  module.exports = function shimObjectIs() {
    var polyfill = getPolyfill();
    define(Object, { is: polyfill }, {
      is: function testObjectIs() {
        return Object.is !== polyfill;
      }
    });
    return polyfill;
  };
});

// mii-creator/node_modules/object-is/index.js
var require_object_is = __commonJS((exports, module) => {
  var define = require_define_properties();
  var callBind = require_call_bind();
  var implementation = require_implementation4();
  var getPolyfill = require_polyfill2();
  var shim = require_shim();
  var polyfill = callBind(getPolyfill(), Object);
  define(polyfill, {
    getPolyfill,
    implementation,
    shim
  });
  module.exports = polyfill;
});

// mii-creator/node_modules/is-nan/implementation.js
var require_implementation5 = __commonJS((exports, module) => {
  module.exports = function isNaN2(value) {
    return value !== value;
  };
});

// mii-creator/node_modules/is-nan/polyfill.js
var require_polyfill3 = __commonJS((exports, module) => {
  var implementation = require_implementation5();
  module.exports = function getPolyfill() {
    if (Number.isNaN && Number.isNaN(NaN) && !Number.isNaN("a")) {
      return Number.isNaN;
    }
    return implementation;
  };
});

// mii-creator/node_modules/is-nan/shim.js
var require_shim2 = __commonJS((exports, module) => {
  var define = require_define_properties();
  var getPolyfill = require_polyfill3();
  module.exports = function shimNumberIsNaN() {
    var polyfill = getPolyfill();
    define(Number, { isNaN: polyfill }, {
      isNaN: function testIsNaN() {
        return Number.isNaN !== polyfill;
      }
    });
    return polyfill;
  };
});

// mii-creator/node_modules/is-nan/index.js
var require_is_nan = __commonJS((exports, module) => {
  var callBind = require_call_bind();
  var define = require_define_properties();
  var implementation = require_implementation5();
  var getPolyfill = require_polyfill3();
  var shim = require_shim2();
  var polyfill = callBind(getPolyfill(), Number);
  define(polyfill, {
    getPolyfill,
    implementation,
    shim
  });
  module.exports = polyfill;
});

// mii-creator/src/external/assert/internal/util/comparisons.js
var require_comparisons = __commonJS((exports, module) => {
  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
  }
  function _nonIterableRest() {
    throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
  }
  function _unsupportedIterableToArray(o, minLen) {
    if (!o)
      return;
    if (typeof o === "string")
      return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor)
      n = o.constructor.name;
    if (n === "Map" || n === "Set")
      return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))
      return _arrayLikeToArray(o, minLen);
  }
  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length)
      len = arr.length;
    for (var i = 0, arr2 = new Array(len);i < len; i++)
      arr2[i] = arr[i];
    return arr2;
  }
  function _iterableToArrayLimit(r, l) {
    var t = r == null ? null : typeof Symbol != "undefined" && r[Symbol.iterator] || r["@@iterator"];
    if (t != null) {
      var e, n, i, u, a = [], f = true, o = false;
      try {
        if (i = (t = t.call(r)).next, l === 0) {
          if (Object(t) !== t)
            return;
          f = false;
        } else
          for (;!(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true)
            ;
      } catch (r2) {
        o = true, n = r2;
      } finally {
        try {
          if (!f && t.return != null && (u = t.return(), Object(u) !== u))
            return;
        } finally {
          if (o)
            throw n;
        }
      }
      return a;
    }
  }
  function _arrayWithHoles(arr) {
    if (Array.isArray(arr))
      return arr;
  }
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  var regexFlagsSupported = /a/g.flags !== undefined;
  var arrayFromSet = function arrayFromSet2(set) {
    var array = [];
    set.forEach(function(value) {
      return array.push(value);
    });
    return array;
  };
  var arrayFromMap = function arrayFromMap2(map) {
    var array = [];
    map.forEach(function(value, key) {
      return array.push([key, value]);
    });
    return array;
  };
  var objectIs = Object.is ? Object.is : require_object_is();
  var objectGetOwnPropertySymbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols : function() {
    return [];
  };
  var numberIsNaN2 = Number.isNaN ? Number.isNaN : require_is_nan();
  function uncurryThis(f) {
    return f.call.bind(f);
  }
  var hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);
  var propertyIsEnumerable = uncurryThis(Object.prototype.propertyIsEnumerable);
  var objectToString = uncurryThis(Object.prototype.toString);
  var _require$types = require_util().types;
  var isAnyArrayBuffer = _require$types.isAnyArrayBuffer;
  var isArrayBufferView = _require$types.isArrayBufferView;
  var isDate = _require$types.isDate;
  var isMap = _require$types.isMap;
  var isRegExp = _require$types.isRegExp;
  var isSet = _require$types.isSet;
  var isNativeError = _require$types.isNativeError;
  var isBoxedPrimitive = _require$types.isBoxedPrimitive;
  var isNumberObject = _require$types.isNumberObject;
  var isStringObject = _require$types.isStringObject;
  var isBooleanObject = _require$types.isBooleanObject;
  var isBigIntObject = _require$types.isBigIntObject;
  var isSymbolObject = _require$types.isSymbolObject;
  var isFloat32Array = _require$types.isFloat32Array;
  var isFloat64Array = _require$types.isFloat64Array;
  function isNonIndex(key) {
    if (key.length === 0 || key.length > 10)
      return true;
    for (var i = 0;i < key.length; i++) {
      var code = key.charCodeAt(i);
      if (code < 48 || code > 57)
        return true;
    }
    return key.length === 10 && key >= Math.pow(2, 32);
  }
  function getOwnNonIndexProperties(value) {
    return Object.keys(value).filter(isNonIndex).concat(objectGetOwnPropertySymbols(value).filter(Object.prototype.propertyIsEnumerable.bind(value)));
  }
  /*!
   * The buffer module from node.js, for the browser.
   *
   * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
   * @license  MIT
   */
  function compare3(a, b) {
    if (a === b) {
      return 0;
    }
    var x = a.length;
    var y = b.length;
    for (var i = 0, len = Math.min(x, y);i < len; ++i) {
      if (a[i] !== b[i]) {
        x = a[i];
        y = b[i];
        break;
      }
    }
    if (x < y) {
      return -1;
    }
    if (y < x) {
      return 1;
    }
    return 0;
  }
  var ONLY_ENUMERABLE = undefined;
  var kStrict = true;
  var kLoose = false;
  var kNoIterator = 0;
  var kIsArray = 1;
  var kIsSet = 2;
  var kIsMap = 3;
  function areSimilarRegExps(a, b) {
    return regexFlagsSupported ? a.source === b.source && a.flags === b.flags : RegExp.prototype.toString.call(a) === RegExp.prototype.toString.call(b);
  }
  function areSimilarFloatArrays(a, b) {
    if (a.byteLength !== b.byteLength) {
      return false;
    }
    for (var offset = 0;offset < a.byteLength; offset++) {
      if (a[offset] !== b[offset]) {
        return false;
      }
    }
    return true;
  }
  function areSimilarTypedArrays(a, b) {
    if (a.byteLength !== b.byteLength) {
      return false;
    }
    return compare3(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), new Uint8Array(b.buffer, b.byteOffset, b.byteLength)) === 0;
  }
  function areEqualArrayBuffers(buf1, buf2) {
    return buf1.byteLength === buf2.byteLength && compare3(new Uint8Array(buf1), new Uint8Array(buf2)) === 0;
  }
  function isEqualBoxedPrimitive(val1, val2) {
    if (isNumberObject(val1)) {
      return isNumberObject(val2) && objectIs(Number.prototype.valueOf.call(val1), Number.prototype.valueOf.call(val2));
    }
    if (isStringObject(val1)) {
      return isStringObject(val2) && String.prototype.valueOf.call(val1) === String.prototype.valueOf.call(val2);
    }
    if (isBooleanObject(val1)) {
      return isBooleanObject(val2) && Boolean.prototype.valueOf.call(val1) === Boolean.prototype.valueOf.call(val2);
    }
    if (isBigIntObject(val1)) {
      return isBigIntObject(val2) && BigInt.prototype.valueOf.call(val1) === BigInt.prototype.valueOf.call(val2);
    }
    return isSymbolObject(val2) && Symbol.prototype.valueOf.call(val1) === Symbol.prototype.valueOf.call(val2);
  }
  function innerDeepEqual(val1, val2, strict, memos) {
    if (val1 === val2) {
      if (val1 !== 0)
        return true;
      return strict ? objectIs(val1, val2) : true;
    }
    if (strict) {
      if (_typeof(val1) !== "object") {
        return typeof val1 === "number" && numberIsNaN2(val1) && numberIsNaN2(val2);
      }
      if (_typeof(val2) !== "object" || val1 === null || val2 === null) {
        return false;
      }
      if (Object.getPrototypeOf(val1) !== Object.getPrototypeOf(val2)) {
        return false;
      }
    } else {
      if (val1 === null || _typeof(val1) !== "object") {
        if (val2 === null || _typeof(val2) !== "object") {
          return val1 == val2;
        }
        return false;
      }
      if (val2 === null || _typeof(val2) !== "object") {
        return false;
      }
    }
    var val1Tag = objectToString(val1);
    var val2Tag = objectToString(val2);
    if (val1Tag !== val2Tag) {
      return false;
    }
    if (Array.isArray(val1)) {
      if (val1.length !== val2.length) {
        return false;
      }
      var keys1 = getOwnNonIndexProperties(val1, ONLY_ENUMERABLE);
      var keys2 = getOwnNonIndexProperties(val2, ONLY_ENUMERABLE);
      if (keys1.length !== keys2.length) {
        return false;
      }
      return keyCheck(val1, val2, strict, memos, kIsArray, keys1);
    }
    if (val1Tag === "[object Object]") {
      if (!isMap(val1) && isMap(val2) || !isSet(val1) && isSet(val2)) {
        return false;
      }
    }
    if (isDate(val1)) {
      if (!isDate(val2) || Date.prototype.getTime.call(val1) !== Date.prototype.getTime.call(val2)) {
        return false;
      }
    } else if (isRegExp(val1)) {
      if (!isRegExp(val2) || !areSimilarRegExps(val1, val2)) {
        return false;
      }
    } else if (isNativeError(val1) || val1 instanceof Error) {
      if (val1.message !== val2.message || val1.name !== val2.name) {
        return false;
      }
    } else if (isArrayBufferView(val1)) {
      if (!strict && (isFloat32Array(val1) || isFloat64Array(val1))) {
        if (!areSimilarFloatArrays(val1, val2)) {
          return false;
        }
      } else if (!areSimilarTypedArrays(val1, val2)) {
        return false;
      }
      var _keys = getOwnNonIndexProperties(val1, ONLY_ENUMERABLE);
      var _keys2 = getOwnNonIndexProperties(val2, ONLY_ENUMERABLE);
      if (_keys.length !== _keys2.length) {
        return false;
      }
      return keyCheck(val1, val2, strict, memos, kNoIterator, _keys);
    } else if (isSet(val1)) {
      if (!isSet(val2) || val1.size !== val2.size) {
        return false;
      }
      return keyCheck(val1, val2, strict, memos, kIsSet);
    } else if (isMap(val1)) {
      if (!isMap(val2) || val1.size !== val2.size) {
        return false;
      }
      return keyCheck(val1, val2, strict, memos, kIsMap);
    } else if (isAnyArrayBuffer(val1)) {
      if (!areEqualArrayBuffers(val1, val2)) {
        return false;
      }
    } else if (isBoxedPrimitive(val1) && !isEqualBoxedPrimitive(val1, val2)) {
      return false;
    }
    return keyCheck(val1, val2, strict, memos, kNoIterator);
  }
  function getEnumerables(val, keys) {
    return keys.filter(function(k) {
      return propertyIsEnumerable(val, k);
    });
  }
  function keyCheck(val1, val2, strict, memos, iterationType, aKeys) {
    if (arguments.length === 5) {
      aKeys = Object.keys(val1);
      var bKeys = Object.keys(val2);
      if (aKeys.length !== bKeys.length) {
        return false;
      }
    }
    var i = 0;
    for (;i < aKeys.length; i++) {
      if (!hasOwnProperty(val2, aKeys[i])) {
        return false;
      }
    }
    if (strict && arguments.length === 5) {
      var symbolKeysA = objectGetOwnPropertySymbols(val1);
      if (symbolKeysA.length !== 0) {
        var count = 0;
        for (i = 0;i < symbolKeysA.length; i++) {
          var key = symbolKeysA[i];
          if (propertyIsEnumerable(val1, key)) {
            if (!propertyIsEnumerable(val2, key)) {
              return false;
            }
            aKeys.push(key);
            count++;
          } else if (propertyIsEnumerable(val2, key)) {
            return false;
          }
        }
        var symbolKeysB = objectGetOwnPropertySymbols(val2);
        if (symbolKeysA.length !== symbolKeysB.length && getEnumerables(val2, symbolKeysB).length !== count) {
          return false;
        }
      } else {
        var _symbolKeysB = objectGetOwnPropertySymbols(val2);
        if (_symbolKeysB.length !== 0 && getEnumerables(val2, _symbolKeysB).length !== 0) {
          return false;
        }
      }
    }
    if (aKeys.length === 0 && (iterationType === kNoIterator || iterationType === kIsArray && val1.length === 0 || val1.size === 0)) {
      return true;
    }
    if (memos === undefined) {
      memos = {
        val1: new Map,
        val2: new Map,
        position: 0
      };
    } else {
      var val2MemoA = memos.val1.get(val1);
      if (val2MemoA !== undefined) {
        var val2MemoB = memos.val2.get(val2);
        if (val2MemoB !== undefined) {
          return val2MemoA === val2MemoB;
        }
      }
      memos.position++;
    }
    memos.val1.set(val1, memos.position);
    memos.val2.set(val2, memos.position);
    var areEq = objEquiv(val1, val2, strict, aKeys, memos, iterationType);
    memos.val1.delete(val1);
    memos.val2.delete(val2);
    return areEq;
  }
  function setHasEqualElement(set, val1, strict, memo) {
    var setValues = arrayFromSet(set);
    for (var i = 0;i < setValues.length; i++) {
      var val2 = setValues[i];
      if (innerDeepEqual(val1, val2, strict, memo)) {
        set.delete(val2);
        return true;
      }
    }
    return false;
  }
  function findLooseMatchingPrimitives(prim) {
    switch (_typeof(prim)) {
      case "undefined":
        return null;
      case "object":
        return;
      case "symbol":
        return false;
      case "string":
        prim = +prim;
      case "number":
        if (numberIsNaN2(prim)) {
          return false;
        }
    }
    return true;
  }
  function setMightHaveLoosePrim(a, b, prim) {
    var altValue = findLooseMatchingPrimitives(prim);
    if (altValue != null)
      return altValue;
    return b.has(altValue) && !a.has(altValue);
  }
  function mapMightHaveLoosePrim(a, b, prim, item, memo) {
    var altValue = findLooseMatchingPrimitives(prim);
    if (altValue != null) {
      return altValue;
    }
    var curB = b.get(altValue);
    if (curB === undefined && !b.has(altValue) || !innerDeepEqual(item, curB, false, memo)) {
      return false;
    }
    return !a.has(altValue) && innerDeepEqual(item, curB, false, memo);
  }
  function setEquiv(a, b, strict, memo) {
    var set = null;
    var aValues = arrayFromSet(a);
    for (var i = 0;i < aValues.length; i++) {
      var val = aValues[i];
      if (_typeof(val) === "object" && val !== null) {
        if (set === null) {
          set = new Set;
        }
        set.add(val);
      } else if (!b.has(val)) {
        if (strict)
          return false;
        if (!setMightHaveLoosePrim(a, b, val)) {
          return false;
        }
        if (set === null) {
          set = new Set;
        }
        set.add(val);
      }
    }
    if (set !== null) {
      var bValues = arrayFromSet(b);
      for (var _i = 0;_i < bValues.length; _i++) {
        var _val = bValues[_i];
        if (_typeof(_val) === "object" && _val !== null) {
          if (!setHasEqualElement(set, _val, strict, memo))
            return false;
        } else if (!strict && !a.has(_val) && !setHasEqualElement(set, _val, strict, memo)) {
          return false;
        }
      }
      return set.size === 0;
    }
    return true;
  }
  function mapHasEqualEntry(set, map, key1, item1, strict, memo) {
    var setValues = arrayFromSet(set);
    for (var i = 0;i < setValues.length; i++) {
      var key2 = setValues[i];
      if (innerDeepEqual(key1, key2, strict, memo) && innerDeepEqual(item1, map.get(key2), strict, memo)) {
        set.delete(key2);
        return true;
      }
    }
    return false;
  }
  function mapEquiv(a, b, strict, memo) {
    var set = null;
    var aEntries = arrayFromMap(a);
    for (var i = 0;i < aEntries.length; i++) {
      var _aEntries$i = _slicedToArray(aEntries[i], 2), key = _aEntries$i[0], item1 = _aEntries$i[1];
      if (_typeof(key) === "object" && key !== null) {
        if (set === null) {
          set = new Set;
        }
        set.add(key);
      } else {
        var item2 = b.get(key);
        if (item2 === undefined && !b.has(key) || !innerDeepEqual(item1, item2, strict, memo)) {
          if (strict)
            return false;
          if (!mapMightHaveLoosePrim(a, b, key, item1, memo))
            return false;
          if (set === null) {
            set = new Set;
          }
          set.add(key);
        }
      }
    }
    if (set !== null) {
      var bEntries = arrayFromMap(b);
      for (var _i2 = 0;_i2 < bEntries.length; _i2++) {
        var _bEntries$_i = _slicedToArray(bEntries[_i2], 2), _key = _bEntries$_i[0], item = _bEntries$_i[1];
        if (_typeof(_key) === "object" && _key !== null) {
          if (!mapHasEqualEntry(set, a, _key, item, strict, memo))
            return false;
        } else if (!strict && (!a.has(_key) || !innerDeepEqual(a.get(_key), item, false, memo)) && !mapHasEqualEntry(set, a, _key, item, false, memo)) {
          return false;
        }
      }
      return set.size === 0;
    }
    return true;
  }
  function objEquiv(a, b, strict, keys, memos, iterationType) {
    var i = 0;
    if (iterationType === kIsSet) {
      if (!setEquiv(a, b, strict, memos)) {
        return false;
      }
    } else if (iterationType === kIsMap) {
      if (!mapEquiv(a, b, strict, memos)) {
        return false;
      }
    } else if (iterationType === kIsArray) {
      for (;i < a.length; i++) {
        if (hasOwnProperty(a, i)) {
          if (!hasOwnProperty(b, i) || !innerDeepEqual(a[i], b[i], strict, memos)) {
            return false;
          }
        } else if (hasOwnProperty(b, i)) {
          return false;
        } else {
          var keysA = Object.keys(a);
          for (;i < keysA.length; i++) {
            var key = keysA[i];
            if (!hasOwnProperty(b, key) || !innerDeepEqual(a[key], b[key], strict, memos)) {
              return false;
            }
          }
          if (keysA.length !== Object.keys(b).length) {
            return false;
          }
          return true;
        }
      }
    }
    for (i = 0;i < keys.length; i++) {
      var _key2 = keys[i];
      if (!innerDeepEqual(a[_key2], b[_key2], strict, memos)) {
        return false;
      }
    }
    return true;
  }
  function isDeepEqual(val1, val2) {
    return innerDeepEqual(val1, val2, kLoose);
  }
  function isDeepStrictEqual(val1, val2) {
    return innerDeepEqual(val1, val2, kStrict);
  }
  module.exports = {
    isDeepEqual,
    isDeepStrictEqual
  };
});

// mii-creator/src/external/assert/assert.js
var require_assert = __commonJS((exports, module) => {
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  function _defineProperties(target, props) {
    for (var i = 0;i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor)
        descriptor.writable = true;
      Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
    }
  }
  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps)
      _defineProperties(Constructor.prototype, protoProps);
    if (staticProps)
      _defineProperties(Constructor, staticProps);
    Object.defineProperty(Constructor, "prototype", { writable: false });
    return Constructor;
  }
  function _toPropertyKey(arg) {
    var key = _toPrimitive(arg, "string");
    return _typeof(key) === "symbol" ? key : String(key);
  }
  function _toPrimitive(input, hint) {
    if (_typeof(input) !== "object" || input === null)
      return input;
    var prim = input[Symbol.toPrimitive];
    if (prim !== undefined) {
      var res = prim.call(input, hint || "default");
      if (_typeof(res) !== "object")
        return res;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (hint === "string" ? String : Number)(input);
  }
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  var _require = require_errors();
  var _require$codes = _require.codes;
  var ERR_AMBIGUOUS_ARGUMENT = _require$codes.ERR_AMBIGUOUS_ARGUMENT;
  var ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE;
  var ERR_INVALID_ARG_VALUE = _require$codes.ERR_INVALID_ARG_VALUE;
  var ERR_INVALID_RETURN_VALUE = _require$codes.ERR_INVALID_RETURN_VALUE;
  var ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS;
  var AssertionError = require_assertion_error();
  var _require2 = require_util();
  var inspect2 = _require2.inspect;
  var _require$types = require_util().types;
  var isPromise = _require$types.isPromise;
  var isRegExp = _require$types.isRegExp;
  var objectAssign = require_polyfill()();
  var objectIs = require_polyfill2()();
  var RegExpPrototypeTest = require_callBound()("RegExp.prototype.test");
  var errorCache = new Map;
  var isDeepEqual;
  var isDeepStrictEqual;
  function lazyLoadComparison() {
    var comparison = require_comparisons();
    isDeepEqual = comparison.isDeepEqual;
    isDeepStrictEqual = comparison.isDeepStrictEqual;
  }
  var warned = false;
  var assert = module.exports = ok;
  var NO_EXCEPTION_SENTINEL = {};
  function innerFail(obj) {
    if (obj.message instanceof Error)
      throw obj.message;
    throw new AssertionError(obj);
  }
  function fail(actual, expected, message, operator, stackStartFn) {
    var argsLen = arguments.length;
    var internalMessage;
    if (argsLen === 0) {
      internalMessage = "Failed";
    } else if (argsLen === 1) {
      message = actual;
      actual = undefined;
    } else {
      if (warned === false) {
        warned = true;
        var warn = process.emitWarning ? process.emitWarning : console.warn.bind(console);
        warn("assert.fail() with more than one argument is deprecated. " + "Please use assert.strictEqual() instead or only pass a message.", "DeprecationWarning", "DEP0094");
      }
      if (argsLen === 2)
        operator = "!=";
    }
    if (message instanceof Error)
      throw message;
    var errArgs = {
      actual,
      expected,
      operator: operator === undefined ? "fail" : operator,
      stackStartFn: stackStartFn || fail
    };
    if (message !== undefined) {
      errArgs.message = message;
    }
    var err = new AssertionError(errArgs);
    if (internalMessage) {
      err.message = internalMessage;
      err.generatedMessage = true;
    }
    throw err;
  }
  assert.fail = fail;
  assert.AssertionError = AssertionError;
  function innerOk(fn, argLen, value, message) {
    if (!value) {
      var generatedMessage = false;
      if (argLen === 0) {
        generatedMessage = true;
        message = "No value argument passed to `assert.ok()`";
      } else if (message instanceof Error) {
        throw message;
      }
      var err = new AssertionError({
        actual: value,
        expected: true,
        message,
        operator: "==",
        stackStartFn: fn
      });
      err.generatedMessage = generatedMessage;
      throw err;
    }
  }
  function ok() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0;_key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    innerOk.apply(undefined, [ok, args.length].concat(args));
  }
  assert.ok = ok;
  assert.equal = function equal(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (actual != expected) {
      innerFail({
        actual,
        expected,
        message,
        operator: "==",
        stackStartFn: equal
      });
    }
  };
  assert.notEqual = function notEqual(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (actual == expected) {
      innerFail({
        actual,
        expected,
        message,
        operator: "!=",
        stackStartFn: notEqual
      });
    }
  };
  assert.deepEqual = function deepEqual(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (isDeepEqual === undefined)
      lazyLoadComparison();
    if (!isDeepEqual(actual, expected)) {
      innerFail({
        actual,
        expected,
        message,
        operator: "deepEqual",
        stackStartFn: deepEqual
      });
    }
  };
  assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (isDeepEqual === undefined)
      lazyLoadComparison();
    if (isDeepEqual(actual, expected)) {
      innerFail({
        actual,
        expected,
        message,
        operator: "notDeepEqual",
        stackStartFn: notDeepEqual
      });
    }
  };
  assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (isDeepEqual === undefined)
      lazyLoadComparison();
    if (!isDeepStrictEqual(actual, expected)) {
      innerFail({
        actual,
        expected,
        message,
        operator: "deepStrictEqual",
        stackStartFn: deepStrictEqual
      });
    }
  };
  assert.notDeepStrictEqual = notDeepStrictEqual;
  function notDeepStrictEqual(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (isDeepEqual === undefined)
      lazyLoadComparison();
    if (isDeepStrictEqual(actual, expected)) {
      innerFail({
        actual,
        expected,
        message,
        operator: "notDeepStrictEqual",
        stackStartFn: notDeepStrictEqual
      });
    }
  }
  assert.strictEqual = function strictEqual(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (!objectIs(actual, expected)) {
      innerFail({
        actual,
        expected,
        message,
        operator: "strictEqual",
        stackStartFn: strictEqual
      });
    }
  };
  assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
    if (arguments.length < 2) {
      throw new ERR_MISSING_ARGS("actual", "expected");
    }
    if (objectIs(actual, expected)) {
      innerFail({
        actual,
        expected,
        message,
        operator: "notStrictEqual",
        stackStartFn: notStrictEqual
      });
    }
  };
  var Comparison = /* @__PURE__ */ _createClass(function Comparison2(obj, keys, actual) {
    var _this = this;
    _classCallCheck(this, Comparison2);
    keys.forEach(function(key) {
      if (key in obj) {
        if (actual !== undefined && typeof actual[key] === "string" && isRegExp(obj[key]) && RegExpPrototypeTest(obj[key], actual[key])) {
          _this[key] = actual[key];
        } else {
          _this[key] = obj[key];
        }
      }
    });
  });
  function compareExceptionKey(actual, expected, key, message, keys, fn) {
    if (!(key in actual) || !isDeepStrictEqual(actual[key], expected[key])) {
      if (!message) {
        var a = new Comparison(actual, keys);
        var b = new Comparison(expected, keys, actual);
        var err = new AssertionError({
          actual: a,
          expected: b,
          operator: "deepStrictEqual",
          stackStartFn: fn
        });
        err.actual = actual;
        err.expected = expected;
        err.operator = fn.name;
        throw err;
      }
      innerFail({
        actual,
        expected,
        message,
        operator: fn.name,
        stackStartFn: fn
      });
    }
  }
  function expectedException(actual, expected, msg, fn) {
    if (typeof expected !== "function") {
      if (isRegExp(expected))
        return RegExpPrototypeTest(expected, actual);
      if (arguments.length === 2) {
        throw new ERR_INVALID_ARG_TYPE("expected", ["Function", "RegExp"], expected);
      }
      if (_typeof(actual) !== "object" || actual === null) {
        var err = new AssertionError({
          actual,
          expected,
          message: msg,
          operator: "deepStrictEqual",
          stackStartFn: fn
        });
        err.operator = fn.name;
        throw err;
      }
      var keys = Object.keys(expected);
      if (expected instanceof Error) {
        keys.push("name", "message");
      } else if (keys.length === 0) {
        throw new ERR_INVALID_ARG_VALUE("error", expected, "may not be an empty object");
      }
      if (isDeepEqual === undefined)
        lazyLoadComparison();
      keys.forEach(function(key) {
        if (typeof actual[key] === "string" && isRegExp(expected[key]) && RegExpPrototypeTest(expected[key], actual[key])) {
          return;
        }
        compareExceptionKey(actual, expected, key, msg, keys, fn);
      });
      return true;
    }
    if (expected.prototype !== undefined && actual instanceof expected) {
      return true;
    }
    if (Error.isPrototypeOf(expected)) {
      return false;
    }
    return expected.call({}, actual) === true;
  }
  function getActual(fn) {
    if (typeof fn !== "function") {
      throw new ERR_INVALID_ARG_TYPE("fn", "Function", fn);
    }
    try {
      fn();
    } catch (e) {
      return e;
    }
    return NO_EXCEPTION_SENTINEL;
  }
  function checkIsPromise(obj) {
    return isPromise(obj) || obj !== null && _typeof(obj) === "object" && typeof obj.then === "function" && typeof obj.catch === "function";
  }
  function waitForActual(promiseFn) {
    return Promise.resolve().then(function() {
      var resultPromise;
      if (typeof promiseFn === "function") {
        resultPromise = promiseFn();
        if (!checkIsPromise(resultPromise)) {
          throw new ERR_INVALID_RETURN_VALUE("instance of Promise", "promiseFn", resultPromise);
        }
      } else if (checkIsPromise(promiseFn)) {
        resultPromise = promiseFn;
      } else {
        throw new ERR_INVALID_ARG_TYPE("promiseFn", ["Function", "Promise"], promiseFn);
      }
      return Promise.resolve().then(function() {
        return resultPromise;
      }).then(function() {
        return NO_EXCEPTION_SENTINEL;
      }).catch(function(e) {
        return e;
      });
    });
  }
  function expectsError(stackStartFn, actual, error, message) {
    if (typeof error === "string") {
      if (arguments.length === 4) {
        throw new ERR_INVALID_ARG_TYPE("error", ["Object", "Error", "Function", "RegExp"], error);
      }
      if (_typeof(actual) === "object" && actual !== null) {
        if (actual.message === error) {
          throw new ERR_AMBIGUOUS_ARGUMENT("error/message", 'The error message "'.concat(actual.message, '" is identical to the message.'));
        }
      } else if (actual === error) {
        throw new ERR_AMBIGUOUS_ARGUMENT("error/message", 'The error "'.concat(actual, '" is identical to the message.'));
      }
      message = error;
      error = undefined;
    } else if (error != null && _typeof(error) !== "object" && typeof error !== "function") {
      throw new ERR_INVALID_ARG_TYPE("error", ["Object", "Error", "Function", "RegExp"], error);
    }
    if (actual === NO_EXCEPTION_SENTINEL) {
      var details = "";
      if (error && error.name) {
        details += " (".concat(error.name, ")");
      }
      details += message ? ": ".concat(message) : ".";
      var fnType = stackStartFn.name === "rejects" ? "rejection" : "exception";
      innerFail({
        actual: undefined,
        expected: error,
        operator: stackStartFn.name,
        message: "Missing expected ".concat(fnType).concat(details),
        stackStartFn
      });
    }
    if (error && !expectedException(actual, error, message, stackStartFn)) {
      throw actual;
    }
  }
  function expectsNoError(stackStartFn, actual, error, message) {
    if (actual === NO_EXCEPTION_SENTINEL)
      return;
    if (typeof error === "string") {
      message = error;
      error = undefined;
    }
    if (!error || expectedException(actual, error)) {
      var details = message ? ": ".concat(message) : ".";
      var fnType = stackStartFn.name === "doesNotReject" ? "rejection" : "exception";
      innerFail({
        actual,
        expected: error,
        operator: stackStartFn.name,
        message: "Got unwanted ".concat(fnType).concat(details, `
`) + 'Actual message: "'.concat(actual && actual.message, '"'),
        stackStartFn
      });
    }
    throw actual;
  }
  assert.throws = function throws(promiseFn) {
    for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1;_key2 < _len2; _key2++) {
      args[_key2 - 1] = arguments[_key2];
    }
    expectsError.apply(undefined, [throws, getActual(promiseFn)].concat(args));
  };
  assert.rejects = function rejects(promiseFn) {
    for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1;_key3 < _len3; _key3++) {
      args[_key3 - 1] = arguments[_key3];
    }
    return waitForActual(promiseFn).then(function(result) {
      return expectsError.apply(undefined, [rejects, result].concat(args));
    });
  };
  assert.doesNotThrow = function doesNotThrow(fn) {
    for (var _len4 = arguments.length, args = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1;_key4 < _len4; _key4++) {
      args[_key4 - 1] = arguments[_key4];
    }
    expectsNoError.apply(undefined, [doesNotThrow, getActual(fn)].concat(args));
  };
  assert.doesNotReject = function doesNotReject(fn) {
    for (var _len5 = arguments.length, args = new Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1;_key5 < _len5; _key5++) {
      args[_key5 - 1] = arguments[_key5];
    }
    return waitForActual(fn).then(function(result) {
      return expectsNoError.apply(undefined, [doesNotReject, result].concat(args));
    });
  };
  assert.ifError = function ifError(err) {
    if (err !== null && err !== undefined) {
      var message = "ifError got unwanted exception: ";
      if (_typeof(err) === "object" && typeof err.message === "string") {
        if (err.message.length === 0 && err.constructor) {
          message += err.constructor.name;
        } else {
          message += err.message;
        }
      } else {
        message += inspect2(err);
      }
      var newErr = new AssertionError({
        actual: err,
        expected: null,
        operator: "ifError",
        message,
        stackStartFn: ifError
      });
      var origStack = err.stack;
      if (typeof origStack === "string") {
        var tmp2 = origStack.split(`
`);
        tmp2.shift();
        var tmp1 = newErr.stack.split(`
`);
        for (var i = 0;i < tmp2.length; i++) {
          var pos = tmp1.indexOf(tmp2[i]);
          if (pos !== -1) {
            tmp1 = tmp1.slice(0, pos);
            break;
          }
        }
        newErr.stack = "".concat(tmp1.join(`
`), `
`).concat(tmp2.join(`
`));
      }
      throw newErr;
    }
  };
  function internalMatch(string, regexp, message, fn, fnName) {
    if (!isRegExp(regexp)) {
      throw new ERR_INVALID_ARG_TYPE("regexp", "RegExp", regexp);
    }
    var match = fnName === "match";
    if (typeof string !== "string" || RegExpPrototypeTest(regexp, string) !== match) {
      if (message instanceof Error) {
        throw message;
      }
      var generatedMessage = !message;
      message = message || (typeof string !== "string" ? 'The "string" argument must be of type string. Received type ' + "".concat(_typeof(string), " (").concat(inspect2(string), ")") : (match ? "The input did not match the regular expression " : "The input was expected to not match the regular expression ") + "".concat(inspect2(regexp), `. Input:

`).concat(inspect2(string), `
`));
      var err = new AssertionError({
        actual: string,
        expected: regexp,
        message,
        operator: fnName,
        stackStartFn: fn
      });
      err.generatedMessage = generatedMessage;
      throw err;
    }
  }
  assert.match = function match(string, regexp, message) {
    internalMatch(string, regexp, message, match, "match");
  };
  assert.doesNotMatch = function doesNotMatch(string, regexp, message) {
    internalMatch(string, regexp, message, doesNotMatch, "doesNotMatch");
  };
  function strict() {
    for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0;_key6 < _len6; _key6++) {
      args[_key6] = arguments[_key6];
    }
    innerOk.apply(undefined, [strict, args.length].concat(args));
  }
  assert.strict = objectAssign(strict, assert, {
    equal: assert.strictEqual,
    deepEqual: assert.deepStrictEqual,
    notEqual: assert.notStrictEqual,
    notDeepEqual: assert.notDeepStrictEqual
  });
  assert.strict.strict = assert.strict;
});

// mii-creator/src/external/mii-js/mii.ts
var import_md5 = __toESM(require_md5(), 1);

// mii-creator/node_modules/buffer/index.js
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
var base64 = require_base64_js();
var ieee754 = require_ieee754();
var customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
var $Buffer = Buffer;
var $INSPECT_MAX_BYTES = 50;
var K_MAX_LENGTH = 2147483647;
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();
if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
  console.error("This browser lacks typed array (Uint8Array) support which is required by " + "`buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
}
function typedArraySupport() {
  try {
    const arr = new Uint8Array(1);
    const proto = { foo: function() {
      return 42;
    } };
    Object.setPrototypeOf(proto, Uint8Array.prototype);
    Object.setPrototypeOf(arr, proto);
    return arr.foo() === 42;
  } catch (e) {
    return false;
  }
}
Object.defineProperty(Buffer.prototype, "parent", {
  enumerable: true,
  get: function() {
    if (!Buffer.isBuffer(this))
      return;
    return this.buffer;
  }
});
Object.defineProperty(Buffer.prototype, "offset", {
  enumerable: true,
  get: function() {
    if (!Buffer.isBuffer(this))
      return;
    return this.byteOffset;
  }
});
function createBuffer(length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"');
  }
  const buf = new Uint8Array(length);
  Object.setPrototypeOf(buf, Buffer.prototype);
  return buf;
}
function Buffer(arg, encodingOrOffset, length) {
  if (typeof arg === "number") {
    if (typeof encodingOrOffset === "string") {
      throw new TypeError('The "string" argument must be of type string. Received type number');
    }
    return allocUnsafe(arg);
  }
  return from(arg, encodingOrOffset, length);
}
Buffer.poolSize = 8192;
function from(value, encodingOrOffset, length) {
  if (typeof value === "string") {
    return fromString(value, encodingOrOffset);
  }
  if (ArrayBuffer.isView(value)) {
    return fromArrayView(value);
  }
  if (value == null) {
    throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, " + "or Array-like Object. Received type " + typeof value);
  }
  if (isInstance(value, ArrayBuffer) || value && isInstance(value.buffer, ArrayBuffer)) {
    return fromArrayBuffer(value, encodingOrOffset, length);
  }
  if (typeof SharedArrayBuffer !== "undefined" && (isInstance(value, SharedArrayBuffer) || value && isInstance(value.buffer, SharedArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length);
  }
  if (typeof value === "number") {
    throw new TypeError('The "value" argument must not be of type number. Received type number');
  }
  const valueOf = value.valueOf && value.valueOf();
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length);
  }
  const b = fromObject(value);
  if (b)
    return b;
  if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
    return Buffer.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
  }
  throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, " + "or Array-like Object. Received type " + typeof value);
}
Buffer.from = function(value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length);
};
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
Object.setPrototypeOf(Buffer, Uint8Array);
function assertSize(size) {
  if (typeof size !== "number") {
    throw new TypeError('"size" argument must be of type number');
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"');
  }
}
function alloc(size, fill, encoding) {
  assertSize(size);
  if (size <= 0) {
    return createBuffer(size);
  }
  if (fill !== undefined) {
    return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
  }
  return createBuffer(size);
}
Buffer.alloc = function(size, fill, encoding) {
  return alloc(size, fill, encoding);
};
function allocUnsafe(size) {
  assertSize(size);
  return createBuffer(size < 0 ? 0 : checked(size) | 0);
}
Buffer.allocUnsafe = function(size) {
  return allocUnsafe(size);
};
Buffer.allocUnsafeSlow = function(size) {
  return allocUnsafe(size);
};
function fromString(string, encoding) {
  if (typeof encoding !== "string" || encoding === "") {
    encoding = "utf8";
  }
  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError("Unknown encoding: " + encoding);
  }
  const length = byteLength(string, encoding) | 0;
  let buf = createBuffer(length);
  const actual = buf.write(string, encoding);
  if (actual !== length) {
    buf = buf.slice(0, actual);
  }
  return buf;
}
function fromArrayLike(array) {
  const length = array.length < 0 ? 0 : checked(array.length) | 0;
  const buf = createBuffer(length);
  for (let i = 0;i < length; i += 1) {
    buf[i] = array[i] & 255;
  }
  return buf;
}
function fromArrayView(arrayView) {
  if (isInstance(arrayView, Uint8Array)) {
    const copy = new Uint8Array(arrayView);
    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
  }
  return fromArrayLike(arrayView);
}
function fromArrayBuffer(array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds');
  }
  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds');
  }
  let buf;
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array);
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset);
  } else {
    buf = new Uint8Array(array, byteOffset, length);
  }
  Object.setPrototypeOf(buf, Buffer.prototype);
  return buf;
}
function fromObject(obj) {
  if (Buffer.isBuffer(obj)) {
    const len = checked(obj.length) | 0;
    const buf = createBuffer(len);
    if (buf.length === 0) {
      return buf;
    }
    obj.copy(buf, 0, 0, len);
    return buf;
  }
  if (obj.length !== undefined) {
    if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
      return createBuffer(0);
    }
    return fromArrayLike(obj);
  }
  if (obj.type === "Buffer" && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data);
  }
}
function checked(length) {
  if (length >= K_MAX_LENGTH) {
    throw new RangeError("Attempt to allocate Buffer larger than maximum " + "size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
  }
  return length | 0;
}
Buffer.isBuffer = function isBuffer(b) {
  return b != null && b._isBuffer === true && b !== Buffer.prototype;
};
Buffer.compare = function compare(a, b) {
  if (isInstance(a, Uint8Array))
    a = Buffer.from(a, a.offset, a.byteLength);
  if (isInstance(b, Uint8Array))
    b = Buffer.from(b, b.offset, b.byteLength);
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');
  }
  if (a === b)
    return 0;
  let x = a.length;
  let y = b.length;
  for (let i = 0, len = Math.min(x, y);i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break;
    }
  }
  if (x < y)
    return -1;
  if (y < x)
    return 1;
  return 0;
};
Buffer.isEncoding = function isEncoding(encoding) {
  switch (String(encoding).toLowerCase()) {
    case "hex":
    case "utf8":
    case "utf-8":
    case "ascii":
    case "latin1":
    case "binary":
    case "base64":
    case "ucs2":
    case "ucs-2":
    case "utf16le":
    case "utf-16le":
      return true;
    default:
      return false;
  }
};
Buffer.concat = function concat(list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers');
  }
  if (list.length === 0) {
    return Buffer.alloc(0);
  }
  let i;
  if (length === undefined) {
    length = 0;
    for (i = 0;i < list.length; ++i) {
      length += list[i].length;
    }
  }
  const buffer = Buffer.allocUnsafe(length);
  let pos = 0;
  for (i = 0;i < list.length; ++i) {
    let buf = list[i];
    if (isInstance(buf, Uint8Array)) {
      if (pos + buf.length > buffer.length) {
        if (!Buffer.isBuffer(buf))
          buf = Buffer.from(buf);
        buf.copy(buffer, pos);
      } else {
        Uint8Array.prototype.set.call(buffer, buf, pos);
      }
    } else if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers');
    } else {
      buf.copy(buffer, pos);
    }
    pos += buf.length;
  }
  return buffer;
};
function byteLength(string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length;
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength;
  }
  if (typeof string !== "string") {
    throw new TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' + "Received type " + typeof string);
  }
  const len = string.length;
  const mustMatch = arguments.length > 2 && arguments[2] === true;
  if (!mustMatch && len === 0)
    return 0;
  let loweredCase = false;
  for (;; ) {
    switch (encoding) {
      case "ascii":
      case "latin1":
      case "binary":
        return len;
      case "utf8":
      case "utf-8":
        return utf8ToBytes(string).length;
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return len * 2;
      case "hex":
        return len >>> 1;
      case "base64":
        return base64ToBytes(string).length;
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length;
        }
        encoding = ("" + encoding).toLowerCase();
        loweredCase = true;
    }
  }
}
Buffer.byteLength = byteLength;
function slowToString(encoding, start, end) {
  let loweredCase = false;
  if (start === undefined || start < 0) {
    start = 0;
  }
  if (start > this.length) {
    return "";
  }
  if (end === undefined || end > this.length) {
    end = this.length;
  }
  if (end <= 0) {
    return "";
  }
  end >>>= 0;
  start >>>= 0;
  if (end <= start) {
    return "";
  }
  if (!encoding)
    encoding = "utf8";
  while (true) {
    switch (encoding) {
      case "hex":
        return hexSlice(this, start, end);
      case "utf8":
      case "utf-8":
        return utf8Slice(this, start, end);
      case "ascii":
        return asciiSlice(this, start, end);
      case "latin1":
      case "binary":
        return latin1Slice(this, start, end);
      case "base64":
        return base64Slice(this, start, end);
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return utf16leSlice(this, start, end);
      default:
        if (loweredCase)
          throw new TypeError("Unknown encoding: " + encoding);
        encoding = (encoding + "").toLowerCase();
        loweredCase = true;
    }
  }
}
Buffer.prototype._isBuffer = true;
function swap(b, n, m) {
  const i = b[n];
  b[n] = b[m];
  b[m] = i;
}
Buffer.prototype.swap16 = function swap16() {
  const len = this.length;
  if (len % 2 !== 0) {
    throw new RangeError("Buffer size must be a multiple of 16-bits");
  }
  for (let i = 0;i < len; i += 2) {
    swap(this, i, i + 1);
  }
  return this;
};
Buffer.prototype.swap32 = function swap32() {
  const len = this.length;
  if (len % 4 !== 0) {
    throw new RangeError("Buffer size must be a multiple of 32-bits");
  }
  for (let i = 0;i < len; i += 4) {
    swap(this, i, i + 3);
    swap(this, i + 1, i + 2);
  }
  return this;
};
Buffer.prototype.swap64 = function swap64() {
  const len = this.length;
  if (len % 8 !== 0) {
    throw new RangeError("Buffer size must be a multiple of 64-bits");
  }
  for (let i = 0;i < len; i += 8) {
    swap(this, i, i + 7);
    swap(this, i + 1, i + 6);
    swap(this, i + 2, i + 5);
    swap(this, i + 3, i + 4);
  }
  return this;
};
Buffer.prototype.toString = function toString() {
  const length = this.length;
  if (length === 0)
    return "";
  if (arguments.length === 0)
    return utf8Slice(this, 0, length);
  return slowToString.apply(this, arguments);
};
Buffer.prototype.toLocaleString = Buffer.prototype.toString;
Buffer.prototype.equals = function equals(b) {
  if (!Buffer.isBuffer(b))
    throw new TypeError("Argument must be a Buffer");
  if (this === b)
    return true;
  return Buffer.compare(this, b) === 0;
};
Buffer.prototype.inspect = function inspect() {
  let str = "";
  const max = $INSPECT_MAX_BYTES;
  str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
  if (this.length > max)
    str += " ... ";
  return "<Buffer " + str + ">";
};
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
}
Buffer.prototype.compare = function compare2(target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength);
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. ' + "Received type " + typeof target);
  }
  if (start === undefined) {
    start = 0;
  }
  if (end === undefined) {
    end = target ? target.length : 0;
  }
  if (thisStart === undefined) {
    thisStart = 0;
  }
  if (thisEnd === undefined) {
    thisEnd = this.length;
  }
  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError("out of range index");
  }
  if (thisStart >= thisEnd && start >= end) {
    return 0;
  }
  if (thisStart >= thisEnd) {
    return -1;
  }
  if (start >= end) {
    return 1;
  }
  start >>>= 0;
  end >>>= 0;
  thisStart >>>= 0;
  thisEnd >>>= 0;
  if (this === target)
    return 0;
  let x = thisEnd - thisStart;
  let y = end - start;
  const len = Math.min(x, y);
  const thisCopy = this.slice(thisStart, thisEnd);
  const targetCopy = target.slice(start, end);
  for (let i = 0;i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i];
      y = targetCopy[i];
      break;
    }
  }
  if (x < y)
    return -1;
  if (y < x)
    return 1;
  return 0;
};
function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
  if (buffer.length === 0)
    return -1;
  if (typeof byteOffset === "string") {
    encoding = byteOffset;
    byteOffset = 0;
  } else if (byteOffset > 2147483647) {
    byteOffset = 2147483647;
  } else if (byteOffset < -2147483648) {
    byteOffset = -2147483648;
  }
  byteOffset = +byteOffset;
  if (numberIsNaN(byteOffset)) {
    byteOffset = dir ? 0 : buffer.length - 1;
  }
  if (byteOffset < 0)
    byteOffset = buffer.length + byteOffset;
  if (byteOffset >= buffer.length) {
    if (dir)
      return -1;
    else
      byteOffset = buffer.length - 1;
  } else if (byteOffset < 0) {
    if (dir)
      byteOffset = 0;
    else
      return -1;
  }
  if (typeof val === "string") {
    val = Buffer.from(val, encoding);
  }
  if (Buffer.isBuffer(val)) {
    if (val.length === 0) {
      return -1;
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
  } else if (typeof val === "number") {
    val = val & 255;
    if (typeof Uint8Array.prototype.indexOf === "function") {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
  }
  throw new TypeError("val must be string, number or Buffer");
}
function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
  let indexSize = 1;
  let arrLength = arr.length;
  let valLength = val.length;
  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase();
    if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
      if (arr.length < 2 || val.length < 2) {
        return -1;
      }
      indexSize = 2;
      arrLength /= 2;
      valLength /= 2;
      byteOffset /= 2;
    }
  }
  function read(buf, i2) {
    if (indexSize === 1) {
      return buf[i2];
    } else {
      return buf.readUInt16BE(i2 * indexSize);
    }
  }
  let i;
  if (dir) {
    let foundIndex = -1;
    for (i = byteOffset;i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1)
          foundIndex = i;
        if (i - foundIndex + 1 === valLength)
          return foundIndex * indexSize;
      } else {
        if (foundIndex !== -1)
          i -= i - foundIndex;
        foundIndex = -1;
      }
    }
  } else {
    if (byteOffset + valLength > arrLength)
      byteOffset = arrLength - valLength;
    for (i = byteOffset;i >= 0; i--) {
      let found = true;
      for (let j = 0;j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false;
          break;
        }
      }
      if (found)
        return i;
    }
  }
  return -1;
}
Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1;
};
Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
};
Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
};
function hexWrite(buf, string, offset, length) {
  offset = Number(offset) || 0;
  const remaining = buf.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = Number(length);
    if (length > remaining) {
      length = remaining;
    }
  }
  const strLen = string.length;
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  let i;
  for (i = 0;i < length; ++i) {
    const parsed = parseInt(string.substr(i * 2, 2), 16);
    if (numberIsNaN(parsed))
      return i;
    buf[offset + i] = parsed;
  }
  return i;
}
function utf8Write(buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
}
function asciiWrite(buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length);
}
function base64Write(buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length);
}
function ucs2Write(buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
}
Buffer.prototype.write = function write(string, offset, length, encoding) {
  if (offset === undefined) {
    encoding = "utf8";
    length = this.length;
    offset = 0;
  } else if (length === undefined && typeof offset === "string") {
    encoding = offset;
    length = this.length;
    offset = 0;
  } else if (isFinite(offset)) {
    offset = offset >>> 0;
    if (isFinite(length)) {
      length = length >>> 0;
      if (encoding === undefined)
        encoding = "utf8";
    } else {
      encoding = length;
      length = undefined;
    }
  } else {
    throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
  }
  const remaining = this.length - offset;
  if (length === undefined || length > remaining)
    length = remaining;
  if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
    throw new RangeError("Attempt to write outside buffer bounds");
  }
  if (!encoding)
    encoding = "utf8";
  let loweredCase = false;
  for (;; ) {
    switch (encoding) {
      case "hex":
        return hexWrite(this, string, offset, length);
      case "utf8":
      case "utf-8":
        return utf8Write(this, string, offset, length);
      case "ascii":
      case "latin1":
      case "binary":
        return asciiWrite(this, string, offset, length);
      case "base64":
        return base64Write(this, string, offset, length);
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return ucs2Write(this, string, offset, length);
      default:
        if (loweredCase)
          throw new TypeError("Unknown encoding: " + encoding);
        encoding = ("" + encoding).toLowerCase();
        loweredCase = true;
    }
  }
};
Buffer.prototype.toJSON = function toJSON() {
  return {
    type: "Buffer",
    data: Array.prototype.slice.call(this._arr || this, 0)
  };
};
function base64Slice(buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf);
  } else {
    return base64.fromByteArray(buf.slice(start, end));
  }
}
function utf8Slice(buf, start, end) {
  end = Math.min(buf.length, end);
  const res = [];
  let i = start;
  while (i < end) {
    const firstByte = buf[i];
    let codePoint = null;
    let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
    if (i + bytesPerSequence <= end) {
      let secondByte, thirdByte, fourthByte, tempCodePoint;
      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 128) {
            codePoint = firstByte;
          }
          break;
        case 2:
          secondByte = buf[i + 1];
          if ((secondByte & 192) === 128) {
            tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
            if (tempCodePoint > 127) {
              codePoint = tempCodePoint;
            }
          }
          break;
        case 3:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
            tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
            if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
              codePoint = tempCodePoint;
            }
          }
          break;
        case 4:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          fourthByte = buf[i + 3];
          if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
            tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
            if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
              codePoint = tempCodePoint;
            }
          }
      }
    }
    if (codePoint === null) {
      codePoint = 65533;
      bytesPerSequence = 1;
    } else if (codePoint > 65535) {
      codePoint -= 65536;
      res.push(codePoint >>> 10 & 1023 | 55296);
      codePoint = 56320 | codePoint & 1023;
    }
    res.push(codePoint);
    i += bytesPerSequence;
  }
  return decodeCodePointsArray(res);
}
var MAX_ARGUMENTS_LENGTH = 4096;
function decodeCodePointsArray(codePoints) {
  const len = codePoints.length;
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints);
  }
  let res = "";
  let i = 0;
  while (i < len) {
    res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
  }
  return res;
}
function asciiSlice(buf, start, end) {
  let ret = "";
  end = Math.min(buf.length, end);
  for (let i = start;i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 127);
  }
  return ret;
}
function latin1Slice(buf, start, end) {
  let ret = "";
  end = Math.min(buf.length, end);
  for (let i = start;i < end; ++i) {
    ret += String.fromCharCode(buf[i]);
  }
  return ret;
}
function hexSlice(buf, start, end) {
  const len = buf.length;
  if (!start || start < 0)
    start = 0;
  if (!end || end < 0 || end > len)
    end = len;
  let out = "";
  for (let i = start;i < end; ++i) {
    out += hexSliceLookupTable[buf[i]];
  }
  return out;
}
function utf16leSlice(buf, start, end) {
  const bytes = buf.slice(start, end);
  let res = "";
  for (let i = 0;i < bytes.length - 1; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
  }
  return res;
}
Buffer.prototype.slice = function slice(start, end) {
  const len = this.length;
  start = ~~start;
  end = end === undefined ? len : ~~end;
  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0;
  } else if (start > len) {
    start = len;
  }
  if (end < 0) {
    end += len;
    if (end < 0)
      end = 0;
  } else if (end > len) {
    end = len;
  }
  if (end < start)
    end = start;
  const newBuf = this.subarray(start, end);
  Object.setPrototypeOf(newBuf, Buffer.prototype);
  return newBuf;
};
function checkOffset(offset, ext, length) {
  if (offset % 1 !== 0 || offset < 0)
    throw new RangeError("offset is not uint");
  if (offset + ext > length)
    throw new RangeError("Trying to access beyond buffer length");
}
Buffer.prototype.readUintLE = Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength2, noAssert) {
  offset = offset >>> 0;
  byteLength2 = byteLength2 >>> 0;
  if (!noAssert)
    checkOffset(offset, byteLength2, this.length);
  let val = this[offset];
  let mul = 1;
  let i = 0;
  while (++i < byteLength2 && (mul *= 256)) {
    val += this[offset + i] * mul;
  }
  return val;
};
Buffer.prototype.readUintBE = Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength2, noAssert) {
  offset = offset >>> 0;
  byteLength2 = byteLength2 >>> 0;
  if (!noAssert) {
    checkOffset(offset, byteLength2, this.length);
  }
  let val = this[offset + --byteLength2];
  let mul = 1;
  while (byteLength2 > 0 && (mul *= 256)) {
    val += this[offset + --byteLength2] * mul;
  }
  return val;
};
Buffer.prototype.readUint8 = Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 1, this.length);
  return this[offset];
};
Buffer.prototype.readUint16LE = Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 2, this.length);
  return this[offset] | this[offset + 1] << 8;
};
Buffer.prototype.readUint16BE = Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 2, this.length);
  return this[offset] << 8 | this[offset + 1];
};
Buffer.prototype.readUint32LE = Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
};
Buffer.prototype.readUint32BE = Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
};
Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
  offset = offset >>> 0;
  validateNumber(offset, "offset");
  const first = this[offset];
  const last = this[offset + 7];
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8);
  }
  const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
  const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
  return BigInt(lo) + (BigInt(hi) << BigInt(32));
});
Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
  offset = offset >>> 0;
  validateNumber(offset, "offset");
  const first = this[offset];
  const last = this[offset + 7];
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8);
  }
  const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
  const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
  return (BigInt(hi) << BigInt(32)) + BigInt(lo);
});
Buffer.prototype.readIntLE = function readIntLE(offset, byteLength2, noAssert) {
  offset = offset >>> 0;
  byteLength2 = byteLength2 >>> 0;
  if (!noAssert)
    checkOffset(offset, byteLength2, this.length);
  let val = this[offset];
  let mul = 1;
  let i = 0;
  while (++i < byteLength2 && (mul *= 256)) {
    val += this[offset + i] * mul;
  }
  mul *= 128;
  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength2);
  return val;
};
Buffer.prototype.readIntBE = function readIntBE(offset, byteLength2, noAssert) {
  offset = offset >>> 0;
  byteLength2 = byteLength2 >>> 0;
  if (!noAssert)
    checkOffset(offset, byteLength2, this.length);
  let i = byteLength2;
  let mul = 1;
  let val = this[offset + --i];
  while (i > 0 && (mul *= 256)) {
    val += this[offset + --i] * mul;
  }
  mul *= 128;
  if (val >= mul)
    val -= Math.pow(2, 8 * byteLength2);
  return val;
};
Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 1, this.length);
  if (!(this[offset] & 128))
    return this[offset];
  return (255 - this[offset] + 1) * -1;
};
Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 2, this.length);
  const val = this[offset] | this[offset + 1] << 8;
  return val & 32768 ? val | 4294901760 : val;
};
Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 2, this.length);
  const val = this[offset + 1] | this[offset] << 8;
  return val & 32768 ? val | 4294901760 : val;
};
Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
};
Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
};
Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
  offset = offset >>> 0;
  validateNumber(offset, "offset");
  const first = this[offset];
  const last = this[offset + 7];
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8);
  }
  const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
  return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
});
Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
  offset = offset >>> 0;
  validateNumber(offset, "offset");
  const first = this[offset];
  const last = this[offset + 7];
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8);
  }
  const val = (first << 24) + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
  return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
});
Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return ieee754.read(this, offset, true, 23, 4);
};
Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 4, this.length);
  return ieee754.read(this, offset, false, 23, 4);
};
Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 8, this.length);
  return ieee754.read(this, offset, true, 52, 8);
};
Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert)
    checkOffset(offset, 8, this.length);
  return ieee754.read(this, offset, false, 52, 8);
};
function checkInt(buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf))
    throw new TypeError('"buffer" argument must be a Buffer instance');
  if (value > max || value < min)
    throw new RangeError('"value" argument is out of bounds');
  if (offset + ext > buf.length)
    throw new RangeError("Index out of range");
}
Buffer.prototype.writeUintLE = Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength2, noAssert) {
  value = +value;
  offset = offset >>> 0;
  byteLength2 = byteLength2 >>> 0;
  if (!noAssert) {
    const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
    checkInt(this, value, offset, byteLength2, maxBytes, 0);
  }
  let mul = 1;
  let i = 0;
  this[offset] = value & 255;
  while (++i < byteLength2 && (mul *= 256)) {
    this[offset + i] = value / mul & 255;
  }
  return offset + byteLength2;
};
Buffer.prototype.writeUintBE = Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength2, noAssert) {
  value = +value;
  offset = offset >>> 0;
  byteLength2 = byteLength2 >>> 0;
  if (!noAssert) {
    const maxBytes = Math.pow(2, 8 * byteLength2) - 1;
    checkInt(this, value, offset, byteLength2, maxBytes, 0);
  }
  let i = byteLength2 - 1;
  let mul = 1;
  this[offset + i] = value & 255;
  while (--i >= 0 && (mul *= 256)) {
    this[offset + i] = value / mul & 255;
  }
  return offset + byteLength2;
};
Buffer.prototype.writeUint8 = Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert)
    checkInt(this, value, offset, 1, 255, 0);
  this[offset] = value & 255;
  return offset + 1;
};
Buffer.prototype.writeUint16LE = Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert)
    checkInt(this, value, offset, 2, 65535, 0);
  this[offset] = value & 255;
  this[offset + 1] = value >>> 8;
  return offset + 2;
};
Buffer.prototype.writeUint16BE = Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert)
    checkInt(this, value, offset, 2, 65535, 0);
  this[offset] = value >>> 8;
  this[offset + 1] = value & 255;
  return offset + 2;
};
Buffer.prototype.writeUint32LE = Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert)
    checkInt(this, value, offset, 4, 4294967295, 0);
  this[offset + 3] = value >>> 24;
  this[offset + 2] = value >>> 16;
  this[offset + 1] = value >>> 8;
  this[offset] = value & 255;
  return offset + 4;
};
Buffer.prototype.writeUint32BE = Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert)
    checkInt(this, value, offset, 4, 4294967295, 0);
  this[offset] = value >>> 24;
  this[offset + 1] = value >>> 16;
  this[offset + 2] = value >>> 8;
  this[offset + 3] = value & 255;
  return offset + 4;
};
function wrtBigUInt64LE(buf, value, offset, min, max) {
  checkIntBI(value, min, max, buf, offset, 7);
  let lo = Number(value & BigInt(4294967295));
  buf[offset++] = lo;
  lo = lo >> 8;
  buf[offset++] = lo;
  lo = lo >> 8;
  buf[offset++] = lo;
  lo = lo >> 8;
  buf[offset++] = lo;
  let hi = Number(value >> BigInt(32) & BigInt(4294967295));
  buf[offset++] = hi;
  hi = hi >> 8;
  buf[offset++] = hi;
  hi = hi >> 8;
  buf[offset++] = hi;
  hi = hi >> 8;
  buf[offset++] = hi;
  return offset;
}
function wrtBigUInt64BE(buf, value, offset, min, max) {
  checkIntBI(value, min, max, buf, offset, 7);
  let lo = Number(value & BigInt(4294967295));
  buf[offset + 7] = lo;
  lo = lo >> 8;
  buf[offset + 6] = lo;
  lo = lo >> 8;
  buf[offset + 5] = lo;
  lo = lo >> 8;
  buf[offset + 4] = lo;
  let hi = Number(value >> BigInt(32) & BigInt(4294967295));
  buf[offset + 3] = hi;
  hi = hi >> 8;
  buf[offset + 2] = hi;
  hi = hi >> 8;
  buf[offset + 1] = hi;
  hi = hi >> 8;
  buf[offset] = hi;
  return offset + 8;
}
Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
});
Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
});
Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength2, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    const limit = Math.pow(2, 8 * byteLength2 - 1);
    checkInt(this, value, offset, byteLength2, limit - 1, -limit);
  }
  let i = 0;
  let mul = 1;
  let sub = 0;
  this[offset] = value & 255;
  while (++i < byteLength2 && (mul *= 256)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = (value / mul >> 0) - sub & 255;
  }
  return offset + byteLength2;
};
Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength2, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    const limit = Math.pow(2, 8 * byteLength2 - 1);
    checkInt(this, value, offset, byteLength2, limit - 1, -limit);
  }
  let i = byteLength2 - 1;
  let mul = 1;
  let sub = 0;
  this[offset + i] = value & 255;
  while (--i >= 0 && (mul *= 256)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = (value / mul >> 0) - sub & 255;
  }
  return offset + byteLength2;
};
Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert)
    checkInt(this, value, offset, 1, 127, -128);
  if (value < 0)
    value = 255 + value + 1;
  this[offset] = value & 255;
  return offset + 1;
};
Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert)
    checkInt(this, value, offset, 2, 32767, -32768);
  this[offset] = value & 255;
  this[offset + 1] = value >>> 8;
  return offset + 2;
};
Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert)
    checkInt(this, value, offset, 2, 32767, -32768);
  this[offset] = value >>> 8;
  this[offset + 1] = value & 255;
  return offset + 2;
};
Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert)
    checkInt(this, value, offset, 4, 2147483647, -2147483648);
  this[offset] = value & 255;
  this[offset + 1] = value >>> 8;
  this[offset + 2] = value >>> 16;
  this[offset + 3] = value >>> 24;
  return offset + 4;
};
Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert)
    checkInt(this, value, offset, 4, 2147483647, -2147483648);
  if (value < 0)
    value = 4294967295 + value + 1;
  this[offset] = value >>> 24;
  this[offset + 1] = value >>> 16;
  this[offset + 2] = value >>> 8;
  this[offset + 3] = value & 255;
  return offset + 4;
};
Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
  return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
});
Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
  return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
});
function checkIEEE754(buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length)
    throw new RangeError("Index out of range");
  if (offset < 0)
    throw new RangeError("Index out of range");
}
function writeFloat(buf, value, offset, littleEndian, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 340282346638528860000000000000000000000, -340282346638528860000000000000000000000);
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4);
  return offset + 4;
}
Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert);
};
Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert);
};
function writeDouble(buf, value, offset, littleEndian, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000, -179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000);
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8);
  return offset + 8;
}
Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert);
};
Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert);
};
Buffer.prototype.copy = function copy(target, targetStart, start, end) {
  if (!Buffer.isBuffer(target))
    throw new TypeError("argument should be a Buffer");
  if (!start)
    start = 0;
  if (!end && end !== 0)
    end = this.length;
  if (targetStart >= target.length)
    targetStart = target.length;
  if (!targetStart)
    targetStart = 0;
  if (end > 0 && end < start)
    end = start;
  if (end === start)
    return 0;
  if (target.length === 0 || this.length === 0)
    return 0;
  if (targetStart < 0) {
    throw new RangeError("targetStart out of bounds");
  }
  if (start < 0 || start >= this.length)
    throw new RangeError("Index out of range");
  if (end < 0)
    throw new RangeError("sourceEnd out of bounds");
  if (end > this.length)
    end = this.length;
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start;
  }
  const len = end - start;
  if (this === target && typeof Uint8Array.prototype.copyWithin === "function") {
    this.copyWithin(targetStart, start, end);
  } else {
    Uint8Array.prototype.set.call(target, this.subarray(start, end), targetStart);
  }
  return len;
};
Buffer.prototype.fill = function fill(val, start, end, encoding) {
  if (typeof val === "string") {
    if (typeof start === "string") {
      encoding = start;
      start = 0;
      end = this.length;
    } else if (typeof end === "string") {
      encoding = end;
      end = this.length;
    }
    if (encoding !== undefined && typeof encoding !== "string") {
      throw new TypeError("encoding must be a string");
    }
    if (typeof encoding === "string" && !Buffer.isEncoding(encoding)) {
      throw new TypeError("Unknown encoding: " + encoding);
    }
    if (val.length === 1) {
      const code = val.charCodeAt(0);
      if (encoding === "utf8" && code < 128 || encoding === "latin1") {
        val = code;
      }
    }
  } else if (typeof val === "number") {
    val = val & 255;
  } else if (typeof val === "boolean") {
    val = Number(val);
  }
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError("Out of range index");
  }
  if (end <= start) {
    return this;
  }
  start = start >>> 0;
  end = end === undefined ? this.length : end >>> 0;
  if (!val)
    val = 0;
  let i;
  if (typeof val === "number") {
    for (i = start;i < end; ++i) {
      this[i] = val;
    }
  } else {
    const bytes = Buffer.isBuffer(val) ? val : Buffer.from(val, encoding);
    const len = bytes.length;
    if (len === 0) {
      throw new TypeError('The value "' + val + '" is invalid for argument "value"');
    }
    for (i = 0;i < end - start; ++i) {
      this[i + start] = bytes[i % len];
    }
  }
  return this;
};
var errors = {};
function E(sym, getMessage, Base) {
  errors[sym] = class NodeError extends Base {
    constructor() {
      super();
      Object.defineProperty(this, "message", {
        value: getMessage.apply(this, arguments),
        writable: true,
        configurable: true
      });
      this.name = `${this.name} [${sym}]`;
      this.stack;
      delete this.name;
    }
    get code() {
      return sym;
    }
    set code(value) {
      Object.defineProperty(this, "code", {
        configurable: true,
        enumerable: true,
        value,
        writable: true
      });
    }
    toString() {
      return `${this.name} [${sym}]: ${this.message}`;
    }
  };
}
E("ERR_BUFFER_OUT_OF_BOUNDS", function(name) {
  if (name) {
    return `${name} is outside of buffer bounds`;
  }
  return "Attempt to access memory outside buffer bounds";
}, RangeError);
E("ERR_INVALID_ARG_TYPE", function(name, actual) {
  return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
}, TypeError);
E("ERR_OUT_OF_RANGE", function(str, range, input) {
  let msg = `The value of "${str}" is out of range.`;
  let received = input;
  if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
    received = addNumericalSeparator(String(input));
  } else if (typeof input === "bigint") {
    received = String(input);
    if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
      received = addNumericalSeparator(received);
    }
    received += "n";
  }
  msg += ` It must be ${range}. Received ${received}`;
  return msg;
}, RangeError);
function addNumericalSeparator(val) {
  let res = "";
  let i = val.length;
  const start = val[0] === "-" ? 1 : 0;
  for (;i >= start + 4; i -= 3) {
    res = `_${val.slice(i - 3, i)}${res}`;
  }
  return `${val.slice(0, i)}${res}`;
}
function checkBounds(buf, offset, byteLength2) {
  validateNumber(offset, "offset");
  if (buf[offset] === undefined || buf[offset + byteLength2] === undefined) {
    boundsError(offset, buf.length - (byteLength2 + 1));
  }
}
function checkIntBI(value, min, max, buf, offset, byteLength2) {
  if (value > max || value < min) {
    const n = typeof min === "bigint" ? "n" : "";
    let range;
    if (byteLength2 > 3) {
      if (min === 0 || min === BigInt(0)) {
        range = `>= 0${n} and < 2${n} ** ${(byteLength2 + 1) * 8}${n}`;
      } else {
        range = `>= -(2${n} ** ${(byteLength2 + 1) * 8 - 1}${n}) and < 2 ** ` + `${(byteLength2 + 1) * 8 - 1}${n}`;
      }
    } else {
      range = `>= ${min}${n} and <= ${max}${n}`;
    }
    throw new errors.ERR_OUT_OF_RANGE("value", range, value);
  }
  checkBounds(buf, offset, byteLength2);
}
function validateNumber(value, name) {
  if (typeof value !== "number") {
    throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
  }
}
function boundsError(value, length, type) {
  if (Math.floor(value) !== value) {
    validateNumber(value, type);
    throw new errors.ERR_OUT_OF_RANGE(type || "offset", "an integer", value);
  }
  if (length < 0) {
    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS;
  }
  throw new errors.ERR_OUT_OF_RANGE(type || "offset", `>= ${type ? 1 : 0} and <= ${length}`, value);
}
var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
function base64clean(str) {
  str = str.split("=")[0];
  str = str.trim().replace(INVALID_BASE64_RE, "");
  if (str.length < 2)
    return "";
  while (str.length % 4 !== 0) {
    str = str + "=";
  }
  return str;
}
function utf8ToBytes(string, units) {
  units = units || Infinity;
  let codePoint;
  const length = string.length;
  let leadSurrogate = null;
  const bytes = [];
  for (let i = 0;i < length; ++i) {
    codePoint = string.charCodeAt(i);
    if (codePoint > 55295 && codePoint < 57344) {
      if (!leadSurrogate) {
        if (codePoint > 56319) {
          if ((units -= 3) > -1)
            bytes.push(239, 191, 189);
          continue;
        } else if (i + 1 === length) {
          if ((units -= 3) > -1)
            bytes.push(239, 191, 189);
          continue;
        }
        leadSurrogate = codePoint;
        continue;
      }
      if (codePoint < 56320) {
        if ((units -= 3) > -1)
          bytes.push(239, 191, 189);
        leadSurrogate = codePoint;
        continue;
      }
      codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
    } else if (leadSurrogate) {
      if ((units -= 3) > -1)
        bytes.push(239, 191, 189);
    }
    leadSurrogate = null;
    if (codePoint < 128) {
      if ((units -= 1) < 0)
        break;
      bytes.push(codePoint);
    } else if (codePoint < 2048) {
      if ((units -= 2) < 0)
        break;
      bytes.push(codePoint >> 6 | 192, codePoint & 63 | 128);
    } else if (codePoint < 65536) {
      if ((units -= 3) < 0)
        break;
      bytes.push(codePoint >> 12 | 224, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
    } else if (codePoint < 1114112) {
      if ((units -= 4) < 0)
        break;
      bytes.push(codePoint >> 18 | 240, codePoint >> 12 & 63 | 128, codePoint >> 6 & 63 | 128, codePoint & 63 | 128);
    } else {
      throw new Error("Invalid code point");
    }
  }
  return bytes;
}
function asciiToBytes(str) {
  const byteArray = [];
  for (let i = 0;i < str.length; ++i) {
    byteArray.push(str.charCodeAt(i) & 255);
  }
  return byteArray;
}
function utf16leToBytes(str, units) {
  let c, hi, lo;
  const byteArray = [];
  for (let i = 0;i < str.length; ++i) {
    if ((units -= 2) < 0)
      break;
    c = str.charCodeAt(i);
    hi = c >> 8;
    lo = c % 256;
    byteArray.push(lo);
    byteArray.push(hi);
  }
  return byteArray;
}
function base64ToBytes(str) {
  return base64.toByteArray(base64clean(str));
}
function blitBuffer(src, dst, offset, length) {
  let i;
  for (i = 0;i < length; ++i) {
    if (i + offset >= dst.length || i >= src.length)
      break;
    dst[i + offset] = src[i];
  }
  return i;
}
function isInstance(obj, type) {
  return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
}
function numberIsNaN(obj) {
  return obj !== obj;
}
var hexSliceLookupTable = function() {
  const alphabet = "0123456789abcdef";
  const table = new Array(256);
  for (let i = 0;i < 16; ++i) {
    const i16 = i * 16;
    for (let j = 0;j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j];
    }
  }
  return table;
}();
function defineBigIntMethod(fn) {
  return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
}
function BufferBigIntNotDefined() {
  throw new Error("BigInt not supported");
}

// mii-creator/src/external/bitStream/bitStream.js
class BitView {
  constructor(source, byteOffset, byteLength2) {
    var isBuffer2 = source instanceof ArrayBuffer || typeof $Buffer !== "undefined" && source instanceof $Buffer;
    if (!isBuffer2) {
      throw new Error("Must specify a valid ArrayBuffer or Buffer.");
    }
    byteOffset = byteOffset || 0;
    byteLength2 = byteLength2 || source.byteLength || source.length;
    this._view = new Uint8Array(source.buffer || source, byteOffset, byteLength2);
    this.bigEndian = false;
  }
  _setBit(offset, on) {
    if (on) {
      this._view[offset >> 3] |= 1 << (offset & 7);
    } else {
      this._view[offset >> 3] &= ~(1 << (offset & 7));
    }
  }
  getBits(offset, bits, signed) {
    var available = this._view.length * 8 - offset;
    if (bits > available) {
      throw new Error("Cannot get " + bits + " bit(s) from offset " + offset + ", " + available + " available");
    }
    var value = 0;
    for (var i = 0;i < bits; ) {
      var remaining = bits - i;
      var bitOffset = offset & 7;
      var currentByte = this._view[offset >> 3];
      var read = Math.min(remaining, 8 - bitOffset);
      var mask, readBits;
      if (this.bigEndian) {
        mask = ~(255 << read);
        readBits = currentByte >> 8 - read - bitOffset & mask;
        value <<= read;
        value |= readBits;
      } else {
        mask = ~(255 << read);
        readBits = currentByte >> bitOffset & mask;
        value |= readBits << i;
      }
      offset += read;
      i += read;
    }
    if (signed) {
      if (bits !== 32 && value & 1 << bits - 1) {
        value |= -1 ^ (1 << bits) - 1;
      }
      return value;
    }
    return value >>> 0;
  }
  setBits(offset, value, bits) {
    var available = this._view.length * 8 - offset;
    if (bits > available) {
      throw new Error("Cannot set " + bits + " bit(s) from offset " + offset + ", " + available + " available");
    }
    for (var i = 0;i < bits; ) {
      var remaining = bits - i;
      var bitOffset = offset & 7;
      var byteOffset = offset >> 3;
      var wrote = Math.min(remaining, 8 - bitOffset);
      var mask, writeBits, destMask;
      if (this.bigEndian) {
        mask = ~(~0 << wrote);
        writeBits = value >> bits - i - wrote & mask;
        var destShift = 8 - bitOffset - wrote;
        destMask = ~(mask << destShift);
        this._view[byteOffset] = this._view[byteOffset] & destMask | writeBits << destShift;
      } else {
        mask = ~(255 << wrote);
        writeBits = value & mask;
        value >>= wrote;
        destMask = ~(mask << bitOffset);
        this._view[byteOffset] = this._view[byteOffset] & destMask | writeBits << bitOffset;
      }
      offset += wrote;
      i += wrote;
    }
  }
  getBoolean(offset) {
    return this.getBits(offset, 1, false) !== 0;
  }
  getInt8(offset) {
    return this.getBits(offset, 8, true);
  }
  getUint8(offset) {
    return this.getBits(offset, 8, false);
  }
  getInt16(offset) {
    return this.getBits(offset, 16, true);
  }
  getUint16(offset) {
    return this.getBits(offset, 16, false);
  }
  getInt32(offset) {
    return this.getBits(offset, 32, true);
  }
  getUint32(offset) {
    return this.getBits(offset, 32, false);
  }
  getFloat32(offset) {
    BitView._scratch.setUint32(0, this.getUint32(offset));
    return BitView._scratch.getFloat32(0);
  }
  getFloat64(offset) {
    BitView._scratch.setUint32(0, this.getUint32(offset));
    BitView._scratch.setUint32(4, this.getUint32(offset + 32));
    return BitView._scratch.getFloat64(0);
  }
  setBoolean(offset, value) {
    this.setBits(offset, value ? 1 : 0, 1);
  }
  setInt8(offset, value) {
    this.setBits(offset, value, 8);
  }
  setUint8(offset, value) {
    this.setBits(offset, value, 8);
  }
  setInt16(offset, value) {
    this.setBits(offset, value, 16);
  }
  setUint16(offset, value) {
    this.setBits(offset, value, 16);
  }
  setInt32(offset, value) {
    this.setBits(offset, value, 32);
  }
  setUint32(offset, value) {
    this.setBits(offset, value, 32);
  }
  setFloat32(offset, value) {
    BitView._scratch.setFloat32(0, value);
    this.setBits(offset, BitView._scratch.getUint32(0), 32);
  }
  setFloat64(offset, value) {
    BitView._scratch.setFloat64(0, value);
    this.setBits(offset, BitView._scratch.getUint32(0), 32);
    this.setBits(offset + 32, BitView._scratch.getUint32(4), 32);
  }
  getArrayBuffer(offset, byteLength2) {
    var buffer = new Uint8Array(byteLength2);
    for (var i = 0;i < byteLength2; i++) {
      buffer[i] = this.getUint8(offset + i * 8);
    }
    return buffer;
  }
}
BitView._scratch = new DataView(new ArrayBuffer(8));
Object.defineProperty(BitView.prototype, "buffer", {
  get: function() {
    return typeof $Buffer !== "undefined" ? $Buffer.from(this._view.buffer) : this._view.buffer;
  },
  enumerable: true,
  configurable: false
});
Object.defineProperty(BitView.prototype, "byteLength", {
  get: function() {
    return this._view.length;
  },
  enumerable: true,
  configurable: false
});
var reader = function(name, size) {
  return function() {
    if (this._index + size > this._length) {
      throw new Error("Trying to read past the end of the stream");
    }
    var val = this._view[name](this._index);
    this._index += size;
    return val;
  };
};
var writer = function(name, size) {
  return function(value) {
    this._view[name](this._index, value);
    this._index += size;
  };
};
function readASCIIString(stream, bytes) {
  return readString(stream, bytes, false);
}
function readUTF8String(stream, bytes) {
  return readString(stream, bytes, true);
}
function readString(stream, bytes, utf8) {
  if (bytes === 0) {
    return "";
  }
  var i = 0;
  var chars = [];
  var append = true;
  var fixedLength = !!bytes;
  if (!bytes) {
    bytes = Math.floor((stream._length - stream._index) / 8);
  }
  while (i < bytes) {
    var c = stream.readUint8();
    if (c === 0) {
      append = false;
      if (!fixedLength) {
        break;
      }
    }
    if (append) {
      chars.push(c);
    }
    i++;
  }
  var string = String.fromCharCode.apply(null, chars);
  if (utf8) {
    try {
      return decodeURIComponent(escape(string));
    } catch (e) {
      return string;
    }
  } else {
    return string;
  }
}
function writeASCIIString(stream, string, bytes) {
  var length = bytes || string.length + 1;
  for (var i = 0;i < length; i++) {
    stream.writeUint8(i < string.length ? string.charCodeAt(i) : 0);
  }
}
function writeUTF8String(stream, string, bytes) {
  var byteArray = stringToByteArray(string);
  var length = bytes || byteArray.length + 1;
  for (var i = 0;i < length; i++) {
    stream.writeUint8(i < byteArray.length ? byteArray[i] : 0);
  }
}
function stringToByteArray(str) {
  var b = [], i, unicode;
  for (i = 0;i < str.length; i++) {
    unicode = str.charCodeAt(i);
    if (unicode <= 127) {
      b.push(unicode);
    } else if (unicode <= 2047) {
      b.push(unicode >> 6 | 192);
      b.push(unicode & 63 | 128);
    } else if (unicode <= 65535) {
      b.push(unicode >> 12 | 224);
      b.push(unicode >> 6 & 63 | 128);
      b.push(unicode & 63 | 128);
    } else {
      b.push(unicode >> 18 | 240);
      b.push(unicode >> 12 & 63 | 128);
      b.push(unicode >> 6 & 63 | 128);
      b.push(unicode & 63 | 128);
    }
  }
  return b;
}

class BitStream {
  constructor(source, byteOffset, byteLength2) {
    var isBuffer2 = source instanceof ArrayBuffer || typeof $Buffer !== "undefined" && source instanceof $Buffer;
    if (!(source instanceof BitView) && !isBuffer2) {
      throw new Error("Must specify a valid BitView, ArrayBuffer or Buffer");
    }
    if (isBuffer2) {
      this._view = new BitView(source, byteOffset, byteLength2);
    } else {
      this._view = source;
    }
    this._index = 0;
    this._startIndex = 0;
    this._length = this._view.byteLength * 8;
  }
  readBits(bits, signed) {
    var val = this._view.getBits(this._index, bits, signed);
    this._index += bits;
    return val;
  }
  writeBits(value, bits) {
    this._view.setBits(this._index, value, bits);
    this._index += bits;
  }
  readASCIIString(bytes) {
    return readASCIIString(this, bytes);
  }
  readUTF8String(bytes) {
    return readUTF8String(this, bytes);
  }
  writeASCIIString(string, bytes) {
    writeASCIIString(this, string, bytes);
  }
  writeUTF8String(string, bytes) {
    writeUTF8String(this, string, bytes);
  }
  readBitStream(bitLength) {
    var slice2 = new BitStream(this._view);
    slice2._startIndex = this._index;
    slice2._index = this._index;
    slice2.length = bitLength;
    this._index += bitLength;
    return slice2;
  }
  writeBitStream(stream, length) {
    if (!length) {
      length = stream.bitsLeft;
    }
    var bitsToWrite;
    while (length > 0) {
      bitsToWrite = Math.min(length, 32);
      this.writeBits(stream.readBits(bitsToWrite), bitsToWrite);
      length -= bitsToWrite;
    }
  }
  readArrayBuffer(byteLength2) {
    var buffer = this._view.getArrayBuffer(this._index, byteLength2);
    this._index += byteLength2 * 8;
    return buffer;
  }
  writeArrayBuffer(buffer, byteLength2) {
    this.writeBitStream(new BitStream(buffer), byteLength2 * 8);
  }
}
Object.defineProperty(BitStream.prototype, "index", {
  get: function() {
    return this._index - this._startIndex;
  },
  set: function(val) {
    this._index = val + this._startIndex;
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(BitStream.prototype, "length", {
  get: function() {
    return this._length - this._startIndex;
  },
  set: function(val) {
    this._length = val + this._startIndex;
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(BitStream.prototype, "bitsLeft", {
  get: function() {
    return this._length - this._index;
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(BitStream.prototype, "byteIndex", {
  get: function() {
    return Math.ceil(this._index / 8);
  },
  set: function(val) {
    this._index = val * 8;
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(BitStream.prototype, "buffer", {
  get: function() {
    return this._view.buffer;
  },
  enumerable: true,
  configurable: false
});
Object.defineProperty(BitStream.prototype, "view", {
  get: function() {
    return this._view;
  },
  enumerable: true,
  configurable: false
});
Object.defineProperty(BitStream.prototype, "bigEndian", {
  get: function() {
    return this._view.bigEndian;
  },
  set: function(val) {
    this._view.bigEndian = val;
  },
  enumerable: true,
  configurable: false
});
BitStream.prototype.readBoolean = reader("getBoolean", 1);
BitStream.prototype.readInt8 = reader("getInt8", 8);
BitStream.prototype.readUint8 = reader("getUint8", 8);
BitStream.prototype.readInt16 = reader("getInt16", 16);
BitStream.prototype.readUint16 = reader("getUint16", 16);
BitStream.prototype.readInt32 = reader("getInt32", 32);
BitStream.prototype.readUint32 = reader("getUint32", 32);
BitStream.prototype.readFloat32 = reader("getFloat32", 32);
BitStream.prototype.readFloat64 = reader("getFloat64", 64);
BitStream.prototype.writeBoolean = writer("setBoolean", 1);
BitStream.prototype.writeInt8 = writer("setInt8", 8);
BitStream.prototype.writeUint8 = writer("setUint8", 8);
BitStream.prototype.writeInt16 = writer("setInt16", 16);
BitStream.prototype.writeUint16 = writer("setUint16", 16);
BitStream.prototype.writeInt32 = writer("setInt32", 32);
BitStream.prototype.writeUint32 = writer("setUint32", 32);
BitStream.prototype.writeFloat32 = writer("setFloat32", 32);
BitStream.prototype.writeFloat64 = writer("setFloat64", 64);

// mii-creator/src/external/mii-js/extendedBitStream.ts
class ExtendedBitStream extends BitStream {
  constructor(buffer) {
    super(buffer, buffer.byteOffset, buffer.byteLength);
  }
  swapEndian() {
    this.bigEndian = !this.bigEndian;
  }
  alignByte() {
    const nextClosestByteIndex = 8 * Math.ceil(this._index / 8);
    const bitDistance = nextClosestByteIndex - this._index;
    this.skipBits(bitDistance);
  }
  bitSeek(bitPos) {
    this._index = bitPos;
  }
  skipBits(bitCount) {
    this._index += bitCount;
  }
  skipBytes(bytes) {
    const bits = bytes * 8;
    this.skipBits(bits);
  }
  skipBit() {
    this.skipBits(1);
  }
  skipInt8() {
    this.skipBytes(1);
  }
  skipInt16() {
    this.skipBytes(2);
  }
  readBit() {
    return this.readBits(1);
  }
  readBytes(length) {
    return Array(length).fill(0).map(() => this.readUint8());
  }
  readBuffer(length) {
    return $Buffer.from(this.readBytes(length));
  }
  readUTF16String(length) {
    return this.readBuffer(length).toString("utf16le").replace(/\0.*$/, "");
  }
  writeBit(bit) {
    this.writeBits(bit, 1);
  }
  writeBuffer(buffer) {
    buffer.forEach((byte) => this.writeUint8(byte));
  }
  writeUTF16String(string) {
    const stringBuffer = $Buffer.from(string, "utf16le");
    const terminatedBuffer = $Buffer.alloc(20);
    stringBuffer.copy(terminatedBuffer);
    this.writeBuffer(terminatedBuffer);
  }
}

// mii-creator/src/external/mii-js/util.ts
class Util {
  static inRange(val, range) {
    return range.includes(val);
  }
  static clamp(val, min, max) {
    if (max === undefined) {
      max = min;
      min = 0;
    }
    return Math.min(Math.max(val, min), max);
  }
  static range(start, end) {
    if (end === undefined) {
      end = start;
      start = 0;
    }
    return Array.from({ length: end - start }, (_, i) => i + start);
  }
}

// mii-creator/src/external/mii-js/mii.ts
var import_assert = __toESM(require_assert(), 1);

// mii-creator/src/config.ts
var useRendererServer = true;
var fflResourcePath = "FFLResHigh.dat";
var baseURL = "https://mii-renderer.nxw.pw/miis/image";
var newApiParams = true;
var nnidFetchOrigin = "https://mii-unsecure.ariankordi.net";
var Config = {
  renderer: {
    baseURL,
    useRendererServer,
    fflResourcePath,
    renderFFLMakeIcon: `${baseURL}.webp?shaderType=miitomo&type=fflmakeicon&width=360&verifyCharInfo=0`,
    renderHeadshotURL: `${baseURL}.webp?shaderType=wiiu&type=face&width=260&verifyCharInfo=0`,
    renderHeadshotURLNoParams: `${baseURL}.webp`,
    renderFullBodyURL: `${baseURL}.webp?shaderType=wiiu&type=all_body_sugar&width=420&verifyCharInfo=0&scale=1`,
    renderFullBodyAltURL: `${baseURL}.webp?shaderType=wiiu&type=all_body_sugar&width=960&verifyCharInfo=0&scale=1`,
    render3DHeadURL: `${baseURL}.glb?shaderType=wiiu&type=face&width=260&verifyCharInfo=0`,
    renderFaceURL: `${baseURL}.webp?scale=1&drawStageMode=mask_only&verifyCharInfo=0`,
    hatTypeParam: newApiParams ? "headwearIndex" : "hatType",
    hatTypeAdd: newApiParams ? 0 : 0,
    hatColorParam: newApiParams ? "headwearColor" : "hatColor",
    hatColorAdd: newApiParams ? -1 : 0,
    allow3DMode: true
  },
  apis: {
    nnidRandomURL: `${nnidFetchOrigin}/mii_data_random`,
    nnidFetchURL: (nnid) => `${nnidFetchOrigin}/mii_data/${nnid}`,
    pnidFetchURL: (pnid) => `${nnidFetchOrigin}/mii_data/${pnid}?api_id=1`,
    useSentry: false,
    sentryURL: "ENTER_SENTRY_URL_HERE"
  },
  mii: {
    scalingMode: "scaleApply"
  },
  version: {
    string: "v0.9.3.1",
    name: "Patch Update",
    changelog: `
    <h1 style="font-size: 20px;text-align: center;">v0.9.2 - QR Code and MiiC v3 Support</h1>

    <div class="flex-group">
      <img draggable="false" width=96 height=96 src="https://i.imgur.com/sMtNF5a.webp">
      <div class="col" style="gap:12px">
        <small>Austin☆²¹ / Kat21</small>
        <div>Let's go over the new changes!</div>
      </div>
    </div>

    <div style="text-align:center;margin:12px 0">
      <p style="margin-bottom:0"><strong style="color:var(--error-color)">Please <a target="_blank" href="mailto:datkat21.yt@gmail.com">contact me</a> <small>(kat21)</small> if you have any feedback, feature requests, or bug reports.</strong></p>
      <small>(Some people are just not aware that kat21 made this app, not ariankordi. if you are one of those people you should know by now. Also this project is named "Mii Creator", not "Mii Creator Web," or any other "mii maker" thing. \uD83D\uDE42)</small>
    </div>
    
    <h3>NEW: v0.9.3.1 - Extremely Small Patch Update</h3>
    <ul style="display:flex;flex-direction:column;gap:8px;line-height:1.75rem">
      <li>Testing bringing back 3D mode, let's see how the server performs...</li>
    </ul>
    <h3>NEW: v0.9.3 - Very Small Patch Update</h3>
    <ul style="display:flex;flex-direction:column;gap:8px;line-height:1.75rem">
      <li style="color:var(--error-color)"><s>Temporarily disabled 3D mode in the editor to save on bandwidth while I try and work around a solution</s></li>
      <li style="color:var(--selection-color)">A lot of people are coming from FlipZ's tweet but that's OK, just know that I (kat21) made this website because the credit wasn't very clear</li>
    </ul>
    <h3>v0.9.2 - Small Patch Update</h3>
    <ul style="display:flex;flex-direction:column;gap:8px;line-height:1.75rem">
      <li style="color:var(--selection-color)">A LOT of new faces have shown up over the past few days, if you come from X/Twitter or YouTube, say hi!</li>
      <li>Some hat models have been improved! Beanie, cap and cat ears were properly fixed.</li>
      <li>2D renders now show hat textures!</li>
      <li>Some broken expressions (blank face, cat face, dog face) work now</li>
      <li>Bug fix Tomodachi Life QR codes not displaying the error message (they still do not work do not ask me about this)</li>
      <li>Bug fix hats clipping the mask</li>
      <li style="color:var(--gold-color)">More secret Special Miis added!</li>
    </ul>

    <h3>v0.9.1 - Patch Update</h3>

    <ul style="display:flex;flex-direction:column;gap:8px;line-height:1.75rem">
      <li>Bug fix the contact menu not closing</li>
      <li>Wii U theme small design tweaks to fix some stuff broken by the new UI</li>
      <li>Rename "Glossy" shader to "Toon"</li>
      <li>Fix a bug where the Wii U animations were sped up.</li>
      <li style="color:var(--gold-color)">Secret Special Miis can be obtained through random menus (there is only 1 for now)</li>
    </ul>

    <h3>The new changes</h3>

    <ul style="display:flex;flex-direction:column;gap:8px;line-height:1.75rem">
      <li>Update Mii Creator file format to version 3, still haven't decided the final feature to add to the miis to fill that last byte, my original idea was probably custom shirt color but that sounds a little bit boring.</li>
      <ul>
        <li>The "face paint" feature for changing color of the head (I really thought it was called face paint in Miitopia, but checking again it is called "foundation")</li>
      </ul>
      <li>I was testing default light direction previously but it looked a bit.. odd, so I got rid of it, if you want it as an option let me know</li>
      <li>Add some new shader options (a few new ones based on the FFL shader)</li>
      <li>Update readme and preview image</li>
      <li>New way of displaying app updates (you're reading one right now)</li>
      <li>Added my contact information inside the app! <small>(please email me about problems \uD83E\uDD7A)</small></li>
      <li>Subtle loading sound when each mii image loads in like the switch mii editor applet, just for fun</li>
      <li>Functional QR code scanning</li>
      <ul>
        <li>It works with Wii U/3DS and mii creator qr codes, but unfortunately does not have fully compatibility with tomodachi life ones due to a weird bug where it isn't decrypting the extra data properly. The code to handle it is there, and once I find a fix, it will fully work with those Tomodachi Life Mii QR codes.</li>
        <li>Camera scanning has a bug when you move away from the tab while scanning, don't do that</li>
      </ul>
      <li>The icons subtly change shader/body model in the background as you change the shader type or body model setting</li>
      <li>Fixed most issues relating to the library duplication bugs by making it a single shutdown function</li>
      <li>Display a version string in the sidebar on the main menu, (also helps to know which update you're on)</li>
      <li>Miscellaneous settings related to QR code scanning</li>
      <ul>
        <li>Ability to disable closing of the QR code menu after you scan a QR code (the library will still refresh in the background if you click 'save')</li>
        <li>Ability to completely disable camera for the QR scanner, so it just becomes a file input</li>
      </ul>
      <li>Fix a possible memory leak with the particle effects</li>
      <li>Add Miitomo body model and animations</li>
      <li>Option to color the hands like in Miitomo</li>
      <li>Much more control in the custom render menu</li>
      <li>Green-screen and other solid color background options for the custom render menu in Settings</li>
      <li>Fix glTF textures exported using Wii U shader</li>
      <li>And probably some more small changes that should improve the user experience</li>
    </ul>
 
    <h3>Plans</h3>
    <ul style="display:flex;flex-direction:column;gap:8px;line-height:1.75rem">
      <li>More theme options</li>
      <li>Online account system for saving your mii data across devices</li>
    </ul>

    <h3>Attributions / Acknowledgements</h5>

    <p>These people helped me with the new update!</p>

    <div class="flex-group" style="justify-content:flex-start">
      <div class="flex-group" style="gap:0px;justify-content:flex-start">
        <img draggable="false" width=96 height=96 src="${baseURL}.webp?type=variableiconbody&data=080037030d020531020c030105040a0209000001000a011004010b0100662f04000214031603140d04000a020109&shaderType=switch&width=96&source=update&characterYRotate=8&bodyType=switch">
        <div class="col" style="gap:12px;flex:1">
          <small>Arian <a href="https://github.com/ariankordi">(@ariankordi)</a></small>
          <div>Wrote code for the new QR code feature, helped with Git, debugging, advice</div>
        </div>
      </div>
      <div class="flex-group" style="gap:0px;justify-content:flex-start">
        <img draggable="false" width=96 height=96 src="${baseURL}.webp?type=variableiconbody&data=00070e3c4554575c616c6872818b909da0b1b7bec3cad0d78f93a1b1c0c78ce8f0f8fdf2f8f3f7ebebf6fdfcfffffb&shaderType=switch&width=96&source=update&characterYRotate=8&bodyType=switch">
        <div class="col" style="gap:12px;flex:1">
          <small>Timothy <a href="https://github.com/Timiimiimii">(@Timimimi)</a></small>
          <div>Implemented the new <code>.charinfo</code> <a href="https://github.com/datkat21/mii-creator/pull/15">export format</a></div>
        </div>
      </div>
      <div class="flex-group" style="gap:0px;justify-content:flex-start">
        <img draggable="false" width=96 height=96 src="${baseURL}.webp?type=variableiconbody&data=00070e3b3f3c4649555e5c6675777a7a7f7e818890979ea5b4b7bebbbac188bdc6ced4ccd6cccfe3f5f8fffcff0513&shaderType=switch&width=96&source=update&characterYRotate=8&bodyType=switch">
        <div class="col" style="gap:12px;flex:1">
          <small>obj <a href="https://x.com/objecty_twitt">(@objecty)</a></small>
          <div>Helped with designing some new icons</div>
        </div>
      </div>
      <div class="flex-group" style="gap:0px;justify-content:flex-start">
        <img draggable="false" width=96 height=96 src="${baseURL}.webp?type=variableiconbody&data=0800450308040402020c0308060406020a0001000006000804000a0800326702010314031304190d04000a040109&shaderType=switch&width=96&source=update&characterYRotate=8&bodyType=switch">
        <div class="col" style="gap:12px;flex:1">
          <small>David J. <a href="https://x.com/dwyazzo90">(@dwyazzo90)</a></small>
          <div>Provided suggestions and ideas</div>
        </div>
      </div>
      <div class="flex-group" style="gap:0px;justify-content:flex-start">
        <img draggable="false" width=96 height=96 src="${baseURL}.webp?type=variableiconbody&data=00070e283208131d43484b524c515a5a606f75838a919ea5b4b7bebbb3ba8bced1d8e1fc03171d191b262d2e313745&shaderType=switch&width=96&source=update&characterYRotate=8&bodyType=switch">
        <div class="col" style="gap:12px;flex:1">
          <small>justcamtro <a href="https://x.com/justcamtro">(@justcamtro)</a></small>
          <div>Tested the new update and gave feedback</div>
        </div>
      </div>
    </div>

    <p style="margin-bottom:0;text-align:center"><strong>You can view this message again in Settings.</strong></p>
    `
  }
};

// mii-creator/src/constants/ColorTables.ts
var ToVer3GlassTypeTable = [
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  1,
  2,
  1,
  3,
  7,
  7,
  6,
  7,
  8,
  7,
  7
];
var ToVer3HairColorTable = [
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  0,
  4,
  3,
  5,
  4,
  4,
  6,
  2,
  0,
  6,
  4,
  3,
  2,
  2,
  7,
  3,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  0,
  0,
  4,
  4,
  4,
  4,
  4,
  4,
  0,
  0,
  0,
  4,
  4,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  5,
  7,
  5,
  7,
  7,
  7,
  7,
  7,
  6,
  7,
  7,
  7,
  7,
  7,
  3,
  7,
  7,
  7,
  7,
  7,
  0,
  4,
  4,
  4,
  4
];
var ToVer3EyeColorTable = [
  0,
  2,
  2,
  2,
  1,
  3,
  2,
  3,
  0,
  1,
  2,
  3,
  4,
  5,
  2,
  2,
  4,
  2,
  1,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  0,
  0,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  1,
  0,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  0,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  2,
  2,
  3,
  3,
  3,
  3,
  2,
  2,
  2,
  2,
  2,
  1,
  1,
  1,
  1,
  1,
  1
];
var ToVer3GlassColorTable = [
  0,
  1,
  1,
  1,
  5,
  1,
  1,
  4,
  0,
  5,
  1,
  1,
  3,
  5,
  1,
  2,
  3,
  4,
  5,
  4,
  2,
  2,
  4,
  4,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  3,
  0,
  0,
  0,
  5,
  5,
  5,
  5,
  5,
  5,
  0,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  1,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  5,
  5
];
var ToVer3FacelineColorTable = [0, 1, 2, 3, 4, 5, 0, 1, 5, 5];

// mii-creator/src/util/Numbers.ts
var RandomInt = (max) => Math.floor(Math.random() * max);

// mii-creator/src/external/mii-js/mii.ts
var STUDIO_RENDER_URL_BASE = Config.renderer.baseURL;
var STUDIO_ASSET_URL_BASE = "https://mii-studio.akamaized.net/editor/1";
var STUDIO_ASSET_FILE_TYPE = "webp";
var STUDIO_RENDER_DEFAULTS = {
  type: "face",
  expression: "normal",
  width: 96,
  bgColor: "FFFFFF00",
  clothesColor: "default",
  cameraXRotate: 0,
  cameraYRotate: 0,
  cameraZRotate: 0,
  characterXRotate: 0,
  characterYRotate: 0,
  characterZRotate: 0,
  lightXDirection: 0,
  lightYDirection: 0,
  lightZDirection: 0,
  lightDirectionMode: "none",
  splitMode: "none",
  instanceCount: 1,
  instanceRotationMode: "model"
};
var STUDIO_RENDER_TYPES = ["face", "face_only", "all_body"];
var STUDIO_RENDER_EXPRESSIONS = [
  "normal",
  "smile",
  "anger",
  "sorrow",
  "surprise",
  "blink",
  "normal_open_mouth",
  "smile_open_mouth",
  "anger_open_mouth",
  "surprise_open_mouth",
  "sorrow_open_mouth",
  "blink_open_mouth",
  "wink_left",
  "wink_right",
  "wink_left_open_mouth",
  "wink_right_open_mouth",
  "like_wink_left",
  "like_wink_right",
  "frustrated"
];
var STUDIO_RENDER_CLOTHES_COLORS = [
  "default",
  "red",
  "orange",
  "yellow",
  "yellowgreen",
  "green",
  "blue",
  "skyblue",
  "pink",
  "purple",
  "brown",
  "white",
  "black"
];
var STUDIO_RENDER_LIGHT_DIRECTION_MODES = [
  "none",
  "zerox",
  "flipx",
  "camera",
  "offset",
  "set"
];
var STUDIO_SPLIT_MODES = [
  "none",
  "front",
  "back",
  "both"
];
var STUDIO_RENDER_INSTANCE_ROTATION_MODES = ["model", "camera", "both"];
var STUDIO_BG_COLOR_REGEX = /^[0-9A-F]{8}$/;

class Mii {
  bitStream;
  version;
  allowCopying;
  profanityFlag;
  regionLock;
  characterSet;
  pageIndex;
  slotIndex;
  unknown1;
  deviceOrigin;
  systemId;
  normalMii;
  dsMii;
  nonUserMii;
  isValid;
  creationTime;
  consoleMAC;
  gender;
  birthMonth;
  birthDay;
  favoriteColor;
  favorite;
  miiName;
  height;
  build;
  disableSharing;
  faceType;
  fflSkinColor;
  trueSkinColor;
  get skinColor() {
    return this.trueSkinColor;
  }
  set skinColor(num) {
    if (num > 5) {
      this.fflSkinColor = ToVer3FacelineColorTable[num];
      this.extFacelineColor = num;
      this.trueSkinColor = num;
    } else {
      this.fflSkinColor = num;
      this.extFacelineColor = 0;
      this.trueSkinColor = num;
    }
  }
  wrinklesType;
  makeupType;
  hairType;
  fflHairColor;
  trueHairColor;
  get hairColor() {
    return this.trueHairColor;
  }
  set hairColor(num) {
    if (num > 7) {
      console.log("hair color:", num, num - 8);
      this.fflHairColor = ToVer3HairColorTable[num - 8];
      this.extHairColor = num - 8;
      this.trueHairColor = num - 8;
    } else {
      this.fflHairColor = num;
      this.extHairColor = 0;
      this.trueHairColor = num;
    }
  }
  flipHair;
  eyeType;
  fflEyeColor;
  trueEyeColor;
  get eyeColor() {
    return this.trueEyeColor;
  }
  set eyeColor(num) {
    if (num > 5) {
      this.fflEyeColor = ToVer3EyeColorTable[num - 6];
      this.extEyeColor = num - 6;
      this.trueEyeColor = num;
    } else {
      this.fflEyeColor = num;
      if (num === 0) {
        this.extEyeColor = 8;
        this.trueEyeColor = 0;
      } else {
        this.extEyeColor = num + 8;
        this.trueEyeColor = num;
      }
    }
  }
  eyeScale;
  eyeVerticalStretch;
  eyeRotation;
  eyeSpacing;
  eyeYPosition;
  eyebrowType;
  fflEyebrowColor;
  trueEyebrowColor;
  get eyebrowColor() {
    return this.trueEyebrowColor;
  }
  set eyebrowColor(num) {
    if (num > 7) {
      this.fflEyebrowColor = ToVer3HairColorTable[num - 8];
      this.extEyebrowColor = num - 8;
      this.trueEyebrowColor = num - 8;
    } else {
      this.fflEyebrowColor = num;
      this.extEyebrowColor = 0;
      this.trueEyebrowColor = num;
    }
  }
  eyebrowScale;
  eyebrowVerticalStretch;
  eyebrowRotation;
  eyebrowSpacing;
  eyebrowYPosition;
  noseType;
  noseScale;
  noseYPosition;
  mouthType;
  fflMouthColor;
  trueMouthColor;
  get mouthColor() {
    return this.trueMouthColor;
  }
  set mouthColor(num) {
    if (num > 4) {
      this.fflMouthColor = ToVer3EyeColorTable[num - 5];
      this.extMouthColor = num - 5;
      this.trueMouthColor = num;
      if (this.fflMouthColor > 4)
        this.fflMouthColor = 4;
    } else {
      this.fflMouthColor = num;
      this.extMouthColor = num + 19;
      this.trueMouthColor = num;
    }
  }
  mouthScale;
  mouthHorizontalStretch;
  mouthYPosition;
  mustacheType;
  unknown2;
  beardType;
  fflFacialHairColor;
  trueFacialHairColor;
  get facialHairColor() {
    return this.trueFacialHairColor;
  }
  set facialHairColor(num) {
    if (num > 7) {
      this.fflFacialHairColor = ToVer3HairColorTable[num - 8];
      this.extBeardColor = num - 8;
      this.trueFacialHairColor = num - 8;
    } else {
      this.fflFacialHairColor = num;
      this.extBeardColor = 0;
      this.trueFacialHairColor = num;
    }
  }
  mustacheScale;
  mustacheYPosition;
  fflGlassesType;
  trueGlassesType;
  get glassesType() {
    return this.trueGlassesType;
  }
  set glassesType(num) {
    if (num > 8) {
      this.fflGlassesType = ToVer3GlassTypeTable[num - 9];
      this.extGlassType = num;
      this.trueGlassesType = num;
    } else {
      this.fflGlassesType = num;
      this.extGlassType = 0;
      this.trueGlassesType = num;
    }
  }
  fflGlassesColor;
  trueGlassesColor;
  get glassesColor() {
    return this.trueGlassesColor;
  }
  set glassesColor(num) {
    if (num > 5) {
      this.fflGlassesColor = ToVer3GlassColorTable[num - 6];
      this.extGlassColor = num - 6;
      this.trueGlassesColor = num - 6;
    } else {
      this.fflGlassesColor = num;
      this.extGlassColor = 0;
      this.trueGlassesColor = num;
    }
  }
  glassesScale;
  glassesYPosition;
  moleEnabled;
  moleScale;
  moleXPosition;
  moleYPosition;
  creatorName;
  checksum;
  extFacelineColor;
  extHairColor;
  extEyeColor;
  extEyebrowColor;
  extMouthColor;
  extBeardColor;
  extGlassColor;
  extGlassType;
  extHatType;
  extHatColor;
  extFacePaintColor;
  extShirtColor;
  initBuffer;
  constructor(buffer) {
    this.isMiiCData = false;
    if (buffer.byteLength === 96) {
      this.bitStream = new ExtendedBitStream($Buffer.concat([buffer, new Uint8Array(12)]));
    } else {
      const bytesToAdd = 108 - buffer.byteLength;
      let tmpBuf;
      if (bytesToAdd > 0) {
        tmpBuf = $Buffer.concat([buffer, new Uint8Array(bytesToAdd)]);
      } else {
        tmpBuf = buffer;
      }
      this.bitStream = new ExtendedBitStream(tmpBuf);
      if (buffer.byteLength > 96)
        this.isMiiCData = true;
    }
    this.initBuffer = buffer;
    this.decode();
  }
  isMiiCData;
  hasExtendedColors() {
    if (this.trueEyeColor > 5 || this.trueEyebrowColor > 7 || this.trueFacialHairColor > 7 || this.trueGlassesColor > 5 || this.trueGlassesType > 8 || this.trueHairColor > 7 || this.trueMouthColor > 4 || this.trueSkinColor > 5)
      return true;
    return false;
  }
  validate() {
    import_assert.default.ok(Util.inRange(this.bitStream.length / 8, [
      96,
      104,
      105,
      106,
      108
    ]), `Invalid Mii data size. Got ${this.bitStream.length / 8}, expected 96 for FFSD, 104 for MiiC v1, or 106 for MiiC v2, or 108 for MiiC v3.`);
    import_assert.default.ok(this.version === 0 || this.version === 3, `Invalid Mii version. Got ${this.version}, expected 0 or 3`);
    import_assert.default.strictEqual(typeof this.allowCopying, "boolean", `Invalid Mii allow copying. Got ${this.allowCopying}, expected true or false`);
    import_assert.default.strictEqual(typeof this.profanityFlag, "boolean", `Invalid Mii profanity flag. Got ${this.profanityFlag}, expected true or false`);
    import_assert.default.ok(Util.inRange(this.regionLock, Util.range(4)), `Invalid Mii region lock. Got ${this.regionLock}, expected 0-3`);
    import_assert.default.ok(Util.inRange(this.characterSet, Util.range(4)), `Invalid Mii region lock. Got ${this.characterSet}, expected 0-3`);
    import_assert.default.ok(Util.inRange(this.pageIndex, Util.range(10)), `Invalid Mii page index. Got ${this.pageIndex}, expected 0-9`);
    import_assert.default.ok(Util.inRange(this.slotIndex, Util.range(10)), `Invalid Mii slot index. Got ${this.slotIndex}, expected 0-9`);
    import_assert.default.ok(Util.inRange(this.deviceOrigin, Util.range(0, 5)), `Invalid Mii device origin. Got ${this.deviceOrigin}, expected 1-4`);
    import_assert.default.strictEqual(this.systemId.length, 8, `Invalid Mii system ID size. Got ${this.systemId.length}, system IDs must be 8 bytes long`);
    import_assert.default.strictEqual(typeof this.normalMii, "boolean", `Invalid normal Mii flag. Got ${this.normalMii}, expected true or false`);
    import_assert.default.strictEqual(typeof this.dsMii, "boolean", `Invalid DS Mii flag. Got ${this.dsMii}, expected true or false`);
    import_assert.default.strictEqual(typeof this.nonUserMii, "boolean", `Invalid non-user Mii flag. Got ${this.nonUserMii}, expected true or false`);
    import_assert.default.strictEqual(typeof this.isValid, "boolean", `Invalid Mii valid flag. Got ${this.isValid}, expected true or false`);
    import_assert.default.ok(this.creationTime < 268435456, `Invalid Mii creation time. Got ${this.creationTime}, max value for 28 bit integer is 268,435,456`);
    import_assert.default.strictEqual(this.consoleMAC.length, 6, `Invalid Mii console MAC address size. Got ${this.consoleMAC.length}, console MAC addresses must be 6 bytes long`);
    import_assert.default.ok(Util.inRange(this.gender, Util.range(2)), `Invalid Mii gender. Got ${this.gender}, expected 0 or 1`);
    import_assert.default.ok(Util.inRange(this.birthMonth, Util.range(13)), `Invalid Mii birth month. Got ${this.birthMonth}, expected 0-12`);
    import_assert.default.ok(Util.inRange(this.birthDay, Util.range(32)), `Invalid Mii birth day. Got ${this.birthDay}, expected 0-31`);
    import_assert.default.ok(Util.inRange(this.favoriteColor, Util.range(12)), `Invalid Mii favorite color. Got ${this.favoriteColor}, expected 0-11`);
    import_assert.default.strictEqual(typeof this.favorite, "boolean", `Invalid favorite Mii flag. Got ${this.favorite}, expected true or false`);
    import_assert.default.ok($Buffer.from(this.miiName, "utf16le").length <= 20, `Invalid Mii name. Got ${this.miiName}, name may only be up to 10 characters`);
    import_assert.default.ok(Util.inRange(this.height, Util.range(128)), `Invalid Mii height. Got ${this.height}, expected 0-127`);
    import_assert.default.ok(Util.inRange(this.build, Util.range(128)), `Invalid Mii build. Got ${this.build}, expected 0-127`);
    import_assert.default.strictEqual(typeof this.disableSharing, "boolean", `Invalid disable sharing Mii flag. Got ${this.disableSharing}, expected true or false`);
    import_assert.default.ok(Util.inRange(this.faceType, Util.range(12)), `Invalid Mii face type. Got ${this.faceType}, expected 0-11`);
    import_assert.default.ok(Util.inRange(this.skinColor, Util.range(1000)), `Invalid Mii skin color. Got ${this.skinColor}, expected 0-10`);
    import_assert.default.ok(Util.inRange(this.extFacePaintColor, Util.range(110)), `Invalid Mii face paint color. Got ${this.skinColor}, expected 0-109`);
    import_assert.default.ok(Util.inRange(this.wrinklesType, Util.range(12)), `Invalid Mii wrinkles type. Got ${this.wrinklesType}, expected 0-11`);
    import_assert.default.ok(Util.inRange(this.makeupType, Util.range(12)), `Invalid Mii makeup type. Got ${this.makeupType}, expected 0-11`);
    import_assert.default.ok(Util.inRange(this.hairType, Util.range(132)), `Invalid Mii hair type. Got ${this.hairType}, expected 0-131`);
    import_assert.default.ok(Util.inRange(this.fflHairColor, Util.range(100)), `Invalid Mii hair color. Got ${this.fflHairColor}, expected 0-7`);
    import_assert.default.strictEqual(typeof this.flipHair, "boolean", `Invalid flip hair flag. Got ${this.flipHair}, expected true or false`);
    import_assert.default.ok(Util.inRange(this.eyeType, Util.range(60)), `Invalid Mii eye type. Got ${this.eyeType}, expected 0-59`);
    import_assert.default.ok(Util.inRange(this.fflEyeColor, Util.range(6)), `Invalid Mii eye color. Got ${this.fflEyeColor}, expected 0-5`);
    import_assert.default.ok(Util.inRange(this.eyeScale, Util.range(8)), `Invalid Mii eye scale. Got ${this.eyeScale}, expected 0-7`);
    import_assert.default.ok(Util.inRange(this.eyeVerticalStretch, Util.range(7)), `Invalid Mii eye vertical stretch. Got ${this.eyeVerticalStretch}, expected 0-6`);
    import_assert.default.ok(Util.inRange(this.eyeRotation, Util.range(8)), `Invalid Mii eye rotation. Got ${this.eyeRotation}, expected 0-7`);
    import_assert.default.ok(Util.inRange(this.eyeSpacing, Util.range(13)), `Invalid Mii eye spacing. Got ${this.eyeSpacing}, expected 0-12`);
    import_assert.default.ok(Util.inRange(this.eyeYPosition, Util.range(19)), `Invalid Mii eye Y position. Got ${this.eyeYPosition}, expected 0-18`);
    import_assert.default.ok(Util.inRange(this.eyebrowType, Util.range(24)), `Invalid Mii eyebrow type. Got ${this.eyebrowType}, expected 0-24`);
    import_assert.default.ok(Util.inRange(this.fflEyebrowColor, Util.range(8)), `Invalid Mii eyebrow color. Got ${this.fflEyebrowColor}, expected 0-7`);
    import_assert.default.ok(Util.inRange(this.eyebrowScale, Util.range(9)), `Invalid Mii eyebrow scale. Got ${this.eyebrowScale}, expected 0-8`);
    import_assert.default.ok(Util.inRange(this.eyebrowVerticalStretch, Util.range(7)), `Invalid Mii eyebrow vertical stretch. Got ${this.eyebrowVerticalStretch}, expected 0-6`);
    import_assert.default.ok(Util.inRange(this.eyebrowRotation, Util.range(12)), `Invalid Mii eyebrow rotation. Got ${this.eyebrowRotation}, expected 0-11`);
    import_assert.default.ok(Util.inRange(this.eyebrowSpacing, Util.range(13)), `Invalid Mii eyebrow spacing. Got ${this.eyebrowSpacing}, expected 0-12`);
    import_assert.default.ok(Util.inRange(this.eyebrowYPosition, Util.range(3, 19)), `Invalid Mii eyebrow Y position. Got ${this.eyebrowYPosition}, expected 3-18`);
    import_assert.default.ok(Util.inRange(this.noseType, Util.range(18)), `Invalid Mii nose type. Got ${this.noseType}, expected 0-17`);
    import_assert.default.ok(Util.inRange(this.noseScale, Util.range(9)), `Invalid Mii nose scale. Got ${this.noseScale}, expected 0-8`);
    import_assert.default.ok(Util.inRange(this.noseYPosition, Util.range(19)), `Invalid Mii nose Y position. Got ${this.noseYPosition}, expected 0-18`);
    import_assert.default.ok(Util.inRange(this.mouthType, Util.range(36)), `Invalid Mii mouth type. Got ${this.mouthType}, expected 0-35`);
    import_assert.default.ok(Util.inRange(this.fflMouthColor, Util.range(5)), `Invalid Mii mouth color. Got ${this.fflMouthColor}, expected 0-4`);
    import_assert.default.ok(Util.inRange(this.mouthScale, Util.range(9)), `Invalid Mii mouth scale. Got ${this.mouthScale}, expected 0-8`);
    import_assert.default.ok(Util.inRange(this.mouthHorizontalStretch, Util.range(7)), `Invalid Mii mouth stretch. Got ${this.mouthHorizontalStretch}, expected 0-6`);
    import_assert.default.ok(Util.inRange(this.mouthYPosition, Util.range(19)), `Invalid Mii mouth Y position. Got ${this.mouthYPosition}, expected 0-18`);
    import_assert.default.ok(Util.inRange(this.mustacheType, Util.range(6)), `Invalid Mii mustache type. Got ${this.mustacheType}, expected 0-5`);
    import_assert.default.ok(Util.inRange(this.beardType, Util.range(6)), `Invalid Mii beard type. Got ${this.beardType}, expected 0-5`);
    import_assert.default.ok(Util.inRange(this.fflFacialHairColor, Util.range(8)), `Invalid Mii beard type. Got ${this.fflFacialHairColor}, expected 0-7`);
    import_assert.default.ok(Util.inRange(this.mustacheScale, Util.range(9)), `Invalid Mii mustache scale. Got ${this.mustacheScale}, expected 0-8`);
    import_assert.default.ok(Util.inRange(this.mustacheYPosition, Util.range(17)), `Invalid Mii mustache Y position. Got ${this.mustacheYPosition}, expected 0-16`);
    import_assert.default.ok(Util.inRange(this.fflGlassesType, Util.range(9)), `Invalid Mii glasses type. Got ${this.fflGlassesType}, expected 0-8`);
    import_assert.default.ok(Util.inRange(this.fflGlassesColor, Util.range(100)), `Invalid Mii glasses color. Got ${this.fflGlassesColor}, expected 0-5`);
    import_assert.default.ok(Util.inRange(this.glassesScale, Util.range(8)), `Invalid Mii glasses scale. Got ${this.glassesScale}, expected 0-7`);
    import_assert.default.ok(Util.inRange(this.glassesYPosition, Util.range(21)), `Invalid Mii glasses Y position. Got ${this.glassesYPosition}, expected 0-20`);
    import_assert.default.strictEqual(typeof this.moleEnabled, "boolean", `Invalid mole enabled flag. Got ${this.moleEnabled}, expected true or false`);
    import_assert.default.ok(Util.inRange(this.moleScale, Util.range(9)), `Invalid Mii mole scale. Got ${this.moleScale}, expected 0-8`);
    import_assert.default.ok(Util.inRange(this.moleXPosition, Util.range(17)), `Invalid Mii mole X position. Got ${this.moleXPosition}, expected 0-16`);
    import_assert.default.ok(Util.inRange(this.moleYPosition, Util.range(31)), `Invalid Mii mole Y position. Got ${this.moleYPosition}, expected 0-30`);
    if (this.nonUserMii && (this.creationTime !== 0 || this.isValid || this.dsMii || this.normalMii)) {
      import_assert.default.fail("Non-user Mii's must have all other Mii ID bits set to 0");
    }
    if (!this.normalMii && !this.disableSharing) {
      import_assert.default.fail("Special Miis must have sharing disabled");
    }
  }
  decode() {
    this.version = this.bitStream.readUint8();
    this.allowCopying = this.bitStream.readBoolean();
    this.profanityFlag = this.bitStream.readBoolean();
    this.regionLock = this.bitStream.readBits(2);
    this.characterSet = this.bitStream.readBits(2);
    this.bitStream.alignByte();
    this.pageIndex = this.bitStream.readBits(4);
    this.slotIndex = this.bitStream.readBits(4);
    this.unknown1 = this.bitStream.readBits(4);
    this.deviceOrigin = this.bitStream.readBits(3);
    this.bitStream.alignByte();
    this.systemId = this.bitStream.readBuffer(8);
    this.bitStream.swapEndian();
    this.normalMii = this.bitStream.readBoolean();
    this.dsMii = this.bitStream.readBoolean();
    this.nonUserMii = this.bitStream.readBoolean();
    this.isValid = this.bitStream.readBoolean();
    this.creationTime = this.bitStream.readBits(28);
    this.bitStream.swapEndian();
    this.consoleMAC = this.bitStream.readBuffer(6);
    this.bitStream.skipInt16();
    this.gender = this.bitStream.readBit();
    this.birthMonth = this.bitStream.readBits(4);
    this.birthDay = this.bitStream.readBits(5);
    this.favoriteColor = this.bitStream.readBits(4);
    this.favorite = this.bitStream.readBoolean();
    this.bitStream.alignByte();
    this.miiName = this.bitStream.readUTF16String(20);
    this.height = this.bitStream.readUint8();
    this.build = this.bitStream.readUint8();
    this.disableSharing = this.bitStream.readBoolean();
    this.faceType = this.bitStream.readBits(4);
    this.skinColor = this.bitStream.readBits(3);
    this.wrinklesType = this.bitStream.readBits(4);
    this.makeupType = this.bitStream.readBits(4);
    this.hairType = this.bitStream.readUint8();
    this.hairColor = this.bitStream.readBits(3);
    this.flipHair = this.bitStream.readBoolean();
    this.bitStream.alignByte();
    this.eyeType = this.bitStream.readBits(6);
    this.eyeColor = this.bitStream.readBits(3);
    this.eyeScale = this.bitStream.readBits(4);
    this.eyeVerticalStretch = this.bitStream.readBits(3);
    this.eyeRotation = this.bitStream.readBits(5);
    this.eyeSpacing = this.bitStream.readBits(4);
    this.eyeYPosition = this.bitStream.readBits(5);
    this.bitStream.alignByte();
    this.eyebrowType = this.bitStream.readBits(5);
    this.eyebrowColor = this.bitStream.readBits(3);
    this.eyebrowScale = this.bitStream.readBits(4);
    this.eyebrowVerticalStretch = this.bitStream.readBits(3);
    this.bitStream.skipBit();
    this.eyebrowRotation = this.bitStream.readBits(4);
    this.bitStream.skipBit();
    this.eyebrowSpacing = this.bitStream.readBits(4);
    this.eyebrowYPosition = this.bitStream.readBits(5);
    this.bitStream.alignByte();
    this.noseType = this.bitStream.readBits(5);
    this.noseScale = this.bitStream.readBits(4);
    this.noseYPosition = this.bitStream.readBits(5);
    this.bitStream.alignByte();
    this.mouthType = this.bitStream.readBits(6);
    this.mouthColor = this.bitStream.readBits(3);
    this.mouthScale = this.bitStream.readBits(4);
    this.mouthHorizontalStretch = this.bitStream.readBits(3);
    this.mouthYPosition = this.bitStream.readBits(5);
    this.mustacheType = this.bitStream.readBits(3);
    this.unknown2 = this.bitStream.readUint8();
    this.beardType = this.bitStream.readBits(3);
    this.facialHairColor = this.bitStream.readBits(3);
    this.mustacheScale = this.bitStream.readBits(4);
    this.mustacheYPosition = this.bitStream.readBits(5);
    this.bitStream.alignByte();
    this.glassesType = this.bitStream.readBits(4);
    this.glassesColor = this.bitStream.readBits(3);
    this.glassesScale = this.bitStream.readBits(4);
    this.glassesYPosition = this.bitStream.readBits(5);
    this.moleEnabled = this.bitStream.readBoolean();
    this.moleScale = this.bitStream.readBits(4);
    this.moleXPosition = this.bitStream.readBits(5);
    this.moleYPosition = this.bitStream.readBits(5);
    this.bitStream.alignByte();
    this.creatorName = this.bitStream.readUTF16String(20);
    this.bitStream.skipInt16();
    this.bitStream.swapEndian();
    this.checksum = this.bitStream.readUint16();
    this.bitStream.swapEndian();
    if (this.bitStream.length / 8 > 96) {
      this.extFacelineColor = this.bitStream.readUint8();
      this.extHairColor = this.bitStream.readUint8();
      this.extEyeColor = this.bitStream.readUint8();
      this.extEyebrowColor = this.bitStream.readUint8();
      this.extMouthColor = this.bitStream.readUint8();
      this.extBeardColor = this.bitStream.readUint8();
      this.extGlassColor = this.bitStream.readUint8();
      this.extGlassType = this.bitStream.readUint8();
    }
    if (this.bitStream.length / 8 > 104) {
      this.extHatType = this.bitStream.readUint8();
    }
    if (this.bitStream.length / 8 > 105) {
      this.extHatColor = this.bitStream.readUint8();
    }
    if (this.bitStream.length / 8 > 106) {
      this.extFacePaintColor = this.bitStream.readUint8();
    } else {
      this.extFacePaintColor = 0;
    }
    if (this.bitStream.length / 8 > 107) {
      this.extShirtColor = this.bitStream.readUint8();
    } else {
      this.extShirtColor = 0;
    }
    if (this.extFacelineColor)
      this.trueSkinColor = this.extFacelineColor;
    if (this.extHairColor)
      this.trueHairColor = this.extHairColor;
    if (this.extEyeColor)
      this.trueEyeColor = this.extEyeColor;
    if (this.extEyebrowColor)
      this.trueEyebrowColor = this.extEyebrowColor;
    if (this.extMouthColor)
      this.trueMouthColor = this.extMouthColor;
    if (this.extBeardColor)
      this.trueFacialHairColor = this.extBeardColor;
    if (this.extGlassColor)
      this.trueGlassesColor = this.extGlassColor;
    if (this.extGlassType)
      this.trueGlassesType = this.extGlassType;
    this.validate();
    if (this.checksum !== this.calculateCRC()) {
      throw new Error("Invalid Mii checksum");
    }
  }
  encode() {
    this.validate();
    this.bitStream.bitSeek(0);
    this.bitStream.writeUint8(this.version);
    this.bitStream.writeBoolean(this.allowCopying);
    this.bitStream.writeBoolean(this.profanityFlag);
    this.bitStream.writeBits(this.regionLock, 2);
    this.bitStream.writeBits(this.characterSet, 2);
    this.bitStream.alignByte();
    this.bitStream.writeBits(this.pageIndex, 4);
    this.bitStream.writeBits(this.slotIndex, 4);
    this.bitStream.writeBits(this.unknown1, 4);
    this.bitStream.writeBits(this.deviceOrigin, 3);
    this.bitStream.alignByte();
    this.bitStream.writeBuffer(this.systemId);
    this.bitStream.swapEndian();
    this.bitStream.writeBoolean(this.normalMii);
    this.bitStream.writeBoolean(this.dsMii);
    this.bitStream.writeBoolean(this.nonUserMii);
    this.bitStream.writeBoolean(this.isValid);
    this.bitStream.writeBits(this.creationTime, 28);
    this.bitStream.swapEndian();
    this.bitStream.writeBuffer(this.consoleMAC);
    this.bitStream.writeUint16(0);
    this.bitStream.writeBit(this.gender);
    this.bitStream.writeBits(this.birthMonth, 4);
    this.bitStream.writeBits(this.birthDay, 5);
    this.bitStream.writeBits(this.favoriteColor, 4);
    this.bitStream.writeBoolean(this.favorite);
    this.bitStream.alignByte();
    this.bitStream.writeUTF16String(this.miiName);
    this.bitStream.writeUint8(this.height);
    this.bitStream.writeUint8(this.build);
    this.bitStream.writeBoolean(this.disableSharing);
    this.bitStream.writeBits(this.faceType, 4);
    this.bitStream.writeBits(this.fflSkinColor, 3);
    this.bitStream.writeBits(this.wrinklesType, 4);
    this.bitStream.writeBits(this.makeupType, 4);
    this.bitStream.writeUint8(this.hairType);
    this.bitStream.writeBits(this.fflHairColor, 3);
    this.bitStream.writeBoolean(this.flipHair);
    this.bitStream.alignByte();
    this.bitStream.writeBits(this.eyeType, 6);
    this.bitStream.writeBits(this.fflEyeColor, 3);
    this.bitStream.writeBits(this.eyeScale, 4);
    this.bitStream.writeBits(this.eyeVerticalStretch, 3);
    this.bitStream.writeBits(this.eyeRotation, 5);
    this.bitStream.writeBits(this.eyeSpacing, 4);
    this.bitStream.writeBits(this.eyeYPosition, 5);
    this.bitStream.alignByte();
    this.bitStream.writeBits(this.eyebrowType, 5);
    this.bitStream.writeBits(this.fflEyebrowColor, 3);
    this.bitStream.writeBits(this.eyebrowScale, 4);
    this.bitStream.writeBits(this.eyebrowVerticalStretch, 3);
    this.bitStream.skipBit();
    this.bitStream.writeBits(this.eyebrowRotation, 4);
    this.bitStream.skipBit();
    this.bitStream.writeBits(this.eyebrowSpacing, 4);
    this.bitStream.writeBits(this.eyebrowYPosition, 5);
    this.bitStream.alignByte();
    this.bitStream.writeBits(this.noseType, 5);
    this.bitStream.writeBits(this.noseScale, 4);
    this.bitStream.writeBits(this.noseYPosition, 5);
    this.bitStream.alignByte();
    this.bitStream.writeBits(this.mouthType, 6);
    this.bitStream.writeBits(this.fflMouthColor, 3);
    this.bitStream.writeBits(this.mouthScale, 4);
    this.bitStream.writeBits(this.mouthHorizontalStretch, 3);
    this.bitStream.writeBits(this.mouthYPosition, 5);
    this.bitStream.writeBits(this.mustacheType, 3);
    this.bitStream.writeUint8(this.unknown2);
    this.bitStream.writeBits(this.beardType, 3);
    this.bitStream.writeBits(this.fflFacialHairColor, 3);
    this.bitStream.writeBits(this.mustacheScale, 4);
    this.bitStream.writeBits(this.mustacheYPosition, 5);
    this.bitStream.alignByte();
    this.bitStream.writeBits(this.fflGlassesType, 4);
    this.bitStream.writeBits(this.fflGlassesColor, 3);
    this.bitStream.writeBits(this.glassesScale, 4);
    this.bitStream.writeBits(this.glassesYPosition, 5);
    this.bitStream.writeBoolean(this.moleEnabled);
    this.bitStream.writeBits(this.moleScale, 4);
    this.bitStream.writeBits(this.moleXPosition, 5);
    this.bitStream.writeBits(this.moleYPosition, 5);
    this.bitStream.alignByte();
    this.bitStream.writeUTF16String(this.creatorName);
    this.bitStream.writeUint16(0);
    this.bitStream.swapEndian();
    this.bitStream.writeUint16(this.calculateCRC());
    this.bitStream.swapEndian();
    this.bitStream.writeUint8(this.extFacelineColor);
    this.bitStream.writeUint8(this.extHairColor);
    this.bitStream.writeUint8(this.extEyeColor);
    this.bitStream.writeUint8(this.extEyebrowColor);
    this.bitStream.writeUint8(this.extMouthColor);
    this.bitStream.writeUint8(this.extBeardColor);
    this.bitStream.writeUint8(this.extGlassColor);
    this.bitStream.writeUint8(this.extGlassType);
    this.bitStream.writeUint8(this.extHatType);
    this.bitStream.writeUint8(this.extHatColor);
    this.bitStream.writeUint8(this.extFacePaintColor);
    this.bitStream.writeUint8(this.extShirtColor);
    return $Buffer.from(this.bitStream.view._view);
  }
  encodeFFSD() {
    this.validate();
    this.bitStream.bitSeek(0);
    this.bitStream.writeUint8(this.version);
    this.bitStream.writeBoolean(this.allowCopying);
    this.bitStream.writeBoolean(this.profanityFlag);
    this.bitStream.writeBits(this.regionLock, 2);
    this.bitStream.writeBits(this.characterSet, 2);
    this.bitStream.alignByte();
    this.bitStream.writeBits(this.pageIndex, 4);
    this.bitStream.writeBits(this.slotIndex, 4);
    this.bitStream.writeBits(this.unknown1, 4);
    this.bitStream.writeBits(this.deviceOrigin, 3);
    this.bitStream.alignByte();
    this.bitStream.writeBuffer(this.systemId);
    this.bitStream.swapEndian();
    this.bitStream.writeBoolean(this.normalMii);
    this.bitStream.writeBoolean(this.dsMii);
    this.bitStream.writeBoolean(this.nonUserMii);
    this.bitStream.writeBoolean(this.isValid);
    this.bitStream.writeBits(this.creationTime, 28);
    this.bitStream.swapEndian();
    this.bitStream.writeBuffer(this.consoleMAC);
    this.bitStream.writeUint16(0);
    this.bitStream.writeBit(this.gender);
    this.bitStream.writeBits(this.birthMonth, 4);
    this.bitStream.writeBits(this.birthDay, 5);
    this.bitStream.writeBits(this.favoriteColor, 4);
    this.bitStream.writeBoolean(this.favorite);
    this.bitStream.alignByte();
    this.bitStream.writeUTF16String(this.miiName);
    this.bitStream.writeUint8(this.height);
    this.bitStream.writeUint8(this.build);
    this.bitStream.writeBoolean(this.disableSharing);
    this.bitStream.writeBits(this.faceType, 4);
    this.bitStream.writeBits(this.fflSkinColor, 3);
    this.bitStream.writeBits(this.wrinklesType, 4);
    this.bitStream.writeBits(this.makeupType, 4);
    this.bitStream.writeUint8(this.hairType);
    this.bitStream.writeBits(this.fflHairColor, 3);
    this.bitStream.writeBoolean(this.flipHair);
    this.bitStream.alignByte();
    this.bitStream.writeBits(this.eyeType, 6);
    this.bitStream.writeBits(this.fflEyeColor, 3);
    this.bitStream.writeBits(this.eyeScale, 4);
    this.bitStream.writeBits(this.eyeVerticalStretch, 3);
    this.bitStream.writeBits(this.eyeRotation, 5);
    this.bitStream.writeBits(this.eyeSpacing, 4);
    this.bitStream.writeBits(this.eyeYPosition, 5);
    this.bitStream.alignByte();
    this.bitStream.writeBits(this.eyebrowType, 5);
    this.bitStream.writeBits(this.fflEyebrowColor, 3);
    this.bitStream.writeBits(this.eyebrowScale, 4);
    this.bitStream.writeBits(this.eyebrowVerticalStretch, 3);
    this.bitStream.skipBit();
    this.bitStream.writeBits(this.eyebrowRotation, 4);
    this.bitStream.skipBit();
    this.bitStream.writeBits(this.eyebrowSpacing, 4);
    this.bitStream.writeBits(this.eyebrowYPosition, 5);
    this.bitStream.alignByte();
    this.bitStream.writeBits(this.noseType, 5);
    this.bitStream.writeBits(this.noseScale, 4);
    this.bitStream.writeBits(this.noseYPosition, 5);
    this.bitStream.alignByte();
    this.bitStream.writeBits(this.mouthType, 6);
    this.bitStream.writeBits(this.fflMouthColor, 3);
    this.bitStream.writeBits(this.mouthScale, 4);
    this.bitStream.writeBits(this.mouthHorizontalStretch, 3);
    this.bitStream.writeBits(this.mouthYPosition, 5);
    this.bitStream.writeBits(this.mustacheType, 3);
    this.bitStream.writeUint8(this.unknown2);
    this.bitStream.writeBits(this.beardType, 3);
    this.bitStream.writeBits(this.fflFacialHairColor, 3);
    this.bitStream.writeBits(this.mustacheScale, 4);
    this.bitStream.writeBits(this.mustacheYPosition, 5);
    this.bitStream.alignByte();
    this.bitStream.writeBits(this.glassesType, 4);
    this.bitStream.writeBits(this.fflGlassesColor, 3);
    this.bitStream.writeBits(this.glassesScale, 4);
    this.bitStream.writeBits(this.glassesYPosition, 5);
    this.bitStream.writeBoolean(this.moleEnabled);
    this.bitStream.writeBits(this.moleScale, 4);
    this.bitStream.writeBits(this.moleXPosition, 5);
    this.bitStream.writeBits(this.moleYPosition, 5);
    this.bitStream.alignByte();
    this.bitStream.writeUTF16String(this.creatorName);
    this.bitStream.writeUint16(0);
    this.bitStream.swapEndian();
    this.bitStream.writeUint16(this.calculateCRC());
    this.bitStream.swapEndian();
    return $Buffer.from(this.bitStream.view._view).slice(0, 96);
  }
  calculateCRC() {
    const view = this.bitStream.view;
    const data = view._view.subarray(0, 94);
    let crc = 0;
    for (const byte of data) {
      for (let bit = 7;bit >= 0; bit--) {
        const flag = (crc & 32768) != 0;
        crc = (crc << 1 | byte >> bit & 1) ^ (flag ? 4129 : 0);
      }
    }
    for (let i = 16;i > 0; i--) {
      const flag = (crc & 32768) != 0;
      crc = crc << 1 ^ (flag ? 4129 : 0);
    }
    return crc & 65535;
  }
  encodeStudio() {
    this.validate();
    let miiStudioData = $Buffer.alloc(47);
    let next = 256;
    let pos = 1;
    function encodeMiiPart(partValue) {
      const encoded = (7 + (partValue ^ next)) % 256;
      next = encoded;
      miiStudioData.writeUInt8(encoded, pos);
      pos++;
    }
    encodeMiiPart(this.trueFacialHairColor);
    encodeMiiPart(this.beardType);
    encodeMiiPart(this.build);
    encodeMiiPart(this.eyeVerticalStretch);
    if (this.trueEyeColor > 5) {
      encodeMiiPart(this.extEyeColor);
    } else
      encodeMiiPart(this.fflEyeColor + 8);
    encodeMiiPart(this.eyeRotation);
    encodeMiiPart(this.eyeScale);
    encodeMiiPart(this.eyeType);
    encodeMiiPart(this.eyeSpacing);
    encodeMiiPart(this.eyeYPosition);
    encodeMiiPart(this.eyebrowVerticalStretch);
    encodeMiiPart(this.trueEyebrowColor);
    encodeMiiPart(this.eyebrowRotation);
    encodeMiiPart(this.eyebrowScale);
    encodeMiiPart(this.eyebrowType);
    encodeMiiPart(this.eyebrowSpacing);
    encodeMiiPart(this.eyebrowYPosition);
    if (this.extFacePaintColor !== 0) {
      encodeMiiPart(this.extFacePaintColor + 9);
    } else {
      encodeMiiPart(this.trueSkinColor);
    }
    encodeMiiPart(this.makeupType);
    encodeMiiPart(this.faceType);
    encodeMiiPart(this.wrinklesType);
    encodeMiiPart(this.favoriteColor);
    encodeMiiPart(this.gender);
    if (this.extGlassColor > 0) {
      encodeMiiPart(this.trueGlassesColor);
    } else {
      if (this.fflGlassesColor === 0)
        encodeMiiPart(8);
      else
        encodeMiiPart(this.fflGlassesColor + 13);
    }
    encodeMiiPart(this.glassesScale);
    encodeMiiPart(this.trueGlassesType);
    encodeMiiPart(this.glassesYPosition);
    encodeMiiPart(this.trueHairColor);
    encodeMiiPart(this.flipHair ? 1 : 0);
    encodeMiiPart(this.hairType);
    encodeMiiPart(this.height);
    encodeMiiPart(this.moleScale);
    encodeMiiPart(this.moleEnabled ? 1 : 0);
    encodeMiiPart(this.moleXPosition);
    encodeMiiPart(this.moleYPosition);
    encodeMiiPart(this.mouthHorizontalStretch);
    if (this.trueMouthColor > 5) {
      encodeMiiPart(this.extMouthColor);
    } else
      encodeMiiPart(this.fflMouthColor + 19);
    encodeMiiPart(this.mouthScale);
    encodeMiiPart(this.mouthType);
    encodeMiiPart(this.mouthYPosition);
    encodeMiiPart(this.mustacheScale);
    encodeMiiPart(this.mustacheType);
    encodeMiiPart(this.mustacheYPosition);
    encodeMiiPart(this.noseScale);
    encodeMiiPart(this.noseType);
    encodeMiiPart(this.noseYPosition);
    return miiStudioData;
  }
  encodeCharInfoSwitch() {
    this.validate();
    this.bitStream.bitSeek(0);
    for (let i = 0;i < 16; i++) {
      let r = RandomInt(255);
      if (i == 8) {
        r &= 63;
        r |= 128;
      }
      this.bitStream.writeUint8(r);
    }
    this.bitStream.writeUTF16String(this.miiName);
    this.bitStream.writeUint8(0);
    this.bitStream.writeUint8(this.characterSet);
    this.bitStream.writeUint8(0);
    this.bitStream.writeUint8(this.favoriteColor);
    this.bitStream.writeUint8(this.gender);
    this.bitStream.writeUint8(this.height);
    this.bitStream.writeUint8(this.build);
    this.bitStream.writeUint8(!this.normalMii);
    this.bitStream.writeUint8(this.regionLock);
    this.bitStream.writeUint8(this.faceType);
    this.bitStream.writeUint8(this.trueSkinColor);
    this.bitStream.writeUint8(this.wrinklesType);
    this.bitStream.writeUint8(this.makeupType);
    this.bitStream.writeUint8(this.hairType);
    if (this.trueHairColor == 0) {
      this.bitStream.writeUint8(8);
    } else {
      this.bitStream.writeUint8(this.trueHairColor);
    }
    this.bitStream.writeUint8(this.flipHair);
    this.bitStream.writeUint8(this.eyeType);
    if (this.trueEyeColor > 5) {
      this.bitStream.writeUint8(this.extEyeColor);
    } else
      this.bitStream.writeUint8(this.fflEyeColor + 8);
    this.bitStream.writeUint8(this.eyeScale);
    this.bitStream.writeUint8(this.eyeVerticalStretch);
    this.bitStream.writeUint8(this.eyeRotation);
    this.bitStream.writeUint8(this.eyeSpacing);
    this.bitStream.writeUint8(this.eyeYPosition);
    this.bitStream.writeUint8(this.eyebrowType);
    if (this.trueEyebrowColor == 0) {
      this.bitStream.writeUint8(8);
    } else {
      this.bitStream.writeUint8(this.trueEyebrowColor);
    }
    this.bitStream.writeUint8(this.eyebrowScale);
    this.bitStream.writeUint8(this.eyebrowVerticalStretch);
    this.bitStream.writeUint8(this.eyebrowRotation);
    this.bitStream.writeUint8(this.eyebrowSpacing);
    this.bitStream.writeUint8(this.eyebrowYPosition);
    this.bitStream.writeUint8(this.noseType);
    this.bitStream.writeUint8(this.noseScale);
    this.bitStream.writeUint8(this.noseYPosition);
    this.bitStream.writeUint8(this.mouthType);
    if (this.trueMouthColor > 5) {
      this.bitStream.writeUint8(this.extMouthColor);
    } else
      this.bitStream.writeUint8(this.fflMouthColor + 19);
    this.bitStream.writeUint8(this.mouthScale);
    this.bitStream.writeUint8(this.mouthHorizontalStretch);
    this.bitStream.writeUint8(this.mouthYPosition);
    this.bitStream.writeUint8(this.trueFacialHairColor);
    this.bitStream.writeUint8(this.beardType);
    this.bitStream.writeUint8(this.mustacheType);
    this.bitStream.writeUint8(this.mustacheScale);
    this.bitStream.writeUint8(this.mustacheYPosition);
    this.bitStream.writeUint8(this.trueGlassesType);
    if (this.extGlassColor > 0) {
      this.bitStream.writeUint8(this.trueGlassesColor);
    } else {
      if (this.fflGlassesColor === 0)
        this.bitStream.writeUint8(8);
      else
        this.bitStream.writeUint8(this.fflGlassesColor + 13);
    }
    this.bitStream.writeUint8(this.glassesScale);
    this.bitStream.writeUint8(this.glassesYPosition);
    this.bitStream.writeUint8(this.moleEnabled);
    this.bitStream.writeUint8(this.moleScale);
    this.bitStream.writeUint8(this.moleXPosition);
    this.bitStream.writeUint8(this.moleYPosition);
    this.bitStream.writeUint8(0);
    return $Buffer.from(this.bitStream.view._view).slice(0, 88);
  }
  studioUrl(queryParams = STUDIO_RENDER_DEFAULTS) {
    const params = {
      ...STUDIO_RENDER_DEFAULTS,
      ...queryParams,
      data: this.encodeStudio().toString("hex"),
      shaderType: "default"
    };
    let fileExt = "png";
    if (params.ext) {
      fileExt = params.ext;
      delete params["ext"];
    }
    params.type = STUDIO_RENDER_TYPES.includes(params.type) ? params.type : STUDIO_RENDER_DEFAULTS.type;
    params.expression = STUDIO_RENDER_EXPRESSIONS.includes(params.expression) ? params.expression : STUDIO_RENDER_DEFAULTS.expression;
    params.width = Util.clamp(params.width, 512);
    params.bgColor = STUDIO_BG_COLOR_REGEX.test(params.bgColor) ? params.bgColor : STUDIO_RENDER_DEFAULTS.bgColor;
    params.clothesColor = STUDIO_RENDER_CLOTHES_COLORS.includes(params.clothesColor) ? params.clothesColor : STUDIO_RENDER_DEFAULTS.clothesColor;
    params.cameraXRotate = Util.clamp(params.cameraXRotate, 359);
    params.cameraYRotate = Util.clamp(params.cameraYRotate, 359);
    params.cameraZRotate = Util.clamp(params.cameraZRotate, 359);
    params.characterXRotate = Util.clamp(params.characterXRotate, 359);
    params.characterYRotate = Util.clamp(params.characterYRotate, 359);
    params.characterZRotate = Util.clamp(params.characterZRotate, 359);
    params.lightXDirection = Util.clamp(params.lightXDirection, 359);
    params.lightYDirection = Util.clamp(params.lightYDirection, 359);
    params.lightZDirection = Util.clamp(params.lightZDirection, 359);
    params.lightDirectionMode = STUDIO_RENDER_LIGHT_DIRECTION_MODES.includes(params.lightDirectionMode) ? params.lightDirectionMode : STUDIO_RENDER_DEFAULTS.lightDirectionMode;
    params.splitMode = STUDIO_SPLIT_MODES.includes(params.splitMode) ? params.splitMode : STUDIO_RENDER_DEFAULTS.splitMode;
    params.instanceCount = Util.clamp(params.instanceCount, 1, 16);
    params.instanceRotationMode = STUDIO_RENDER_INSTANCE_ROTATION_MODES.includes(params.instanceRotationMode) ? params.instanceRotationMode : STUDIO_RENDER_DEFAULTS.instanceRotationMode;
    const query = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([key, value]) => [key, value.toString()])));
    if (params.lightDirectionMode === "none") {
      query.delete("lightDirectionMode");
      query.delete("lightXDirection");
      query.delete("lightYDirection");
      query.delete("lightZDirection");
    }
    if (params.splitMode === "none")
      query.delete("splitMode");
    return `${STUDIO_RENDER_URL_BASE}.${fileExt}?${query.toString()}`;
  }
  studioAssetUrlBody() {
    return this.studioAssetUrl(`body/${this.gender}/${this.favoriteColor}`);
  }
  studioAssetUrlHead() {
    return this.studioAssetUrl(`face/${this.faceType}/${this.wrinklesType}/${this.makeupType}/${this.skinColor}`);
  }
  studioAssetUrlFace() {
    return this.studioAssetUrlHead();
  }
  studioAssetUrlEye() {
    return this.studioAssetUrl(`eye/${this.eyeType}/${this.eyeColor + 8}`);
  }
  studioAssetUrlEyebrow() {
    let eyebrowColor = this.eyebrowColor;
    if (this.eyebrowColor === 0) {
      eyebrowColor = 8;
    }
    return this.studioAssetUrl(`eyebrow/${this.eyebrowType}/${eyebrowColor}`);
  }
  studioAssetUrlNose() {
    return this.studioAssetUrl(`nose/${this.noseType}/${this.skinColor}`);
  }
  studioAssetUrlMouth() {
    let mouthColor = 0;
    if (this.mouthColor < 4) {
      mouthColor = this.mouthColor + 19;
    }
    return this.studioAssetUrl(`mouth/${this.mouthType}/${mouthColor}`);
  }
  studioAssetUrlHair() {
    let assetPath;
    let hairColor = this.hairColor;
    if (this.hairColor == 0) {
      hairColor = 8;
    }
    if (this.hairType === 34 || this.hairType === 57) {
      assetPath = `hair/${this.hairType}/${this.faceType}/${this.favoriteColor}`;
    } else {
      assetPath = `${this.flipHair ? "hairflip" : "hair"}/${this.hairType}/${this.faceType}/${hairColor}`;
    }
    return this.studioAssetUrl(assetPath);
  }
  studioAssetUrlBeard() {
    let facialHairColor = this.facialHairColor;
    if (this.facialHairColor === 0) {
      facialHairColor = 8;
    }
    return this.studioAssetUrl(`beard/${this.beardType}/${this.faceType}/${facialHairColor}`);
  }
  studioAssetUrlMustache() {
    let facialHairColor = this.facialHairColor;
    if (this.facialHairColor === 0) {
      facialHairColor = 8;
    }
    return this.studioAssetUrl(`mustache/${this.mustacheType}/${facialHairColor}`);
  }
  studioAssetUrlGlasses() {
    let glassesColor = 0;
    if (this.glassesColor == 0) {
      glassesColor = 8;
    } else if (this.glassesColor < 6) {
      glassesColor = this.glassesColor + 13;
    }
    return this.studioAssetUrl(`glass/${this.glassesType}/${glassesColor}`);
  }
  studioAssetUrlMole() {
    return this.studioAssetUrl(`mole/${this.moleEnabled ? 1 : 0}`);
  }
  studioAssetUrl(assetPath) {
    this.validate();
    const assetPathHash = import_md5.default(assetPath);
    const char0 = assetPathHash[0];
    const char1 = assetPathHash[1];
    const char2 = assetPathHash[2];
    const fileName = assetPathHash.substring(3, 12);
    return `${STUDIO_ASSET_URL_BASE}/${STUDIO_ASSET_FILE_TYPE}/1024/${char0}/${char1}/${char2}/${fileName}.${STUDIO_ASSET_FILE_TYPE}`;
  }
}
export {
  Mii as default
};
