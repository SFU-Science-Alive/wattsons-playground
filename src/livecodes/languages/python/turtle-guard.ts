// Wattson (#459): after turtle.done() or turtle.mainloop(), the next turtle command
// stops the run with a hint, like Python on a computer (where the window loop
// blocks, so later lines never run). Brython's turtle draws on every call, so
// without this the lines after done() keep drawing.
//
// Runs as its own Brython script (its own line numbers), ahead of the student's
// code. It patches turtle up front because Brython ignores a replaced
// builtins.__import__. Only when the stdlib is loaded (the student has an import),
// so a program with no imports never fetches turtle. Brython's module-level
// mainloop() only warns and draws nothing, so it is mapped to done().
export const turtleDoneHint = "Lines after turtle.done() don't run. Move them above it.";

export const turtleGuardPython = `
from browser import window

_SKIP = ('done', 'mainloop', 'exitonclick', 'bye')

def _patch(tg):
    state = {'done': False}
    def guard(fn):
        def wrapped(*a, **k):
            if state['done']:
                raise RuntimeError("${turtleDoneHint}")
            return fn(*a, **k)
        return wrapped
    for cls, names in ((tg.Turtle, tg._tg_turtle_functions), (tg.Screen, tg._tg_screen_functions)):
        for n in names:
            if n not in _SKIP and hasattr(cls, n):
                setattr(cls, n, guard(getattr(cls, n)))
    for n in tg._tg_turtle_functions + tg._tg_screen_functions:
        if n not in _SKIP and hasattr(tg, n):
            setattr(tg, n, guard(getattr(tg, n)))
    show = tg.done
    def done(*a, **k):
        show()
        state['done'] = True
    tg.done = done
    tg.mainloop = done

_vfs = getattr(window.__BRYTHON__, 'VFS', None)
if _vfs and getattr(_vfs, 'turtle', None):
    import turtle as _tg
    _patch(_tg)
`;

// JS for the result page head: adds the guard as a Brython script before the student's.
// The id must not contain a hyphen (Brython uses it as the module name).
export const turtleGuardScript = `
(function () {
  var s = document.createElement('script');
  s.type = 'text/python';
  s.id = 'wattson_turtle_guard';
  s.textContent = ${JSON.stringify(turtleGuardPython)};
  document.head.appendChild(s);
})();
`;
