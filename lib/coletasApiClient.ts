import { callSoap, SoapResult } from "./soapClient";

export function splitEndereco(endereco: string): { rua: string; num: string } {
  const match = endereco.match(/^(.+?),\s*(\S+)$/);
  if (match) return { rua: match[1].trim(), num: match[2].trim() };
  return { rua: endereco, num: '' };
}

export async function buscarCep(uf: string, cidade: string, bairro: string, rua: string): Promise<string> {
  const cidadeNormalizada = cidade.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

  // 1) ViaCEP por bairro — garante CEP da cidade correta
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(bairro)}/json/`, {
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) {
      const data = await resp.json() as any[];
      if (Array.isArray(data) && data.length > 0 && data[0].cep) {
        const cep = data[0].cep.replace(/\D/g, '');
        if (cep) return cep;
      }
    }
  } catch {}

  // 2) Nominatim/OSM — validado contra a cidade
  try {
    const q = encodeURIComponent(`${rua} ${bairro} ${cidade}`);
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { 'User-Agent': 'MINHAS-CACAMBAS/1.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) {
      const data = await resp.json() as any[];
      if (data.length > 0 && data[0].display_name) {
        const cepMatch = data[0].display_name.match(/(\d{5}-?\d{3})/);
        if (cepMatch) {
          const cep = cepMatch[1].replace(/\D/g, '');
          const validado = await validarCep(cep);
          if (validado && validado.toUpperCase().includes(cidadeNormalizada.substring(0, 5))) {
            return cep;
          }
        }
      }
    }
  } catch {}

  return '';
}

async function validarCep(cep: string): Promise<string | null> {
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(3000),
    });
    if (resp.ok) {
      const data = await resp.json() as any;
      if (data && !data.erro) return data.localidade || null;
    }
  } catch {}
  return null;
}

export interface CtrPrintData {
  numeroGuia: string;
  cacamba: string;
  cpfCnpj: string;
  geradorNome: string;
  geradorEmail: string;
  geradorEndereco: string;
  geradorRua: string;
  geradorNum: string;
  geradorBairro: string;
  geradorCidade: string;
  geradorCep: string;
  obraEndereco: string;
  obraRua: string;
  obraNum: string;
  obraBairro: string;
  obraCidade: string;
  obraCep: string;
  transportadorCnpj: string;
  transportadorNome: string;
  transportadorPlaca: string;
  volumesCacamba: string;
  dataEnvio: string;
  dataRetirada: string;
  dataDestinoFinal: string;
}

export async function consultarCTR(ctrNumero: string): Promise<{ link: string; hash: string; item?: any } | null> {
  const res = await callSoap("ConsultarCTR", { stNumeroCTR: ctrNumero });
  if (res.codigo !== "00") return null;

  const link = res.raw?.match(/<link[^>]*>([^<]+)/)?.[1] || "";
  const hash = link.match(/id=([^&]+)/)?.[1] || "";
  const item = res.items?.[0] || null;
  return link ? { link, hash, item } : null;
}

async function buscarCepPelaConsultaCTRs(cpfCnpj: string): Promise<{ cep: string; rua: string; num: string } | null> {
  try {
    const res = await callSoap("ConsultaCTRs", {});
    if (res.codigo !== "00" || !res.items) return null;
    for (const item of res.items) {
      if (item.GG_CPF === cpfCnpj && item.GG_Endereco_CEP) {
        return {
          cep: item.GG_Endereco_CEP.replace(/\D/g, ''),
          rua: item.GG_Endereco_Rua || '',
          num: item.GG_Endereco_Num || '',
        };
      }
    }
  } catch {}
  return null;
}

export async function buscarDadosCTR(ctrNumero: string): Promise<CtrPrintData | null> {
  const result = await consultarCTR(ctrNumero);
  if (!result) return null;

  const resp = await fetch(result.link);
  if (!resp.ok) return null;

  const html = await resp.text();

  const extract = (id: string) => {
    const match = html.match(new RegExp(`id="${id}"[^>]*>([^<]*)`));
    const val = match?.[1]?.trim() || "";
    if (/^[_\/]+$/.test(val)) return "";
    return val;
  };

  const endereco = extract("lb_GeradorEndereco");
  const bairro = extract("lb_GeradorBairro");
  const cidade = extract("lb_GeradorCidade");
  const cpfCnpj = extract("lb_CpfCNPJ");
  const { rua, num } = splitEndereco(endereco);

  let cep = '';
  let ruaFinal = rua;
  let numFinal = num;

  const dadosConsulta = await buscarCepPelaConsultaCTRs(cpfCnpj);
  if (dadosConsulta) {
    cep = dadosConsulta.cep;
    if (dadosConsulta.rua) ruaFinal = dadosConsulta.rua;
    if (dadosConsulta.num) numFinal = dadosConsulta.num;
  }

  if (!cep && rua && bairro && cidade) {
    cep = await buscarCep('SP', cidade, bairro, rua);
  }

  // Endereço da Obra vem do XML do ConsultarCTR (campos sem prefixo)
  const item = result.item;
  const obraEndereco = item?.Endereco || '';
  const obraBairro = item?.Bairro || '';
  const obraCidade = item?.Cidade || '';
  const { rua: obraRua, num: obraNum } = obraEndereco ? splitEndereco(obraEndereco) : { rua: '', num: '' };

  let obraCep = '';
  if (obraRua && obraBairro && obraCidade) {
    obraCep = await buscarCep('SP', obraCidade, obraBairro, obraRua);
  }

  return {
    numeroGuia: extract("lb_NumeroGuia"),
    cacamba: extract("lb_cacamba"),
    cpfCnpj,
    geradorNome: extract("lb_GeradorNome"),
    geradorEmail: extract("lb_GeradorEmail"),
    geradorEndereco: endereco,
    geradorRua: ruaFinal,
    geradorNum: numFinal,
    geradorBairro: bairro,
    geradorCidade: cidade,
    geradorCep: cep,
    obraEndereco,
    obraRua,
    obraNum,
    obraBairro,
    obraCidade,
    obraCep,
    transportadorCnpj: extract("lb_TransportadorCNPJ"),
    transportadorNome: extract("lb_TransportadorNome"),
    transportadorPlaca: extract("lb_TransportadorVeiculo"),
    volumesCacamba: extract("lb_VolumesCacamba"),
    dataEnvio: extract("lb_DtEnvio") || extract("lb_AssinaturasDataEnvio") || extract("lb_AssinaturasDataGerador"),
    dataRetirada: extract("lb_DtRetirada") || extract("lb_AssinaturasDataRetiradaTransportador"),
    dataDestinoFinal: extract("lb_DtDestino") || extract("lb_AssinaturasDataDestinoFinal"),
  };
}

export async function retirarCacamba(
  ctrNumero: string,
  dataRetirada: string,
  placa: string,
  idDestino: number = 758
): Promise<SoapResult> {
  return callSoap("RetirarCacambaObra", {
    stNumeroCTR: ctrNumero,
    stDataRetirada: dataRetirada,
    stPlacaVeiculo: placa,
    idDestino: idDestino,
  });
}

export interface SolicitarCTRInput {
  tipoVeiculo: number;
  classificacao: number;
  classe: number;
  volume: number;
  ggCpf: string;
  ggNome: string;
  ggEmail: string;
  ggCep: string;
  ggRua: string;
  ggNum: string;
  ggCompl: string;
  ggBairro: string;
  ggCidade: string;
  ctrCep: string;
  ctrRua: string;
  ctrNum: string;
  ctrCompl: string;
  ctrBairro: string;
  ctrCidade: string;
}

export async function solicitarCTR(input: SolicitarCTRInput): Promise<SoapResult & { idCtr?: string }> {
  const res = await callSoap("SolicitaCTR", {
    iTipoVeiculo: input.tipoVeiculo,
    iClassificacao: input.classificacao,
    iClasse: input.classe,
    ivolume: input.volume,
    iGGTipo: 0,
    GG_CPF: input.ggCpf,
    GG_Nome: input.ggNome,
    GG_Email: input.ggEmail,
    GG_Endereco_CEP: input.ggCep,
    GG_Endereco_Rua: input.ggRua,
    GG_Endereco_Num: input.ggNum,
    GG_Endereco_Compl: input.ggCompl,
    GG_Endereco_Bairro: input.ggBairro,
    GG_Endereco_Cidade: input.ggCidade,
    CTR_CEP: input.ctrCep,
    CTR_Rua: input.ctrRua,
    CTR_Num: input.ctrNum,
    CTR_Compl: input.ctrCompl,
    CTR_Bairro: input.ctrBairro,
    CTR_Cidade: input.ctrCidade,
  });

  const idCtr = res.raw?.match(/numeroCTR[^>]*>([^<]+)/i)?.[1]
    || res.raw?.match(/NumeroCTR[^>]*>([^<]+)/i)?.[1]
    || res.raw?.match(/<ID_CTR[^>]*>([^<]+)/)?.[1];
  return { ...res, idCtr };
}

export async function enviarCacambaObra(
  ctrNumero: string,
  dataEnvio: string,
  placa: string,
  cacamba: string
): Promise<SoapResult> {
  return callSoap("EnviaCacambaObra", {
    stNumeroCTR: ctrNumero,
    stDataEnvio: dataEnvio,
    stPlacaVeiculo: placa,
    stIDentificacaoCacamba: cacamba,
  });
}
