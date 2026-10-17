import { PDFDocument, PDFName, PDFString, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DailyEdition } from "@/types/paper";

export const SUMMARY_FALLBACK = "Read the full story at the original publisher.";
export async function createNewspaperPdf(edition: DailyEdition): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontDir = path.join(process.cwd(), "node_modules/@fontsource/noto-serif/files");
  const regular = await doc.embedFont(await readFile(path.join(fontDir, "noto-serif-latin-400-normal.woff")), { subset: true });
  const bold = await doc.embedFont(await readFile(path.join(fontDir, "noto-serif-latin-700-normal.woff")), { subset: true });
  doc.setTitle(`The Morning Paper - ${edition.date}`);
  doc.setSubject(`Saved edition ${edition.id}`);
  doc.setCreationDate(new Date(edition.generatedAt));
  const W = 595.28, H = 841.89, margin = 38, gap = 24, width = (W - margin * 2 - gap) / 2;
  const ink = rgb(.12, .13, .12);
  let page = doc.addPage([W, H]);
  let column = 0, y = 680;
  const x = () => margin + column * (width + gap);
  function text(value: string, px: number, py: number, size: number, font = regular) {
    page.drawText(value, { x: px, y: py, size, font, color: ink });
  }
  function header() {
    text("THE MORNING PAPER", margin, H - 65, 29, bold);
    text("A little perspective, every day.", margin, H - 85, 10);
    text(edition.date, W - 110, H - 85, 10);
    page.drawLine({ start: { x: margin, y: H - 100 }, end: { x: W - margin, y: H - 100 }, thickness: 2, color: ink });
    text("PERSONAL EDITION  /  PUBLISHER EXCERPTS", margin, H - 118, 8);
    page.drawLine({ start: { x: W / 2, y: 690 }, end: { x: W / 2, y: 55 }, thickness: .4, color: rgb(.7, .7, .7) });
  }
  function advance() {
    if (column === 0) column = 1;
    else { page = doc.addPage([W, H]); column = 0; header(); }
    y = 680;
  }
  function lines(value: string, font: PDFFont, size: number) {
    const result: string[] = [];
    let line = "";
    for (const word of value.replace(/\s+/g, " ").trim().split(" ")) {
      if (font.widthOfTextAtSize(`${line}${line ? " " : ""}${word}`, size) <= width) { line += `${line ? " " : ""}${word}`; continue; }
      if (line) result.push(line);
      line = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > width && line) { result.push(line); line = ""; }
        line += char;
      }
    }
    if (line) result.push(line);
    return result;
  }
  function paragraph(value: string, size: number, font = regular, leading = size * 1.5) {
    for (const line of lines(value, font, size)) {
      if (y < 70) advance();
      text(line, x(), y, size, font); y -= leading;
    }
    y -= 9;
  }
  header();
  if (!edition.articles.length) paragraph("No articles were included in this saved edition.", 14, bold);
  edition.articles.forEach((article, index) => {
    if (y < 230) advance();
    paragraph(`${String(index + 1).padStart(2, "0")} / ${article.matchedTopics.join(" / ")}`, 8, bold);
    paragraph(article.title || "Untitled story", index === 0 ? 21 : 18, bold, index === 0 ? 26 : 23);
    paragraph(`${article.source} | ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: edition.preferences.timezone }).format(new Date(article.publishedAt))}`, 8);
    paragraph(article.summary || SUMMARY_FALLBACK, 10.5);
    paragraph(article.reason, 8);
    if (y < 90) advance();
    const label = "Read original article";
    text(label, x(), y, 9, bold);
    if (/^https?:\/\//i.test(article.url)) {
      const annotation = doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [x(), y - 2, x() + bold.widthOfTextAtSize(label, 9), y + 11], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(article.url) } });
      page.node.addAnnot(doc.context.register(annotation));
    }
    y -= 18;
    page.drawLine({ start: { x: x(), y }, end: { x: x() + width, y }, thickness: .5, color: ink });
    y -= 24;
  });
  if (edition.sourceNotice) paragraph(edition.sourceNotice, 8);
  doc.getPages().forEach((p, i) => {
    p.drawText(`${edition.date}  |  ${edition.preferences.timezone}  |  Page ${i + 1} of ${doc.getPageCount()}`, { x: margin, y: 32, size: 8, font: regular, color: ink });
  });
  // Keep the metadata reference stable for exact-edition verification.
  doc.catalog.set(PDFName.of("Lang"), PDFString.of("en"));
  return doc.save();
}
