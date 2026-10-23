import { describe, expect, it } from 'vitest';
import {
  DROPPED_CONTENT_META_KEY,
  droppedAudio,
  droppedContentKinds,
  droppedImages,
} from './droppedContent';

describe('droppedContentKinds', () => {
  it('reads the bare list of kinds', () => {
    expect(droppedContentKinds({ [DROPPED_CONTENT_META_KEY]: ['image'] })).toEqual(['image']);
  });

  it('reads the object-with-kinds spelling too', () => {
    expect(
      droppedContentKinds({ [DROPPED_CONTENT_META_KEY]: { kinds: ['image', 'audio'] } }),
    ).toEqual(['image', 'audio']);
  });

  it('reads a single kind sent as a bare string', () => {
    expect(droppedContentKinds({ [DROPPED_CONTENT_META_KEY]: 'image' })).toEqual(['image']);
  });

  it('de-duplicates — a command turn can record the same kind more than once', () => {
    expect(droppedContentKinds({ [DROPPED_CONTENT_META_KEY]: ['image', 'image'] })).toEqual([
      'image',
    ]);
  });

  it('is empty for the ordinary turn, an absent key, and an unusable value', () => {
    expect(droppedContentKinds(undefined)).toEqual([]);
    expect(droppedContentKinds(null)).toEqual([]);
    expect(droppedContentKinds({})).toEqual([]);
    expect(droppedContentKinds({ 'contenox.agent': 'claude' })).toEqual([]);
    expect(droppedContentKinds({ [DROPPED_CONTENT_META_KEY]: 7 })).toEqual([]);
    expect(droppedContentKinds({ [DROPPED_CONTENT_META_KEY]: [] })).toEqual([]);
    expect(droppedContentKinds({ [DROPPED_CONTENT_META_KEY]: [1, null, ''] })).toEqual([]);
  });
});

describe('droppedImages', () => {
  it('is true only when the report names the image kind', () => {
    expect(droppedImages({ [DROPPED_CONTENT_META_KEY]: ['image'] })).toBe(true);
    expect(droppedImages({ [DROPPED_CONTENT_META_KEY]: ['audio'] })).toBe(false);
    expect(droppedImages({})).toBe(false);
  });
});

describe('droppedAudio', () => {
  it('is true only when the report names the audio kind — an older runtime reporting a dropped clip', () => {
    expect(droppedAudio({ [DROPPED_CONTENT_META_KEY]: ['audio'] })).toBe(true);
    expect(droppedAudio({ [DROPPED_CONTENT_META_KEY]: { kinds: ['image', 'audio'] } })).toBe(true);
    expect(droppedAudio({ [DROPPED_CONTENT_META_KEY]: ['image'] })).toBe(false);
    expect(droppedAudio({})).toBe(false);
    expect(droppedAudio(undefined)).toBe(false);
  });
});
