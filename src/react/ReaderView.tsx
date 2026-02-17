import { useEffect, useRef, useCallback, type CSSProperties, type MouseEvent } from 'react';
import { useReaderContext } from './context';

export interface ReaderViewProps {
  className?: string;
  style?: CSSProperties;
  onTapLeft?: () => void;
  onTapRight?: () => void;
  onTapCenter?: () => void;
}

export function ReaderView({
  className,
  style,
  onTapLeft,
  onTapRight,
  onTapCenter,
}: ReaderViewProps) {
  const { engine, prevPage, nextPage } = useReaderContext();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    engine.mount(el);
    return () => {
      engine.unmount();
    };
  }, [engine]);

  const handleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;

    if (ratio < 0.3) {
      prevPage();
      onTapLeft?.();
    } else if (ratio > 0.7) {
      nextPage();
      onTapRight?.();
    } else {
      onTapCenter?.();
    }
  }, [prevPage, nextPage, onTapLeft, onTapRight, onTapCenter]);

  return (
    <div
      ref={containerRef}
      className={className}
      onClick={handleClick}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        userSelect: 'text',
        ...style,
      }}
    />
  );
}
