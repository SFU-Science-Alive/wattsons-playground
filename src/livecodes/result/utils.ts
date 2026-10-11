import { getConsoleCallSite, getConsoleCallSiteFromError } from '../compiler/source-maps';

// modified from https://github.com/alexindigo/precise-typeof/blob/master/index.js
export const typeOf = (obj: any) => {
  function isElement(o: any) {
    return typeof HTMLElement === 'object'
      ? o instanceof HTMLElement
      : o &&
          typeof o === 'object' &&
          o !== null &&
          o.nodeType === 1 &&
          typeof o.nodeName === 'string';
  }
  function isNode(o: any) {
    return typeof Node === 'object'
      ? o instanceof Node
      : o &&
          typeof o === 'object' &&
          typeof o.nodeType === 'number' &&
          typeof o.nodeName === 'string';
  }
  function isNodeList(o: any) {
    return o instanceof NodeList;
  }
  function isHTMLCollection(o: any) {
    return o instanceof HTMLCollection;
  }
  function isDocument(o: any) {
    return Object.prototype.toString.call(o) === '[object HTMLDocument]';
  }
  function isWindow(o: any) {
    return Object.prototype.toString.call(o) === '[object Window]';
  }

  const stamp: string = Object.prototype.toString.call(obj);

  if (obj === undefined) return 'undefined';
  if (obj === null) return 'null';

  if (isWindow(obj)) return 'window';
  if (isDocument(obj)) return 'document';
  if (isElement(obj)) return 'element';
  if (isNode(obj)) return 'node';
  if (isNodeList(obj)) return 'nodelist';
  if (isHTMLCollection(obj)) return 'htmlcollection';

  if (
    obj.constructor &&
    typeof obj.constructor.isBuffer === 'function' &&
    obj.constructor.isBuffer(obj)
  ) {
    return 'buffer';
  }

  if (typeof window === 'object' && obj === window) return 'window';
  if (typeof global === 'object' && obj === global) return 'global';

  if (typeof obj === 'number' && isNaN(obj)) return 'nan';
  if (typeof obj === 'object' && stamp === '[object Number]' && isNaN(obj)) return 'nan';

  if (typeof obj === 'object' && stamp.substr(-6) === 'Event]') return 'event';
  if (stamp.substr(0, 12) === '[object HTML') return 'element';
  if (stamp.substr(0, 12) === '[object Node') return 'node';

  // last resort
  const type = stamp.match(/\[object\s*([^\]]+)\]/);
  if (type) return type[1].toLowerCase();

  return 'object';
};

function consoleArgs(args: any[]): Array<{ type: string; content: any }> {
  return args.map((arg) => {
    switch (typeOf(arg)) {
      case 'window':
      case 'function':
      case 'date':
      case 'symbol':
        return { type: typeOf(arg), content: arg.toString() };
      case 'document':
        return { type: typeOf(arg), content: arg.documentElement.outerHTML };
      case 'element':
        return { type: typeOf(arg), content: arg.outerHTML };
      case 'node':
        return { type: typeOf(arg), content: arg.textContent };
      case 'nodelist':
      case 'htmlcollection':
        return {
          type: typeOf(arg),
          content: [...arg].map((x: unknown) => consoleArgs([x])[0].content),
        };
      case 'array':
        return { type: typeOf(arg), content: arg.map((x: unknown) => consoleArgs([x])[0].content) };
      case 'object':
      case 'event':
        const obj: Record<string, any> = {};
        // eslint-disable-next-line guard-for-in
        for (const k in arg) {
          obj[k] = arg[k];
        }
        return {
          type: typeOf(arg),
          content: Object.keys(obj).reduce(
            (acc, key) => ({ ...acc, [key]: consoleArgs([obj[key]])[0].content }),
            {},
          ),
        };
      case 'error':
        return {
          type: typeOf(arg),
          content: arg.constructor.name + ': ' + arg.message,
        };
    }
    try {
      return { type: 'other', content: structuredClone(arg) };
    } catch {
      return { type: 'other', content: String(arg) };
    }
  });
}

export const proxyConsole = () => {
  window.console = new Proxy(console, {
    get(target, method) {
      return function (...args: any[]) {
        if (!(method in target)) {
          const msg = `Uncaught TypeError: console.${String(method)} is not a function`;
          target.error(msg);
          parent.postMessage({ type: 'console', method: 'error', args: consoleArgs([msg]) }, '*');
          return;
        }
        (target[method as keyof typeof console] as any)(...args);
        const callSite = getConsoleCallSite();
        // Methods that produce no visual output in Luna (don't fire the 'insert' event):
        // - 'time' always silent (stores start time, no DOM entry)
        // - 'countReset' always silent (resets counter in memory, no DOM entry)
        // - 'assert' when assertion passes (first arg truthy = no failure shown)
        // - 'table' with no args (nothing to render)
        const silent =
          method === 'time' ||
          method === 'countReset' ||
          (method === 'assert' && !!args[0]) ||
          (method === 'table' && args.length === 0);
        parent.postMessage(
          {
            type: 'console',
            method,
            args: consoleArgs(args),
            lineNumber: callSite.lineNumber,
            columnNumber: callSite.columnNumber,
            source: callSite.source,
            silent,
          },
          '*',
        );
      };
    },
  });

  window.addEventListener('error', (error) => {
    const callSite = getConsoleCallSiteFromError(error.lineno, error.error?.stack);
    parent.postMessage(
      {
        type: 'console',
        method: 'error',
        args: consoleArgs([error.message]),
        lineNumber: callSite.lineNumber,
        columnNumber: callSite.columnNumber,
        source: callSite.source,
      },
      '*',
    );
  });
};

export const handleEval = () => {
  window.addEventListener('message', (event) => {
    if (event.data.console) {
      const evalCode = () => {
        try {
          return {
            type: 'console',
            method: 'output',
            // eslint-disable-next-line no-eval
            args: consoleArgs([window.eval(event.data.console)]),
          };
        } catch (error) {
          return { type: 'console', method: 'error', args: consoleArgs([error]) };
        }
      };
      parent.postMessage(evalCode(), '*');
    }
  });
};

export const handleResize = () => {
  window.addEventListener('resize', () => {
    parent.postMessage(
      {
        type: 'resize',
        sizes: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
      '*',
    );
  });
};

export const handleScrollPosition = () => {
  window.addEventListener('scroll', () => {
    parent.postMessage(
      {
        type: 'scroll',
        position: {
          x: window.scrollX,
          y: window.scrollY,
        },
      },
      '*',
    );
  });
  const prefix = '#livecodes-scroll-position:';
  if (location.hash.startsWith(prefix)) {
    const [x, y] = location.hash.replace(prefix, '').split(',').map(Number);
    window.addEventListener('DOMContentLoaded', () => {
      window.scrollTo({ top: y, left: x });
    });
  }
};

export const TURTLE_FIT_CSS =
  '#turtle-canvas{max-width:100% !important;height:auto !important;display:block}';

export const fitTurtleCanvas = (svg: Element | null): void => {
  if (!svg) return;
  const w = Number(svg.getAttribute('width'));
  const h = Number(svg.getAttribute('height'));
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
};

export const handleTurtleFit = (doc: Document = document): MutationObserver => {
  if (!doc.getElementById('__livecodes_turtle_fit__')) {
    const style = doc.createElement('style');
    style.id = '__livecodes_turtle_fit__';
    style.textContent = TURTLE_FIT_CSS;
    doc.head.appendChild(style);
  }
  fitTurtleCanvas(doc.getElementById('turtle-canvas'));
  const observer = new MutationObserver(() => {
    fitTurtleCanvas(doc.getElementById('turtle-canvas'));
  });
  observer.observe(doc.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['width', 'height'],
  });
  return observer;
};
