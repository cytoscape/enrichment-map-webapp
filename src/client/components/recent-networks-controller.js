import EventEmitter from 'eventemitter3';
import LocalForage from 'localforage';
import { NETWORK_BACKGROUND } from './defaults';


const MAX_ITEMS = 20;
const NETWORK_THUMBNAIL_WIDTH = 344;
const NETWORK_THUMBNAIL_HEIGHT = 344;


/**
 * @property {EventEmitter} bus The event bus that the controller emits on after every operation
 */
 export class RecentNetworksController {

  /**
   * @param {EventEmitter} bus The event bus that the controller emits on after every operation
   */
  constructor(bus) {
    /** @type {EventEmitter} */
    this.bus = bus || new EventEmitter();

    LocalForage.config({
      name    : 'EM-Web',
      version : 1.0,
    });
  }

   async saveRecentNetwork(cy) {
    const id = cy.data('id');
    let created;
    const item = await LocalForage.getItem(id);
    if (item != null) {
      // This network already exists
      created = item.created;
    }
    const keys = await LocalForage.keys();
    const index = keys.indexOf(id);
    if (index >= 0) {
      // This network already exists
      keys.splice(index, 1); // remove the current key from the list before we check the max length
    }

    const value = this._localStorageValue({ created: created, cy });

    if (keys.length < MAX_ITEMS) {
      // Just add the new item
      LocalForage.setItem(id, value).catch((err) => {
        console.log(err);
      });
    } else {
      this.getRecentNetworks('created', (list) => {
        // Remove the last item before adding the new one
        const lastItem = list[list.length - 1];
        LocalForage.removeItem(lastItem.id).then(() => {
          LocalForage.setItem(id, value);
        }).catch((err) => {
          console.log(err);
        });
      });
    }
  }

  updateRecentNetwork(cy) {
    const id = cy.data('id');
   
    LocalForage.getItem(id).then((val) => {
      if (val) {
        const newValue = this._localStorageValue({ created: val.created, cy });
        
        LocalForage.setItem(id, newValue).catch((err) => {
          console.log(err);
        });
      }
    }).catch((err) => {
      console.log(err);
    });
  }

  getRecentNetworks(sortByField, callback) {
    const nets = [];

    LocalForage.iterate((val, id) => {
      nets.push({ id, ...val });
    }).then(() => {
      nets.sort((o1, o2) => o2[sortByField] - o1[sortByField]); // Usually sort by 'opened' or 'created' date
      
      if (callback)
        callback(nets);
    }).catch((err) => {
      console.log(err);
    });
  }

  getRecentNetworksLength(callback) {
    LocalForage.length().then(length => {
      if (callback)
        callback(length);
    }).catch((err) => {
      console.log(err);
    });
  }

  removeRecentNetwork(id, callback) {
    LocalForage.removeItem(id).then(() => {
      if (callback)
        callback();
    }).catch((err) => {
      console.log(err);
    });
  }

  clearRecentNetworks(callback) {
    LocalForage.clear().then(() => {
      if (callback)
        callback();
    }).catch((err) => {
      console.log(err);
    });
  }

  _localStorageValue({ created, cy }) {
    const name = cy.data('name');
    const now = new Date().getTime();
    const thumbnail = cy.png({
      output: 'base64',
      maxWidth: NETWORK_THUMBNAIL_WIDTH,
      maxHeight: NETWORK_THUMBNAIL_HEIGHT,
      full: true,
      bg: NETWORK_BACKGROUND,
    });

    return {
      name,
      thumbnail,
      created: created ? created : now,
      opened: now,
    };
  }
}