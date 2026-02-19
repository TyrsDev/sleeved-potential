import { useState, useRef, useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface CardTooltipProps {
  children: ReactNode;
  content: ReactNode;
  placement?: "top" | "right" | "bottom" | "left";
  className?: string;
}

interface TooltipPosition {
  top: number;
  left: number;
}

/**
 * Generic tooltip wrapper. On hover, shows a fixed-positioned popup
 * rendered via portal to escape overflow:hidden and transform containers.
 */
export function CardTooltip({
  children,
  content,
  placement = "top",
  className = "",
}: CardTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0 });
  const [finalPlacement, setFinalPlacement] = useState(placement);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8;

    let pl = placement;
    let top = 0;
    let left = 0;

    const calc = (p: typeof placement) => {
      switch (p) {
        case "top":
          top = triggerRect.top - tooltipRect.height - gap;
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case "bottom":
          top = triggerRect.bottom + gap;
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case "left":
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.left - tooltipRect.width - gap;
          break;
        case "right":
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.right + gap;
          break;
      }
    };

    calc(pl);

    // Flip if overflowing viewport
    if (pl === "top" && top < gap) {
      pl = "bottom";
      calc(pl);
    } else if (pl === "bottom" && top + tooltipRect.height > window.innerHeight - gap) {
      pl = "top";
      calc(pl);
    } else if (pl === "right" && left + tooltipRect.width > window.innerWidth - gap) {
      pl = "left";
      calc(pl);
    } else if (pl === "left" && left < gap) {
      pl = "right";
      calc(pl);
    }

    // Clamp to viewport edges
    left = Math.max(gap, Math.min(left, window.innerWidth - tooltipRect.width - gap));
    top = Math.max(gap, Math.min(top, window.innerHeight - tooltipRect.height - gap));

    setFinalPlacement(pl);
    setPosition({ top, left });
  }, [visible, placement]);

  return (
    <div
      className={`sp-card-tooltip-wrapper ${className}`}
      ref={triggerRef}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`sp-card-tooltip sp-tooltip-${finalPlacement}`}
            style={{ top: position.top, left: position.left }}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}
