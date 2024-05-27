export function isMobile(theme) {
  return window.innerWidth < theme.breakpoints.values.sm;
}

export function isTablet(theme) {
  return window.innerWidth < theme.breakpoints.values.md;
}

export function delay(millis) {
  return new Promise(r => setTimeout(r, millis, 'delay'));
}

export function stringToBlob(str) {
  return new Blob([str], { type: 'text/plain;charset=utf-8' });
}

export function networkURL(id) {
  return `${window.location.origin}/document/${id}`;
}