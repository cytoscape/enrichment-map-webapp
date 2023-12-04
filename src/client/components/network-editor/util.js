import theme from '../../theme';


export function isMobile() {
  return window.innerWidth < theme.breakpoints.values.sm;
}

export function isTablet() {
  return window.innerWidth < theme.breakpoints.values.md;
}

export function delay(millis) {
  return new Promise(r => setTimeout(r, millis, 'delay'));
}

export function stringToBlob(str) {
  return new Blob([str], { type: 'text/plain;charset=utf-8' });
}