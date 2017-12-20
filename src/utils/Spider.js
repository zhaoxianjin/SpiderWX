const puppeteer = require('puppeteer'),
    fs = require('fs'),
    path = require('path'),
    request = require('request');
const { timeout } = require('../../tools/tools.js');

const downloadImage = async(src, dest, callback) => {
    request.head(src, (err, res, body) => {
        // console.log('content-type:', res.headers['content-type']);
        // console.log('content-length:', res.headers['content-length']);
        if (src) {
            request(src).pipe(fs.createWriteStream(dest)).on('close', () => {
                callback(null, dest);
            });
        }
    });
};

const spider = async(wxName) => {
    puppeteer.launch({ headless: false }).then(async browser => {
        let page = await browser.newPage();
        const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36';
        await page.setUserAgent(ua);
        //await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
        await page.goto(`http://weixin.sogou.com/weixin?type=1&s_from=input&query=${encodeURIComponent(wxName)}`);
        await timeout(2000);
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
        //await page.pdf({ path: `./data/es6-pdf/${aTags[0].name}1.pdf` });
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
        //await page.pdf({ path: `./data/es6-pdf/${PublicNumber.name}2.pdf` });
        await page.close();
        //获取公众号最新一条动态
        page = await browser.newPage();
        await page.goto(firstDynamic.href);
        //await timeout(2000);
        //await page.pdf({ path: `./data/es6-pdf/${PublicNumber.name}3.pdf` });
        let getContent = await page.evaluate(() => { //取网页源码
            let HTML = document.getElementById('img-content').innerHTML;
            let imgs = [...document.querySelectorAll("img[data-src]")].map((v, i) => {
                return v.getAttribute('data-src');
            })
            return {
                html: HTML,
                imgs: imgs
            };
        });
        let showImgJs = `<script>const imgDOM=[...document.querySelectorAll("img[data-src]")];imgDOM.map((v)=>{v.setAttribute("src",v.getAttribute("data-src"));});</script>`;
        fs.writeFileSync(`./data/wx-html/${wxName}.html`, getContent.html + showImgJs);
        // getContent.imgs.map((v, i) => { //下载图片
        //     downloadImage(v, `./wx-img/${Math.random()*1000}.jpg`, (err, dest) => {
        //         if (err) {
        //             console.log(err);
        //         }
        //         if (dest) {
        //             console.log(dest);
        //         }
        //     });
        // });
        await page.close();
        await browser.close();
    });
}
const moreSpider = async(wxArr) => {
    wxArr.map((val) => {
        spider(val);
    });
};

module.exports = moreSpider;