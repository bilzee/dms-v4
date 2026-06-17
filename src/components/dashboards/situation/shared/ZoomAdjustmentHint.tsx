'use client';

import React, { useState, useEffect } from 'react';
import { Info, X } from '@/lib/icons';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'dms-zoom-hint-dismissed';

export function ZoomAdjustmentHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISS_KEY)) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2',
        'px-3 py-1.5',
        'bg-blue-50 border-b border-blue-100',
        'text-xs text-blue-700'
      )}
    >
      <div className="flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 flex-shrink-0" />
        <span>To adjust screen coverage, press Ctrl+-</span>
      </div>
      <button
        onClick={handleDismiss}
        className="p-0.5 rounded hover:bg-blue-100 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
