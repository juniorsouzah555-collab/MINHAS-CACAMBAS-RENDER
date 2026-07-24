const WS_URL = "https://ws.coletas.online/WSColetas.asmx";
const USER = "02948345000105";
const PASS = "21685430";
const CIDADE = parseInt(process.env.SOAP_CIDADE || "50");

function buildEnvelope(method, params) {
  let xml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method} xmlns="http://tempuri.org/">`;
  
  xml += `<iCodCidade>${CIDADE}</iCodCidade>`;
  xml += `<stLoginUser>${USER}</stLoginUser>`;
  xml += `<stSenhaUser>${PASS}</stSenhaUser>`;
  
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) {
      xml += `<${key}>${val}</${key}>`;
    }
  }
  
  xml += `</${method}>
  </soap:Body>
</soap:Envelope>`;
  return xml;
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function callSoap(method, params = {}) {
  const envelope = buildEnvelope(method, params);
  
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Método: ${method}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`\nEnvelope XML:`);
  console.log(envelope);
  
  const response = await fetch(WS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction": `http://tempuri.org/${method}`
    },
    body: envelope
  });
  
  const text = await response.text();
  
  console.log(`\nStatus HTTP: ${response.status}`);
  console.log(`\nResposta XML (primeiros 2000 chars):`);
  console.log(text.substring(0, 2000));
  
  return text;
}

function parseXml(xml) {
  const result = {};
  
  const codigo = xml.match(/<codigo[^>]*>([^<]*)<\/codigo>/);
  const mensagem = xml.match(/<mensagem[^>]*>([^<]*)<\/mensagem>/);
  if (codigo) result.codigo = codigo[1];
  if (mensagem) result.mensagem = mensagem[1];
  
  const items = [];
  const itemRegex = /<Item[^>]*>([\s\S]*?)<\/Item>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemXml = itemMatch[1];
    const item = {};
    const fieldRegex = /<([^/\s>]+)[^>]*>([^<]*)<\/\1>/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(itemXml)) !== null) {
      item[fieldMatch[1]] = fieldMatch[2];
    }
    items.push(item);
  }
  if (items.length > 0) result.items = items;
  
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const method = args[0] || "ConsultaCTRs";
  const paramKey = args[1];
  const paramValue = args[2];
  
  const params = {};
  if (paramKey && paramValue) {
    params[paramKey] = paramValue;
  }
  
  console.log(`\nTestando SOAP: ${method}`);
  console.log(`Parâmetros:`, params);
  
  try {
    const xml = await callSoap(method, params);
    const parsed = parseXml(xml);
    
    console.log(`\n${"=".repeat(60)}`);
    console.log(`RESULTADO PARSEADO:`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Código: ${parsed.codigo || "N/A"}`);
    console.log(`Mensagem: ${parsed.mensagem || "N/A"}`);
    
    if (parsed.items && parsed.items.length > 0) {
      console.log(`\nTotal de itens: ${parsed.items.length}`);
      
      // Coletar status únicos
      const statusSet = new Set();
      parsed.items.forEach(item => {
        if (item.Status) statusSet.add(item.Status);
      });
      
      if (statusSet.size > 0) {
        console.log(`\nStatus encontrados:`);
        statusSet.forEach(s => console.log(`  - ${s}`));
      }
      
      // Mostrar primeiros 5 itens
      console.log(`\nPrimeiros 5 itens:`);
      parsed.items.slice(0, 5).forEach((item, i) => {
        console.log(`\n--- Item ${i + 1} ---`);
        console.log(JSON.stringify(item, null, 2));
      });
    } else {
      console.log(`\nNenhum item encontrado`);
    }
  } catch (err) {
    console.error(`\nErro:`, err.message);
  }
}

main();
