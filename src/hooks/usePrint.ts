export function usePrint() {
  const printReceipt = (contentId: string, receiptWidth: string = '80mm') => {
    const content = document.getElementById(contentId);
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const clonedContent = content.cloneNode(true) as HTMLElement;
    const isWide = clonedContent.classList.contains('wide-invoice') || receiptWidth === 'A4';

    let style = '';
    if (isWide) {
      if (receiptWidth === '80mm' || receiptWidth === '58mm') {
        const printW = receiptWidth === '80mm' ? '72mm' : '54mm';
        const pageW = receiptWidth === '80mm' ? '80mm' : '58mm';
        style = `
          @page { 
            size: ${pageW} auto; 
            margin: 0;
          }
          html, body { 
            margin: 0; 
            padding: 0; 
            width: ${pageW}; 
            font-family: 'Times New Roman', Times, serif !important;
            background: #fff; 
            color: #000; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            font-weight: 700 !important;
            font-size: 12px !important;
          }
          * { 
            box-sizing: border-box; 
            font-weight: 700 !important;
          }
          
          .wide-invoice {
            width: ${printW} !important;
            max-width: ${printW} !important;
            margin: 0 auto !important;
            padding: 0.5mm 1.5mm 2mm 1.5mm !important;
            background: #fff;
            border: none !important;
            box-shadow: none !important;
            overflow: hidden !important;
          }
          
          body, .wide-invoice, .wide-invoice > * { 
            margin: 0 !important; 
            padding: 0 !important; 
          }
          
          /* ALI MOBILES - Arial Black font */
          .wide-invoice h2,
          .wide-invoice .text-2xl,
          .wide-invoice .font-extrabold,
          .wide-invoice .shop-name,
          .wide-invoice .text-\\[\\#1e3a8a\\] {
            font-family: 'Arial Black', 'Arial', 'Helvetica', sans-serif !important;
            font-size: 18px !important;
            margin-top: 0 !important;
            margin-bottom: 2px !important;
            font-weight: 900 !important;
            letter-spacing: 1px !important;
          }
          
          /* Sale Invoice title - Arial Black */
          .wide-invoice .text-lg {
            font-family: 'Arial Black', 'Arial', 'Helvetica', sans-serif !important;
            font-size: 14px !important;
            font-weight: 900 !important;
            letter-spacing: 1px !important;
          }
          
          /* Column Headers - Arial */
          th,
          .items-table th,
          .w-full.border-collapse.border.border-black th {
            font-family: 'Arial', 'Helvetica', sans-serif !important;
            font-weight: 700 !important;
          }
          
          /* Footer text - Arial */
          .footer-text,
          .receipt-footer,
          .barcode-container span,
          .text-gray-400,
          .text-gray-600,
          .text-gray-500 {
            font-family: 'Arial', 'Helvetica', sans-serif !important;
            font-weight: 700 !important;
          }
          
          /* All numbers - Tahoma */
          .items-table td:last-child,
          .items-table td:nth-child(1),
          .items-table td:nth-child(5),
          .text-right,
          .font-bold.text-right,
          .grid-cols-2 .text-right,
          .grid-cols-2 .font-bold,
          .text-gray-900,
          .text-red-600,
          .text-green-700,
          .text-amber-600,
          span[class*="text-right"],
          td[class*="text-right"],
          .items-table td,
          .text-gray-850,
          .items-table tr:last-child td span,
          .items-table tr:last-child td {
            font-family: 'Tahoma', 'Arial', 'Helvetica', sans-serif !important;
            font-weight: 700 !important;
          }
          
          /* All other text - Times New Roman */
          p, span, div, td, th, tr, h1, h2, h3, h4, h5, h6, label, a, button, input, textarea,
          .text-xs, .text-sm, .text-xl, .text-2xl, .text-\\[10px\\], .text-\\[11px\\], .text-\\[12px\\], .text-\\[13px\\], .text-\\[9px\\], .text-\\[8px\\] {
            font-family: 'Times New Roman', Times, serif !important;
            font-weight: 700 !important;
          }
          
          /* Tables */
          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            margin-top: 4px !important;
            margin-bottom: 4px !important;
          }
          
          .items-table {
            margin-top: 5px !important;
            margin-bottom: 5px !important;
          }
          
          td {
            border: 1px solid #000 !important;
            padding: 3px 2px !important;
            font-size: 10px !important;
            font-weight: 700 !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          /* Table column widths for 80mm thermal - 5 columns */
          .items-table {
            width: 100% !important;
          }
          
          .items-table th:nth-child(1), 
          .items-table td:nth-child(1) { 
            width: 7% !important; 
            text-align: center !important; 
            white-space: nowrap !important;
            padding: 2px 1px !important;
            font-size: 10px !important;
            font-weight: 700 !important;
          }
          
          .items-table th:nth-child(2), 
          .items-table td:nth-child(2) { 
            width: 36% !important; 
            text-align: left !important;
            padding: 2px 2px !important;
            font-size: 9.5px !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          /* Color column - full word with proper width and alignment */
          .items-table th:nth-child(3), 
          .items-table td:nth-child(3) { 
            width: 13% !important; 
            text-align: center !important; 
            white-space: nowrap !important;
            padding: 2px 1px !important;
            font-size: 9.5px !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
            letter-spacing: 0.5px !important;
          }
          
          /* R/S column - fix for GB display with line break */
          .items-table th:nth-child(4), 
          .items-table td:nth-child(4) { 
            width: 18% !important; 
            text-align: center !important;
            padding: 2px 1px !important;
            font-size: 8.5px !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
            line-height: 1.2 !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
          }
          
          /* Price column - Tahoma for numbers */
          .items-table th:nth-child(5), 
          .items-table td:nth-child(5) { 
            width: 26% !important; 
            text-align: right !important; 
            white-space: nowrap !important;
            padding: 2px 2px !important;
            font-size: 10.5px !important;
            font-weight: 700 !important;
            font-family: 'Tahoma', 'Arial', 'Helvetica', sans-serif !important;
          }

          /* For 58mm paper */
          ${receiptWidth === '58mm' ? `
          .items-table th:nth-child(1), .items-table td:nth-child(1) { width: 8% !important; font-size: 9px !important; }
          .items-table th:nth-child(2), .items-table td:nth-child(2) { width: 30% !important; font-size: 8.5px !important; }
          .items-table th:nth-child(3), .items-table td:nth-child(3) { width: 11% !important; font-size: 9px !important; }
          .items-table th:nth-child(4), .items-table td:nth-child(4) { width: 16% !important; font-size: 8px !important; }
          .items-table th:nth-child(5), .items-table td:nth-child(5) { width: 35% !important; font-size: 9.5px !important; }
          ` : ''}

          /* Customer info table */
          .w-full.border-collapse.border.border-black {
            width: 100% !important;
            margin-bottom: 6px !important;
          }
          
          .w-full.border-collapse.border.border-black td {
            padding: 3px 4px !important;
            font-size: 10px !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .w-full.border-collapse.border.border-black .text-gray-500 {
            color: #000 !important;
            font-weight: 700 !important;
            font-family: 'Arial', 'Helvetica', sans-serif !important;
          }
          
          .w-full.border-collapse.border.border-black .text-gray-900 {
            font-weight: 700 !important;
            font-family: 'Tahoma', 'Arial', 'Helvetica', sans-serif !important;
          }

          .grid {
            display: grid !important;
          }
          
          .grid-cols-2 {
            display: grid !important;
            grid-template-columns: 52% 48% !important;
          }
          
          .border {
            border: 1px solid #000 !important;
          }
          
          .border-r {
            border-right: 1px solid #000 !important;
          }
          
          .border-b {
            border-bottom: 1px solid #000 !important;
          }
          
          .border-t {
            border-top: 1px solid #000 !important;
          }
          
          .border-t-0 {
            border-top: 0 !important;
          }
          
          .border-r-0 {
            border-right: 0 !important;
          }
          
          .p-2 {
            padding: 4px !important;
          }
          
          /* Summary section spacing */
          .space-y-0\\.5 > * + * {
            margin-top: 1.5px !important;
          }
          
          .space-y-1 > * + * {
            margin-top: 1.5px !important;
          }
          
          .grid-cols-2 .p-2 {
            padding: 4px 6px !important;
          }
          
          .grid-cols-2 .flex {
            padding: 1.5px 0 !important;
          }
          
          .grid-cols-2 .justify-between {
            padding: 1.5px 0 !important;
          }
          
          .flex {
            display: flex !important;
          }
          
          .flex-col {
            display: flex !important;
            flex-direction: column !important;
          }
          
          .justify-between {
            justify-content: space-between !important;
          }
          
          .justify-center {
            justify-content: center !important;
          }
          
          .items-end {
            align-items: flex-end !important;
          }
          
          .text-center {
            text-align: center !important;
          }
          
          .text-left {
            text-align: left !important;
          }
          
          .text-right {
            text-align: right !important;
          }
          
          .font-bold {
            font-weight: 700 !important;
          }
          
          .font-semibold {
            font-weight: 700 !important;
          }
          
          .font-normal {
            font-weight: 700 !important;
          }
          
          .font-medium {
            font-weight: 700 !important;
          }
          
          .text-xs {
            font-size: 9.5px !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .text-sm {
            font-size: 11px !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .text-xl {
            font-size: 14px !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .text-2xl {
            font-size: 18px !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .text-\\[10px\\] {
            font-size: 10px !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .text-\\[11px\\] {
            font-size: 11px !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .text-\\[12px\\] {
            font-size: 12px !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .text-\\[13px\\] {
            font-size: 13px !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .text-\\[9px\\] {
            font-size: 9px !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .text-\\[8px\\] {
            font-size: 8px !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .uppercase {
            text-transform: uppercase !important;
          }
          
          .text-blue-700 {
            color: #000 !important;
            font-weight: 700 !important;
            font-family: 'Arial Black', 'Arial', 'Helvetica', sans-serif !important;
          }
          
          .text-gray-700 {
            color: #000 !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .text-gray-800 {
            color: #000 !important;
            font-weight: 700 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .text-red-600 {
            color: #000 !important;
            font-weight: 700 !important;
            font-family: 'Tahoma', 'Arial', 'Helvetica', sans-serif !important;
          }
          
          .text-green-700 {
            color: #000 !important;
            font-weight: 700 !important;
            font-family: 'Tahoma', 'Arial', 'Helvetica', sans-serif !important;
          }
          
          .text-amber-600 {
            color: #000 !important;
            font-weight: 700 !important;
            font-family: 'Tahoma', 'Arial', 'Helvetica', sans-serif !important;
          }
          
          .text-gray-400 {
            color: #666 !important;
            font-weight: 700 !important;
            font-family: 'Arial', 'Helvetica', sans-serif !important;
          }
          
          .text-gray-600 {
            color: #000 !important;
            font-weight: 700 !important;
            font-family: 'Arial', 'Helvetica', sans-serif !important;
          }
          
          .break-words {
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }
          
          .whitespace-nowrap {
            white-space: nowrap !important;
          }
          
          .tracking-wide {
            letter-spacing: 0.5px !important;
          }
          
          .tracking-wider {
            letter-spacing: 1px !important;
          }
          
          /* Urdu warranty statement - Jameel Noori Nastaleeq Kasheeda */
          div[style*="direction: rtl"],
          [style*="direction: rtl"] p,
          [style*="direction: rtl"] span,
          [style*="direction: rtl"] div,
          [style*="direction: rtl"] td,
          [style*="direction: rtl"] th,
          .urdu-text,
          .footer-urdu,
          .text-center[style*="direction: rtl"],
          div[dir="rtl"],
          [dir="rtl"] {
            font-family: 'Jameel Noori Nastaleeq Kasheeda', 'Jameel Noori Nastaleeq', 'Alvi Nastaleeq', 'Urdu Typesetting', 'Noto Nastaliq Urdu', sans-serif !important;
            font-weight: 700 !important;
            font-size: 11px !important;
            color: #000 !important;
            padding: 2px 0 !important;
            line-height: 1.5 !important;
          }
          
          /* Urdu text in any element with rtl direction - override for footer */
          [dir="rtl"],
          .rtl-text,
          .urdu-footer {
            font-family: 'Jameel Noori Nastaleeq Kasheeda', 'Jameel Noori Nastaleeq', 'Alvi Nastaleeq', 'Urdu Typesetting', 'Noto Nastaliq Urdu', sans-serif !important;
            font-weight: 700 !important;
            font-size: 11px !important;
          }
          
          .barcode-container {
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            margin-top: 4px !important;
            page-break-inside: avoid !important;
          }
          
          .barcode-container svg {
            max-width: 85% !important;
            height: auto !important;
          }
          
          .border-dashed {
            border-style: dashed !important;
          }
          
          .border-gray-300 {
            border-color: #999 !important;
          }
          
          .pt-1\\.5 {
            padding-top: 1.5px !important;
          }
          
          .pt-2 {
            padding-top: 2px !important;
          }
          
          .pt-3 {
            padding-top: 3px !important;
          }
          
          .pt-0\\.5 {
            padding-top: 0.5px !important;
          }
          
          .pb-0\\.5 {
            padding-bottom: 0.5px !important;
          }
          
          .mt-0\\.5 {
            margin-top: 0.5px !important;
          }
          
          .mt-1 {
            margin-top: 1px !important;
          }
          
          .mt-1\\.5 {
            margin-top: 1.5px !important;
          }
          
          .mt-2 {
            margin-top: 2px !important;
          }
          
          .mb-1 {
            margin-bottom: 1px !important;
          }
          
          .mb-2 {
            margin-bottom: 2px !important;
          }
          
          .mx-auto {
            margin-left: auto !important;
            margin-right: auto !important;
          }
          
          .inline-block {
            display: inline-block !important;
          }
          
          .block {
            display: block !important;
          }
          
          .leading-tight {
            line-height: 1.2 !important;
          }
          
          .leading-relaxed {
            line-height: 1.5 !important;
          }
          
          .border-t {
            border-top: 1px solid #000 !important;
          }
          
          .border-b {
            border-bottom: 1px solid #000 !important;
          }
          
          .border-l {
            border-left: 1px solid #000 !important;
          }
          
          .border-r {
            border-right: 1px solid #000 !important;
          }
          
          .border-black {
            border-color: #000 !important;
          }
          
          .bg-gray-100 {
            background-color: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .bg-white {
            background-color: #fff !important;
          }
          
          .bg-green-50 {
            background-color: #fff !important;
          }
          
          .rounded {
            border-radius: 2px !important;
          }
          
          .rounded-lg {
            border-radius: 3px !important;
          }
          
          .shadow-sm {
            box-shadow: none !important;
          }
          
          .border-gray-100 {
            border-color: #ddd !important;
          }
          
          .border-gray-200 {
            border-color: #ddd !important;
          }
          
          .items-table tr:last-child td {
            font-size: 10px !important;
            padding: 2px 2px !important;
            font-weight: 700 !important;
            font-family: 'Tahoma', 'Arial', 'Helvetica', sans-serif !important;
          }
          
          .items-table tr:last-child td span {
            font-size: 10px !important;
            font-weight: 700 !important;
            font-family: 'Tahoma', 'Arial', 'Helvetica', sans-serif !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .space-y-4 > * + * {
            margin-top: 2px !important;
          }
          
          .space-y-2 > * + * {
            margin-top: 1.5px !important;
          }
          
          .space-y-1 > * + * {
            margin-top: 1.5px !important;
          }
          
          /* Price alignment fix - right aligned with minimal padding */
          .text-right {
            text-align: right !important;
            padding-right: 2px !important;
          }
          
          /* Fix for the price column in items table */
          .items-table td:last-child {
            text-align: right !important;
            padding-right: 2px !important;
            font-weight: 700 !important;
            font-family: 'Tahoma', 'Arial', 'Helvetica', sans-serif !important;
          }
          
          .items-table th:last-child {
            text-align: right !important;
            padding-right: 2px !important;
            font-weight: 700 !important;
            font-family: 'Arial', 'Helvetica', sans-serif !important;
          }
          
          .grid-cols-2 .space-y-0\\.5 > * + * {
            margin-top: 1.5px !important;
          }
          
          /* Amount in words styling */
          .text-gray-850 {
            font-size: 10px !important;
            font-weight: 700 !important;
            line-height: 1.3 !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          @media print {
            body { 
              background: #fff; 
              color: #000; 
            }
            .no-print { 
              display: none !important; 
            }
            * { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              font-weight: 700 !important;
            }
          }
        `;
      } else {
        style = `
          @page { size: A4 portrait; margin: 10mm; }
          html, body { margin: 0; padding: 0; width: 100%; font-family: 'Times New Roman', Times, serif; background: #fff; color: #111; }
          * { box-sizing: border-box; }
          .wide-invoice { width: 100%; max-width: 800px; margin: 0 auto; padding: 10px; background: #fff; }
          
          /* Arial Black for ALI MOBILES */
          .wide-invoice h2, .wide-invoice .shop-name, .wide-invoice .text-2xl {
            font-family: 'Arial Black', 'Arial', 'Helvetica', sans-serif !important;
          }
          
          /* Column headers - Arial */
          th {
            font-family: 'Arial', 'Helvetica', sans-serif !important;
          }
          
          /* Numbers - Tahoma */
          td, .text-right, .font-bold {
            font-family: 'Tahoma', 'Arial', 'Helvetica', sans-serif !important;
          }
          
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; }
          th, td { border: 1px solid #000 !important; padding: 6px; font-size: 12px; }
          th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Arial', 'Helvetica', sans-serif !important; }
          td { font-family: 'Tahoma', 'Arial', 'Helvetica', sans-serif !important; }
          .grid { display: grid; }
          .grid-cols-2 { display: grid; grid-template-columns: 60% 40%; }
          .grid-cols-3 { display: grid; grid-template-columns: 1fr 1.2fr 1fr; }
          .border { border: 1px solid #000 !important; }
          .border-r { border-right: 1px solid #000 !important; }
          .border-b { border-bottom: 1px solid #000 !important; }
          .border-t { border-top: 1px solid #000 !important; }
          .border-t-0 { border-top: 0 !important; }
          .border-r-0 { border-right: 0 !important; }
          .p-2 { padding: 8px; }
          .space-y-1 > * + * { margin-top: 4px; }
          .flex { display: flex; }
          .flex-col { display: flex; flex-direction: column; }
          .justify-between { justify-content: space-between; }
          .justify-center { justify-content: center; }
          .items-end { align-items: flex-end; }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .text-xs { font-size: 11px; }
          .text-sm { font-size: 14px; }
          .text-xl { font-size: 18px; }
          .text-2xl { font-size: 24px; }
          .uppercase { text-transform: uppercase; }
          .text-blue-700 { color: #1e3a8a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .text-gray-500 { color: #6b7280 !important; }
          .text-gray-700 { color: #374151 !important; }
          
          /* Footer - Arial */
          .footer-text, .text-gray-400, .text-gray-600 {
            font-family: 'Arial', 'Helvetica', sans-serif !important;
          }
          
          /* Urdu for A4 - Jameel Noori Nastaleeq Kasheeda */
          [dir="rtl"], [style*="direction: rtl"] {
            font-family: 'Jameel Noori Nastaleeq Kasheeda', 'Jameel Noori Nastaleeq', 'Alvi Nastaleeq', 'Urdu Typesetting', sans-serif !important;
          }
          
          @media print {
            body { background: #fff; color: #000; }
            .no-print { display: none; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `;
      }
    } else {
      style = `
      @page { size: ${receiptWidth} auto; margin: 0; }
      html, body { margin: 0; padding: 0; width: ${receiptWidth}; }
      body {
        font-family: 'Times New Roman', Times, serif !important;
        font-size: 11px;
        line-height: 1.0;
        background: #fff;
        color: #111;
        width: ${receiptWidth};
        min-height: auto;
        overflow: hidden;
        font-weight: 700 !important;
      }
      * { box-sizing: border-box; font-weight: 700 !important; }
      body, .receipt-container, .receipt-pre { margin: 0 !important; padding: 0 !important; }
      .receipt-container { display: block; width: ${receiptWidth}; max-width: ${receiptWidth}; margin: 0 !important; padding: 0 !important; }
      .receipt-header { text-align: center; }
      .receipt-header .shop-name { font-weight: 900; font-size: 14px; text-transform: uppercase; font-family: 'Arial Black', 'Arial', 'Helvetica', sans-serif !important; }
      .receipt-header .small { font-size: 10px; margin-top: 2px; }
      .receipt-divider { border-top: 1px dashed #000; margin: 6px 0; }
      .receipt-row { display: flex; justify-content: space-between; width: 100%; }
      .receipt-row .label { text-align: left; }
      .receipt-row .value { text-align: right; }
      .receipt-items { width: 100%; margin-top: 6px; }
      .receipt-item { display: flex; justify-content: space-between; margin-bottom: 3px; }
      .receipt-item-name { width: 55%; word-wrap: break-word; }
      .receipt-item-qty { width: 15%; text-align: center; }
      .receipt-item-price { width: 15%; text-align: right; }
      .receipt-item-total { width: 15%; text-align: right; }
      .receipt-footer { text-align: center; margin-top: 8px; font-size: 10px; }
      .text-center { text-align: center; }
      .text-left { text-align: left; }
      .text-right { text-align: right; }
      pre.receipt-pre {
        font-family: 'Courier New', Courier, monospace;
        white-space: pre;
        font-size: 11px;
        margin: 0;
        line-height: 1.2;
        display: block;
        font-weight: 700 !important;
      }
      img { max-width: 100%; height: auto; }
      .p-0 { padding: 0; }
      .mb-1 { margin-bottom: 4px; }
      .mb-2 { margin-bottom: 8px; }
      .mt-1 { margin-top: 4px; }
      .mt-2 { margin-top: 8px; }
      .font-bold { font-weight: 700 !important; }
      .uppercase { text-transform: uppercase; }
      .capitalize { text-transform: capitalize; }
      
      /* Urdu for thermal - Jameel Noori Nastaleeq Kasheeda */
      [dir="rtl"], [style*="direction: rtl"] {
        font-family: 'Jameel Noori Nastaleeq Kasheeda', 'Jameel Noori Nastaleeq', 'Alvi Nastaleeq', 'Urdu Typesetting', sans-serif !important;
      }
    `;
    }

    const toDataURL = async (url: string): Promise<string | null> => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        return null;
      }
    };

    const inlineImages = async (el: HTMLElement) => {
      try {
        const imgs = Array.from(el.querySelectorAll('img')) as HTMLImageElement[];
        await Promise.all(imgs.map(async (img) => {
          try {
            const src = img.getAttribute('src') || img.src;
            if (!src) return;
            if (src.startsWith('data:')) return;
            const dataUrl = await toDataURL(src);
            if (dataUrl) img.setAttribute('src', dataUrl);
            try {
              const probe = new Image();
              await new Promise((resolve) => { probe.onload = probe.onerror = resolve; probe.src = dataUrl || src; });
              img.style.maxWidth = img.style.maxWidth || '160px';
              img.style.height = img.style.height || 'auto';
              img.removeAttribute('width');
              img.removeAttribute('height');
            } catch (e) {
              // ignore sizing errors
            }
          } catch (e) {
            // ignore individual image failures
          }
        }));
      } catch (e) {
        // ignore
      }
    };

    const printAndClose = (win: Window) => {
      try {
        win.focus();
        setTimeout(() => {
          try { win.print(); } catch (e) { /* ignore */ }
          try { win.close(); } catch (e) { /* ignore */ }
        }, 50);
      } catch (e) {
        try { win.close(); } catch (e) { /* ignore */ }
      }
    };

    const waitForImages = (win: any, timeout = 3000) => new Promise<void>((resolve) => {
      try {
        const imgs = Array.from(win.document.images || []) as HTMLImageElement[];
        if (imgs.length === 0) return resolve();
        let remaining = imgs.length;
        const onLoadOrError = () => {
          remaining -= 1;
          if (remaining <= 0) resolve();
        };

        imgs.forEach((img: HTMLImageElement) => {
          if (img.complete && img.naturalWidth !== 0) {
            onLoadOrError();
          } else {
            img.addEventListener('load', onLoadOrError);
            img.addEventListener('error', onLoadOrError);
          }
        });

        setTimeout(() => resolve(), timeout);
      } catch (e) {
        resolve();
      }
    });

    (async () => {
      try {
        await inlineImages(clonedContent);
      } catch (e) {
        // ignore inline failures
      }

      printWindow.document.open();
      printWindow.document.write(`<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Receipt</title>
            <style>${style}</style>
          </head>
          <body>${clonedContent.outerHTML}</body>
        </html>
      `);
      printWindow.document.close();

      waitForImages(printWindow, 5000).then(() => printAndClose(printWindow)).catch(() => printAndClose(printWindow));
    })();
  };

  return { printReceipt };
}