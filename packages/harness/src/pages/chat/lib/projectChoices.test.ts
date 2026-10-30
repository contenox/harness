import { describe, expect, it } from 'vitest';
import { filterProjects } from './projectChoices';

const roots = [
  { path: '/home/u/Contenox', default: true },
  { path: '/work/alpha', name: 'Alpha Shop', default: false },
  { path: '/work/beta', default: false },
];

describe('filterProjects', () => {
  it('keeps everything for a blank query', () => {
    expect(filterProjects(roots, '  ')).toHaveLength(3);
  });

  it('matches name or path case-insensitively', () => {
    expect(filterProjects(roots, 'SHOP').map(r => r.path)).toEqual(['/work/alpha']);
    expect(filterProjects(roots, 'work/b').map(r => r.path)).toEqual(['/work/beta']);
    expect(filterProjects(roots, 'nothing')).toEqual([]);
  });
});
