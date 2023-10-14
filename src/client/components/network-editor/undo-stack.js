import _ from 'lodash';


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
        this.undoStack.push({
          type: 'position',
          action: () => restorePositions(positionsToUndo)
        });
      }

      savedPositions = null;
    }, 100));
  }


  _addDeleteUndoListeners() {
    const { cy } = this;

    let deletedEles = [];

    const restoreEles = elesToRestore => {
      cy.add(elesToRestore);
    };

    // deleting multiple nodes calls this handler once for each node deleted
    const handleDelete = _.debounce(() => {
      const elesToRestore = deletedEles;
      this.undoStack.push({
        type: 'delete',
        action: () => restoreEles(elesToRestore)
      });
      deletedEles = [];
    }, 50);

    cy.on('remove', (evt) => {
      deletedEles.push(evt.target);
      handleDelete();
    });
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
  }

}

export default UndoHandler;