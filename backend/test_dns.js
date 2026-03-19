const dns = require('dns').promises;
const dnsRaw = require('dns');

dnsRaw.setServers(['8.8.8.8']);

async function test() {
    const srvRecord = '_mongodb._tcp.cluster0.x0wee2n.mongodb.net';
    console.log(`Testing DNS SRV lookup for: ${srvRecord}`);
    try {
        const addresses = await dns.resolveSrv(srvRecord);
        console.log('SRV Records found:', JSON.stringify(addresses, null, 2));
    } catch (err) {
        console.error('SRV Lookup Failed:', err);
    }

    try {
        const txtRecord = 'cluster0.x0wee2n.mongodb.net';
        console.log(`Testing DNS TXT lookup for: ${txtRecord}`);
        const txt = await dns.resolveTxt(txtRecord);
        console.log('TXT Records found:', JSON.stringify(txt, null, 2));
    } catch (err) {
        console.error('TXT Lookup Failed:', err);
    }
}

test();
