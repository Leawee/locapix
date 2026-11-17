import type { OutputFormat, ToolKind } from "@/lib/process/types";

export type ToolIcon =
  | "compress"
  | "target"
  | "resize"
  | "convert"
  | "exif"
  | "crop"
  | "rotate"
  | "pdf"
  | "batch";

export type Faq = { q: string; a: string };

export type Tool = {
  id: string;
  path: string;
  kind: ToolKind;
  batch: boolean;
  title: string;
  metaTitle: string;
  description: string;
  lede: string;
  card: string;
  icon: ToolIcon;
  format: OutputFormat;
  quality: number;
  targetBytes: number;
  chips: "off" | "local" | "route";
  showInGrid: boolean;
  faqs: Faq[];
  story: string[];
};

const sharedPrivacy: Faq = {
  q: "Do you upload my photo?",
  a: "No. locapix decodes and encodes it in your browser. The photo is not sent to a locapix server, and there is no account.",
};

function targetTool(id: string, path: string, bytes: number, label: string): Tool {
  return {
    id,
    path,
    kind: "target",
    batch: false,
    title: `Compress a photo to ${label}`,
    metaTitle: `Compress images to ${label}`,
    description: `Fit a photo under ${label} in your browser. locapix keeps as much detail as it can, and the file never gets uploaded.`,
    lede: `Set the limit at ${label}. locapix searches for the highest quality that still fits, and only then scales the photo down a little.`,
    card: `Fit ${label} and keep as much detail as you can.`,
    icon: "target",
    format: "auto",
    quality: 80,
    targetBytes: bytes,
    chips: "route",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: `Will the file be under ${label}?`,
        a: `Yes, when it's possible. If the photo would have to become too small, locapix stops and tells you the closest size instead of pretending it worked.`,
      },
      {
        q: "Does it just crush the quality slider?",
        a: "No. It looks for the highest quality that fits. Only if that still isn't small enough does it shorten the long side, a little at a time.",
      },
    ],
    story: [
      `Upload forms often want a hard limit. ${label} is a common one. This page starts there.`,
      "Photos stay on this device. The first time you use a format, the encoder downloads and is cached. After that it can run offline.",
    ],
  };
}

export const tools: Tool[] = [
  {
    id: "compress",
    path: "/compress",
    kind: "compress",
    batch: false,
    title: "Compress a photo",
    metaTitle: "Compress images locally",
    description: "Shrink a JPEG, PNG, WebP, or AVIF in your browser with MozJPEG, WebP, AVIF, or OxiPNG. Photos never leave your device.",
    lede: "Make the file smaller while the photo still looks like itself. You can compare before and after before you download.",
    card: "Make a photo smaller while keeping it sharp.",
    icon: "compress",
    format: "keep",
    quality: 80,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: true,
    faqs: [
      sharedPrivacy,
      {
        q: "Which encoder is used?",
        a: "JPEG uses MozJPEG with trellis optimization. PNG stays lossless with OxiPNG. WebP and AVIF use their own encoders. The browser's built-in JPEG export is not the default.",
      },
      {
        q: "Will you keep the location stored in the photo?",
        a: "Not by default. Camera location and similar details are removed. You can turn that off under More options if you need them.",
      },
    ],
    story: [
      "Drop a photo, move the quality slider, and check the edges before you download. The new size and the amount saved stay on screen.",
      "Animated GIF, APNG, and animated WebP are left alone. This version won't quietly keep only the first frame.",
    ],
  },
  {
    id: "compress-to-size",
    path: "/compress-to-size",
    kind: "target",
    batch: false,
    title: "Compress to a size you pick",
    metaTitle: "Compress images to a target size",
    description: "Compress a photo under 50KB, 200KB, 1MB, or a size you type. The work stays in your browser.",
    lede: "Type a limit or tap a common size. locapix keeps the photo as sharp as that limit allows.",
    card: "Fit 200KB, 1MB, or any limit you type.",
    icon: "target",
    format: "auto",
    quality: 80,
    targetBytes: 200 * 1024,
    chips: "local",
    showInGrid: true,
    faqs: [
      sharedPrivacy,
      {
        q: "What if the photo is already small enough?",
        a: "Then it is not compressed again. If it's a JPEG, camera details can still be removed without touching the pixels.",
      },
      {
        q: "Which format does it pick?",
        a: "A normal photo becomes JPEG. A photo with transparency becomes WebP. You can force JPEG, PNG, WebP, or AVIF.",
      },
    ],
    story: [
      "The search stays in a high quality range first. Shrinking the pixel size is the last resort, and it happens in small steps.",
      "You can cancel while it searches. The original file stays on your device either way.",
    ],
  },
  targetTool("compress-to-50kb", "/compress-to-50kb", 50 * 1024, "50KB"),
  targetTool("compress-to-100kb", "/compress-to-100kb", 100 * 1024, "100KB"),
  targetTool("compress-to-200kb", "/compress-to-200kb", 200 * 1024, "200KB"),
  targetTool("compress-to-500kb", "/compress-to-500kb", 500 * 1024, "500KB"),
  targetTool("compress-to-1mb", "/compress-to-1mb", 1024 * 1024, "1MB"),
  targetTool("compress-to-2mb", "/compress-to-2mb", 2 * 1024 * 1024, "2MB"),
  targetTool("compress-to-8mb", "/compress-to-8mb", 8 * 1024 * 1024, "8MB"),
  {
    id: "resize",
    path: "/resize",
    kind: "resize",
    batch: false,
    title: "Resize a photo",
    metaTitle: "Resize images without stretching",
    description: "Change the pixel size of a photo with Lanczos resampling. The aspect ratio stays locked unless you unlock it.",
    lede: "Set a width, a height, the long side, or a percent. The photo is not stretched unless you ask for that.",
    card: "Change the pixel size without stretching.",
    icon: "resize",
    format: "keep",
    quality: 85,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: true,
    faqs: [
      sharedPrivacy,
      {
        q: "Can I make a photo larger?",
        a: "Not by default. Enlarging a photo makes it soft, and this version does not invent detail. You can allow it, and locapix will warn you.",
      },
      {
        q: "How is the resize done?",
        a: "Shrinking uses Lanczos3, then a very light sharpen so edges don't go dull. It is not a plain browser canvas scale.",
      },
    ],
    story: [
      "Presets cover a long side of 1920, 1280, or 800 pixels, plus 50 percent. Lock stays on so faces don't get wide or tall.",
      "The download uses the same encoders as Compress, so the file isn't quietly passed through a second, worse export.",
    ],
  },
  {
    id: "convert",
    path: "/convert",
    kind: "convert",
    batch: false,
    title: "Convert a photo",
    metaTitle: "Convert HEIC, PNG, WebP, JPEG, and AVIF",
    description: "Convert photos between JPEG, PNG, WebP, and AVIF in your browser, including HEIC from a phone.",
    lede: "Pick the format you actually need. Transparent photos ask before they are flattened onto white.",
    card: "HEIC, PNG, WebP, JPEG, or AVIF.",
    icon: "convert",
    format: "webp",
    quality: 82,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: true,
    faqs: [
      sharedPrivacy,
      {
        q: "What happens to transparency?",
        a: "JPEG has no transparency. You'll see the background color — white, unless you change it — before you download.",
      },
      {
        q: "My HEIC photo failed.",
        a: "Some browsers can't decode HEIC. Export a JPEG from the camera roll, or try Safari, which often can read it.",
      },
    ],
    story: [
      "HEIC from an iPhone, a PNG screenshot, or a WebP can each take a different path. The page tells you which one it used.",
      "Animations are not turned into a still. If the file moves, locapix says so and leaves it alone.",
    ],
  },
  {
    id: "heic-to-jpg",
    path: "/heic-to-jpg",
    kind: "convert",
    batch: false,
    title: "Convert HEIC to JPG",
    metaTitle: "Convert HEIC to JPG locally",
    description: "Turn an iPhone HEIC photo into a JPEG in your browser. The HEIC file is not uploaded.",
    lede: "Drop an HEIC or HEIF photo. locapix decodes it on this device and saves a JPEG.",
    card: "Turn iPhone HEIC photos into JPEG.",
    icon: "convert",
    format: "jpeg",
    quality: 88,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "Why did HEIC fail in this browser?",
        a: "HEIC decoding depends on the browser. If it fails, export a JPEG from your camera roll or open the page in Safari.",
      },
      {
        q: "Will the JPEG keep the location?",
        a: "No. The new JPEG does not include camera location or the other details stored in the HEIC.",
      },
    ],
    story: [
      "The JPEG is encoded with MozJPEG, not the browser's built-in exporter.",
      "If the phone photo is sideways, locapix turns the pixels upright so other apps don't show it on its side.",
    ],
  },
  {
    id: "png-to-webp",
    path: "/png-to-webp",
    kind: "convert",
    batch: false,
    title: "Convert PNG to WebP",
    metaTitle: "Convert PNG to WebP locally",
    description: "Save a PNG as WebP in your browser. Transparency can stay. The file is not uploaded.",
    lede: "WebP keeps transparency and is often much smaller than a PNG screenshot or graphic.",
    card: "Save a PNG as WebP.",
    icon: "convert",
    format: "webp",
    quality: 82,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "Is the transparency kept?",
        a: "Yes. WebP can keep a transparent background. You don't have to flatten it onto white.",
      },
      {
        q: "What about an animated PNG?",
        a: "This version doesn't convert animations. You'll get a clear message instead of a silent first frame.",
      },
    ],
    story: ["Quality starts high. Pull it down if you need a smaller file, and check the edges in the compare view."],
  },
  {
    id: "jpg-to-webp",
    path: "/jpg-to-webp",
    kind: "convert",
    batch: false,
    title: "Convert JPG to WebP",
    metaTitle: "Convert JPG to WebP locally",
    description: "Convert a JPEG to WebP in your browser without uploading it.",
    lede: "A WebP copy is often smaller at the same kind of look. Compare them before you download.",
    card: "Save a JPEG as WebP.",
    icon: "convert",
    format: "webp",
    quality: 80,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "Is this just a rename?",
        a: "No. The photo is decoded and encoded as WebP. Camera details are left out of the new file.",
      },
    ],
    story: ["If the WebP comes out larger, the note under the preview says so. You can still download the original JPEG."],
  },
  {
    id: "to-avif",
    path: "/to-avif",
    kind: "convert",
    batch: false,
    title: "Convert a photo to AVIF",
    metaTitle: "Convert images to AVIF locally",
    description: "Encode a photo as AVIF in your browser. Photos use 4:2:0. You can switch to 4:4:4 when the image has text.",
    lede: "AVIF is slow and small. Photos start at 4:2:0. Turn on sharper text if the image is a screenshot or a label.",
    card: "Save a photo as AVIF.",
    icon: "convert",
    format: "avif",
    quality: 60,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "Why is AVIF slower?",
        a: "The encoder does more work. You can cancel it. The first run also downloads the AVIF encoder, which is then cached.",
      },
      {
        q: "When should I use sharper text?",
        a: "When the image has type, a screen, or hard edges. It uses 4:4:4 so letters don't smear. Photos can stay on the smaller 4:2:0 setting.",
      },
    ],
    story: ["AVIF quality around 60 is already strong. Raise it if you can see the sky or a face breaking up."],
  },
  {
    id: "remove-exif",
    path: "/remove-exif",
    kind: "exif",
    batch: false,
    title: "Remove location and camera details",
    metaTitle: "Remove EXIF data locally",
    description: "See the location, time, and camera stored in a photo, then remove them without recompressing a JPEG when that's possible.",
    lede: "Look at what's hidden in the file first. Then strip it. A JPEG's pixels stay as they were whenever the file allows it.",
    card: "Remove location and camera details.",
    icon: "exif",
    format: "keep",
    quality: 90,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: true,
    faqs: [
      sharedPrivacy,
      {
        q: "Is the JPEG recompressed?",
        a: "Not when the file can be edited in place. Location, camera, and thumbnail data are removed and the compressed pixels stay. If the photo was stored sideways, it is turned upright without a second compression.",
      },
      {
        q: "What will I see before I download?",
        a: "Whatever locapix could read: camera, time, and location. If a location is there, the page says so in plain language.",
      },
    ],
    story: [
      "People send photos without noticing the map pin inside them. This page shows that pin, then takes it out.",
      "Color profile data can stay, so the photo doesn't shift color just because the location was removed.",
    ],
  },
  {
    id: "crop",
    path: "/crop",
    kind: "crop",
    batch: false,
    title: "Crop a photo",
    metaTitle: "Crop images in the browser",
    description: "Crop a photo to a square, 4:3, 3:2, 16:9, or a free shape. The result is encoded on your device.",
    lede: "Drag the box. Pick a ratio if you want one. The download covers only what you see — no leftover bars.",
    card: "Cut to a square, 4:3, 16:9, or free.",
    icon: "crop",
    format: "keep",
    quality: 88,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: true,
    faqs: [
      sharedPrivacy,
      {
        q: "Can I crop on my phone?",
        a: "Yes. The handles are large enough to drag with a finger, and you can nudge the box with the arrow keys.",
      },
    ],
    story: ["The crop is exact. After you preview it, the file is encoded with the same high-quality path as the other tools."],
  },
  {
    id: "rotate",
    path: "/rotate",
    kind: "rotate",
    batch: false,
    title: "Rotate or flip a photo",
    metaTitle: "Rotate JPEG photos losslessly",
    description: "Turn or flip a photo. JPEG files are rotated without recompressing when the file allows it.",
    lede: "Quarter turns and flips stay lossless for a normal JPEG. Other formats are saved again at a high quality.",
    card: "Turn or flip. JPEGs stay lossless when they can.",
    icon: "rotate",
    format: "keep",
    quality: 92,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: true,
    faqs: [
      sharedPrivacy,
      {
        q: "Does rotating a JPEG hurt the quality?",
        a: "A 90, 180, or 270 degree turn rearranges the existing JPEG data instead of encoding it again. If the edges aren't aligned to the JPEG blocks, a hairline of edge may be trimmed, and the page says so.",
      },
    ],
    story: [
      "Camera details are removed during the turn so the photo doesn't get rotated a second time by an old orientation tag.",
      "JPEG rotation uses libjpeg from the Independent JPEG Group. This software is based in part on the work of the Independent JPEG Group.",
    ],
  },
  {
    id: "image-to-pdf",
    path: "/image-to-pdf",
    kind: "pdf",
    batch: false,
    title: "Put photos in a PDF",
    metaTitle: "Convert images to PDF locally",
    description: "Combine photos into a PDF in your browser. Original JPEG and PNG files are embedded instead of being compressed again.",
    lede: "One photo per page. Keep each photo's own size, or fit them on A4 or Letter. Reorder them before you export.",
    card: "One photo per page, with the quality intact.",
    icon: "pdf",
    format: "keep",
    quality: 90,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: true,
    faqs: [
      sharedPrivacy,
      {
        q: "Will a JPEG get compressed again inside the PDF?",
        a: "No. The original JPEG bytes are embedded when the file is already a JPEG. PNG is embedded as PNG. Other formats are saved at high quality first.",
      },
    ],
    story: ["This is not a layout tool. There's no collage and no text boxes. It's the photos, in order, on pages."],
  },
  {
    id: "batch",
    path: "/batch",
    kind: "compress",
    batch: true,
    title: "Process a batch",
    metaTitle: "Batch compress images locally",
    description: "Run the same local settings on many photos, then download the ones that worked or a ZIP of all of them.",
    lede: "Add a set of photos, pick one job, and let them run a few at a time. A failure doesn't throw away the rest.",
    card: "The same settings, on a whole set of photos.",
    icon: "batch",
    format: "keep",
    quality: 80,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "How many photos can I add?",
        a: "A normal set of about 20 phone photos is the range this version is built for. They run one or a few at a time so the tab doesn't run out of memory. You can retry a single failure.",
      },
    ],
    story: [
      "Files are named from the original, with a suffix such as -200kb or -compressed. They don't get a random name.",
      "Leave the page while a batch is running and the browser will ask before you throw the work away.",
    ],
  },
];

export const gridTools = tools.filter((tool) => tool.showInGrid);

export function getTool(id: string): Tool {
  const tool = tools.find((item) => item.id === id);
  if (!tool) throw new Error(`Unknown tool ${id}`);
  return tool;
}

export function toolPaths(): string[] {
  return tools.map((tool) => tool.path);
}
