import _ from 'lodash';


const MAX_STACK_DEPTH = 30;

export const TYPE = {
  DELETE: 'DELETE',
  POSITION: 'POSITION'
};

export class UndoHandler {

  constructor(controller) {
    this.controller = controller;
    this.cy = controller.cy;
    this.undoStack = [];
  }

  init() {
    this._addPositionUndoListeners();
    this._addDeleteUndoListeners();
  }


  _addPositionUndoListeners() {
    const { cy } = this;

    let savedPositions;

    const getPositionsMap = () => {
      const map = new Map();
      cy.pathwayNodes()
        .forEach(n => {
          const id = n.data('id');
          const pos = n.position();
          map.set(id, { id, x: pos.x, y: pos.y });
        }
      );
      return map;
    };

    const restorePositions = (positionsToUndo) => {
      cy.batch(() => {
        for(const pos of positionsToUndo) {
          const node = cy.nodes(`#${pos.id}`);
          node.position(pos);
        }
      });
    };

    cy.on('grab', 'node', () => {
      savedPositions = getPositionsMap();
    });
  
    cy.on('free', 'node', _.debounce(() => {
      const newPositions = getPositionsMap();
      const positionsToUndo = [];

      for(const [ id, savedPos ] of savedPositions) {
        const newPos = newPositions.get(id);
        if(newPos.x != savedPos.x || newPos.y != savedPos.y) {
          positionsToUndo.push(savedPos);
        }
      }

      if(positionsToUndo.length > 0) {
        this._push(TYPE.POSITION, () => restorePositions(positionsToUndo));
      }

      savedPositions = null;
    }, 100));
  }


  _addDeleteUndoListeners() {
    const { cy } = this;

    const restoreEles = elesToRestore => {
      const parentIDs = new Set();
      for(const ele of elesToRestore) {
        if(ele.group === 'nodes') {
          if(ele.data._isParent) {
            parentIDs.add(ele.data.id);
          }
          if(ele.data.parent) {
            parentIDs.add(ele.data.parent);
          }
        }
      }

      cy.add(elesToRestore);

      for(const id of parentIDs) {
        const parent = cy.elements(`node[id="${id}"]`);
        this.controller._updateBubblePath(parent);
      }
    };

    let deletedEles = [];

    // Deleting multiple nodes calls this handler once for each node deleted.
    // A short debounce is used to coalesce the deleted elements into one list.
    const handleDelete = _.debounce(() => {
      const elesToRestore = deletedEles;
      this._push(TYPE.DELETE, () => restoreEles(elesToRestore));
      deletedEles = [];
    }, 50);

    cy.on('remove', (evt) => {
      deletedEles.push(evt.target.json());
      handleDelete();
    });
  }


  _push(type, action) {
    if(this.undoStack.length == MAX_STACK_DEPTH) {
      this.undoStack.shift();
    }
    this.undoStack.push({ type, action });

    this.controller.bus.emit('undo', 'push', action.type, this.empty(), this.peekType());
  }

  empty() {
    return this.undoStack.length <= 0;
  }

  undo() {
    if(this.empty()) {
      console.log("no undo action on stack");
      return;
    }

    const action = this.undoStack.pop();
    action.action();

    this.controller.bus.emit('undo', 'pop', action.type, this.empty(), this.peekType());
  }

  peekType() {
    if(!this.empty()) {
      return this.undoStack.slice(-1)[0].type;
    }
  }

}

export default UndoHandler;