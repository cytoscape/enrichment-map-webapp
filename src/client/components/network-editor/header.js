import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { DEFAULT_PADDING } from './defaults';
import TitleEditor from './title-editor';
import ShareButton from './share-button';
import { NetworkEditorController } from './controller';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';

import { AppLogoIcon } from '../svg-icons';
import { expandOutline, search } from 'ionicons/icons';

/**
 * The network editor's header or app bar.
 * @param {Object} props React props
 */
export class Header extends Component {

  constructor(props) {
    super(props);

    this.controller = props.controller;
    this.busProxy = new EventEmitterProxy(this.controller.bus);

    this.state = {
      menu: null,
      anchorEl: null,
      dialogId: null,
    };
  }

  handleClick(event, menuName) {
    this.showMenu(menuName, event.currentTarget);
  }

  handleClose() {
    this.setState({
      menuName: null,
      anchorEl: null,
      dialogName: null,
    });
  }

  showMenu(menuName, anchorEl) {
    this.setState({
      menuName: menuName,
      anchorEl: anchorEl,
      dialogName: null,
    });
  }

  goBackToMenu(menuName) {
    this.setState({
      menuName: menuName,
      dialogName: null,
    });
  }

  showDialog(dialogName, menuName) {
    this.setState({
      menuName: menuName,
      anchorEl: menuName ? this.state.anchorEl : null,
      dialogName: dialogName,
    });
  }

  hideDialog() {
    this.setState({
      menuName: null,
      anchorEl: null,
      dialogName: null,
    });
  }

  componentDidMount() {
    const dirty = () => this.setState({ dirty: Date.now() });
    this.busProxy.on('toggleDrawMode', dirty);
  }

  componentWillUnmount() {
    this.busProxy.removeAllListeners();
  }

  render() {
    const { anchorEl, menuName, dialogName } = this.state;
    const { controller } = this;

    return (
      <IonHeader>
        <IonToolbar color="dark">
          <IonButtons slot="start">
            <IonButton aria-label='home' defaultHref="/">
              <AppLogoIcon fontSize="large" />
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={() => controller.cy.fit(DEFAULT_PADDING)} >
              <IonIcon slot="icon-only" icon={expandOutline} />
            </IonButton>
            <IonButton onClick={() => console.log('Search NOT IMPLEMENTED...')} >
              <IonIcon slot="icon-only" icon={search} />
            </IonButton>
            {/* <ShareButton controller={controller}/> */}
          </IonButtons>
          <TitleEditor controller={controller} />
        </IonToolbar>
      </IonHeader>
      // {anchorEl && (
      //   <Popover
      //     id="menu-popover"
      //     anchorEl={anchorEl}
      //     open={Boolean(anchorEl)}
      //     onClose={() => this.handleClose()}
      //   >
      //     {menuName === 'account' && (
      //       <MenuList>
      //         <MenuItem disabled={true} onClick={() => this.handleClose()}>Sign Out</MenuItem>
      //       </MenuList>
      //     )}
      //   </Popover>
      // )}
    );
  }
}

// const ToolbarButton = ({ children, title, onClick }) => (
//     <IonButton onClick={onClick}>
//       { children }
//     </IonButton>
// );

// const useStyles = theme => ({
//   root: {
//     width: 'fit-content',
//   },
//   divider: {
//     marginLeft: theme.spacing(0.5),
//     marginRight: theme.spacing(0.5),
//     width: 0,
//   },
//   unrelatedDivider: {
//     marginLeft: theme.spacing(2.5),
//     marginRight: theme.spacing(2.5),
//     width: 0,
//   },
// });

// ToolbarButton.propTypes = {
//   title: PropTypes.string.isRequired,
//   color: PropTypes.string,
//   onClick: PropTypes.func.isRequired,
//   children: PropTypes.element.isRequired,
// };

Header.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController)
};

export default Header;