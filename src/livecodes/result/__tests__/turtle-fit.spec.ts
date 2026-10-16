import { handleTurtleFit } from '../utils';

const NS = 'http://www.w3.org/2000/svg';
const makeSvg = (id?: string) => {
  const svg = document.createElementNS(NS, 'svg');
  if (id) svg.setAttribute('id', id);
  svg.setAttribute('width', '500');
  svg.setAttribute('height', '500');
  return svg;
};
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('handleTurtleFit', () => {
  let observer: MutationObserver;
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    observer = handleTurtleFit();
  });
  afterEach(() => observer.disconnect());

  test('adds a viewBox to the turtle canvas', async () => {
    const svg = makeSvg('turtle-canvas');
    document.body.appendChild(svg);
    await tick();
    expect(svg.getAttribute('viewBox')).toBe('0 0 500 500');
  });

  test('updates the viewBox when width changes', async () => {
    const svg = makeSvg('turtle-canvas');
    document.body.appendChild(svg);
    await tick();
    svg.setAttribute('width', '600');
    await tick();
    expect(svg.getAttribute('viewBox')).toBe('0 0 600 500');
  });

  test('keeps one style element when called twice', () => {
    const second = handleTurtleFit();
    second.disconnect();
    expect(document.querySelectorAll('#__livecodes_turtle_fit__').length).toBe(1);
  });

  const setPane = (w: number, h: number) => {
    Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
    window.dispatchEvent(new Event('resize'));
  };

  test('shrinks to fit a narrow pane, centred', async () => {
    setPane(410, 530);
    const svg = makeSvg('turtle-canvas');
    document.body.appendChild(svg);
    await tick();
    expect(svg.style.width).toBe('410px');
    expect(svg.style.height).toBe('410px');
    expect(svg.style.left).toBe('0px');
    expect(svg.style.top).toBe('60px');
    expect(svg.style.getPropertyPriority('width')).toBe('important');
    expect(svg.style.getPropertyPriority('height')).toBe('important');
  });

  test('grows past 500 and refits on resize without a redraw', async () => {
    setPane(410, 530);
    const svg = makeSvg('turtle-canvas');
    document.body.appendChild(svg);
    await tick();
    setPane(900, 700);
    expect(svg.style.width).toBe('700px');
    expect(svg.style.left).toBe('100px');
    expect(svg.style.top).toBe('0px');
    setPane(410, 530);
    expect(svg.style.width).toBe('410px');
  });

  test('keeps the drawing shape for a non-square canvas', async () => {
    setPane(1000, 500);
    const svg = makeSvg('turtle-canvas');
    svg.setAttribute('width', '400');
    svg.setAttribute('height', '200');
    document.body.appendChild(svg);
    await tick();
    expect(svg.style.width).toBe('1000px');
    expect(svg.style.height).toBe('500px');
  });

  test('never changes width', async () => {
    const svg = makeSvg('turtle-canvas');
    document.body.appendChild(svg);
    await tick();
    expect(svg.getAttribute('width')).toBe('500');
  });

  test('ignores svg without the id', async () => {
    const svg = makeSvg();
    document.body.appendChild(svg);
    await tick();
    expect(svg.hasAttribute('viewBox')).toBe(false);
  });

  test('handles a wrapper that already holds the svg', async () => {
    const wrapper = document.createElement('div');
    wrapper.id = 'turtle-canvas-wrapper';
    const svg = makeSvg('turtle-canvas');
    wrapper.appendChild(svg);
    document.body.appendChild(wrapper);
    await tick();
    expect(svg.getAttribute('viewBox')).toBe('0 0 500 500');
  });
});
