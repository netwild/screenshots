const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

/**
 * 加载配置文件
 */
const configPath = path.join(__dirname, "conf.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

/**
 * 初始化 Express 服务器环境
 * 1) port: 端口号
 * 2) staticPathName: 截屏图片的保存目录名称，同时也是静态目录的请求名称
 */
const app = express();
const port = config.port;
const staticPathName = config.folder;

// 设置静态目录
app.use(
  `/${staticPathName}`,
  express.static(path.join(__dirname, staticPathName))
);

/**
 * 创建截屏图片的保存目录
 * 目录格式：/staticPathName/yyyy/mm/dd/
 * @returns 保存目录的绝对路径和请求路径
 */
async function createDir() {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const directoryPath = path.join(
    process.cwd(),
    staticPathName,
    year,
    month,
    day
  );
  fs.mkdirSync(directoryPath, { recursive: true });
  return {
    dirPath: directoryPath,
    urlPath: `/${staticPathName}/${year}/${month}/${day}/`,
  };
}

/**
 * 获取字符串的HashCode格式，用于生成截屏图片名称
 * @param str
 * @returns
 */
function stringToHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return hash;
}

/**
 * 移除请求页面中的滚屏动画，否则会影响截屏效果
 * @param page
 */
async function styleClean(page) {
  await page.evaluate(() => {
    const elms = document.querySelectorAll("[data-aos]");
    elms.forEach((elm) => {
      elm.removeAttribute("data-aos");
    });
  });
}

/**
 * 页面截屏接口：/screenshot
 *
 * 接口特点：
 * 1) 如果页面有滚动条会自动滚屏截取全部可见内容
 * 2) 如果页面使用了异步加载，会等待全部数据加载完毕后再进行截屏
 * 3) 如果页面使用了AOS滚屏动画会将动画清除后再进行截屏
 */
app.get("/screenshot", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const modes = {
    pc: {
      width: 1366,
      height: 800,
    },
    mobile: {
      width: 400,
      height: 900,
    },
  };
  const url = req.query.url;
  const mode = req.query.mode || "pc";
  let width = parseInt(req.query.width, 0);
  let height = parseInt(req.query.height, 0);
  if (!width) width = modes[mode].width;
  if (!height) height = modes[mode].height;
  const base64 = parseInt(req.query.base64 || "0");
  if (!url) {
    return res.send({
      state: false,
      msg: "未发现页面地址！",
    });
  }
  const { dirPath, urlPath } = await createDir();
  const picName = stringToHash(url) + ".png";
  const pageOpts = {
    width,
    height,
    deviceScaleFactor: 1,
  };
  const screenshotOpts = {
    type: "png",
    path: path.join(dirPath, picName),
    fullPage: true,
  };

  try {
    const reqStart = process.hrtime();
    const result = {
      state: true,
      url,
      mode,
      width,
      height,
      screenshot: urlPath + picName,
    };
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport(pageOpts);
    await page.goto(url, { waitUntil: "networkidle2" });
    await styleClean(page);
    if (!base64) {
      await page.screenshot(screenshotOpts);
    } else {
      const screenshotBuf = await page.screenshot({
        encoding: "binary",
        ...screenshotOpts,
      });
      const screenshotBase64 = Buffer.from(screenshotBuf, "binary").toString(
        "base64"
      );
      result.base64 = "data:image/png;base64," + screenshotBase64;
    }
    await browser.close();
    const reqEnd = process.hrtime(reqStart);
    const elapsedTimeInNanoseconds = reqEnd[0] * 1e9 + reqEnd[1];
    const elapsedTimeInMilliseconds = parseInt(elapsedTimeInNanoseconds / 1e6);
    result.times = `${elapsedTimeInMilliseconds} milliseconds`;
    res.send(result);
  } catch (error) {
    console.error(error);
    res.send({
      state: false,
      msg: "截屏服务出现异常！",
    });
  }
});

app.listen(port, () => {
  console.log("截屏服务接口已启动。");
  console.log(`请求地址：http://localhost:${port}/screenshot`);
  console.log(`图片目录：http://localhost:${port}/${staticPathName}`);
  console.log("-------------------------------------------------------");
  console.log("* 请求参数：");
  console.log("* 1) url: 请求页面地址，必传");
  console.log("* 2) mode: 页面渲染模式，可选值：pc、mobile，默认：pc");
  console.log("* 3) width: 页面渲染宽度，可选，默认：1366，优先于mode");
  console.log("* 4) height: 页面渲染高度，可选，默认：800，优先于mode");
  console.log("* 5) base64: 是否返回图片的Base64编码，可选，默认0");
  console.log("*");
  console.log("* 返回数据：");
  console.log("* 1) state: 处理状态，成功true，失败false");
  console.log("* 2) msg: 错误信息，处理成功时该参数为空");
  console.log("* 3) url: 请求页面的地址");
  console.log("* 4) mode: 请求页面的渲染方式（pc、mobile）");
  console.log("* 5) width: 请求页面的渲染宽度（模拟浏览器宽度，非截图宽度）");
  console.log("* 6) height: 请求页面的渲染高度（模拟浏览器高度，非截图高度）");
  console.log("* 7) screenshot: 截屏图片的请求地址");
  console.log("* 8) times: 接口总处理时长，单位：毫秒");
  console.log("* 9) base64: 截屏图片的Base64编码，当请求参数base64为真时有效");
});
