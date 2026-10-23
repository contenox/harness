import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils';
import { Label } from './Label';
import { Input } from './Input';

export type SwitchProps = InputHTMLAttributes<HTMLInputElement>;


export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => (
    <Label className="relative inline-flex cursor-pointer items-center">
      <Input type="checkbox" className="peer sr-only" ref={ref} {...props} />
      <span
        aria-hidden="true"
        className={cn(
          'bg-secondary-200 peer h-6 w-11 rounded-full',
          'peer-checked:after:translate-x-full peer-checked:after:border-white',
          'after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5',
          'after:rounded-full after:border after:border-secondary-300 after:bg-white',
          'after:transition-all after:content-["\"]',
          'peer-checked:bg-primary-500 dark:peer-checked:bg-dark-primary-500',
          'dark:border-dark-secondary-400 dark:bg-dark-secondary-300',
          className,
        )}
      />
    </Label>
  ),
);

Switch.displayName = 'Switch';
