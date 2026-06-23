import React from 'react';

interface BarcodeProps {
  value: string;
  height?: number;
  widthScale?: number;
  className?: string;
}

// Code 39 encoding table
// 1 = wide (width 3), 0 = narrow (width 1)
// 9 elements: 5 bars, 4 spaces alternating (b1, s1, b2, s2, b3, s3, b4, s4, b5)
const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  '*': '010010100', // Start/Stop character
};

export default function Barcode({ value, height = 40, widthScale = 1.2, className }: BarcodeProps) {
  // Normalize value: Code 39 start/stop character is *
  const code = `*${value.toUpperCase()}*`;
  
  // Calculate bars
  const elements: { isBar: boolean; width: number }[] = [];
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const pattern = CODE39_PATTERNS[char];
    if (!pattern) continue; // Skip unsupported characters
    
    for (let j = 0; j < pattern.length; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === '1';
      elements.push({
        isBar,
        width: isWide ? 3 : 1,
      });
    }
    
    // Add inter-character gap (always space, narrow width 1)
    if (i < code.length - 1) {
      elements.push({
        isBar: false,
        width: 1,
      });
    }
  }

  // Calculate total width
  const totalUnits = elements.reduce((sum, el) => sum + el.width, 0);
  const totalWidth = totalUnits * widthScale;

  let currentX = 0;
  const rects: React.ReactNode[] = [];

  elements.forEach((el, index) => {
    const w = el.width * widthScale;
    if (el.isBar) {
      rects.push(
        <rect
          key={index}
          x={currentX}
          y={0}
          width={w}
          height={height}
          fill="black"
        />
      );
    }
    currentX += w;
  });

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        width={totalWidth}
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        {rects}
      </svg>
      <span className="text-[10px] font-mono tracking-[0.2em] mt-1 text-center font-bold text-gray-900">
        {value}
      </span>
    </div>
  );
}
