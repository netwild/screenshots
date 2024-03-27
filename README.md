# screenshots
A small tool based on Nodejs environment, using Puppeter to take full screen screenshots of any webpage

## 1. 简介

一个基于Nodejs环境的小工具，使用Puppeter对任何网页进行全屏截图

## 2. 特点

1) 如果页面有滚动条会自动滚屏截取全部可见内容
2) 如果页面使用了异步加载，会等待全部数据加载完毕后再进行截屏
3) 如果页面使用了AOS滚屏动画会将动画清除后再进行截屏

## 3. 请求参数

1) url: 请求页面地址，必传
2) mode: 页面渲染模式，可选值：pc、mobile，默认：pc
3) width: 页面渲染宽度，可选，默认：1366，优先于mode
4) height: 页面渲染高度，可选，默认：800，优先于mode
5. base64: 是否返回图片的Base64编码，可选，默认0

## 4. 返回数据

1) state: 处理状态，成功true，失败false
2) msg: 错误信息，处理成功时该参数为空
3) url: 请求页面的地址
4) mode: 请求页面的渲染方式（pc、mobile）
5) width: 请求页面的渲染宽度（模拟浏览器宽度，非截图宽度）
6) height: 请求页面的渲染高度（模拟浏览器高度，非截图高度）
7) screenshot: 截屏图片的请求地址
8) times: 接口总处理时长，单位：毫秒
9) base64: 截屏图片的Base64编码，当请求参数base64为真时有效

## 5. 如何使用

1. 本地安装node.js环境
2. 拉取代码到本地目录
3. 执行：npm install 初始化依赖
4. 执行：node ./screenshots.js 开启服务
5. 配置文件 conf.json 中可以调整服务端口和截图保存目录名称
