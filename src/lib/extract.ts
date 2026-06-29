// 从 PDF / DOCX / URL 抽取纯文本

export async function extractPdf(base64: string): Promise<string> {
  const mod = await import("pdf-parse");
  const pdfParse = (mod as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default;
  const buf = Buffer.from(base64, "base64");
  const r = await pdfParse(buf);
  return r.text;
}

/**
 * 极简 DOCX 抽取：DOCX 本质是 zip 包，内部 word/document.xml 是正文。
 * 不引第三方 docx 解析依赖，用内置 zlib + 一次性 stream parsing。
 */
export async function extractDocx(base64: string): Promise<string> {
  const buf = Buffer.from(base64, "base64");
  const text = await readDocxBuffer(buf);
  return text;
}

async function readDocxBuffer(buf: Buffer): Promise<string> {
  const target = "word/document.xml";
  for (let i = 0; i < buf.length - 30; i++) {
    // local file header signature: 0x04034b50 little-endian
    if (
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x03 &&
      buf[i + 3] === 0x04
    ) {
      const nameLen = buf.readUInt16LE(i + 26);
      const extraLen = buf.readUInt16LE(i + 28);
      const name = buf.slice(i + 30, i + 30 + nameLen).toString("utf-8");
      if (name === target) {
        const method = buf.readUInt16LE(i + 8);
        let compSize = buf.readUInt32LE(i + 18);
        if (compSize === 0) {
          // 数据描述符模式：扫到下一个 PK 头
          const dataStart = i + 30 + nameLen + extraLen;
          let j = dataStart;
          while (j < buf.length - 4) {
            if (
              buf[j] === 0x50 &&
              buf[j + 1] === 0x4b &&
              (buf[j + 2] === 0x07 || buf[j + 2] === 0x03 || buf[j + 2] === 0x01)
            )
              break;
            j++;
          }
          compSize = j - dataStart;
        }
        const dataStart = i + 30 + nameLen + extraLen;
        const compData = buf.slice(dataStart, dataStart + compSize);
        const xml = await inflate(compData, method);
        return xmlToText(xml.toString("utf-8"));
      }
    }
  }
  return "";
}

function inflate(input: Buffer, method: number): Promise<Buffer> {
  if (method === 0) return Promise.resolve(input); // stored
  return new Promise((resolve, reject) => {
    import("node:zlib").then((zlib) => {
      zlib.inflateRaw(input, (err, out) => (err ? reject(err) : resolve(out)));
    });
  });
}

function xmlToText(xml: string): string {
  // 段落 = <w:p> ... </w:p>；文本 = <w:t>...</w:t>
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (RecruitCopilot) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24000);
}
