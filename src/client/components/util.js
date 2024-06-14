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

const USE_SMOOTH_LINK_SCROLLING = true;

export function openPageLink(href, target) {
  if (target === '_blank') {
    window.open(href);
  } else if (href.indexOf("#") >= 0 && USE_SMOOTH_LINK_SCROLLING) {
    // get hash portion of url
    const hash = href.split("#")[1];

    document.getElementById(hash).scrollIntoView({
        behavior: 'smooth'
    });

    let isScrolling;

    // Listen for scroll events
    const lis = function() {
      // Clear the timeout if it was already set
      window.clearTimeout(isScrolling);

      // Set a timeout to run after scrolling ends
      isScrolling = setTimeout(function() {
        // Remove passive listener
        window.removeEventListener('scroll', lis);

        // Update the URL when scrolling has stopped
        window.location.href = href;
      }, 150); // delay after scrolling ends
    };

    window.addEventListener('scroll', lis, { passive: true });
  } else {
    window.location.href = href;
  }
}