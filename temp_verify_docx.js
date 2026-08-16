const fs = require('fs');
const path = require('path');
const outPath = path.join(__dirname, 'temp_docx_manual.docx');
const entries = [
  {
    name: '[Content_Types].xml',
    data: '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n  <Default Extension="xml" ContentType="application/xml"/>\n  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>\n</Types>'
  },
  {
    name: '_rels/.rels',
    data: '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>\n</Relationships>'
  },
  {
    name: 'word/document.xml',
    data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">\n  <w:body>\n    <w:p><w:r><w:t>Hello .docx BRD</w:t></w:r></w:p>\n    <w:p><w:r><w:t>Requirement: Search hotels by city</w:t></w:r></w:p>\n    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr>\n  </w:body>\n</w:document>'
  }
];
function makeTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
}
const crcTable = makeTable();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const localParts = [];
const centralParts = [];
let offset = 0;
for (const entry of entries) {
  const nameBuf = Buffer.from(entry.name, 'utf8');
  const dataBuf = Buffer.from(entry.data, 'utf8');
  const crc = crc32(dataBuf);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(dataBuf.length, 18);
  header.writeUInt32LE(dataBuf.length, 22);
  header.writeUInt16LE(nameBuf.length, 26);
  header.writeUInt16LE(0, 28);
  const local = Buffer.concat([header, nameBuf, dataBuf]);
  localParts.push(local);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0, 14);
  central.writeUInt16LE(0, 16);
  central.writeUInt32LE(crc, 18);
  central.writeUInt32LE(dataBuf.length, 22);
  central.writeUInt32LE(dataBuf.length, 26);
  central.writeUInt16LE(nameBuf.length, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt16LE(0, 38);
  central.writeUInt32LE(0, 40);
  central.writeUInt32LE(offset, 42);
  centralParts.push(Buffer.concat([central, nameBuf]));
  offset += local.length;
}
const centralDir = Buffer.concat(centralParts);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(entries.length, 8);
eocd.writeUInt16LE(entries.length, 10);
eocd.writeUInt32LE(centralDir.length, 12);
eocd.writeUInt32LE(offset, 16);
eocd.writeUInt16LE(0, 20);
fs.writeFileSync(outPath, Buffer.concat([...localParts, centralDir, eocd]));
console.log('Wrote', outPath);
const mammoth = require('mammoth');
mammoth.extractRawText({path: outPath}).then(r => {
  console.log('PARSED:', JSON.stringify(r.value));
}).catch(err => {
  console.error('PARSE_ERR', err);
  process.exit(1);
});
