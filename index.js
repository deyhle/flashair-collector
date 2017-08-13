const config = require('config');
const Card = require('./Card');
const downloader = require('./downloader');

const cards = config.cards.map(card => new Card(card));
downloader.start();

setInterval(() => {
  console.log(`Status Update
  Online: ${cards.filter(card => card.online).map(card => card.name).join(', ')}
  Offline: ${cards.filter(card => !card.online).map(card => card.name).join(', ')}`);
}, 8000);
