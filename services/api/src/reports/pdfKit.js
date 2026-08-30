"use strict";

const {
  CONTENT_LEFT,
  CONTENT_RIGHT,
  CONTENT_WIDTH,
  CONTENT_BOTTOM,
  FONT,
  safe
} = require("./pdfTheme");

function ensureSpace(doc, needed) {
  if (doc.y + needed > CONTENT_BOTTOM) {
    doc.addPage();
    return true;
  }
  return false;
}

// pdfkit still wraps when `width` is set, so shrink long values instead of
// letting them spill out of a fixed-height card.
function fitFontSize(doc, text, font, maxSize, minSize, width) {
  let size = maxSize;
  doc.font(font);
  while (size > minSize && doc.fontSize(size).widthOfString(text) > width) {
    size -= 0.5;
  }
  return size;
}

function polar(cx, cy, radius, degrees) {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

/**
 * Drawing helpers bound to one request's palette. Returning a bound set keeps
 * theme colors out of module scope, so concurrent downloads with different
 * themes cannot bleed into one another.
 */
function createDrawKit(C) {
  function sectionTitle(doc, title, subtitle) {
    ensureSpace(doc, subtitle ? 62 : 48);
    const y = doc.y;
    doc.save();
    doc.rect(CONTENT_LEFT, y + 1, 3, 16).fill(C.brand);
    doc.restore();
    doc.fillColor(C.ink).font(FONT.bold).fontSize(14)
      .text(safe(title), CONTENT_LEFT + 12, y, { width: CONTENT_WIDTH - 12 });
    if (subtitle) {
      doc.fillColor(C.muted).font(FONT.regular).fontSize(9)
        .text(safe(subtitle), CONTENT_LEFT + 12, doc.y + 1, { width: CONTENT_WIDTH - 12 });
    }
    doc.moveDown(0.45);
    const ruleY = doc.y;
    doc.save().lineWidth(0.75).strokeColor(C.line)
      .moveTo(CONTENT_LEFT, ruleY).lineTo(CONTENT_RIGHT, ruleY).stroke().restore();
    doc.y = ruleY + 10;
    doc.x = CONTENT_LEFT;
  }

  function subTitle(doc, text) {
    ensureSpace(doc, 40);
    doc.y += 8;
    doc.fillColor(C.ink).font(FONT.bold).fontSize(10.5)
      .text(safe(text), CONTENT_LEFT, doc.y, { width: CONTENT_WIDTH });
    doc.y += 4;
    doc.x = CONTENT_LEFT;
  }

  function paragraph(doc, text, options = {}) {
    const value = safe(text);
    if (!value) return;
    const size = options.size || 9.5;
    const color = options.color || C.body;
    const width = options.width || CONTENT_WIDTH;
    const height = doc.font(FONT.regular).fontSize(size).heightOfString(value, { width });
    ensureSpace(doc, height + 6);
    doc.fillColor(color).font(options.bold ? FONT.bold : FONT.regular).fontSize(size)
      .text(value, CONTENT_LEFT, doc.y, { width, align: options.align || "left" });
    doc.y += options.gap === undefined ? 5 : options.gap;
    doc.x = CONTENT_LEFT;
  }

  function bulletList(doc, items, options = {}) {
    const list = (items || []).map((item) => safe(item)).filter(Boolean);
    if (!list.length) return;
    const limit = options.limit || list.length;
    const size = options.size || 9.5;
    const indent = options.indent === undefined ? 12 : options.indent;
    const width = CONTENT_WIDTH - indent - 8;

    list.slice(0, limit).forEach((item) => {
      const height = doc.font(FONT.regular).fontSize(size).heightOfString(item, { width });
      ensureSpace(doc, height + 5);
      const y = doc.y;
      doc.save();
      doc.circle(CONTENT_LEFT + indent - 6, y + size * 0.42, 1.7).fill(options.dotColor || C.brand);
      doc.restore();
      doc.fillColor(options.color || C.body).font(FONT.regular).fontSize(size)
        .text(item, CONTENT_LEFT + indent, y, { width });
      doc.y += 3.5;
    });

    if (list.length > limit) {
      doc.fillColor(C.faint).font(FONT.italic).fontSize(8.5)
        .text(`+ ${list.length - limit} more not shown`, CONTENT_LEFT + indent, doc.y, { width });
      doc.y += 3;
    }
    doc.x = CONTENT_LEFT;
  }

  function pillWidth(doc, text, size = 8) {
    return doc.font(FONT.bold).fontSize(size).widthOfString(safe(text)) + 14;
  }

  function pill(doc, x, y, text, tone, options = {}) {
    const label = safe(text).toUpperCase();
    const size = options.size || 8;
    const height = options.height || 14;
    const width = options.width || pillWidth(doc, label, size);
    doc.save();
    doc.roundedRect(x, y, width, height, height / 2).fill(tone.bg);
    doc.restore();
    doc.fillColor(tone.fg).font(FONT.bold).fontSize(size)
      .text(label, x, y + (height - size) / 2 + 0.5, { width, align: "center", lineBreak: false });
    return width;
  }

  function statCard(doc, x, y, width, height, { label, value, hint, accent }) {
    const color = accent || C.brand;
    doc.save();
    doc.roundedRect(x, y, width, height, 8).fill(C.surface);
    doc.roundedRect(x, y, width, height, 8).lineWidth(0.75).stroke(C.line);
    doc.rect(x, y + 8, 3, height - 16).fill(color);
    doc.restore();

    const labelText = safe(label).toUpperCase();
    doc.fillColor(C.muted).font(FONT.bold)
      .fontSize(fitFontSize(doc, labelText, FONT.bold, 7.5, 5.5, width - 24))
      .text(labelText, x + 14, y + 11, { width: width - 22, lineBreak: false });

    const valueText = safe(value);
    doc.fillColor(color).font(FONT.bold)
      .fontSize(fitFontSize(doc, valueText, FONT.bold, 21, 9, width - 26))
      .text(valueText, x + 13, y + 24, { width: width - 22, lineBreak: false });

    if (hint) {
      doc.fillColor(C.faint).font(FONT.regular).fontSize(7.5)
        .text(safe(hint), x + 14, y + height - 18, { width: width - 22, lineBreak: false });
    }
  }

  function statCardRow(doc, cards, options = {}) {
    const height = options.height || 68;
    const gap = options.gap === undefined ? 12 : options.gap;
    ensureSpace(doc, height + 12);
    const y = doc.y;
    const width = (CONTENT_WIDTH - gap * (cards.length - 1)) / cards.length;
    cards.forEach((card, index) => {
      statCard(doc, CONTENT_LEFT + index * (width + gap), y, width, height, card);
    });
    doc.y = y + height + 14;
    doc.x = CONTENT_LEFT;
  }

  function donutSegment(doc, cx, cy, outer, inner, startAngle, sweep, color) {
    if (sweep <= 0) return;
    const span = Math.min(sweep, 359.99);
    const end = startAngle + span;
    const large = span > 180 ? 1 : 0;
    const o0 = polar(cx, cy, outer, startAngle);
    const o1 = polar(cx, cy, outer, end);
    const i1 = polar(cx, cy, inner, end);
    const i0 = polar(cx, cy, inner, startAngle);
    const path = [
      `M ${o0.x} ${o0.y}`,
      `A ${outer} ${outer} 0 ${large} 1 ${o1.x} ${o1.y}`,
      `L ${i1.x} ${i1.y}`,
      `A ${inner} ${inner} 0 ${large} 0 ${i0.x} ${i0.y}`,
      "Z"
    ].join(" ");
    doc.save().path(path).fill(color).restore();
  }

  function donutChart(doc, cx, cy, radius, slices, center) {
    const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);
    const inner = radius * 0.62;
    if (!total) {
      doc.save();
      doc.circle(cx, cy, radius).lineWidth(radius - inner).stroke(C.lineSoft);
      doc.restore();
    } else {
      let angle = 0;
      slices.forEach((slice) => {
        const sweep = (Math.max(0, slice.value) / total) * 360;
        if (sweep > 0) donutSegment(doc, cx, cy, radius, inner, angle, sweep, slice.color);
        angle += sweep;
      });
    }
    if (center) {
      doc.fillColor(center.color || C.ink).font(FONT.bold).fontSize(center.size || 17)
        .text(safe(center.value), cx - radius, cy - 12, { width: radius * 2, align: "center", lineBreak: false });
      if (center.label) {
        doc.fillColor(C.muted).font(FONT.bold).fontSize(7)
          .text(safe(center.label).toUpperCase(), cx - radius, cy + 6, {
            width: radius * 2, align: "center", lineBreak: false
          });
      }
    }
  }

  function legend(doc, x, y, entries, options = {}) {
    const size = options.size || 8.5;
    const lineHeight = options.lineHeight || 15;
    entries.forEach((entry, index) => {
      const rowY = y + index * lineHeight;
      doc.save().roundedRect(x, rowY + 1.5, 8, 8, 2).fill(entry.color).restore();
      doc.fillColor(C.body).font(FONT.regular).fontSize(size)
        .text(safe(entry.label), x + 14, rowY, { width: options.width || 150, lineBreak: false });
    });
    return y + entries.length * lineHeight;
  }

  function stackedBar(doc, x, y, width, height, segments) {
    const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
    doc.save().roundedRect(x, y, width, height, height / 2).fill(C.lineSoft).restore();
    if (!total) return;
    let cursor = x;
    segments.forEach((segment) => {
      const segmentWidth = (Math.max(0, segment.value) / total) * width;
      if (segmentWidth <= 0.4) return;
      doc.save().rect(cursor, y, segmentWidth, height).fill(segment.color).restore();
      cursor += segmentWidth;
    });
  }

  function keyValueGrid(doc, entries, options = {}) {
    const rows = entries.filter((entry) => entry && safe(entry.value));
    if (!rows.length) return;
    const cols = options.columns || 3;
    const gap = 14;
    const cellWidth = (CONTENT_WIDTH - gap * (cols - 1)) / cols;
    const size = 9.5;

    for (let index = 0; index < rows.length; index += cols) {
      const slice = rows.slice(index, index + cols);
      const heights = slice.map((entry) => (
        doc.font(FONT.regular).fontSize(size).heightOfString(safe(entry.value), { width: cellWidth - 4 })
      ));
      const rowHeight = Math.max(...heights) + 20;
      ensureSpace(doc, rowHeight + 4);
      const y = doc.y;
      slice.forEach((entry, column) => {
        const x = CONTENT_LEFT + column * (cellWidth + gap);
        doc.fillColor(C.faint).font(FONT.bold).fontSize(7.5)
          .text(safe(entry.label).toUpperCase(), x, y, { width: cellWidth, lineBreak: false });
        doc.fillColor(entry.color || C.ink).font(entry.bold ? FONT.bold : FONT.regular).fontSize(size)
          .text(safe(entry.value), x, y + 11, { width: cellWidth - 4 });
      });
      doc.y = y + rowHeight;
    }
    doc.x = CONTENT_LEFT;
  }

  function calloutBox(doc, { title, body, tone, lines }) {
    const palette = tone || { fg: C.info, bg: C.infoBg };
    const innerWidth = CONTENT_WIDTH - 34;
    const bodyLines = (lines || []).map((line) => safe(line)).filter(Boolean);
    const bodyText = safe(body);

    let contentHeight = 0;
    if (title) contentHeight += 13;
    if (bodyText) {
      contentHeight += doc.font(FONT.regular).fontSize(9.5).heightOfString(bodyText, { width: innerWidth }) + 3;
    }
    bodyLines.forEach((line) => {
      contentHeight += doc.font(FONT.regular).fontSize(9).heightOfString(line, { width: innerWidth - 10 }) + 3;
    });
    const boxHeight = contentHeight + 22;
    ensureSpace(doc, boxHeight + 8);

    const y = doc.y;
    doc.save();
    doc.roundedRect(CONTENT_LEFT, y, CONTENT_WIDTH, boxHeight, 7).fill(palette.bg);
    doc.rect(CONTENT_LEFT, y + 6, 3, boxHeight - 12).fill(palette.fg);
    doc.restore();

    let cursor = y + 11;
    if (title) {
      doc.fillColor(palette.fg).font(FONT.bold).fontSize(9.5)
        .text(safe(title), CONTENT_LEFT + 16, cursor, { width: innerWidth });
      cursor = doc.y + 2;
    }
    if (bodyText) {
      doc.fillColor(C.ink).font(FONT.regular).fontSize(9.5)
        .text(bodyText, CONTENT_LEFT + 16, cursor, { width: innerWidth });
      cursor = doc.y + 2;
    }
    bodyLines.forEach((line) => {
      doc.fillColor(C.body).font(FONT.regular).fontSize(9)
        .text(line, CONTENT_LEFT + 24, cursor, { width: innerWidth - 10 });
      cursor = doc.y + 2;
    });

    doc.y = y + boxHeight + 10;
    doc.x = CONTENT_LEFT;
  }

  function drawTable(doc, { columns, rows, fontSize = 8.5, padding = 6, minRowHeight = 20, emptyText }) {
    if (!rows || !rows.length) {
      if (emptyText) paragraph(doc, emptyText, { color: C.muted, size: 9 });
      return;
    }

    const headerHeight = 22;

    const drawHeader = () => {
      ensureSpace(doc, headerHeight + minRowHeight);
      const y = doc.y;
      doc.save().rect(CONTENT_LEFT, y, CONTENT_WIDTH, headerHeight).fill(C.tableHeaderBg).restore();
      let x = CONTENT_LEFT;
      columns.forEach((column) => {
        doc.fillColor(C.tableHeaderInk).font(FONT.bold).fontSize(7.5)
          .text(safe(column.label).toUpperCase(), x + padding, y + 7, {
            width: column.width - padding * 2,
            align: column.align || "left",
            lineBreak: false
          });
        x += column.width;
      });
      doc.y = y + headerHeight;
    };

    drawHeader();

    rows.forEach((row, index) => {
      const cells = columns.map((column) => safe(row[column.key]));
      const heights = columns.map((column, cellIndex) => (
        doc.font(FONT.regular).fontSize(fontSize)
          .heightOfString(cells[cellIndex] || " ", { width: column.width - padding * 2 })
      ));
      const rowHeight = Math.max(minRowHeight, Math.max(...heights) + padding * 2);

      if (doc.y + rowHeight > CONTENT_BOTTOM) {
        doc.addPage();
        drawHeader();
      }

      const y = doc.y;
      if (index % 2 === 1) {
        doc.save().rect(CONTENT_LEFT, y, CONTENT_WIDTH, rowHeight).fill(C.surface).restore();
      }
      doc.save().lineWidth(0.5).strokeColor(C.lineSoft)
        .moveTo(CONTENT_LEFT, y + rowHeight).lineTo(CONTENT_RIGHT, y + rowHeight).stroke().restore();

      let x = CONTENT_LEFT;
      columns.forEach((column, cellIndex) => {
        const value = cells[cellIndex];
        if (column.pill) {
          const tone = C.toneFor(value, column.pillKind);
          const width = pillWidth(doc, value, 7.5);
          const pillX = column.align === "center" ? x + (column.width - width) / 2 : x + padding;
          if (value) pill(doc, pillX, y + (rowHeight - 14) / 2, value, tone, { size: 7.5 });
        } else {
          doc.fillColor(column.color ? column.color(row) : C.body)
            .font(column.bold ? FONT.bold : FONT.regular).fontSize(fontSize)
            .text(value, x + padding, y + padding, {
              width: column.width - padding * 2,
              align: column.align || "left"
            });
        }
        x += column.width;
      });

      doc.y = y + rowHeight;
    });

    doc.y += 8;
    doc.x = CONTENT_LEFT;
  }

  return {
    ensureSpace,
    fitFontSize,
    sectionTitle,
    subTitle,
    paragraph,
    bulletList,
    pill,
    pillWidth,
    statCard,
    statCardRow,
    donutChart,
    legend,
    stackedBar,
    keyValueGrid,
    calloutBox,
    drawTable
  };
}

module.exports = { createDrawKit, ensureSpace };
