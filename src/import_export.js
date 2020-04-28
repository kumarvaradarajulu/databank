// Get Import Export Data of India

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const http = require('http');

const baseUrl = 'https://commerce-app.gov.in/eidb/icntcomq.asp';

const today = new Date();
const currYear = today.getFullYear();

function main() {
    (async () => {
        const browser = await puppeteer.launch({headless: true, args: ['--start-fullscreen', '--window-size=1920,1040']});
        const page = await browser.newPage();
        await page.goto(baseUrl);
        await page.setViewport({width: 1920, height: 1040});
                
        await page.waitForSelector('#button1');              
        // console.log(countries);
        const years = await page.$$eval('select#select2 option', all => all.map(a => a.getAttribute('value')));

        const countries = await page.$$eval('select#select3 option', all => all.map(a => [a.getAttribute('value'), a.textContent]));

        console.log(countries[0][1]);
        // For each year we have to get the data
        for (year of years){
            await page.select('select#select2', year);
            const yearSelected = await page.$eval('select#select2', yearSelected => yearSelected.value);
            // console.log(yearSelected);
            
            for (country of countries){
                // console.log(country[1]);
                await page.select('select#select3', country[0]);
                const countrySelected = await page.$eval('select#select3', countrySelected => countrySelected.value);
                console.log(yearSelected, countrySelected);
                
    
            }
        }

        await browser.close();
    })();
}

main()