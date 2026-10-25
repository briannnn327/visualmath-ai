/* =========================================================
   Renderer sertifikat sisi server.

   Satu sumber desain:
   - CertificateTemplate -> preview langsung sebagai Server Component
   - buildCertificateSvg() -> markup SVG dari template yang sama
   - buildCertificatePng() -> raster dari SVG yang sama
   - buildCertificatePdf() -> PDF 16:9 berisi raster dari SVG yang sama
   ========================================================= */

import { deflateSync } from "node:zlib";
import { createElement } from "react";
import { prerenderToNodeStream } from "react-dom/static";
import sharp from "sharp";
import { CertificateTemplate } from "@/components/certificate/certificate-template";
import { CERTIFICATE_MAX_SCORE } from "@/lib/certificate";
import { createCertificateQrMatrix } from "@/lib/server/certificate-qr";

export interface CertificateRenderInput {
  recipientName: string;
  topicTitle: string;
  score: number;
  xp?: number;
  code: string;
  issuedAt: Date;
  verificationUrl: string;
}

export type CertificateFormat = "pdf" | "png";

const PDF_PAGE_WIDTH = 960;
const PDF_PAGE_HEIGHT = 540;
const PDF_IMAGE_WIDTH = 2560;
const PDF_IMAGE_HEIGHT = 1440;
const PNG_WIDTH = 3200;
const PNG_HEIGHT = 1800;

/** Render SVG yang identik untuk export. */
export async function buildCertificateSvg(input: CertificateRenderInput): Promise<string> {
  const qr = createCertificateQrMatrix(input.verificationUrl);
  const { prelude } = await prerenderToNodeStream(
    createElement(CertificateTemplate, {
      ...input,
      maxScore: CERTIFICATE_MAX_SCORE,
      qr,
    }),
  );

  let svg = "";
  for await (const chunk of prelude) {
    svg += chunk.toString();
  }
  return svg;
}

interface RgbImage {
  data: Buffer;
  width: number;
  height: number;
}

async function rasterize(
  input: CertificateRenderInput,
  width: number,
  height: number,
): Promise<RgbImage> {
  const svg = await buildCertificateSvg(input);
  const { data, info } = await sharp(Buffer.from(svg, "utf8"), { density: 144 })
    .resize(width, height, { fit: "fill" })
    .flatten({ background: "#07152F" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 3) {
    throw new Error(`Raster sertifikat tidak memiliki 3 kanal RGB (${info.channels}).`);
  }

  return { data, width: info.width, height: info.height };
}

/** PNG resolusi tinggi untuk dibagikan/diunggah. */
export async function buildCertificatePng(input: CertificateRenderInput): Promise<Buffer> {
  const svg = await buildCertificateSvg(input);
  return sharp(Buffer.from(svg, "utf8"), { density: 144 })
    .resize(PNG_WIDTH, PNG_HEIGHT, { fit: "fill" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

/**
 * PDF satu halaman 16:9. Raster RGB dikompresi Flate dan disematkan sebagai
 * image XObject, sehingga hasil PDF sama dengan preview/PNG tanpa perlu font.
 */
export async function buildCertificatePdf(input: CertificateRenderInput): Promise<Buffer> {
  const image = await rasterize(input, PDF_IMAGE_WIDTH, PDF_IMAGE_HEIGHT);
  const compressed = deflateSync(image.data, { level: 9 });
  return buildImagePdf({
    width: image.width,
    height: image.height,
    rgbFlate: compressed,
  });
}

function buildImagePdf(input: { width: number; height: number; rgbFlate: Buffer }): Buffer {
  const chunks: Buffer[] = [];
  const offsets: number[] = [];
  let totalLength = 0;

  const push = (value: Buffer | string) => {
    const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, "latin1");
    chunks.push(buffer);
    totalLength += buffer.length;
  };

  const pushObject = (number: number, body: Buffer | string) => {
    offsets[number] = totalLength;
    push(`${number} 0 obj\n`);
    push(body);
    push("\nendobj\n");
  };

  push("%PDF-1.4\n");
  push(Buffer.from([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  pushObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  pushObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  pushObject(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>`,
  );

  const imageHeader =
    `<< /Type /XObject /Subtype /Image /Width ${input.width} /Height ${input.height} ` +
    `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Interpolate true /Filter /FlateDecode ` +
    `/Length ${input.rgbFlate.length} >>\nstream\n`;
  pushObject(
    4,
    Buffer.concat([
      Buffer.from(imageHeader, "ascii"),
      input.rgbFlate,
      Buffer.from("\nendstream", "ascii"),
    ]),
  );

  const content = `q\n${PDF_PAGE_WIDTH} 0 0 ${PDF_PAGE_HEIGHT} 0 0 cm\n/Im0 Do\nQ\n`;
  pushObject(
    5,
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}endstream`,
  );

  const xrefStart = totalLength;
  push("xref\n0 6\n0000000000 65535 f \n");
  for (let object = 1; object <= 5; object += 1) {
    push(`${String(offsets[object]).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  return Buffer.concat(chunks);
}
