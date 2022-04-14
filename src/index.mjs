'use strict';

import log from 'node-color-log';
import axios from 'axios';
import tar from 'tar';
import fs from 'fs';
import _path from 'path';
import MMDBReader from 'mmdb-reader';
import express from 'express';

const MAXMIND_KEY = process.env.MAXMIND_KEY;
const PORT = process.env.PORT || 3000;
const __dirname = _path.resolve('.');

async function downloadMaxmindDatabase()
{
    const url = `https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-Country&license_key=${MAXMIND_KEY}&suffix=tar.gz`;
    
    const response = await axios({
        url: url,
        method: 'GET',
        responseType: 'arraybuffer',
    });
    
    if(response.status == 200)
    {
        log.info('Download database is complete');

        if(!fs.existsSync(_path.join(__dirname, 'tmp')))
        {
            fs.mkdirSync(_path.join(__dirname, 'tmp'));
        }

        const buffer = response.data;
        fs.writeFileSync(_path.join(__dirname, 'tmp', 'maxmind.tar.gz'), buffer);

        let target = null;

        await tar.x({
            file: _path.join(__dirname, 'tmp', 'maxmind.tar.gz'),
            cwd: _path.join(__dirname, 'tmp'),
            keep: false,
            filter: ($path, $entry) =>
            {
                return $path.endsWith('.mmdb');
            },
            onentry: $entry =>
            {
                target = $entry.path;
            },
        })

        if(!target)
        {
            throw new Error('tar file problem');
        }

        log.info('Extract database is complete');

        return _path.join(__dirname, 'tmp', target);
    }

    throw new Error('response is not okay ' + response.status);
}


async function main()
{
    const target = await downloadMaxmindDatabase();
    const reader = MMDBReader(target);

    const app = express();
    app.get('/', (req, res) => 
    {
        const ip = req.header['X-IP'];

        if(!ip)
        {
            log.error('Header X-IP was not set');
            res.status(403).end();
            return;
        }

        let result = reader.lookup(ip);
        if(result)
        {
            if(result.country.iso_code == 'HK')
            {
                res.status(200).end();
                return;
            }

            log.info('IP', ip, 'is not in HK');
            res.status(403).end();
            return;
        }

        log.info('IP', ip, 'is not cannot be recognised')
        res.status(403).end();
        return;
    });

    app.listen(PORT, '0.0.0.0', () =>
    {
        log.info(`firewallz listening on port ${PORT}`);
    });
}

if(!MAXMIND_KEY)
{
    log.error('MAXMIND_KEY is not set');
    process.exit(1);
}

main();
