import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, shrink-to-fit=no" />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Prevent zooming (pinch + double-tap) on web, including iOS Safari which ignores user-scalable=no. */}
        <script dangerouslySetInnerHTML={{ __html: disableZoomScript }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  touch-action: manipulation;
}
body {
  background-color: #fff;
  touch-action: manipulation;
}
* {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;

// Disables pinch-zoom and double-tap-zoom on web (works on iOS Safari which ignores the viewport meta tag).
const disableZoomScript = `
(function () {
  if (typeof document === 'undefined') return;
  // Prevent pinch-zoom gesture (iOS Safari)
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });
  // Prevent double-tap-to-zoom
  var lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    var now = Date.now();
    if (now - lastTouchEnd <= 300) { e.preventDefault(); }
    lastTouchEnd = now;
  }, { passive: false });
  // Prevent multi-touch pinch on touchmove
  document.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches.length > 1) { e.preventDefault(); }
  }, { passive: false });
  // Prevent ctrl/cmd + wheel zoom on desktop
  document.addEventListener('wheel', function (e) {
    if (e.ctrlKey) { e.preventDefault(); }
  }, { passive: false });
  // Prevent ctrl/cmd + (+/-/0) keyboard zoom
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].indexOf(e.key) !== -1) { e.preventDefault(); }
  }, { passive: false });
})();
`;
