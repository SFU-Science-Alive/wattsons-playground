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

  test('style caps the width', () => {
    expect(document.getElementById('__livecodes_turtle_fit__')?.textContent).toContain(
      'max-width:100% !important',
    );
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
