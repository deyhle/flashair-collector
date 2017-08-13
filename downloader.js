const superagent = require('superagent');
const eventstream = require('./eventstream');
const fsExtra = require('fs-extra');

const map = new Map();
const stack = new Set();

async function download() {
  if (!stack.size) {
    return setTimeout(download, 1000);
  }
  const image = map.get([...stack].pop());
  const response = await superagent.get(image.url)
  .timeout({
    response: 2000,
    deadline: 30000,
  })
  .catch((e) => {
    if (e.timeout || e.code === 'EHOSTDOWN' || e.code === 'ENOTFOUND' || e.code === 'EHOSTUNREACH') {
      return;
      //  throw new Error(`could not connect to ${this.host}`);
    }
    throw e;
  });
  await fsExtra.writeFile(`target/${image.card.name}/${image.filename}`, response.body);
  stack.delete(image.url);
  map.delete(image.url);
  eventstream.emit('downloaded', image);
  download();
}

function start() {
  eventstream.on('image', async (image) => {
    map.set(image.url, image);
    stack.add(image.url);
  });
  download();
}

module.exports = { start };
