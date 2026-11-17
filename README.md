# locapix

Photo tools that run in the browser. Photos never leave your device.

Compress, fit a file-size limit, resize, convert, strip camera details, crop, rotate, and build a simple PDF. Encoding uses MozJPEG, OxiPNG, WebP, and AVIF. JPEG turns and metadata removal stay lossless when the file allows it.

JPEG rotation uses libjpeg from the Independent JPEG Group. This software is based in part on the work of the Independent JPEG Group.

## Develop

```bash
npm install
npm run dev
```

Open the site, drop a photo, and download the result. There is no upload API.

```bash
npm test
npm run build
```
