/* Live HTML -> cached textures. No cloned overlay DOM, no previous dock renderer.
 * Content changes refresh snapshots; native scroll and drawer movement are
 * composed from current element rectangles on each animation frame.
 */
window.WebGLBackground = function (gl, texture, canvas) {
  'use strict';
  const scene = document.createElement('canvas');
  const ctx = scene.getContext('2d', {alpha: false});
  const sources = new Map();
  let busy = false, revision = 0, lastCapture = 0, lastScene = '';
  const stats = {captures: 0, uploads: 0, error: '', captureMs: 0};
  const root = document.documentElement;
  const nodes = () => [document.querySelector('.app'), document.querySelector('#accountTicker'),
    ...(document.body.classList.contains('drawer-open') ? [document.querySelector('#profileDrawer')] : [])].filter(Boolean);
  function track() {
    for (const node of nodes()) if (!sources.has(node)) {
      const source = {node, dirty: true, image: null, version: 0, page: null, pages: new Map()};
      sources.set(node, source);
      new MutationObserver(() => {source.dirty = true;}).observe(node, {
        subtree: true, childList: true, characterData: true, attributes: true,
        attributeFilter: ['class', 'hidden', 'value', 'src', 'd', 'points']
      });
      node.addEventListener('input', () => {source.dirty = true;});
      node.addEventListener('scroll', () => {if (node.id === 'profileDrawer') source.dirty = true;}, {passive: true});
    }
  }
  async function capture() {
    if (busy || performance.now() - lastCapture < 120) return;
    const source = nodes().map(n => sources.get(n)).find(s => s?.dirty);
    if (!source) return;
    busy = true; source.dirty = false; lastCapture = performance.now();
    const node = source.node, screen = node.querySelector('.screen.active')?.id;
    const width = node.offsetWidth, height = Math.max(node.offsetHeight, node.scrollHeight);
    const scale = Math.min(devicePixelRatio || 1, 1.5, 4096 / height, 2048 / width);
    try {
      const image = await html2canvas(node, {
        scale, width, height, backgroundColor: null, logging: false, useCORS: true,
        allowTaint: false, imageTimeout: 1500, scrollX: 0, scrollY: 0,
        ignoreElements: el => el.matches?.('#glassCanvas,#bar,script,iframe') || false,
        onclone: (doc, clone) => {
          clone.style.transform = 'none'; clone.style.width = width + 'px';
          if (node.id === 'profileDrawer') {
            clone.style.position = 'relative'; clone.style.inset = 'auto';
            clone.style.height = height + 'px'; clone.style.overflow = 'visible';
          }
          doc.querySelectorAll('*').forEach(el => {
            el.style.transition = 'none'; el.style.animationPlayState = 'paused';
            if (el.classList.contains('jelly-item')) el.style.transform = 'none';
          });
        }
      });
      if (screen !== node.querySelector('.screen.active')?.id) {source.dirty = true; return;}
      source.image = image; source.width = width; source.height = height;
      source.version = ++revision; stats.captures++;
      if(screen) {
        source.pages.set(screen,{image,width,height,version:source.version});
        if(source.pages.size>6)source.pages.delete(source.pages.keys().next().value);
      }
      stats.captureMs = Math.round(performance.now() - lastCapture);
      root.dataset.glassCaptures = String(stats.captures);
    } catch (error) {
      stats.error = error.message; root.dataset.glassError = error.message;
      console.error('Glass background:', error);
    } finally {busy = false;}
  }
  function resize(width, height) {
    scene.width = width; scene.height = height; lastScene = '';
    for (const source of sources.values()) source.dirty = true;
  }
  function draw(width, height) {
    track();
    for(const source of sources.values()) {
      const page=source.node.querySelector('.screen.active')?.id;
      if(page && page!==source.page) {
        source.page=page;source.dirty=true;
        const cached=source.pages.get(page);
        source.image=cached?.image||null;
        if(cached){source.width=cached.width;source.height=cached.height;source.version=cached.version;}
        lastScene='';
      }
    }
    capture();
    const list = nodes(), poses = list.map(node => {
      const r = node.getBoundingClientRect();
      return {node, r, source: sources.get(node), scroll: node.id === 'profileDrawer' ? node.scrollTop : 0};
    });
    const key = poses.map(p => [p.node.id, p.source?.version, p.r.left, p.r.top, p.r.width, p.r.height, p.scroll].join(',')).join('|');
    if (key === lastScene) return;
    lastScene = key;
    ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle = '#050505'; ctx.fillRect(0,0,width,height);
    const sx = width / canvas.clientWidth, sy = height / canvas.clientHeight;
    for (const {node, r, source, scroll} of poses) {
      if (!source?.image) continue;
      ctx.save();
      if (node.id === 'profileDrawer') {
        ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillRect(0,0,width,height);
        ctx.beginPath(); ctx.rect(r.left*sx,r.top*sy,r.width*sx,r.height*sy); ctx.clip();
      }
      ctx.drawImage(source.image, r.left*sx, (r.top-scroll)*sy,
        r.width*sx, source.height*sy);
      ctx.restore();
    }
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,scene);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    root.dataset.glassUploads = String(++stats.uploads);
  }
  document.addEventListener('finance:navigation', () => {
    for (const source of sources.values()) source.dirty = true;
    lastScene = '';
  });
  return {resize, draw, stats};
};
