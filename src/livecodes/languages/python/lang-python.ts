import type { LanguageSpecs } from '../../models';
import { getLanguageCustomSettings } from '../../utils/utils';
import { brythonBaseUrl, codeMirrorBaseUrl, monacoLanguagesBaseUrl } from '../../vendors';
import { pythonFormatter } from '../python-wasm/lang-python-wasm';
import { turtleGuardScript } from './turtle-guard';

const brythonUrl = brythonBaseUrl + 'brython.min.js';
const stdlibUrl = brythonBaseUrl + 'brython_stdlib.js';

// Brython 3.12.4 logs console.info("upgrade needed") from its IndexedDB stdlib cache
// (onupgradeneeded) on every run, which shows in the camper Console (#569). Turning the
// cache off skips that code; the stdlib then loads from brython_stdlib.js as usual.
export const brythonOptionsScript = `
(function () {
  var o = document.createElement('brython-options');
  o.setAttribute('indexeddb', 'false');
  document.head.appendChild(o);
})();
`;

export const python: LanguageSpecs = {
  name: 'python',
  title: 'Python',
  formatter: pythonFormatter,
  compiler: {
    factory: () => async (code) => code,
    scripts: ({ compiled, config }) => {
      const { autoloadStdlib } = getLanguageCustomSettings('python', config);
      const importsPattern = /^(?:from[ ]+(\S+)[ ]+)?import[ ]+(\S+)(?:[ ]+as[ ]+\S+)?[ ]*$/gm;
      const stdlib = autoloadStdlib !== false && compiled.match(importsPattern) ? [stdlibUrl] : [];
      return [brythonUrl, ...stdlib];
    },
    inlineScript: brythonOptionsScript + turtleGuardScript,
    scriptType: 'text/python',
    compiledCodeLanguage: 'python',
  },
  extensions: ['py'],
  editor: 'script',
  editorSupport: {
    monaco: { languageSupport: monacoLanguagesBaseUrl + 'python.js' },
    codemirror: {
      languageSupport: async () =>
        (await import(codeMirrorBaseUrl + 'codemirror-lang-python.js')).python(),
    },
  },
};
