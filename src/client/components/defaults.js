export const DEFAULT_PADDING = 10;
export const HEADER_HEIGHT = 50;
export const LEFT_DRAWER_WIDTH = 320;
export const RIGHT_DRAWER_WIDTH = 320;

/** The height of the bottom drawer when collapsed */
export const BOTTOM_DRAWER_HEIGHT = 48;
/** Whether the bottom drawer must be open (expanded) by default */
export const BOTTOM_DRAWER_OPEN = true; 

/**
 * The minimum width the header toolbar must have to show its buttons.
 * If the toolbar gets smaller than this, the buttons must be moved to 
 * the right-drawer menu (a.k.a 'mobile menu').
 */
export const MIN_DESKTOP_TOOLBAR_WIDTH = 1080 - LEFT_DRAWER_WIDTH;

export const linkoutProps = { target: "_blank",  rel: "noreferrer", underline: "hover" };


export function bottomDrawerHeight() {
  // The preferred height is 1/3 of the height of the content area (excludes the header)
  const h = Math.round((window.innerHeight - HEADER_HEIGHT) * 0.33);
  const min = 4 * BOTTOM_DRAWER_HEIGHT; // ...but set a minimum height

  return Math.max(min, h);
}

export function pathwayTableHeight() {
  const dh = bottomDrawerHeight() - BOTTOM_DRAWER_HEIGHT;
  
  return dh;
}