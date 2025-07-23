"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import React, { memo, useEffect, useId, useRef, useState } from "react";

/**
 *  DotPattern Component Props
 *
 * @param {number} [width=16] - The horizontal spacing between dots
 * @param {number} [height=16] - The vertical spacing between dots
 * @param {number} [x=0] - The x-offset of the entire pattern
 * @param {number} [y=0] - The y-offset of the entire pattern
 * @param {number} [cx=1] - The x-offset of individual dots
 * @param {number} [cy=1] - The y-offset of individual dots
 * @param {number} [cr=1] - The radius of each dot
 * @param {string} [className] - Additional CSS classes to apply to the SVG container
 * @param {boolean} [glow=false] - Whether dots should have a glowing animation effect
 */
interface DotPatternProps extends React.SVGProps<SVGSVGElement> {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    cx?: number;
    cy?: number;
    cr?: number;
    className?: string;
    glow?: boolean;
    [key: string]: unknown;
}

/**
 * DotPattern Component
 *
 * A React component that creates an animated or static dot pattern background using SVG.
 * The pattern automatically adjusts to fill its container and can optionally display glowing dots.
 *
 * @component
 *
 * @see DotPatternProps for the props interface.
 *
 * @example
 * // Basic usage
 * <DotPattern />
 *
 * // With glowing effect and custom spacing
 * <DotPattern
 *   width={20}
 *   height={20}
 *   glow={true}
 *   className="opacity-50"
 * />
 *
 * @notes
 * - The component is client-side only ("use client")
 * - Automatically responds to container size changes
 * - When glow is enabled, dots will animate with random delays and durations
 * - Uses Motion for animations
 * - Dots color can be controlled via the text color utility classes
 */

const DotPattern = memo(function DotPattern({
    width = 16,
    height = 16,
    x = 0,
    y = 0,
    cx = 1,
    cy = 1,
    cr = 1,
    className,
    glow = true,
    ...props
}: DotPatternProps) {
    const id = useId();
    const containerRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };

        updateDimensions();
        const resizeObserver = new ResizeObserver(updateDimensions);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        return () => {
            if (containerRef.current) {
                resizeObserver.unobserve(containerRef.current);
            }
        };
    }, []);

    // Generate all dots with random animation properties
    const allDots = React.useMemo(() => {
        if (dimensions.width === 0 || dimensions.height === 0) {
            return [];
        }

        const numCols = Math.ceil(dimensions.width / width);
        const numRows = Math.ceil(dimensions.height / height);

        // Maximize dot density with optimized performance
        const maxDots = 8000; // Even higher limit for maximum dots
        const totalDots = numCols * numRows;
        const skipFactor = totalDots > maxDots ? Math.ceil(totalDots / maxDots) : 1;

        const dots = [];
        for (let row = 0; row < numRows; row += skipFactor) {
            for (let col = 0; col < numCols; col += skipFactor) {
                // Increase animation percentage for more movement
                const shouldAnimate = glow && Math.random() > 0.75; // 25% animate for more activity
                dots.push({
                    x: col * width + cx,
                    y: row * height + cy,
                    animate: shouldAnimate,
                    delay: shouldAnimate ? Math.random() * 8 : 0, // Faster start times
                    duration: shouldAnimate ? Math.random() * 2 + 2 : 0, // 2-4 seconds for faster animations
                    baseOpacity: shouldAnimate ? 0.35 : 0.25, // Higher base opacity
                    peakOpacity: shouldAnimate ? 0.9 : 0.25, // Stronger peak for visibility
                });
            }
        }

        return dots;
    }, [dimensions, width, height, cx, cy, glow]);

    return (
        <svg
            ref={containerRef}
            aria-hidden="true"
            className={cn(
                "pointer-events-none absolute inset-0 h-full w-full",
                className,
            )}
            {...props}
        >
            {/* Render all dots - some static, some animated */}
            {allDots.map((dot, index) =>
                dot.animate ? (
                    <motion.circle
                        key={`animated-${dot.x}-${dot.y}-${index}`}
                        cx={dot.x}
                        cy={dot.y}
                        r={cr}
                        fill="currentColor"
                        initial={{ opacity: dot.baseOpacity }}
                        animate={{
                            opacity: [dot.baseOpacity, dot.peakOpacity, dot.baseOpacity],
                        }}
                        transition={{
                            duration: dot.duration,
                            repeat: Infinity,
                            repeatType: "reverse",
                            delay: dot.delay,
                            ease: "easeInOut", // Smoother easing for better visual appeal
                        }}
                        style={{
                            willChange: 'opacity',
                            transform: 'translateZ(0)', // Force GPU acceleration
                        }}
                    />
                ) : (
                    <circle
                        key={`static-${dot.x}-${dot.y}-${index}`}
                        cx={dot.x}
                        cy={dot.y}
                        r={cr}
                        fill="currentColor"
                        opacity={dot.baseOpacity}
                        style={{ transform: 'translateZ(0)' }} // GPU acceleration for static dots too
                    />
                )
            )}
        </svg>
    );
});

DotPattern.displayName = "DotPattern";

export { DotPattern };
