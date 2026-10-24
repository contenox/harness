
export const DEFAULT_COMPOSER_SOFT_MAX = 131072;

export function isComposerCharCountWarning(length: number, softMax: number): boolean {
  return length > softMax * 0.875;
}

export function isOverComposerSoftMax(length: number, softMax: number): boolean {
  return length > softMax;
}
