import { callSoap, SoapResult } from "./soapClient";

function splitEndereco(endereco: string): { rua: string; num: string } {
  const match = endereco.match(/^(.+?),\s*(\S+)$/);
  if (match) return { rua: match[1].trim(), num: match[2].trim() };
  return { rua: endereco, num: '' };
}

export async function buscarCep(uf: string, cidade: string, bairro: string, rua: string): Promise<string> {
  try {
    const cid = encodeURIComponent(cidade);
    const bai = encodeURIComponent(bairro);
    const r = encodeURIComponent(rua);
    const resp = await fetch(`https://viacep.com.br/ws/${uf}/${cid}/${bai}/${r}/json/`);
    if (!resp.ok) return '';
    const data = await resp.json() as any[];
    if (Array.isArray(data) && data.length > 0 && data[0].cep) {
      return data[0].cep.replace(/\D/g, '');
    }
  } catch {}
  return '';
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
  transportadorCnpj: string;
  transportadorNome: string;
  transportadorPlaca: string;
  volumesCacamba: string;
  dataEnvio: string;
  dataRetirada: string;
  dataDestinoFinal: string;
}

export async function consultarCTR(ctrNumero: string): Promise<{ link: string; hash: string } | null> {
  const res = await callSoap("ConsultarCTR", { stNumeroCTR: ctrNumero });
  if (res.codigo !== "00") return null;

  const link = res.raw?.match(/<link[^>]*>([^<]+)/)?.[1] || "";
  const hash = link.match(/id=([^&]+)/)?.[1] || "";
  return link ? { link, hash } : null;
}

export async function buscarDadosCTR(ctrNumero: string): Promise<CtrPrintData | null> {
  const result = await consultarCTR(ctrNumero);
  if (!result) return null;

  const resp = await fetch(result.link);
  if (!resp.ok) return null;

  const html = await resp.text();

  const extract = (id: string) => {
    const match = html.match(new RegExp(`id="${id}"[^>]*>([^<]*)`));
    return match?.[1]?.trim() || "";
  };

  const endereco = extract("lb_GeradorEndereco");
  const bairro = extract("lb_GeradorBairro");
  const cidade = extract("lb_GeradorCidade");
  const { rua, num } = splitEndereco(endereco);

  let cep = '';
  if (rua && bairro && cidade) {
    cep = await buscarCep('SP', cidade, bairro, rua);
  }

  return {
    numeroGuia: extract("lb_NumeroGuia"),
    cacamba: extract("lb_cacamba"),
    cpfCnpj: extract("lb_CpfCNPJ"),
    geradorNome: extract("lb_GeradorNome"),
    geradorEmail: extract("lb_GeradorEmail"),
    geradorEndereco: endereco,
    geradorRua: rua,
    geradorNum: num,
    geradorBairro: bairro,
    geradorCidade: cidade,
    geradorCep: cep,
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

  const idCtr = res.raw?.match(/<ID_CTR[^>]*>([^<]+)/)?.[1];
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
