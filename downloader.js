const superagent = require('superagent');
const eventstream = require('./eventstream');
const fsExtra = require('fs-extra');

async function downloadImage(image) {
  const targetPath = `target/${image.card.name}-${image.filename}`;
  if (await fsExtra.pathExists(targetPath)) {
    console.log(`${image.filename} alredy exists`);
    return;
  }
  console.log(`trying to download ${image.filename} from ${image.card.name}...`);
  const response = await superagent.get(image.url)
    .timeout({
      response: 5000,
      deadline: 10000,
    })
    .catch((e) => {
      if (e.code === 'ECONNABORTED' || e.code === 'EHOSTDOWN' || e.code === 'ENOTFOUND' || e.code === 'EHOSTUNREACH') {
        console.log(`could not connect to ${image.card.name} ${e}`); // TODO remove log
        return;
      }
      throw e;
    });
  if (!response) {
    return;
  }
  await fsExtra.writeFile(targetPath, response.body);
  eventstream.emit('downloaded', image);
}


function start() {
  eventstream.on('image', async (image) => {
    downloadImage(image);
  });
}

eventstream.on('onlinestatus', (card) => {
  if (card.online) {
    
  }
});

module.exports = { start };
