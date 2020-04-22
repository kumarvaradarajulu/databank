const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");


function main() {
    (async () => {
        const browser = await puppeteer.launch({headless: true, args: ['--start-fullscreen', '--window-size=1920,1040']});
        const page = await browser.newPage();
        await page.goto("https://google.com");
        await page.setViewport({width: 1920, height: 1040});
        const dimensions = await page.evaluate(() => {
            return {
                width: document.documentElement.clientWidth,
                height: document.documentElement.clientHeight,
                deviceScaleFactor: window.devicePixelRatio
            }
        });
        console.log(dimensions);
        await browser.close();
    })();
}

main()