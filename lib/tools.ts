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
export type ToolSection = { heading: string; paragraphs: string[] };
export type ToolLink = { href: string; label: string };

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
  sections?: ToolSection[];
  links?: ToolLink[];
};

export const formatLinks: ToolLink[] = [
  { href: "/heic-to-jpg", label: "HEIC to JPG" },
  { href: "/png-to-jpg", label: "PNG to JPG" },
  { href: "/jpg-to-png", label: "JPG to PNG" },
  { href: "/png-to-webp", label: "PNG to WebP" },
  { href: "/jpg-to-webp", label: "JPG to WebP" },
  { href: "/webp-to-jpg", label: "WebP to JPG" },
  { href: "/webp-to-png", label: "WebP to PNG" },
  { href: "/to-avif", label: "To AVIF" },
];

const sharedPrivacy: Faq = {
  q: "Do you upload my photo?",
  a: "No. locapix decodes and encodes it in your browser. The photo is not sent to a locapix server, and there is no account.",
};

function sizeLinks(path: string): ToolLink[] {
  const labels: Record<string, string> = {
    "/compress-to-50kb": "50KB avatars",
    "/compress-to-100kb": "100KB form limits",
    "/compress-to-200kb": "200KB web forms",
    "/compress-to-500kb": "500KB applications",
    "/compress-to-1mb": "1MB email and CMS",
    "/compress-to-2mb": "2MB attachments",
    "/compress-to-8mb": "8MB portal files",
  };
  const links = Object.entries(labels)
    .filter(([href]) => href !== path)
    .map(([href, label]) => ({ href, label }));
  if (path !== "/compress-to-size") links.push({ href: "/compress-to-size", label: "Type your own limit" });
  return links;
}

function formatPageLinks(path: string): ToolLink[] {
  return [...formatLinks.filter((link) => link.href !== path), { href: "/convert", label: "All conversions" }];
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
        a: "JPEG uses MozJPEG with trellis optimization. PNG stays lossless with OxiPNG. WebP uses libwebp. AVIF uses libavif. The browser's built-in JPEG export is not the default.",
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
    sections: [
      {
        heading: "How compression works",
        paragraphs: [
          "The photo is decoded in the browser and encoded there. JPEG goes through MozJPEG. With “Take a bit longer for a cleaner file” on — it is on by default — that encode uses trellis optimization and a progressive scan. PNG is packed losslessly with OxiPNG. WebP uses libwebp. AVIF uses libavif.",
          "Compare before and after, then download. Camera location is left out of the new file unless you turn that off under More options.",
        ],
      },
      {
        heading: "Which format to pick",
        paragraphs: [
          "Keep the original format when the place you're sending the file already accepts it. Pick JPEG for the widest compatibility. Pick WebP when you want a smaller file and transparency can stay. Pick AVIF when the recipient can open it and you want a photo even smaller. Pick PNG when the picture has to stay lossless.",
          "A phone HEIC can be opened here and saved as one of those. The HEIC to JPG page starts that job on JPEG.",
        ],
      },
      {
        heading: "Quality and limits",
        paragraphs: [
          "The slider starts at 80 and runs from 40 to 95. If a new JPEG would come out larger than the original, locapix keeps the original pixels and can still remove camera details without a second lossy encode.",
          "Very large photos ask before they run. Animations are refused rather than reduced to a single frame.",
        ],
      },
    ],
    links: [
      { href: "/compress-to-size", label: "Compress to a size you pick" },
      { href: "/compress-to-200kb", label: "Compress to 200KB" },
      { href: "/compress-to-1mb", label: "Compress to 1MB" },
      { href: "/heic-to-jpg", label: "HEIC to JPG" },
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
    chips: "off",
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
    sections: [
      {
        heading: "How the search works",
        paragraphs: [
          "locapix tries JPEG, WebP, AVIF, or PNG qualities from 50 through 95 and keeps the highest one that lands under your number. The engines are the same as Compress: MozJPEG, libwebp, libavif, and OxiPNG. Only if that range still misses the limit does the long side get shorter, about 18 percent at a time, with Lanczos.",
          "It will not shrink the long side below about 45 percent of the original, or below 320 pixels, whichever is larger. If the limit still isn't met, the page stops and names the closest size. It does not hand you a file over the line.",
        ],
      },
      {
        heading: "Which format it writes",
        paragraphs: [
          "Auto saves a normal photo as JPEG and a photo with transparency as WebP. Force JPEG when a form says JPG. A lossless PNG may not fit a tight cap, because OxiPNG does not throw pixels away.",
          "A file already under the limit is left at its current pixel size. On a JPEG, location and camera details can still be removed without a new compress.",
        ],
      },
      {
        heading: "Pick the limit they named",
        paragraphs: [
          "The size links open a page for that cap: 50KB for avatars, 100KB for tighter app limits, 200KB for common web forms, 500KB for applications, 1MB and 2MB for email and CMS fields, and 8MB for larger portal files. Type any other kilobyte value if the form names one that isn't listed.",
        ],
      },
    ],
    links: sizeLinks("/compress-to-size"),
  },
  {
    id: "compress-to-50kb",
    path: "/compress-to-50kb",
    kind: "target",
    batch: false,
    title: "Compress a photo to 50KB",
    metaTitle: "Compress images to 50KB",
    description: "Fit an avatar or profile photo under 50KB in your browser. locapix keeps the face readable when it can, and the file is not uploaded.",
    lede: "Profile forms still stop at 50KB. This page starts there, for an avatar, a forum picture, or a staff-directory headshot.",
    card: "Fit a profile photo under 50KB.",
    icon: "target",
    format: "auto",
    quality: 80,
    targetBytes: 50 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "Will a phone photo fit in 50KB?",
        a: "A full camera photo has to shrink. locapix keeps the highest quality it can, then shortens the long side, and stops if the only way through is a picture too small to use. The page tells you the closest size when 50KB isn't reachable.",
      },
      {
        q: "Should I crop before aiming at 50KB?",
        a: "Yes, if the form only needs a face. Crop to a square first so the bytes go to the person and not the room behind them.",
      },
      {
        q: "Is 50KB enough for a scan of a document?",
        a: "Usually not. Letters break up before a face does. Use 200KB or 500KB when the form is really asking for a page of type.",
      },
    ],
    story: [
      "50KB is a tight box. One face on a plain background can survive it. A group photo or a street scene generally can't, not at a size you'd still want to look at.",
      "The work stays on this device. There is no account, and the photo is not uploaded while the encoder hunts for a file the profile form will accept.",
    ],
    sections: [
      {
        heading: "What 50KB is for",
        paragraphs: [
          "Avatars, chat pictures, and profile slots that reject anything over 50KB. Keep the subject simple. If the result looks soft, the cap is the reason — try the 100KB page when the form allows it.",
          "JPEG is the usual output for a normal photo. A picture that already has transparency is saved as WebP so the edges aren't painted onto white.",
        ],
      },
    ],
    links: sizeLinks("/compress-to-50kb"),
  },
  {
    id: "compress-to-100kb",
    path: "/compress-to-100kb",
    kind: "target",
    batch: false,
    title: "Compress a photo to 100KB",
    metaTitle: "Compress images to 100KB",
    description: "Fit a photo under a 100KB app or form limit in your browser. Quality stays as high as that cap allows, and the file is not uploaded.",
    lede: "100KB shows up on older app uploads and on forms that want a picture, just not a camera original.",
    card: "Fit a photo under a 100KB app limit.",
    icon: "target",
    format: "auto",
    quality: 80,
    targetBytes: 100 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "How is 100KB different from 50KB?",
        a: "The search can stop sooner, so the long side usually stays longer and the quality number stays higher. It is a different cap, not the 50KB page with the label swapped.",
      },
      {
        q: "What if my file is already under 100KB?",
        a: "It is not compressed again. A JPEG can still have its location and camera details removed without touching the pixels.",
      },
      {
        q: "Which uploads ask for 100KB?",
        a: "Small apps, club and school signups, and marketplace thumbnails that published a round number years ago and never changed it. A head-and-shoulders photo is the realistic subject.",
      },
    ],
    story: [
      "There's a bit more room than an avatar slot: a clearer face, and sometimes a simple background, as long as the photo isn't a wide scene.",
      "MozJPEG writes the JPEG when the photo is a normal picture. Transparency stays in a WebP instead of being flattened. You can force PNG, WebP, or AVIF if the app names one of those.",
    ],
    sections: [
      {
        heading: "Where a 100KB cap shows up",
        paragraphs: [
          "Treat this as a thumbnail and ID-style limit. If the form is asking for a document or a full scene, 100KB will spend itself on the wrong pixels. Move up to 500KB or 1MB when they allow it.",
          "You can cancel the search. The original never leaves the browser either way, and the encoder for that format is cached after the first run so the same cap works offline.",
        ],
      },
    ],
    links: sizeLinks("/compress-to-100kb"),
  },
  {
    id: "compress-to-200kb",
    path: "/compress-to-200kb",
    kind: "target",
    batch: false,
    title: "Compress a photo to 200KB",
    metaTitle: "Compress images to 200KB",
    description: "Compress a photo under 200KB for a web form or an older mail limit. The file stays in your browser, at the highest quality that fits.",
    lede: "200KB is the number a lot of web forms and older mail systems still print on the page. It's the limit locapix uses when you don't type your own.",
    card: "Fit the 200KB cap common on web forms.",
    icon: "target",
    format: "auto",
    quality: 80,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "Why does the pixel size change, not just the file size?",
        a: "Quality alone, kept in a high range, often can't bring a phone photo down to 200KB. Shortening the long side is the second step, and it happens in small cuts. The page says when it did that.",
      },
      {
        q: "The form says JPG under 200KB. Will I get a JPG?",
        a: "Yes for a normal photo. Leave the format on Auto and the result is a JPEG from MozJPEG. Switch to WebP only when you know the site accepts it. A form that checks the file type will reject a WebP even when the size is right.",
      },
      {
        q: "Is 200KB the same as an email attachment limit?",
        a: "It's the older, stricter kind. Many current inboxes allow 1MB or more. Use this page when the instructions actually say 200KB, including insurance and “photo of the item” boxes.",
      },
    ],
    story: [
      "Job forms, claim uploads, and classifieds use 200KB as a middle: tighter than a modern attachment, looser than an avatar. A typical phone photo needs both a lower quality and a shorter long side to land here.",
      "Check edges and any small type in the compare view before you download. If the form will take 500KB, that page keeps more of the photo.",
    ],
    sections: [
      {
        heading: "The usual web-form cap",
        paragraphs: [
          "This is the default target on the size tool because it's the number people have to hit most often. The chips above are links to the other caps, when the form you opened names a different one.",
          "Photos are processed in the browser. Nothing is uploaded, and you don't need an account to try a second size.",
        ],
      },
    ],
    links: sizeLinks("/compress-to-200kb"),
  },
  {
    id: "compress-to-500kb",
    path: "/compress-to-500kb",
    kind: "target",
    batch: false,
    title: "Compress a photo to 500KB",
    metaTitle: "Compress images to 500KB",
    description: "Get a photo under 500KB for a job portal or application upload. The search runs in your browser, and the photo is not uploaded.",
    lede: "Application portals like a 500KB cap: small enough for their form, large enough that a headshot or a certificate can still be read.",
    card: "Fit a 500KB application or portal limit.",
    icon: "target",
    format: "auto",
    quality: 80,
    targetBytes: 500 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "Will a scan of a letter fit in 500KB?",
        a: "Often, after you crop away the desk around the page. If it still misses, the note names the closest size. Don't resave that file in a loop. Crop tighter or use the limit the portal actually printed.",
      },
      {
        q: "Does 500KB lock the quality slider?",
        a: "No. The page hunts for a high quality that fits this cap, and only shortens the photo if that still misses 500KB. A face on a plain background often needs little or no shrinking.",
      },
      {
        q: "What if I force PNG?",
        a: "PNG stays lossless through OxiPNG, so a detailed photo may not fit under 500KB. The page will say it couldn't, rather than give you a file over the line. Use JPEG for a photo the portal will accept as JPG.",
      },
    ],
    story: [
      "Use this for résumé photo boxes, visa-style uploads, and “scan of the document, max 500KB” instructions. Guessing a higher cap and getting rejected costs a submission. Open the number they wrote down.",
      "Start from the photo, not from a file you already crushed. A second pass on a damaged JPEG can't put the letters back.",
    ],
    sections: [
      {
        heading: "Photos versus scans",
        paragraphs: [
          "A headshot usually fits at 500KB with the dimensions intact or only slightly reduced. A photo of a printed page is harder, because the letters need clean edges. Crop to the page first.",
          "The encoder still runs locally. JPEG uses MozJPEG. The file is not sent to a locapix server at any point in the search.",
        ],
      },
    ],
    links: sizeLinks("/compress-to-500kb"),
  },
  {
    id: "compress-to-1mb",
    path: "/compress-to-1mb",
    kind: "target",
    batch: false,
    title: "Compress a photo to 1MB",
    metaTitle: "Compress images to 1MB",
    description: "Shrink a photo under 1MB for email or a CMS that rejects camera originals. Encoding happens in your browser, and nothing is uploaded.",
    lede: "1MB is a common ceiling for an email attachment and for a CMS field that accepts a real photo but not an 8MB camera file.",
    card: "Fit a 1MB email or CMS limit.",
    icon: "target",
    format: "auto",
    quality: 80,
    targetBytes: 1024 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "Is 1MB enough to keep the full photo?",
        a: "For a lot of web and email uses, yes. The search prefers a high quality, so a 1MB result is often the original dimensions with a tighter JPEG, not a thumbnail.",
      },
      {
        q: "What if the photo is already under 1MB?",
        a: "locapix does not compress it again. You can still strip camera details from a JPEG without a second encode. Closing the tab throws the working copy away.",
      },
      {
        q: "Should email use 1MB or 2MB?",
        a: "Use the number in the bounce or the CMS help text. 1MB is the right page when they say 1MB. The 2MB page is for the roomier attachment and upload fields, and it keeps more fine detail.",
      },
    ],
    story: [
      "A JPEG from a recent phone is often several megabytes. Landing at 1MB with MozJPEG keeps faces and skies in better shape than a 200KB cap does. Compare before you send it.",
      "Blog images, product fields, and contact-form attachments are the usual reason to be here. The photo stays on this device while the size is worked out.",
    ],
    sections: [
      {
        heading: "Email and CMS uploads",
        paragraphs: [
          "Mail that still meters a single attachment, and editors that ask for “under 1MB”, are what this limit is for. Move to 2MB when the field allows it and the photo has fabric, hair, or a product label you need to keep.",
          "Camera location is left out of the new file by default. Turn that off under More options only if the photo has to keep its place and time.",
        ],
      },
    ],
    links: sizeLinks("/compress-to-1mb"),
  },
  {
    id: "compress-to-2mb",
    path: "/compress-to-2mb",
    kind: "target",
    batch: false,
    title: "Compress a photo to 2MB",
    metaTitle: "Compress images to 2MB",
    description: "Fit a photo under 2MB for email attachments and CMS uploads that allow a larger file. Processing stays in your browser, and the photo is not uploaded.",
    lede: "2MB is the roomier email and CMS limit: enough for a sharp photo, still a clear line under a multi-megabyte original.",
    card: "Fit a 2MB attachment or CMS field.",
    icon: "target",
    format: "auto",
    quality: 80,
    targetBytes: 2 * 1024 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "Will this shrink the pixels or only the file?",
        a: "At 2MB, many phone photos finish on quality alone. You should see less pixel shrinking than on the 200KB or 500KB pages. If the file still won't fit, the page names the closest size instead of cutting forever.",
      },
      {
        q: "Will WebP be smaller than JPEG here?",
        a: "Often, but switch only if the CMS accepts WebP. A field that says JPEG will not take a WebP just because it fits under 2MB. Auto keeps a normal photo as JPEG.",
      },
      {
        q: "Does a photo that's already under 2MB get recompressed?",
        a: "No. Under the limit means the pixels stay, aside from an optional lossless cleanup of camera details on a JPEG.",
      },
    ],
    story: [
      "Some inboxes cap one attachment around 2MB once the rest of the message is counted. Product uploads and image fields in older CMS tools use the same number. This page treats 2MB as its own goal.",
      "Because the cap is higher, fine detail has somewhere to go. Use it for foliage, fabric, and labels when the form allows 2MB and not merely 1MB.",
    ],
    sections: [
      {
        heading: "When 2MB is the right ceiling",
        paragraphs: [
          "Pick 2MB when the instructions allow it. Pick the 1MB page when they don't. Both use the same local encoders, and neither one uploads the photo.",
          "You can force AVIF if you want libavif's smaller photo encode and you know the site will accept it. Leave Auto alone for a JPEG the CMS already understands.",
        ],
      },
    ],
    links: sizeLinks("/compress-to-2mb"),
  },
  {
    id: "compress-to-8mb",
    path: "/compress-to-8mb",
    kind: "target",
    batch: false,
    title: "Compress a photo to 8MB",
    metaTitle: "Compress images to 8MB",
    description: "Bring a large photo under an 8MB document or portal limit without uploading it. locapix only reduces the file when it is actually over 8MB.",
    lede: "8MB is a large portal limit: scanned packets, high-resolution listings, and forms that accept a near-original as long as it isn't a huge export.",
    card: "Fit an 8MB document or portal limit.",
    icon: "target",
    format: "auto",
    quality: 80,
    targetBytes: 8 * 1024 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "Why did my photo stay the same size?",
        a: "Because it is already under 8MB. locapix will not make it smaller just to have something to do. A JPEG can still drop its location data without a new compress.",
      },
      {
        q: "When would 8MB actually change the file?",
        a: "When the original is over 8MB: a stitched scan, a very large export, or a camera file the portal won't take. The search then looks for a high quality that fits, and scales down only if that isn't enough.",
      },
      {
        q: "Is this the page for a profile picture?",
        a: "No. Profile and avatar slots are the 50KB and 100KB pages. Use 8MB only when the portal named 8MB. A smaller cap they wrote down still applies.",
      },
    ],
    story: [
      "This is the “don't send us a 20MB file” rule. Many photos you already have are under 8MB, and those are left alone. The page is here so you can confirm the limit before you upload it on their site.",
      "The first time you encode, the encoder downloads and is cached. After that, the same check works offline. The photo itself is never the thing that was downloaded or uploaded.",
    ],
    sections: [
      {
        heading: "Large files and portal caps",
        paragraphs: [
          "Document portals, listing sites, and application packets that set 8MB per file are the audience. If they named 500KB or 1MB, use that page. An 8MB file they didn't ask for will still be rejected.",
          "JPEG output uses MozJPEG. Transparency is kept by saving WebP instead. You can cancel if a huge scan is taking too long. Nothing has been sent anywhere.",
        ],
      },
    ],
    links: sizeLinks("/compress-to-8mb"),
  },
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
    sections: [
      {
        heading: "How the resize is done",
        paragraphs: [
          "Shrinking uses Lanczos3, then a very light sharpen so edges don't go dull. It is not a nearest-neighbor scale and not the browser's plain canvas resize. The shape stays locked unless you turn that off.",
          "You can set the long side, a width, a height, or a percent. The presets are 1920, 1280, and 800 pixels on the long side, plus 50 percent.",
        ],
      },
      {
        heading: "Which format the file is saved as",
        paragraphs: [
          "The resized pixels are encoded with MozJPEG, OxiPNG, libwebp, or libavif, same as Compress. Keeping the original format still uses that encoder. It does not pass the file through a second, weaker export.",
          "JPEG output leaves camera location out by default. Turn that off under More options if the resized photo has to keep its place and time.",
        ],
      },
      {
        heading: "What resizing will not do",
        paragraphs: [
          "Enlarging is off by default. A bigger pixel grid does not add detail, and the page warns you if you allow it. Animated images are left alone.",
          "File size and pixel size are different jobs. To hit 200KB or 1MB, use Compress to a size. This page changes the dimensions.",
        ],
      },
    ],
    links: [
      { href: "/compress", label: "Compress a photo" },
      { href: "/compress-to-size", label: "Fit a file size" },
      { href: "/crop", label: "Crop a photo" },
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
        a: "HEIC is decoded with libheif in the browser. If that decoder can't read the file, export a JPEG from the camera roll or open the page in Safari.",
      },
    ],
    story: [
      "HEIC from an iPhone, a PNG screenshot, or a WebP can each take a different path. The page tells you which one it used.",
      "Animations are not turned into a still. If the file moves, locapix says so and leaves it alone.",
    ],
    sections: [
      {
        heading: "How a conversion runs",
        paragraphs: [
          "The file is decoded in the browser, then encoded into the format you picked. JPEG output is MozJPEG. WebP is libwebp. AVIF is libavif. PNG is a lossless encode packed with OxiPNG. HEIC and HEIF are decoded with libheif.",
          "Transparent pixels stay for WebP, PNG, and AVIF. JPEG has nowhere to put them, so you see the fill color — white, unless you change it — before you download.",
        ],
      },
      {
        heading: "Which pair to open",
        paragraphs: [
          "If you already know the two formats, open that page. Each one starts with the right output selected: HEIC to JPG, PNG to JPG, JPG to PNG, PNG to WebP, JPG to WebP, WebP to JPG, WebP to PNG, and AVIF.",
          "AVIF photos use 4:2:0. Turn on sharper text for screenshots and labels. That switches the encode to 4:4:4 so letters don't smear.",
        ],
      },
      {
        heading: "What is left alone",
        paragraphs: [
          "Animations are not flattened into a still. A HEIC that holds more than one picture is refused. If libheif can't read a particular HEIC, export a JPEG from the camera roll or try Safari.",
          "The new file does not include camera location. The original stays on this device. There is no upload and no account.",
        ],
      },
    ],
    links: formatLinks,
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
        a: "HEIC is decoded with libheif in the browser. If that decoder can't read the file, export a JPEG from your camera roll or open the page in Safari.",
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
    sections: [
      {
        heading: "How the JPEG is made",
        paragraphs: [
          "HEIC and HEIF are decoded with libheif on this device, then encoded with MozJPEG. The new JPEG does not include the phone's location or camera details.",
          "A HEIC that holds more than one picture is refused, rather than silently reduced to one frame. Quality starts at 88. Lower it if you need a smaller JPEG, and check the compare view first.",
        ],
      },
    ],
    links: formatPageLinks("/heic-to-jpg"),
  },
  {
    id: "png-to-jpg",
    path: "/png-to-jpg",
    kind: "convert",
    batch: false,
    title: "Convert PNG to JPG",
    metaTitle: "Convert PNG to JPG locally",
    description: "Turn a PNG into a JPEG in your browser with MozJPEG. Transparency is filled before you download, and the file is not uploaded.",
    lede: "JPEG is what most forms still ask for. This page turns a PNG into one on your device, and shows the background color before you download.",
    card: "Save a PNG as JPEG.",
    icon: "convert",
    format: "jpeg",
    quality: 88,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "Will the transparent background stay?",
        a: "No. JPEG has no transparency. Transparent pixels are painted onto a background — white, unless you change it — and you see that fill in the preview.",
      },
      {
        q: "Is the JPEG smaller than the PNG?",
        a: "Often, for photos. A flat icon or a screenshot can look softer without getting much smaller. The compare view is there so you can tell before you download.",
      },
      {
        q: "Can I just rename the file to .jpg?",
        a: "A renamed PNG is still a PNG. This page decodes the image and encodes a real JPEG with MozJPEG.",
      },
    ],
    story: [
      "Use JPG when the other side said JPG or JPEG: email, an old CMS, a printer, or a form that checks the file type. Use PNG to WebP when you want a smaller file and the transparency can stay.",
      "Camera details are not copied into the new JPEG. The PNG never leaves this browser.",
    ],
    sections: [
      {
        heading: "When JPG is the format they accept",
        paragraphs: [
          "Screenshots with small type are the hard case. JPEG is built for photos, so letters can fuzz. Keep the quality high, or keep the PNG, if the words matter more than the file size.",
          "The background control sits under More options. Change it before you download if white is the wrong fill for a logo.",
        ],
      },
    ],
    links: formatPageLinks("/png-to-jpg"),
  },
  {
    id: "jpg-to-png",
    path: "/jpg-to-png",
    kind: "convert",
    batch: false,
    title: "Convert JPG to PNG",
    metaTitle: "Convert JPG to PNG locally",
    description: "Save a JPEG as a lossless PNG in your browser with OxiPNG. The photo is not uploaded. The PNG is often larger than the JPEG.",
    lede: "Some tools only accept PNG. This page makes one from your JPEG without sending the file anywhere.",
    card: "Save a JPEG as a lossless PNG.",
    icon: "convert",
    format: "png",
    quality: 90,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "Will PNG make the photo sharper?",
        a: "No. A JPEG has already thrown detail away. The PNG keeps this decoded version. It does not restore the camera original, and it does not invent a transparent background.",
      },
      {
        q: "Why is the PNG bigger?",
        a: "PNG stores the picture without JPEG's lossy step. OxiPNG only finds a tighter lossless packing. If you need a smaller file, stay with JPEG or use JPG to WebP.",
      },
      {
        q: "Who is this for?",
        a: "Editors, slides, and upload forms that reject JPEG and ask for PNG. It is the wrong page when the only goal is a smaller photo.",
      },
    ],
    story: [
      "The PNG is lossless. OxiPNG packs it after the encode. A JPEG has no alpha channel to recover, so the PNG is fully opaque.",
      "Location and camera details are not written into the PNG. You still see the same picture.",
    ],
    sections: [
      {
        heading: "What you keep and what you give up",
        paragraphs: [
          "You keep the pixels the decoder produced. You give up the small JPEG size. That trade is worth it only when a program or a spec says PNG.",
          "There is no quality slider for this pair, because the PNG isn't lossy. Check the preview, then download. The file is not uploaded.",
        ],
      },
    ],
    links: formatPageLinks("/jpg-to-png"),
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
    sections: [
      {
        heading: "What WebP keeps",
        paragraphs: [
          "WebP is encoded with libwebp. Transparency stays, so a logo or a screenshot doesn't have to sit on white. Quality starts at 82. Lower it only if you need a smaller file, and check the edges first.",
          "An animated PNG is not converted. You'll get a message instead of a still of the first frame.",
        ],
      },
    ],
    links: formatPageLinks("/png-to-webp"),
  },
  {
    id: "jpg-to-webp",
    path: "/jpg-to-webp",
    kind: "convert",
    batch: false,
    title: "Convert JPG to WebP",
    metaTitle: "Convert JPG to WebP locally",
    description: "Convert a JPEG to WebP with libwebp in your browser. The WebP is often smaller at a similar look. The photo is not uploaded, and there is no account.",
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
    sections: [
      {
        heading: "What changes besides the format",
        paragraphs: [
          "The JPEG is decoded and encoded with libwebp. It is not a rename. Camera details are left out of the WebP. If the WebP comes out larger, the preview says so and you can keep the original JPEG.",
          "Use this when a site accepts WebP and you want a smaller photo. Use PNG to WebP if you started from a PNG and need the transparency kept.",
        ],
      },
    ],
    links: formatPageLinks("/jpg-to-webp"),
  },
  {
    id: "webp-to-jpg",
    path: "/webp-to-jpg",
    kind: "convert",
    batch: false,
    title: "Convert WebP to JPG",
    metaTitle: "Convert WebP to JPG locally",
    description: "Turn a WebP into a JPEG in your browser with MozJPEG, for sites and apps that only accept JPG. The WebP is not uploaded.",
    lede: "A lot of desktops and older tools still don't want a WebP. This page saves a JPEG from it, on your device.",
    card: "Save a WebP as JPEG.",
    icon: "convert",
    format: "jpeg",
    quality: 88,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "Does this only change the extension?",
        a: "No. The WebP is decoded and encoded again with MozJPEG. A renamed WebP would still be a WebP, and many upload forms would reject it.",
      },
      {
        q: "What happens to a transparent WebP?",
        a: "The transparent parts are painted onto a background before the JPEG is saved. White is the default. You'll see that fill in the preview, and you can change the color.",
      },
      {
        q: "Why is the JPEG larger?",
        a: "You're buying compatibility, not a smaller file. WebP is often the tighter format. The note under the preview says when the new file grew.",
      },
    ],
    story: [
      "Email clients, office apps, and forms that list JPG, JPEG, and PNG — and leave WebP off the list — are why this page exists.",
      "If the WebP's transparent background matters and the destination accepts PNG, use WebP to PNG instead. That pair keeps the empty parts empty.",
    ],
    sections: [
      {
        heading: "Where a JPG is the one they'll open",
        paragraphs: [
          "Camera details in the WebP are not copied into the JPEG. The picture is. Quality starts at 88. Raise it if a face or a sky starts to break up.",
          "The WebP stays on this device. This page decodes it and encodes the JPEG with MozJPEG.",
        ],
      },
    ],
    links: formatPageLinks("/webp-to-jpg"),
  },
  {
    id: "webp-to-png",
    path: "/webp-to-png",
    kind: "convert",
    batch: false,
    title: "Convert WebP to PNG",
    metaTitle: "Convert WebP to PNG locally",
    description: "Save a WebP as a PNG in your browser. Transparency can stay. OxiPNG packs the PNG, and the file is not uploaded.",
    lede: "Use this when you need a PNG and a transparent background has to survive. The WebP is decoded on this device.",
    card: "Save a WebP as PNG and keep transparency.",
    icon: "convert",
    format: "png",
    quality: 90,
    targetBytes: 200 * 1024,
    chips: "off",
    showInGrid: false,
    faqs: [
      sharedPrivacy,
      {
        q: "Is the transparency kept?",
        a: "Yes. PNG can store the same kind of transparent background WebP can. Nothing is flattened unless you later convert that PNG to JPEG.",
      },
      {
        q: "Will the PNG be smaller than the WebP?",
        a: "Usually not. OxiPNG squeezes the lossless packing, not the picture. You're changing the container to one more tools accept.",
      },
      {
        q: "What about an animated WebP?",
        a: "This version doesn't convert animations. You'll get a message instead of a silent first frame.",
      },
    ],
    story: [
      "Graphics, screenshots, and logos that use transparency belong here. A photo that just needs to open in an old app usually belongs on WebP to JPG.",
      "The PNG is written on your device. There is no account and no upload step.",
    ],
    sections: [
      {
        heading: "PNG or JPG from a WebP",
        paragraphs: [
          "Choose PNG for a transparent graphic. Choose JPG when the destination only accepts JPEG and a solid background is fine. Both happen locally, with OxiPNG for the PNG and MozJPEG for the JPEG.",
          "An animated WebP is left alone. This page will not keep the first frame and call that a conversion.",
        ],
      },
    ],
    links: formatPageLinks("/webp-to-png"),
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
    sections: [
      {
        heading: "How AVIF is encoded",
        paragraphs: [
          "AVIF uses libavif. Photos start at 4:2:0, which is the smaller setting. Sharper text switches to 4:4:4 so letters and hard edges don't smear. Quality around 60 is already strong for a photo.",
          "The encoder is slower than JPEG or WebP, and the first run downloads it. You can cancel. The photo still never leaves the device, and there is no account.",
        ],
      },
    ],
    links: formatPageLinks("/to-avif"),
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
    card: "See the camera, time, and map pin, then take them out.",
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
    sections: [
      {
        heading: "How removal works",
        paragraphs: [
          "The page reads the camera, time, and location on your device and shows them before you download. That read is not sent anywhere.",
          "A JPEG is edited in place when the file allows it. Location, camera, thumbnail, comment, and XMP data are removed. The compressed image data stays. If the file was stored sideways, libjpeg turns the pixels upright without a second lossy encode. A PNG drops its text and camera chunks. A WebP drops EXIF and XMP. Other formats are saved again at a high quality, because their extra details can't be lifted off as cleanly.",
        ],
      },
      {
        heading: "What this does not remove",
        paragraphs: [
          "The picture itself stays. A face, a street sign, or a screen in the photo is still there. This only takes out the hidden file details.",
          "If a JPEG's edges aren't aligned to the encoding blocks, a hairline of edge can be trimmed when it is turned upright. The page says so when that happens.",
        ],
      },
    ],
    links: [
      { href: "/rotate", label: "Rotate or flip a photo" },
      { href: "/compress", label: "Compress a photo" },
      { href: "/image-to-pdf", label: "Put photos in a PDF" },
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
    sections: [
      {
        heading: "How the crop is saved",
        paragraphs: [
          "Drag the box, or set a ratio: square, 4:3, 3:2, 16:9, or free. The download is that rectangle. There are no leftover bars.",
          "The cropped pixels are encoded on your device with MozJPEG, OxiPNG, libwebp, or libavif, depending on the format you leave selected. Quality starts at 88. JPEG still can't store transparency, so a transparent crop shows its fill color first.",
        ],
      },
      {
        heading: "Cropping on a phone",
        paragraphs: [
          "The handles are large enough to drag with a finger, and the arrow keys nudge the box. The photo still doesn't leave the browser, and you don't need an account.",
        ],
      },
    ],
    links: [
      { href: "/resize", label: "Resize a photo" },
      { href: "/rotate", label: "Rotate or flip a photo" },
      { href: "/compress-to-200kb", label: "Compress to 200KB" },
    ],
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
    sections: [
      {
        heading: "How a JPEG turns without a new compress",
        paragraphs: [
          "Quarter turns and flips on a JPEG are done with libjpeg. The existing compressed data is rearranged instead of being encoded again. Camera details are removed in the same pass so an old orientation tag doesn't turn the photo a second time.",
          "If the edges don't line up with the JPEG blocks, a thin strip may be trimmed, and the page tells you.",
        ],
      },
      {
        heading: "Other formats",
        paragraphs: [
          "PNG, WebP, AVIF, and HEIC are decoded, turned, and saved again. Quality is kept at 90 or higher. That path is not lossless. HEIC is decoded with libheif first. Animated images are not turned.",
        ],
      },
    ],
    links: [
      { href: "/remove-exif", label: "Remove location and camera details" },
      { href: "/crop", label: "Crop a photo" },
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
    sections: [
      {
        heading: "How the PDF is built",
        paragraphs: [
          "The PDF is built in the browser, one photo per page. Keep each photo's own pixel size, or fit the pages to A4 or Letter, and reorder them before you export.",
          "An original JPEG is embedded after a lossless cleanup: camera details removed, and turned upright when the file was stored sideways. A PNG is embedded as PNG. WebP, AVIF, and HEIC are encoded at high quality first, then placed on the page. HEIC is decoded with libheif for that step.",
        ],
      },
      {
        heading: "What this PDF is not",
        paragraphs: [
          "There's no collage, no caption, and no text box. Animated images are refused. The photos are not uploaded while the PDF is built, and there is no account to store it in.",
        ],
      },
    ],
    links: [
      { href: "/remove-exif", label: "Remove location and camera details" },
      { href: "/compress", label: "Compress a photo" },
      { href: "/batch", label: "Process a batch" },
    ],
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
    sections: [
      {
        heading: "How a batch runs",
        paragraphs: [
          "Add a set of photos, then pick one job: compress, fit a file size, resize, convert, or strip EXIF. They run a few at a time. The encoders are the same ones the single-photo tools use, including MozJPEG, OxiPNG, libwebp, libavif, and libheif for HEIC.",
          "A failure stays on that file. The others still finish, and you can retry one. Download the finished files on their own, or as a ZIP.",
        ],
      },
      {
        heading: "Limits",
        paragraphs: [
          "A normal set of about 20 phone photos is what this version is built for. More than that can run the tab out of memory, because every photo is still processed locally. Nothing is uploaded, and there is no account holding the set.",
        ],
      },
    ],
    links: [
      { href: "/compress", label: "Compress a photo" },
      { href: "/compress-to-size", label: "Compress to a size you pick" },
      { href: "/remove-exif", label: "Remove location and camera details" },
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
