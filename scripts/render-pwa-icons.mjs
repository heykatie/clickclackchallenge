import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const blush = [0xfb, 0xed, 0xef, 0xff];
const white = [0xff, 0xfd, 0xfc, 0xff];
const lavender = [0xaa, 0x9a, 0xd4, 0xff];
const mint = [0x6c, 0xcf, 0xc7, 0xff];

const root = join(dirname(fileURLToPath(import.meta.url)), "../public/icons");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function png(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const start = y * (width * 4 + 1);
    raw[start] = 0;
    pixels.copy(raw, start + 1, y * width * 4, (y + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function blend(under, over) {
  const alpha = over[3] / 255;
  return [
    Math.round(over[0] * alpha + under[0] * (1 - alpha)),
    Math.round(over[1] * alpha + under[1] * (1 - alpha)),
    Math.round(over[2] * alpha + under[2] * (1 - alpha)),
    255,
  ];
}

function roundedDistance(x, y, left, top, width, height, radius) {
  const nearestX = Math.min(Math.max(x, left + radius), left + width - radius);
  const nearestY = Math.min(Math.max(y, top + radius), top + height - radius);
  return Math.hypot(x - nearestX, y - nearestY);
}

function paint(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const keyLeft = size * 0.22;
  const keyTop = size * 0.28;
  const keyWidth = size * 0.56;
  const keyHeight = size * 0.46;
  const keyRadius = size * 0.1;
  const stroke = Math.max(2, size * 0.028);
  const legendLeft = size * 0.34;
  const legendTop = size * 0.4;
  const legendWidth = size * 0.16;
  const legendHeight = size * 0.055;
  const legendRadius = legendHeight / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let color = blush;
      const keyEdge = roundedDistance(x + 0.5, y + 0.5, keyLeft, keyTop, keyWidth, keyHeight, keyRadius);
      if (keyEdge <= keyRadius) {
        color = keyEdge >= keyRadius - stroke ? lavender : white;
      }
      const legendEdge = roundedDistance(
        x + 0.5,
        y + 0.5,
        legendLeft,
        legendTop,
        legendWidth,
        legendHeight,
        legendRadius,
      );
      if (legendEdge <= legendRadius) {
        color = blend(color, mint);
      }
      const offset = (y * size + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }
  return png(size, size, pixels);
}

mkdirSync(root, { recursive: true });
writeFileSync(join(root, "icon-192.png"), paint(192));
writeFileSync(join(root, "icon-512.png"), paint(512));
writeFileSync(join(root, "apple-touch-icon.png"), paint(180));
