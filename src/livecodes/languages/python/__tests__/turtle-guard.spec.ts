import { brythonOptionsScript, python } from '../lang-python';
import { turtleDoneHint, turtleGuardPython, turtleGuardScript } from '../turtle-guard';

describe('python turtle guard (#459)', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  test('is the python compiler inline script', () => {
    expect(python.compiler).toMatchObject({
      inlineScript: brythonOptionsScript + turtleGuardScript,
    });
  });

  test('adds one text/python script to the head', () => {
    // eslint-disable-next-line no-new-func
    new Function(turtleGuardScript)();
    const el = document.head.querySelector('script[type="text/python"]') as HTMLScriptElement;
    expect(el.id).toBe('wattson_turtle_guard');
    expect(el.textContent).toBe(turtleGuardPython);
  });

  test('carries the exact hint', () => {
    expect(turtleDoneHint).toBe("Lines after turtle.done() don't run. Move them above it.");
    expect(turtleGuardPython).toContain(turtleDoneHint);
  });

  test('wraps done and mainloop, and leaves exitonclick and bye alone', () => {
    expect(turtleGuardPython).toContain('tg.mainloop = done');
    expect(turtleGuardPython).toContain("_SKIP = ('done', 'mainloop', 'exitonclick', 'bye')");
  });

  test('turns off the Brython IndexedDB cache that logs "upgrade needed" (#569)', () => {
    document.head.innerHTML = '';
    // eslint-disable-next-line no-new-func
    new Function(brythonOptionsScript)();
    const el = document.head.querySelector('brython-options') as HTMLElement;
    expect(el.getAttribute('indexeddb')).toBe('false');
  });
});
