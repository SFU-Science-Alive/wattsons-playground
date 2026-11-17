import type { ContentConfig } from '../../models';
import { clearPending, newerPending, readPending, writePending } from '../activity-pending';

const config = {
  script: { language: 'python', content: 'print("hi")' },
} as unknown as ContentConfig;

describe('activity-pending (#332)', () => {
  beforeEach(() => window.localStorage.clear());

  test('write, read and clear one activity', () => {
    writePending('a1', config, undefined, 1000);
    expect(readPending('a1')).toEqual({ config, ts: 1000 });
    expect(readPending('a2')).toBeNull();
    clearPending('a1');
    expect(readPending('a1')).toBeNull();
  });

  test('activities are kept apart', () => {
    writePending('a1', config, undefined, 1);
    writePending('a2', { ...config, title: 'two' } as ContentConfig, undefined, 2);
    clearPending('a1');
    expect(readPending('a1')).toBeNull();
    expect(readPending('a2')?.ts).toBe(2);
  });

  test('a broken or foreign value reads as nothing', () => {
    window.localStorage.setItem('__wattson_activity_pending__:a1', '{not json');
    expect(readPending('a1')).toBeNull();
    window.localStorage.setItem(
      '__wattson_activity_pending__:a1',
      JSON.stringify({ ts: 'x', config }),
    );
    expect(readPending('a1')).toBeNull();
    window.localStorage.setItem('__wattson_activity_pending__:a1', JSON.stringify({ ts: 1 }));
    expect(readPending('a1')).toBeNull();
  });

  test('a store that throws never throws to the caller', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => writePending('a1', config, broken)).not.toThrow();
    expect(readPending('a1', broken)).toBeNull();
    expect(() => clearPending('a1', broken)).not.toThrow();
    expect(() => writePending('a1', config, null)).not.toThrow();
    expect(readPending('a1', null)).toBeNull();
  });

  test('newerPending keeps a copy newer than the save, or any copy when nothing is saved', () => {
    const p = { config, ts: 2000 };
    expect(newerPending(p, undefined)).toBe(p);
    expect(newerPending(p, 1999)).toBe(p);
    expect(newerPending(p, 2000)).toBeNull();
    expect(newerPending(p, 3000)).toBeNull();
    expect(newerPending(null, 1000)).toBeNull();
  });
});
