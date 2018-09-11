const superagent = require('superagent');
const config = require('config');
const fsExtra = require('fs-extra');

const eventstream = require('./eventstream');

const onlineSymbol = Symbol('online');
const foldersSymbol = Symbol('folders');

async function getImageList(host, cameraFolder) {
  const response = await superagent.get(`http://${host}/command.cgi?op=100&DIR=/DCIM/${cameraFolder}`)
  .timeout({
    response: 1000,
    deadline: 5000,
  })
  .catch((e) => {
    this.online = false;
    if (e.timeout || e.code === 'EHOSTDOWN' || e.code === 'ENOTFOUND' || e.code === 'EHOSTUNREACH') {
      return;
      //  throw new Error(`could not connect to ${this.host}`);
    }
    throw e;
  });
  if (response) {
    const imageList = response.text.split('\r\n')
    .filter(line => /^\/DCIM/.test(line))
    .map(line => line.split(',')[1])
    .map(filename => ({ filename, url: `http://${host}/DCIM/${cameraFolder}/${filename}` }));
    return imageList;
  }
  return [];
}

class Card {
  constructor({ host, name }) {
    this.host = host;
    this.name = name;
    this[onlineSymbol] = false;
    this[foldersSymbol] = [];
    setInterval(async () => {
      await this.ping();
      await this.checkForImages();
    }, config.pingInterval);
    this.setup();
  }

  async setup() {
    await fsExtra.ensureDir(`target/${this.name}`);
  }

  set online(newValue) {
    if (newValue !== this[onlineSymbol]) {
      this[onlineSymbol] = newValue;
      eventstream.emit('onlinestatus', this);
    }
  }

  get online() {
    return this[onlineSymbol];
  }

  set folders(newFolders) {
    if (this[foldersSymbol].length !== newFolders.length
      || !(this[foldersSymbol].every((e, i) => e === newFolders[i]))) {
      this[foldersSymbol] = newFolders;
      eventstream.emit('foldersChanged', this);
    }
  }

  get folders() {
    return this[foldersSymbol];
  }

  async ping() {
    const response = await superagent.get(`http://${this.host}/command.cgi?op=100&DIR=/DCIM`)
    .timeout({
      response: 2000,
      deadline: 10000,
    })
    .catch((e) => {
      this.online = false;
      if (e.code === 'ECONNABORTED' || e.code === 'EHOSTDOWN' || e.code === 'ENOTFOUND' || e.code === 'EHOSTUNREACH') {
        return;
        //  throw new Error(`could not connect to ${this.host}`);
      }
      console.error(`error in card ping ${this.name} ${e.stack}`);
    });
    if (response) {
      this.online = true;
      this.folders = response.text.split('\r\n')
      .filter(line => /^\/DCIM,/.test(line) && !/^\/DCIM,100__TSB,/.test(line))
      .map(line => line.split(',')[1]);
    }
  }

  async checkForImages() {
    if (!this.online || !this.folders.length) {
      return;
    }
    const downloadedImages = (await fsExtra.readdir(`target`))
      .filter(file => file.startsWith(this.name)).map(file => file.replace(`${this.name}-`, ''));
    
    const cameraImages = (await Promise.all(
      this.folders.map(folder => getImageList(this.host, folder))
    ))
    .reduce((a, b) => a.concat(b), []);
    const newImages = cameraImages.filter(({ filename }) => filename.endsWith('JPG') && !downloadedImages.includes(filename));
    newImages
    .map(image => Object.assign(image, { card: this }))
    .forEach(image => eventstream.emit('image', image));
  }

}

module.exports = Card;
