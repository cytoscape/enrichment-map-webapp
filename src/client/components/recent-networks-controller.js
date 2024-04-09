import EventEmitter from 'eventemitter3';
import LocalForage from 'localforage';
import { NETWORK_BACKGROUND } from './defaults';

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

   saveRecentNetwork(cy) {
    const id = cy.data('id');
    const now = new Date();
    const opened = now.getTime();
    const value = this._localStorageValue({ opened: opened, cy });
    
    LocalForage.setItem(id, value).catch((err) => {
      console.log(err);
    });
  }

  updateRecentNetwork(cy) {
    const id = cy.data('id');
   
    LocalForage.getItem(id).then((val) => {
      if (val) {
        const newValue = this._localStorageValue({ opened: val.opened, cy });
        
        LocalForage.setItem(id, newValue).catch((err) => {
          console.log(err);
        });
      }
    }).catch((err) => {
      console.log(err);
    });
  }

  getRecentNetworks(callback) {
    const nets = [];

    LocalForage.iterate((val, id) => {
      nets.push({ id, ...val });
    }).then(() => {
      nets.sort((o1, o2) => o2.opened - o1.opened); // Sort by 'opened' date
      
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

  _localStorageValue({ opened, cy }) {
    const name = cy.data('name');
    const now = new Date();
    const modified = now.getTime();
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
      opened: opened ? opened : modified,
      modified,
    };
  }
}