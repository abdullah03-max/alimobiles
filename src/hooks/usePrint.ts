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
        const printW = receiptWidth === '80mm' ? '76mm' : '54mm';
        const pageW = receiptWidth === '80mm' ? '80mm' : '58mm';
        style = `
          @page { size: ${pageW} auto; margin: 0; }
          html, body { margin: 0; padding: 0; width: ${pageW}; font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight: bold !important; }
          * { box-sizing: border-box; font-weight: bold !important; }
          
          /* Remove top margin/padding space from receipt */
          .wide-invoice {
            width: ${printW} !important;
            max-width: ${printW} !important;
            margin: 0 auto !important;
            padding: 0mm 1mm 2mm 1mm !important;
            background: #fff;
            border: none !important;
            box-shadow: none !important;
          }
          .wide-invoice h2 {
            font-size: 16px !important;
            margin-top: 0 !important;
            margin-bottom: 2px !important;
            font-weight: 900 !important;
          }
          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            margin-top: 5px !important;
            margin-bottom: 5px !important;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 4px 2px !important;
            font-size: 10px !important;
            font-weight: bold !important;
          }
          th {
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Prevent price wrap: keep Rate, Disc. %, Net Rate in one line */
          .items-table td:nth-child(1), .items-table td:nth-child(3), .items-table td:nth-child(4), .items-table td:nth-child(5), .items-table td:nth-child(6) {
            white-space: nowrap !important;
            word-break: keep-all !important;
            overflow-wrap: normal !important;
          }
          
          /* Wrap only the item description column */
          .items-table td:nth-child(2) {
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }
          
          /* Table column widths for thermal printing */
          .items-table th:nth-child(1), .items-table td:nth-child(1) { width: 9% !important; text-align: center; } /* Sr# */
          .items-table th:nth-child(2), .items-table td:nth-child(2) { width: 39% !important; text-align: left; } /* Description */
          .items-table th:nth-child(3), .items-table td:nth-child(3) { width: 8% !important; text-align: center; } /* Qty */
          .items-table th:nth-child(4), .items-table td:nth-child(4) { width: 16% !important; text-align: right; } /* Rate */
          .items-table th:nth-child(5), .items-table td:nth-child(5) { width: 12% !important; text-align: right; } /* Disc. % */
          .items-table th:nth-child(6), .items-table td:nth-child(6) { width: 16% !important; text-align: right; } /* Net Rate */

          .grid { display: grid !important; }
          .grid-cols-2 { display: grid !important; grid-template-cols: 55% 45% !important; }
          .grid-cols-3 { display: grid !important; grid-template-cols: 1fr 1fr 1fr !important; }
          .border { border: 1px solid #000 !important; }
          .border-r { border-right: 1px solid #000 !important; }
          .border-b { border-bottom: 1px solid #000 !important; }
          .border-t { border-top: 1px solid #000 !important; }
          .border-t-0 { border-top: 0 !important; }
          .border-r-0 { border-right: 0 !important; }
          .p-2 { padding: 4px !important; }
          .space-y-1 > * + * { margin-top: 2px !important; }
          .flex { display: flex !important; }
          .flex-col { display: flex !important; flex-direction: column !important; }
          .justify-between { justify-content: space-between !important; }
          .justify-center { justify-content: center !important; }
          .items-end { align-items: flex-end !important; }
          .text-center { text-align: center !important; }
          .text-left { text-align: left !important; }
          .text-right { text-align: right !important; }
          .font-bold { font-weight: bold !important; }
          .text-xs { font-size: 9px !important; }
          .text-sm { font-size: 11px !important; }
          .text-xl { font-size: 14px !important; }
          .text-2xl { font-size: 16px !important; }
          .uppercase { text-transform: uppercase !important; }
          .text-blue-700 { color: #000 !important; }
          .text-gray-500 { color: #000 !important; }
          .text-gray-700 { color: #000 !important; }
          
          /* Urdu warranty statement styles */
          div[style*="direction: rtl"] {
            font-weight: 900 !important;
            font-size: 13px !important;
            color: #000 !important;
          }
          
          .barcode-container {
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            margin-top: 8px !important;
            page-break-inside: avoid !important;
          }
          .barcode-container svg {
            max-width: 90% !important;
            height: auto !important;
          }
          @media print {
            body { background: #fff; color: #000; }
            .no-print { display: none !important; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `;
      } else {
        style = `
          @page { size: A4 portrait; margin: 10mm; }
          html, body { margin: 0; padding: 0; width: 100%; font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #111; }
          * { box-sizing: border-box; }
          .wide-invoice { width: 100%; max-width: 800px; margin: 0 auto; padding: 10px; background: #fff; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; }
          th, td { border: 1px solid #000 !important; padding: 6px; font-size: 12px; }
          th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .grid { display: grid; }
          .grid-cols-2 { display: grid; grid-template-cols: 60% 40%; }
          .grid-cols-3 { display: grid; grid-template-cols: 1fr 1.2fr 1fr; }
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
        font-family: 'Courier New', Courier, monospace;
        font-size: 11px;
        line-height: 1.0;
        background: #fff;
        color: #111;
        width: ${receiptWidth};
        min-height: auto;
        overflow: hidden;
      }
      * { box-sizing: border-box; }
      .receipt-container { display: block; width: ${receiptWidth}; max-width: ${receiptWidth}; margin: 0; padding: 0; }
      .receipt-header { text-align: center; }
      .receipt-header .shop-name { font-weight: bold; font-size: 14px; text-transform: uppercase; }
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
      }
      img { max-width: 100%; height: auto; }
      .p-0 { padding: 0; }
      .mb-1 { margin-bottom: 4px; }
      .mb-2 { margin-bottom: 8px; }
      .mt-1 { margin-top: 4px; }
      .mt-2 { margin-top: 8px; }
      .font-bold { font-weight: bold; }
      .uppercase { text-transform: uppercase; }
      .capitalize { text-transform: capitalize; }
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
            if (src.startsWith('data:')) return; // already inlined
            // Attempt to convert to data URL
            const dataUrl = await toDataURL(src);
            if (dataUrl) img.setAttribute('src', dataUrl);
            // Ensure the image reserves space in the print layout by setting a sensible max-width
            try {
              const probe = new Image();
              await new Promise((resolve) => { probe.onload = probe.onerror = resolve; probe.src = dataUrl || src; });
              // Apply a conservative max-width so header logos remain visible in print preview
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
        // Some browsers block immediate print; wrapping in setTimeout improves reliability
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

        // Fallback: ensure we don't wait forever
        setTimeout(() => resolve(), timeout);
      } catch (e) {
        resolve();
      }
    });

    // Inline external images in the cloned content, then write to the print window.
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

      // Wait for images (logo) to load in the new window, then print.
      waitForImages(printWindow, 5000).then(() => printAndClose(printWindow)).catch(() => printAndClose(printWindow));
    })();
  };

  return { printReceipt };
}
