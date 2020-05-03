// Get Import Export Data of India

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const http = require('http');
const csv = require('fast-csv');
const scrollPageToBottom = require('puppeteer-autoscroll-down');

const importBaseUrl = 'https://commerce-app.gov.in/eidb/icntcomq.asp';
const exportBaseUrl = 'https://commerce-app.gov.in/eidb/ecntcomq.asp';

const csvStream = csv.format();

const runStatFileName = path.resolve(__dirname, '..', 'run_stats.json');

const countriesToCrawl = ["U S A", "CHINA P RP", "U ARAB EMTS", "SAUDI ARAB", "HONG KONG", "IRAQ", "SINGAPORE", "GERMANY", "KOREA RP", "INDONESIA", "SWITZERLAND", "JAPAN", "MALAYSIA", "U K", "BELGIUM", "NIGERIA", "AUSTRALIA", "VIETNAM SOC REP", "NETHERLAND", "THAILAND", "KUWAIT", "QATAR", "SOUTH AFRICA", "FRANCE", "RUSSIA", "ITALY", "BANGLADESH PR", "NEPAL", "MEXICO", "TURKEY", "CANADA", "BRAZIL", "VENEZUELA", "TAIWAN", "SPAIN", "OMAN", "ISRAEL", "IRAN", "SRI LANKA DSR", "EGYPT A RP", "ANGOLA", "MOZAMBIQUE", "ARGENTINA", "ALGERIA", "TANZANIA REP", "UNSPECIFIED", "GHANA", "UKRAINE", "PERU", "POLAND"];

async function loadConfigFile() {
    try {
        fs.accessSync(runStatFileName, fs.constants.F_OK)
        return JSON.parse(fs.readFileSync(runStatFileName));

    } catch (error) {
        console.log('Config File not found', error, runStatFileName);
        configData = {import: {year: '9999', countryCode: []}, export: {year: '9999', countryCode: []},};
        fs.writeFileSync(runStatFileName, JSON.stringify(configData));
        return configData;
    }
}

const main = async (baseUrl, dataType) => {
    var config = await loadConfigFile();
    console.log("config", config[dataType]);
    const csvFileName = path.resolve(__dirname, '..', 'data', `${dataType}_data_india.csv`);
    const csvHeaders = ['country', 'countrycode', 'hscode', 'commodity', 'importinlakhs', 'year'];
    const csvWriteStream = fs.createWriteStream(csvFileName, {flags: 'a'});
    csvStream.pipe(csvWriteStream).on('end', process.exit);

    if (Number(config[dataType].year === 9999)){
        // Write only the first time.
        csvStream.write(csvHeaders);
    }

    console.log(`Fetching ${dataType} data`);
    const browser = await puppeteer.launch({headless: true, args: ['--start-fullscreen', '--window-size=1920,1040']});
    const page = await browser.newPage();
    await page.goto(baseUrl);
    await page.setViewport({width: 1920, height: 1040});

    await page.waitForSelector('#button1');
    // console.log(countries);
    const years = await page.$$eval('select#select2 option', all => all.map(a => a.getAttribute('value')));

    const countries = await page.$$eval('select#select3 option', all => all.map(a => [a.getAttribute('value'), a.textContent]));

    await page.select('select#hslevel', '8');
    await page.select('select#select1', '0');

    // Click the number of entries radio button
    await page.click('input#radioDAll');

    // console.log(years)
    // For each year we have to get the data
    for (year of years) {
        if (Number(year) >= Number(config[dataType].year)) {
            continue
        }
        await page.select('select#select2', year);
        const yearSelected = await page.$eval('select#select2', yearSelected => yearSelected.value);
        // console.log(yearSelected);

        for (country of countries) {
            // console.log(country[1]);
            if (config[dataType].countryCode.includes(country[0])) {
                console.log(`Skipping country =${country[0]}, ${country[1]}`);
                continue
            }
            if (!countriesToCrawl.includes(country[1].trim())) {
                console.log(`Skipping country as configured=${country[0]}, ${country[1]}`);
                continue
            }
            await page.select('select#select3', country[0]);
            const countrySelected = await page.$eval('select#select3', countrySelected => countrySelected.value);
            console.log(yearSelected, country[1]);

            await page.click('#button1');
            let nextPageUrl = (dataType === 'export') ? 'a[href="ecntcomq.asp"]' : 'a[href="icntcomq.asp"]';
            try {
                await page.waitForSelector(nextPageUrl, {timeout: 60000});
            } catch {
                console.log('Page load failed waiting for a few seconds');
                setTimeout(_ => {
                }, Math.random() * 30000);
                await page.waitForSelector(nextPageUrl);
            }

            let data = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('table>tbody>tr'),
                    row => Array.from(row.querySelectorAll('th, td'), cell => cell.innerText.trim().replace(',', ';')));
            })


            let sno = 0
            for (d of data.slice(1,)) {
                sno++;
                if (sno.toString() != d[0].slice(0, -1)) {
                    continue
                }
                csvStream.write([country[1], country[0], d[1], d[2], d[4], yearSelected]);
            }


            // console.log(data[0].split('\n').length, data[1].split('\n').length, data[2].split('\n').length);
            await scrollPageToBottom(page);
            await page.click(nextPageUrl);
            config[dataType].countryCode.push(countrySelected);
            fs.writeFileSync(runStatFileName, JSON.stringify(config));

            setTimeout(() => {
                // Just waiting
            }, Math.random() * 10000);
        }
        config[dataType].year = yearSelected;
        config[dataType].countryCode = [];
        fs.writeFileSync(runStatFileName, JSON.stringify(config));
    }
    csvStream.end();
    await browser.close();
}

while (true) {
    try {
        main(importBaseUrl, 'import');
        // main(exportBaseUrl, 'export');
        break;
    } catch (error) {
        console.error('Retrying...');
    }
}
