import puppeteer, { Browser, Page } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { execSync } from "child_process";

const COLETAS_ONLINE_URL =
  process.env.COLETAS_ONLINE_URL || "https://rcc-spregula.coletas.online";
const USER = process.env.COLETAS_ONLINE_USER || "02948345000105";
const PASS = process.env.COLETAS_ONLINE_PASS || "21685430";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

let scrapingEmAndamento = false;

export interface Ocorrencia {
  ctrId: string;
  notId: string;
  tipo: string;
  descricao: string;
  solicitante: string;
  telefone: string;
  endereco: string;
  dtEnvioObra: string;
  dtRetirada: string;
  dtFiscalizacao: string;
  cacamba: string;
  observacao: string;
}

function killChromium(): void {
  try {
    execSync("pkill -f chromium || pkill -f chrome || true", { timeout: 5000 });
  } catch {}
}

async function login(page: Page): Promise<void> {
  await page.goto(`${COLETAS_ONLINE_URL}/Default.aspx`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await delay(2000);

  await page.type(
    "#ctl00_ContentPlaceHolder1_wuc_Login_ed_CpfCnpj",
    USER
  );
  await page.type(
    "#ctl00_ContentPlaceHolder1_wuc_Login_ed_Senha",
    PASS
  );
  await page.click(
    "#ctl00_ContentPlaceHolder1_wuc_Login_bt_Login"
  );
  await delay(3000);
}

async function selecionarModuloTransportador(page: Page): Promise<void> {
  const moduloLink = await page.$('a[href*="Transportador"]');
  if (moduloLink) {
    await moduloLink.click();
    await delay(2000);
  }
}

export async function listarOcorrencias(): Promise<Ocorrencia[]> {
  if (scrapingEmAndamento) {
    console.log("[OCORRENCIAS] Scraping já em andamento, ignorando...");
    return [];
  }

  scrapingEmAndamento = true;
  let browser: Browser | null = null;

  try {
    killChromium();
    await delay(2000);

    const execPath = await chromium.executablePath();
    browser = await puppeteer.launch({
      headless: true,
      executablePath: execPath,
      timeout: 60000,
      args: [
        ...chromium.args,
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--single-process",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    await login(page);
    await selecionarModuloTransportador(page);

    await page.goto(
      `${COLETAS_ONLINE_URL}/Transportador/OcorrenciaFiscalizacao.aspx`,
      { waitUntil: "domcontentloaded", timeout: 20000 }
    );
    await delay(3000);

    const ocorrencias = await page.evaluate(() => {
      const result: Ocorrencia[] = [];

      for (let i = 0; i < 50; i++) {
        const idx = i.toString().padStart(2, "0");
        const prefix = `ctl00_ContentPlaceHolder1_rptTR_ctl${idx}_`;

        const ctrIdEl = document.getElementById(`${prefix}lbl_CtrId`);
        if (!ctrIdEl) break;

        const notIdEl = document.getElementById(`${prefix}lbl_NotId`);
        const tipoEl = document.getElementById(`${prefix}lbl_Tipo`);
        const statusEl = document.getElementById(`${prefix}lb_Status`);
        const solicitanteEl = document.getElementById(`${prefix}Label14`);
        const telefoneEl = document.getElementById(`${prefix}Labelt10`);
        const enderecoEl = document.getElementById(`${prefix}Label6`);
        const dtEnvioEl = document.getElementById(`${prefix}lbDTEnvio`);
        const dtRetiradaEl = document.getElementById(`${prefix}lb_DTRetirada`);
        const dtFiscalizacaoEl = document.getElementById(`${prefix}lblMostraDataFiscalizacao`);
        const cacambaEl = document.getElementById(`${prefix}Label15`);
        const obsEl = document.getElementById(`${prefix}lblMostraObservacao`);

        result.push({
          ctrId: ctrIdEl?.textContent?.trim() || "",
          notId: notIdEl?.textContent?.trim() || "",
          tipo: tipoEl?.textContent?.trim() || "",
          descricao: statusEl?.textContent?.trim() || "",
          solicitante: solicitanteEl?.textContent?.trim() || "",
          telefone: telefoneEl?.textContent?.trim() || "",
          endereco: enderecoEl?.textContent?.trim() || "",
          dtEnvioObra: dtEnvioEl?.textContent?.trim() || "",
          dtRetirada: dtRetiradaEl?.textContent?.trim() || "",
          dtFiscalizacao: dtFiscalizacaoEl?.textContent?.trim() || "",
          cacamba: cacambaEl?.textContent?.trim() || "",
          observacao: obsEl?.textContent?.trim() || "",
        });
      }

      return result;
    });

    return ocorrencias;
  } catch (err: any) {
    console.error("Erro ao listar ocorrências:", err.message);
    throw err;
  } finally {
    try {
      if (browser) await browser.close();
    } catch {}
    killChromium();
    scrapingEmAndamento = false;
  }
}
