const { JSDOM } = require("jsdom");
const fs = require("fs");
const html = fs.readFileSync("admin.html", "utf8");

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  url: "file:///" + __dirname + "/admin.html"
});

dom.window.console.log = console.log;
dom.window.console.error = console.error;

dom.window.addEventListener("error", (e) => {
    console.error("Window Error:", e.error);
});

setTimeout(() => {
    console.log("Done");
    process.exit(0);
}, 3000);
