const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const FORCED_COLORS = '(forced-colors: active)';

export function enhanceOpticalPointer() {
  const finePointer = window.matchMedia(FINE_POINTER);
  const reducedMotion = window.matchMedia(REDUCED_MOTION);
  const forcedColors = window.matchMedia(FORCED_COLORS);

  if (
    !finePointer.matches ||
    reducedMotion.matches ||
    forcedColors.matches
  ) {
    return;
  }

  const pointer = document.createElement('div');
  pointer.className = 'optical-pointer';
  pointer.setAttribute('aria-hidden', 'true');

  const lens = document.createElement('div');
  lens.className = 'optical-pointer__lens';

  pointer.append(lens);
  document.body.append(pointer);

  let x = -100;
  let y = -100;
  let frame = 0;
  let initialized = false;

  const render = () => {
    frame = 0;
    pointer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const requestRender = () => {
    if (!frame) {
      frame = requestAnimationFrame(render);
    }
  };

  const setVariant = (target: EventTarget | null) => {
    if (!(target instanceof Element)) {
      pointer.dataset.variant = 'default';
      return;
    }

    if (
      target.closest(
        'input, textarea, select, [contenteditable="true"], [data-native-cursor]',
      )
    ) {
      pointer.dataset.variant = 'native';
      document.documentElement.dataset.opticalPointerNative = 'true';
      return;
    }

    delete document.documentElement.dataset.opticalPointerNative;

    if (target.closest('.site-header, .desktop-nav, .mobile-nav')) {
      pointer.dataset.variant = 'glass';
      return;
    }

    if (
      target.closest(
        'button, [role="button"], .button, .sign-in, summary, [data-pointer="action"]',
      )
    ) {
      pointer.dataset.variant = 'action';
      return;
    }

    if (target.closest('a')) {
      pointer.dataset.variant = 'link';
      return;
    }

    pointer.dataset.variant = 'default';
  };

  const show = () => {
    pointer.dataset.visible = 'true';

    if (!initialized) {
      initialized = true;
      document.documentElement.dataset.opticalPointer = 'ready';
    }
  };

  const hide = () => {
    pointer.dataset.visible = 'false';
    delete document.documentElement.dataset.opticalPointerNative;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType && event.pointerType !== 'mouse') {
      return;
    }

    x = event.clientX;
    y = event.clientY;

    setVariant(event.target);
    show();
    requestRender();
  };

  const onPointerOver = (event: PointerEvent) => {
    if (event.pointerType && event.pointerType !== 'mouse') {
      return;
    }

    setVariant(event.target);
  };

  const onPointerDown = () => {
    pointer.dataset.pressed = 'true';
  };

  const onPointerUp = () => {
    delete pointer.dataset.pressed;
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerover', onPointerOver, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('blur', hide);

  document.documentElement.addEventListener('mouseleave', hide);
  document.documentElement.addEventListener('mouseenter', show);
}