// Public identities verified against the signed App Store build and Play Console.
const team = '569A638J8F';
const playCertificates = [
  'D1:20:94:B2:08:13:F6:A4:CB:F7:F8:8E:E6:7E:DC:C8:D4:AE:34:8F:FC:7A:31:71:01:23:B4:4C:82:F1:BD:97',
  '9C:4C:51:89:9F:94:DA:90:F7:F6:45:3D:96:99:FA:53:82:BF:71:24:32:E9:92:6E:00:BF:B7:D4:55:FB:EC:DA',
];
export function linkAssociations(environment, developmentCertificates = '') {
  const production = environment === 'production';
  if (!production && !['development', 'ci', 'test', undefined, ''].includes(environment)) {
    throw new Error('Unprovisioned sharing environment');
  }
  const app = production ? 'com.vinnot.app' : 'com.vinnot.app.dev';
  const certificates = production ? playCertificates : developmentCertificates.split(',').filter(Boolean);
  if (certificates.some(value => !/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(value))) {
    throw new Error('Invalid development signing certificate');
  }
  const paths = ['/share', '/share/', ...['wines', 'events', 'wine-routes'].map(kind => `/share/${kind}/*`)];
  return {
    'apple-app-site-association': JSON.stringify({ applinks: { apps: [], details: [{ appID: `${team}.${app}`, paths }] } }),
    'assetlinks.json': JSON.stringify(certificates.length ? [{ relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: app, sha256_cert_fingerprints: certificates } }] : []),
  };
}
