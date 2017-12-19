const puppeteer = require('puppeteer');
let { timeout } = require('../tools/tools.js');
const spider = async(wxName) => {
    puppeteer.launch().then(async browser => {
        let page = await browser.newPage();
        await page.goto(`http://weixin.sogou.com/weixin?type=1&s_from=input&query=${encodeURIComponent(wxName)}`);
        //await timeout(2000);
        let aTags = await page.evaluate(() => {
            let as = [...document.querySelectorAll('a[uigs="account_name_0"]')];
            return as.map((a) => {
                return {
                    href: a.href.trim(),
                    name: a.text
                }
            });
        });
        console.log("aTags", aTags);
        await page.pdf({ path: `./data/es6-pdf/${aTags[0].name}1.pdf` });
        await page.close();
        //获取公众号页面
        page = await browser.newPage();
        let PublicNumber = aTags[0];
        await page.goto(PublicNumber.href);
        // await timeout(2000);
        let firstDynamic = await page.evaluate(() => {
            let as = [...document.querySelectorAll('#history .weui_msg_card .weui_media_title')];
            return as.map((a) => {
                return {
                    href: a.outerHTML.trim(),
                    name: a.innerText
                }
            })[0];
        });
        console.log('firstDynamic', firstDynamic);
        const strLeft = '<h4 class="weui_media_title" hrefs="';
        const strRight = '">';
        let leftPosition = firstDynamic.href.indexOf(strLeft) + strLeft.length;
        let rightPosition = firstDynamic.href.indexOf(strRight);
        firstDynamic.href = ('http://mp.weixin.qq.com' + firstDynamic.href.substring(leftPosition, rightPosition)).replace(/\amp;/g, "");
        console.log('href:', firstDynamic.href);
        await page.pdf({ path: `./data/es6-pdf/${PublicNumber.name}2.pdf` });
        await page.close();
        //获取公众号最新一条动态
        page = await browser.newPage();
        await page.goto(firstDynamic.href);
        //await timeout(2000);
        await page.pdf({ path: `./data/es6-pdf/${PublicNumber.name}3.pdf` });
        await page.close();
        await browser.close();
    });
}

const moreSpider = async(wxArr) => {
    wxArr.map((val) => {
        spider(val);
    });
};

const wxArr = ['jackmafoundation', '雷军'];

moreSpider(wxArr);