'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '@/components/ui/button';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

/** Parchment / wood-framed panel for HUD sections */
export function GamePanel({ className, children, ...props }: DivProps) {
  return (
    <div className={cn('game-panel', className)} {...props}>
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

/** Chunky fantasy toolbar button (wraps shadcn Button) */
export function GameButton({ className, variant = 'secondary', ...props }: ButtonProps) {
  return (
    <Button
      variant={variant}
      className={cn('game-button-chunky font-semibold tracking-wide', className)}
      {...props}
    />
  );
}
