import React, { Component } from 'react';
import EventEmitterProxy from '../../../model/event-emitter-proxy';
import PropTypes from 'prop-types';
import { NetworkEditorController } from './controller';
import Tooltip from '@material-ui/core/Tooltip';
import { Drawer } from '@material-ui/core';
import { IconButton, Divider, Box } from '@material-ui/core';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import { LayoutIcon } from '../svg-icons';

function SidePanel({ title, onClose, children }) {
  return <div>
    <div className="tool-panel-heading">
      { title || "Panel" }
      <IconButton size="small" onClick={onClose}>
        <KeyboardArrowRightIcon />
      </IconButton>
    </div>
    <div>
      { children }
    </div>
  </div>;
}
SidePanel.propTypes = {
  title: PropTypes.string,
  children: PropTypes.any,
  onClose: PropTypes.func,
};

export class ToolPanel extends Component {
  constructor(props){
    super(props);
    this.busProxy = new EventEmitterProxy(this.props.controller.bus);
    this.state = {
      toolRender: () => <div></div>,
      panelOpen: false,
    };
  }

  componentDidMount() {
    const dirty = () => this.setState({ dirty: Date.now() });
    this.busProxy.on('toggleDrawMode', dirty);
  }

  componentWillUnmount(){
    this.busProxy.removeAllListeners();
  }

  render() {
    const { controller } = this.props;
    const { toolRender } = this.state;

    const openPanel  = () => this.setState({ panelOpen: true });
    const closePanel = () => this.setState({ panelOpen: false });
    const notifyOpen  = () => this.props.onSetOpen(true);
    const notifyClose = () => this.props.onSetOpen(false);
      
    const ToolButton = ({ icon, title, tool, onClick = (() => {}), render = (() => <div></div>) }) => {
        const color = this.state.tool === tool ? 'primary' : 'inherit';
        const buttonOnClick = () => { 
          onClick(); 
          this.setState({ tool, toolRender: render });
          openPanel();
        };
        
        return <Tooltip arrow placement="left" title={title}>
          <IconButton size="small" color={color} onClick={buttonOnClick}>
            {typeof(icon) === 'string' ? (
              <i className="material-icons">{ icon }</i>
            ) : (
              <>{ icon }</>
            )}
          </IconButton>
        </Tooltip>;
    };

    return (<div className="tool-panel">
      <Drawer 
        variant='persistent' 
        anchor='right' 
        open={this.state.panelOpen} 
        style={{ zIndex: -1 }} // MKTODO Is there a better way to do this?
        SlideProps={{ // Notify the network editor *after* the slide animation completes.
          onEntered: notifyOpen,
          onExit: notifyClose
        }}>
        <div className="tool-panel-wrapper" bgcolor="background.paper">
          { toolRender() }
        </div>
      </Drawer>

      <Box className="tool-panel-buttons" bgcolor="background.paper" color="secondary.main">

        <ToolButton 
          title="Gene List"
          tool="gene_list"
          icon={<LayoutIcon />}
          render={() =>
            <SidePanel title="Gene List" onClose={closePanel}>
              The Gene List goes here.
            </SidePanel>
          }>
        </ToolButton>
        
        <Divider />
        
        <ToolButton 
          title="Filtering"
          tool="filtering"
          icon="history"
          render={() =>
            <SidePanel title="Filters" onClose={closePanel}>
              The filters go here.
            </SidePanel>
          }>
        </ToolButton>

      </Box>
    </div>);
  }
}

ToolPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
  onSetOpen: PropTypes.func,
};
ToolPanel.defaultProps ={
  onSetOpen: () => null
};

export default ToolPanel;