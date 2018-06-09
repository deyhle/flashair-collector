const superagent = require('superagent');
const eventstream = require('./eventstream');
const fsExtra = require('fs-extra');

const map = new Map();
const stack = new Set();

async function downloadImage(image) {
  console.log(`trying to download ${image.filename} from ${image.card.name}...`);
  const response = await superagent.get(image.url)
    .timeout({
      response: 5000,
      deadline: 10000,
    })
    .catch((e) => {
      if (e.timeout || e.code === 'EHOSTDOWN' || e.code === 'ENOTFOUND' || e.code === 'EHOSTUNREACH') {
        throw new Error(`could not connect to ${image.card.name} ${e}`);
      }
      throw e;
    });
  await fsExtra.writeFile(`target/${image.card.name}/${image.filename}`, response.body);
  stack.delete(image.url);
  map.delete(image.url);
  eventstream.emit('downloaded', image);
}

async function downloadInterval() {
  if (!stack.size) {
    return setTimeout(downloadInterval, 1000);
  }
  await (async () => {
    const arrayStack = [...stack];
    let image;
    let success = false;
    let lastError;
    for (image = map.get(arrayStack.pop()); !success && arrayStack.length; image = map.get(arrayStack.pop())) {
    //while (!success && (image = map.get(arrayStack.pop())) {
      try {
        await downloadImage(image);
        success = true;
      } catch (e) {
        console.log(e);
        lastError = e;
      }
    }
    if (!success && lastError) {
      throw lastError;
    }
  })().catch((e) => {
    console.error(e);
  });
  downloadInterval();
}

function start() {
  eventstream.on('image', async (image) => {
    map.set(image.url, image);
    stack.add(image.url);
  });
  downloadInterval();
}

eventstream.on('onlinestatus', (card) => {
  if (card.online) {
    const imagesFromCardStillToDownload = [...map.entries()]
    .map(([,value]) => value)
    .filter(image => image.card === card)
    .map(image => () => downloadImage(image))
    .reduce((result, promise) => result.then(promise), Promise.resolve());
    return imagesFromCardStillToDownload.catch((e) => {
      console.error(e)
    });
  }
});

module.exports = { start };
