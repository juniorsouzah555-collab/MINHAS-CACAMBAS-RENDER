const crypto = require('crypto');
const ACCESS_ID = 'mfuk3akuej8au9pegcwh';
const ACCESS_SECRET = '9936222de93b4958bc5951f664ae70ff';
const DEVICE_ID = 'p1784169558813kf5tcn';
const ENDPOINT = 'https://openapi.tuyaus.com';

function sortQueryString(qs) {
  if (!qs) return '';
  return qs.split('&').sort().join('&');
}

function sign(method, fullPath, token, body) {
  const ts = Date.now();
  const qIdx = fullPath.indexOf('?');
  const path = qIdx >= 0 ? fullPath.substring(0, qIdx) : fullPath;
  const qs = qIdx >= 0 ? fullPath.substring(qIdx + 1) : '';
  const sortedUrl = path + (qs ? '?' + sortQueryString(qs) : '');
  const contentSha256 = crypto.createHash('sha256').update(body || '').digest('hex');
  const stringToSign = [method, contentSha256, '', sortedUrl].join('\n');
  const str = token
    ? `${ACCESS_ID}${token}${ts}${stringToSign}`
    : `${ACCESS_ID}${ts}${stringToSign}`;
  return { sign: crypto.createHmac('sha256', ACCESS_SECRET).update(str).digest('hex').toUpperCase(), ts };
}

async function api(method, fullPath, token, body) {
  const { sign: s, ts } = sign(method, fullPath, token, body);
  const opts = {
    method,
    headers: {
      client_id: ACCESS_ID,
      ...(token && { access_token: token }),
      sign: s,
      t: String(ts),
      sign_method: 'HMAC-SHA256',
      ...(body && { 'Content-Type': 'application/json' }),
    },
    ...(body && { body }),
  };
  const res = await fetch(`${ENDPOINT}${fullPath}`, opts);
  return res.json();
}

(async () => {
  const tokenData = await api('GET', '/v1.0/token?grant_type=1');
  if (!tokenData.success) { console.error('Token failed:', JSON.stringify(tokenData)); return; }
  const token = tokenData.result.access_token;
  console.log('Token OK');

  // 1. List devices with id filter
  console.log('\n=== LIST DEVICES (by id) ===');
  console.log(JSON.stringify(await api('GET', `/v1.0/devices?ids=${DEVICE_ID}`, token), null, 2));

  // 2. Try v1.1 device info
  console.log('\n=== v1.1 DEVICE INFO ===');
  console.log(JSON.stringify(await api('GET', `/v1.1/devices/${DEVICE_ID}`, token), null, 2));

  // 3. Try different Smart Lock endpoints
  console.log('\n=== /v1.0/smart-lock/devices/{id}/password-ticket ===');
  console.log(JSON.stringify(await api('GET', `/v1.0/smart-lock/devices/${DEVICE_ID}/password-ticket`, token), null, 2));

  console.log('\n=== /v1.1/devices/{id}/door-lock/password-free/open-door ===');
  console.log(JSON.stringify(await api('POST', `/v1.1/devices/${DEVICE_ID}/door-lock/password-free/open-door`, token, JSON.stringify({})), null, 2));

  console.log('\n=== /v1.0/devices/{id}/door-lock/unlock ===');
  console.log(JSON.stringify(await api('POST', `/v1.0/devices/${DEVICE_ID}/door-lock/unlock`, token, JSON.stringify({})), null, 2));

  console.log('\n=== /v1.0/devices/{id}/door-lock/password-free/door-operate ===');
  console.log(JSON.stringify(await api('POST', `/v1.0/devices/${DEVICE_ID}/door-lock/password-free/door-operate`, token, JSON.stringify({ ticket_id: 'test', open: true })), null, 2));

  // 4. Check device DPs (data points) via standard IoT Core
  console.log('\n=== DEVICE DPs (standard set) ===');
  console.log(JSON.stringify(await api('GET', `/v1.0/devices/${DEVICE_ID}/status`, token), null, 2));

})();
