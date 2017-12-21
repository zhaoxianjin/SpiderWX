const puppeteer = require('puppeteer'),
    fs = require('fs'),
    path = require('path'),
    request = require('request'),
    uuid = require('node-uuid');
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
    let pages = new Array(wxName.length);
    puppeteer.launch({ headless: false }).then(async browser => {
        for (let ii = 0; ii < wxName.length; ii++) {
            try {
                console.log(`正在爬取${wxName[ii]}...`);
                pages[ii] = {
                        a: await browser.newPage(),
                        b: await browser.newPage(),
                        c: await browser.newPage()
                    }
                    //const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36';
                    //await page.setUserAgent(ua);
                    //await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
                await pages[ii].a.goto(`http://weixin.sogou.com/weixin?type=1&s_from=input&query=${encodeURIComponent(wxName[ii])}`);
                await timeout(Math.floor(Math.random() * 10000));
                let aTags = await pages[ii].a.evaluate(() => {
                    window.scrollBy(0, window.innerHeight); //模拟滚动视图
                    let as = [...document.querySelectorAll('a[uigs="account_name_0"]')];
                    if (as.length) {
                        return as.map((a) => {
                            return {
                                href: a.href.trim(),
                                name: a.text
                            }
                        });
                    } else {
                        return false;
                    }
                });
                console.log("page1:" + ii, aTags || `${wxName[ii]}'未找到'`);
                //await page.pdf({ path: `./data/es6-pdf/${aTags[0].name}1.pdf` });
                //await page.close();
                //获取公众号页面
                //page2 = await browser.newPage();
                if (!aTags) {
                    await pages[ii].a.close();
                    await pages[ii].b.close();
                    await pages[ii].c.close();
                    continue;
                }
                let PublicNumber = aTags[0];
                await pages[ii].b.goto(PublicNumber.href);
                await timeout(Math.floor(Math.random() * 10000));
                let firstDynamic = await pages[ii].b.evaluate(() => {
                    window.scrollBy(0, window.innerHeight); //模拟滚动视图
                    let as = [...document.querySelectorAll('#history .weui_msg_card .weui_media_title')];
                    if (as.length) {
                        return as.map((a) => {
                            return {
                                href: a.outerHTML.trim(),
                                name: a.innerText
                            }
                        })[0];
                    } else {
                        return false;
                    }
                });
                console.log('page2:' + ii, firstDynamic || `${wxName[ii]}'未找到'`);
                if (!firstDynamic) {
                    await pages[ii].a.close();
                    await pages[ii].b.close();
                    await pages[ii].c.close();
                    continue;
                }
                const strLeft = '<h4 class="weui_media_title" hrefs="';
                const strRight = '">';
                let leftPosition = firstDynamic.href.indexOf(strLeft) + strLeft.length;
                let rightPosition = firstDynamic.href.indexOf(strRight);
                firstDynamic.href = ('http://mp.weixin.qq.com' + firstDynamic.href.substring(leftPosition, rightPosition)).replace(/\amp;/g, "");
                console.log('href:', firstDynamic.href);
                //await page.pdf({ path: `./data/es6-pdf/${PublicNumber.name}2.pdf` });
                //await page2.close();
                //获取公众号最新一条动态
                //page3 = await browser.newPage();
                await pages[ii].c.goto(firstDynamic.href);
                await timeout(Math.floor(Math.random() * 10000));
                //await page.pdf({ path: `./data/es6-pdf/${PublicNumber.name}3.pdf` });
                let getContent = await pages[ii].c.evaluate(() => { //取网页源码
                    window.scrollBy(0, window.innerHeight); //模拟滚动视图
                    let imgs = [...document.querySelectorAll("img[data-src]")].map((v, i) => {
                        v.setAttribute('onerror', "javascript:this.src=this.getAttribute('data-src');");
                        // let imgID = uuid.v4().replace(/\-/g, "");
                        let imgID = Math.floor(Math.random() * 100000000).toString() + Date.now().toString();
                        let imgSrc = v.getAttribute('data-src');
                        let suffix = imgSrc.substr(imgSrc.indexOf('wx_fmt=')).replace('wx_fmt=', "");
                        switch (suffix) {
                            case 'png':
                                break;
                            case 'jpg':
                                break;
                            case 'jpeg':
                                break;
                            case 'gif':
                                break;
                            default:
                                suffix = 'gif';
                        }
                        let imgName = `${imgID}.${suffix}`;
                        v.setAttribute("src", `../wx-img/${imgName}`);
                        return {
                            src: imgSrc,
                            name: imgName
                        };
                    });
                    //js_article
                    //page-content
                    document.getElementById('js_pc_qr_code').outerHTML = ""; //清除公众号二维码
                    [...document.querySelectorAll('img')].map((v) => { v.classList.remove("img_loading"); }); //清除img_loading class
                    document.getElementsByClassName('reward_qrcode_img_wrp')[0].outerHTML = ""; //清除reward_qrcode_img_wrp
                    let HTML = document.getElementById('js_article').outerHTML;
                    return {
                        html: HTML,
                        imgs: imgs
                    };
                });
                console.log('page3', getContent);
                //let showImgJs = `<script>const imgDOM=[...document.querySelectorAll("img[data-src]")];imgDOM.map((v)=>{v.setAttribute("src",v.getAttribute("data-src"));});</script>`;
                let css = '<script>document.head.innerHTML=\'<link href="../wx-css/style1.css" rel="stylesheet" type="text/css"><link href="../wx-css/style2.css" rel="stylesheet" type="text/css"><link href="../wx-css/style3.css" rel="stylesheet" type="text/css">\';</script>';
                await fs.writeFileSync(`./data/wx-html/${wxName[ii]}.html`, css + getContent.html);
                await getContent.imgs.map((v, i) => { //下载图片
                    if (v.src.indexOf('https') != -1) {
                        downloadImage(v.src, `./data/wx-img/${v.name}`, (err, dest) => {
                            console.log(v.src);
                            if (err) {
                                console.log(err);
                            }
                            if (dest) {
                                console.log(dest);
                            }
                        });
                    }
                });
                await pages[ii].a.close();
                await pages[ii].b.close();
                await pages[ii].c.close();
            } catch (error) {
                await pages[ii].a.close();
                await pages[ii].b.close();
                await pages[ii].c.close();
                console.log(error);
            }
        }

        await browser.close();
    });
}
const moreSpider = async(wxArr) => {
    // wxArr.map((val) => {
    //     spider(val);
    // });
    spider(wxArr);
};

module.exports = moreSpider;