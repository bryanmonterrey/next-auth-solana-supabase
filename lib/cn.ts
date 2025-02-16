import clsx, { type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

export { type ClassValue } from 'clsx';

const twMergeConfig = extendTailwindMerge({
  classGroups: {
    text: [{ text: ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'] }],
    shadow: [{ shadow: ['sm', 'md', 'lg', 'xl', '2xl'] }],
    rounded: [{ rounded: ['sm', 'md', 'lg', 'xl', '2xl', 'full'] }],
  },
});

export { twMergeConfig };

/**
 * Utilizes `clsx` with `tailwind-merge`, use in cases of possible class conflicts.
 */
export function cnExt(...classes: ClassValue[]) {
  return twMergeConfig(clsx(...classes));
}

/**
 * A direct export of `clsx` without `tailwind-merge`.
 */
export const cn = clsx; 