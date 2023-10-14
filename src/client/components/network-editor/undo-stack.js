import _ from 'lodash';


const MAX_STACK_DEPTH = 30;


export class UndoHandler {

  constructor(cy) {
    this.cy = cy;
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
      cy.nodes()
        .filter(n => n.children().empty())
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
        this._push('position', () => restorePositions(positionsToUndo));
      }

      savedPositions = null;
    }, 100));
  }


  _addDeleteUndoListeners() {
    const { cy } = this;

    let deletedEles = [];

    const restoreEles = elesToRestore => {
      console.log("elesToRestore: " + elesToRestore.length);
      cy.add(elesToRestore);
    };

    // Deleting multiple nodes calls this handler once for each node deleted.
    // A short debounce is used to coalesce the deleted elements into one list.
    const handleDelete = _.debounce(() => {
      const elesToRestore = deletedEles;
      console.log("handleDelete " + elesToRestore.length);
      this._push('delete', () => restoreEles(elesToRestore));
      deletedEles = [];
    }, 50);

    cy.on('remove', (evt) => {
      deletedEles.push(evt.target.json());
      handleDelete();
    });
  }


  _push(type, action) {
    console.log("undo pushed " + type);
    if(this.undoStack.length == MAX_STACK_DEPTH) {
      this.undoStack.shift();
    }
    this.undoStack.push({ type, action });
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
    console.log("undoing " + action.type);
    action.action();
  }

}

export default UndoHandler;