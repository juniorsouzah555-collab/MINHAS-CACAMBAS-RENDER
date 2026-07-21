const WS_URL = "https://ws.coletas.online/WSColetas.asmx";

const USER = process.env.COLETAS_ONLINE_USER || "02948345000105";
const PASS = process.env.COLETAS_ONLINE_PASS || "21685430";
const CIDADE = parseInt(process.env.COLETAS_CIDADE || "50");

export interface SoapResult {
  codigo: string;
  mensagem: string;
  items?: any[];
  raw: any;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildEnvelope(method: string, params: Record<string, any>): string {
  let xml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method} xmlns="http://tempuri.org/">`;

  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      xml += `<${key}>`;
      for (const item of val) {
        const tag = Number.isInteger(item) ? "int" : "float";
        xml += `<${tag}>${item}</${tag}>`;
      }
      xml += `</${key}>`;
    } else {
      xml += `<${key}>${escapeXml(String(val))}</${key}>`;
    }
  }

  xml += `</${method}>
  </soap:Body>
</soap:Envelope>`;
  return xml;
}

export async function callSoap(
  method: string,
  params: Record<string, any> = {}
): Promise<SoapResult> {
  const fullParams = {
    ...params,
    iCodCidade: CIDADE,
    stLoginUser: USER,
    stSenhaUser: PASS,
  };

  const envelope = buildEnvelope(method, fullParams);

  const res = await fetch(WS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `http://tempuri.org/${method}`,
    },
    body: envelope,
  });

  const text = await res.text();

  const regex = new RegExp(
    `<${method}Result[^>]*>([\\s\\S]*?)<\\/${method}Result>`
  );
  const bodyMatch = text.match(regex);
  if (!bodyMatch) {
    throw new Error(`Resposta SOAP inválida para ${method}: ${text.substring(0, 500)}`);
  }

  const resultXml = bodyMatch[1];
  const codigo = resultXml.match(/<codigo[^>]*>([^<]*)<\/codigo>/)?.[1] || "";
  const mensagem = resultXml.match(/<mensagem[^>]*>([^<]*)<\/mensagem>/)?.[1] || "";

  const items: any[] = [];
  const itemRegex = /<Item[^>]*>([\s\S]*?)<\/Item>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(resultXml)) !== null) {
    const item: any = {};
    const fieldRegex = /<([^/\s>]+)[^>]*>([^<]*)<\/\1>/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(itemMatch[1])) !== null) {
      item[fieldMatch[1]] = fieldMatch[2];
    }
    items.push(item);
  }

  return {
    codigo,
    mensagem,
    items: items.length > 0 ? items : undefined,
    raw: resultXml,
  };
}
