/**
 * first version, all in a single file
 */

const superagent = require('superagent');
const config = require('config');
const fsExtra = require('fs-extra');

async function discoverCameraFolders(host) {
  let response;
  try {
    response = await superagent.get(`http://${host}/command.cgi?op=100&DIR=/DCIM`)
    .timeout({
      response: 2000,
      deadline: 10000,
    })
  } catch (e) {
    if (e.timeout || e.code === 'EHOSTDOWN') {
      throw new Error(`could not connect to ${host}`);
    }
    throw e;
  }
  ;
  const cameraFolders = response.text.split('\r\n')
  .filter(line => /^\/DCIM,/.test(line) && !/^\/DCIM,100__TSB,/.test(line))
  .map(line => line.split(',')[1]);
  return cameraFolders;
}



async function downloadImage(url, target) {
  // const stream = fsExtra.createWriteStream(target);
  const response = await superagent.get(url)
  .timeout({
    response: 2000,
    deadline: 30000,
  });
  await fsExtra.writeFile(target, response.body);
  return;
}

async function syncImages(name, imageList) {
  await fsExtra.ensureDir(`target/${name}`);
  const downloadedImages = await fsExtra.readdir(`target/${name}`);
  const newImages = imageList.filter(({ filename }) => !downloadedImages.includes(filename));
  if (newImages.length) {
    console.log(`${name} has ${newImages.length} new photos, downloading…`);
  } else {
    console.log(`${name} has no new photos.`);
  }
  await Promise.all(newImages.map(({ filename, url }) =>
    downloadImage(url, `target/${name}/${filename}`)
    .then(() => console.log(`downloaded ${name}/${filename}`))
  ));
}

async function checkCard({ host, name }) {
  try {
    const cameraFolders = await discoverCameraFolders(host);
    //    console.log(`${name} (${host}) found`);
    const imageList = await getImageList(host, cameraFolders[0]);
    await syncImages(name, imageList);
  } catch (error) {
    console.error(error.message);
  }
}

setInterval(async () => {
  Promise.all(config.cards.map(card => checkCard(card)));
}, 5000);

