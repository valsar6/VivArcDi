(async () => {
  const CANDIDATES = {
    meet: ['[data-call-ended="false"]', '[data-meeting-title]'],
    zoom: ['#wc-container-left', '.meeting-client-inner'],
    discord: ['[class*="callContainer"]', '[class*="wrapper"][class*="video"]'],
    teams: ['[data-tid="calling-screen"]', '#calling-unified-bar'],
  };
  const LEAVE = /leave|hang ?up|end call|end meeting|disconnect|esci|abbandona|lascia|termina|riaggancia/i;
  const clip = (value, size = 90) => String(value || '').replace(/\s+/g, ' ').slice(0, size);

  const describeVideo = (video) => {
    const rect = video.getBoundingClientRect();
    const stream = video.srcObject instanceof MediaStream ? video.srcObject : null;
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      playing: !video.paused && !video.ended && video.readyState > 2,
      hasMediaStream: stream !== null,
      liveVideoTracks: stream ? stream.getVideoTracks().filter((track) => track.readyState === 'live').length : 0,
      disablePictureInPicture: video.disablePictureInPicture,
      disablepictureinpictureAttribute: video.hasAttribute('disablepictureinpicture'),
      muted: video.muted,
      parent: clip(video.parentElement && (video.parentElement.tagName + '.' + video.parentElement.className), 80),
    };
  };

  const videos = [...document.querySelectorAll('video')].map(describeVideo);
  const canvases = [...document.querySelectorAll('canvas')]
    .map((canvas) => canvas.getBoundingClientRect())
    .filter((rect) => rect.width > 200 && rect.height > 120)
    .map((rect) => ({ width: Math.round(rect.width), height: Math.round(rect.height) }));

  const iframes = [...document.querySelectorAll('iframe')].map((frame) => {
    let videosInside = null;
    try {
      videosInside = frame.contentDocument ? frame.contentDocument.querySelectorAll('video').length : null;
    } catch {
      videosInside = 'cross-origin';
    }
    return { src: clip(frame.src, 100), videosInside };
  });

  const selectorMatches = {};
  Object.entries(CANDIDATES).forEach(([site, list]) => {
    selectorMatches[site] = Object.fromEntries(list.map((selector) => [selector, document.querySelectorAll(selector).length]));
  });

  const leaveButtons = [...document.querySelectorAll('button, [role="button"]')]
    .filter((el) => LEAVE.test(el.getAttribute('aria-label') || '') || LEAVE.test(el.getAttribute('data-tid') || '') || LEAVE.test(el.getAttribute('title') || ''))
    .slice(0, 8)
    .map((el) => ({
      tag: el.tagName,
      ariaLabel: clip(el.getAttribute('aria-label')),
      dataTid: el.getAttribute('data-tid'),
      title: clip(el.getAttribute('title')),
      dataAttributes: [...el.attributes].filter((attribute) => attribute.name.startsWith('data-')).map((attribute) => attribute.name + '=' + clip(attribute.value, 40)),
      className: clip(el.className, 80),
    }));

  const keysSeen = [];
  const onKey = (event) => {
    if ((event.metaKey || event.ctrlKey) && (event.shiftKey || event.altKey) && event.key.length === 1) {
      keysSeen.push({ key: event.key, code: event.code, meta: event.metaKey, ctrl: event.ctrlKey, shift: event.shiftKey, alt: event.altKey, defaultPrevented: event.defaultPrevented });
    }
  };
  window.addEventListener('keydown', onKey, true);

  const report = {
    page: { host: location.host, path: location.pathname.replace(/[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}/i, 'xxx-xxxx-xxx'), isTop: window.top === window },
    pictureInPictureEnabled: document.pictureInPictureEnabled,
    documentPictureInPicture: typeof window.documentPictureInPicture,
    mediaSession: 'mediaSession' in navigator,
    videos,
    canvases,
    iframes,
    selectorMatches,
    leaveButtons,
  };
  console.log('Premi ora, nella pagina, Cmd+Shift+P, poi Cmd+Option+P, poi Ctrl+Shift+P. Aspetto 15 secondi.');
  await new Promise((resolve) => setTimeout(resolve, 15000));
  window.removeEventListener('keydown', onKey, true);
  report.keysSeen = keysSeen;

  const text = JSON.stringify(report, null, 2);
  try {
    copy(text);
    console.log('Risultato copiato negli appunti. Incollalo nella chat.');
  } catch {
    console.log(text);
  }
  return report;
})();
