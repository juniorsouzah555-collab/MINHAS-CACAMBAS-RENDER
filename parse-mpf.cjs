const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/Micro/Downloads/MPF_Empresas.xlsm', { cellDates: true });
const sheets = wb.SheetNames;
console.log('Total sheets:', sheets.length);
sheets.forEach(s => {
  const ws = wb.Sheets[s];
  if (!ws || !ws['!ref']) return;
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log('\n=== ' + s + ' (' + json.length + ' linhas) ===');
  json.slice(0, 12).forEach((r, i) => console.log(i + ': ' + JSON.stringify(r).slice(0, 500)));
});
