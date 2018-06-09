const EventEmitter = require('events');
const eventstream = new EventEmitter();

eventstream.on('onlinestatus', (card) => {
  if (card.online) {
    console.log(`${card.name} came online`);
  } else {
    console.log(`${card.name} went offline`);
  }
});

eventstream.on('foldersChanged', (card) => {
  console.log(`${card.name} folders: ${card.folders.join(', ')}`);
});

eventstream.on('image', (image) => {
  console.log(`found image ${image.filename} on ${image.card.name}`);
});

eventstream.on('downloaded', (image) => {
  console.log(`downloaded ${image.filename} from ${image.card.name}`);
});

module.exports = eventstream;
