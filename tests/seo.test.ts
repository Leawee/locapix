import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config.ts";
import { SIZE_PRESETS } from "../lib/bytes.ts";
import { llmsText } from "../lib/llms.ts";
import { formatLinks, tools } from "../lib/tools.ts";

const sizeIds = [
  "compress-to-50kb",
  "compress-to-100kb",
  "compress-to-200kb",
  "compress-to-500kb",
  "compress-to-1mb",
  "compress-to-2mb",
  "compress-to-8mb",
];

const mainIds = [
  "compress",
  "compress-to-size",
  "resize",
  "convert",
  "remove-exif",
  "crop",
  "rotate",
  "image-to-pdf",
  "batch",
];

test("jpg-to-webp description is a useful length", () => {
  const tool = tools.find((item) => item.id === "jpg-to-webp");
  assert.ok(tool);
  assert.ok(tool.description.length >= 120 && tool.description.length <= 160, tool.description);
});

test("size pages have distinct copy and faqs", () => {
  const pages = sizeIds.map((id) => {
    const tool = tools.find((item) => item.id === id);
    assert.ok(tool, id);
    return tool;
  });
  const ledes = new Set(pages.map((tool) => tool.lede));
  const descriptions = new Set(pages.map((tool) => tool.description));
  const stories = new Set(pages.map((tool) => tool.story.join("\n")));
  assert.equal(ledes.size, pages.length);
  assert.equal(descriptions.size, pages.length);
  assert.equal(stories.size, pages.length);
  for (const tool of pages) {
    assert.ok(tool.sections && tool.sections.length > 0);
    const questions = tool.faqs.map((faq) => faq.q);
    assert.equal(new Set(questions).size, questions.length);
    const unique = tool.faqs.filter((faq) => faq.q !== "Do you upload my photo?");
    assert.ok(unique.length >= 2);
    assert.ok(tool.links?.some((link) => link.href.startsWith("/compress-to-")));
  }
  const faqSets = pages.map((tool) => tool.faqs.map((faq) => faq.q).sort().join("|"));
  assert.equal(new Set(faqSets).size, pages.length);
});

test("main tools have useful sections", () => {
  for (const id of mainIds) {
    const tool = tools.find((item) => item.id === id);
    assert.ok(tool, id);
    assert.ok(tool.sections && tool.sections.length >= 2, id);
    assert.ok(tool.sections.every((section) => section.heading.length > 0 && section.paragraphs.length > 0));
  }
});

test("convert landings exist and size presets point at real tools", () => {
  for (const path of ["/png-to-jpg", "/jpg-to-png", "/webp-to-jpg", "/webp-to-png", "/heic-to-jpg"]) {
    assert.ok(tools.some((tool) => tool.path === path), path);
  }
  assert.equal(tools.some((tool) => tool.path === "/heic-to-jpeg"), false);
  for (const preset of SIZE_PRESETS) {
    assert.ok(tools.some((tool) => tool.path === preset.path && tool.targetBytes === preset.bytes));
  }
  for (const link of formatLinks) {
    assert.ok(tools.some((tool) => tool.path === link.href));
  }
});

test("exif card is not a repeat of the title", () => {
  const tool = tools.find((item) => item.id === "remove-exif");
  assert.ok(tool);
  assert.notEqual(tool.card.replace(/\.$/, ""), tool.title);
});

test("llms.txt names the local encoders and every tool", () => {
  const text = llmsText();
  assert.match(text, /not uploaded/);
  assert.match(text, /no account/i);
  assert.match(text, /MozJPEG/);
  assert.match(text, /OxiPNG/);
  assert.match(text, /libwebp/);
  assert.match(text, /libavif/);
  assert.match(text, /libheif/);
  for (const tool of tools) assert.match(text, new RegExp(tool.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("heic-to-jpeg redirects permanently to heic-to-jpg", async () => {
  const redirects = await nextConfig.redirects();
  const rule = redirects.find((item) => item.source === "/heic-to-jpeg");
  assert.ok(rule);
  assert.equal(rule.destination, "/heic-to-jpg");
  assert.equal(rule.permanent, true);
});
