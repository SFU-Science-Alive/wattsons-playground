// Science Alive fork (#300): which SDK host pages may save activity work in an embed.
export const SAVE_PARENT_ORIGINS = [
  'https://hellowattson.ca',
  'https://hellowattson-staging.saadmin4.workers.dev',
  'https://workbench-hellowattson-staging.saadmin4.workers.dev',
];

export const resolveParentOrigin = (input: {
  ancestorOrigins?: ArrayLike<string> | null;
  referrer?: string;
}): string | null => {
  const first = input.ancestorOrigins?.[0];
  if (first) return first;
  if (input.referrer) {
    try {
      return new URL(input.referrer).origin;
    } catch {
      return null;
    }
  }
  return null;
};

export const isSaveAllowedParent = (origin: string | null): boolean => {
  if (!origin) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (SAVE_PARENT_ORIGINS.includes(url.origin)) return true;
  // localhost on any port, http only
  return url.protocol === 'http:' && url.hostname === 'localhost';
};

/** `undefined` when not embedded, otherwise the parent origin or `null` if unknown. */
export const getEmbedParentOrigin = (win: Window): string | null | undefined => {
  try {
    if (win === win.top) return undefined;
    return resolveParentOrigin({
      ancestorOrigins: win.location.ancestorOrigins,
      referrer: win.document.referrer,
    });
  } catch {
    return null;
  }
};
