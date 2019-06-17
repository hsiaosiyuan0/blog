const fs = require("fs").promises;
const path = require("path");

function isIgnored(dir) {
  const list = ["node_modules", ".git"];
  for (let i = 0, len = list.length; i < len; i++) {
    if (dir.indexOf(list[i]) !== -1) return true;
  }
  return false;
}

async function walk(dir) {
  let files = await fs.readdir(dir);
  files = await Promise.all(
    files.map(async file => {
      const filePath = path.join(dir, file);
      const stats = await fs.stat(filePath);
      if (stats.isDirectory() && !isIgnored(filePath)) return walk(filePath);
      else if (stats.isFile()) return filePath;
      return null;
    })
  );

  return files
    .reduce((all, folderContents) => all.concat(folderContents), [])
    .filter(dir => dir && dir.endsWith(".md"));
}

function setObj(obj, path, val) {
  path = path.split("/");
  let lastKey = path.pop();
  let key = path.shift();
  while (key) {
    if (obj[key] === undefined) obj[key] = {};
    obj = obj[key];
    key = path.shift();
  }
  obj[lastKey] = val;
}

const root = path.resolve(".");

function render(obj, dep) {
  if (typeof obj === "string") {
    const label = path.basename(obj, ".md");
    const link = encodeURIComponent(obj);
    return `${" ".repeat(dep)}* [${label}](${link})\n`;
  }
  let ret = "";
  Object.keys(obj).forEach(k => {
    if (dep == 0) ret += "\n";
    if (typeof obj[k] !== "string" && dep !== -2)
      ret += `${" ".repeat(dep)}* ${k}\n`;
    ret += render(obj[k], dep + 2);
  });
  if (dep === -2) return `<!-- index begin -->${ret}<!-- index end -->`;
  return ret;
}

(async () => {
  const indexes = await walk(path.resolve("."));
  const tree = {};
  indexes
    .map(b => b.replace(root, ""))
    .filter(b => b.startsWith("/posts"))
    .forEach(b => {
      let path = b.split("/");
      path.shift();
      setObj(tree, path.join("/"), b);
    });
  const readmePath = path.resolve("./README.md");
  let readme = await fs.readFile(readmePath, {
    encoding: "utf8"
  });
  await fs.writeFile(
    readmePath,
    readme.replace(/(@index|<!--[\s\S]*-->)/, render(tree, -2)),
    {
      encoding: "utf8"
    }
  );
})();
