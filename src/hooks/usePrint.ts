export function usePrint() {
  const printReceipt = (contentId: string, receiptWidth: string = '80mm') => {
    const content = document.getElementById(contentId);
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const clonedContent = content.cloneNode(true) as HTMLElement;
    const isWide = clonedContent.classList.contains('wide-invoice') || receiptWidth === 'A4';

    const style = isWide ? `
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
    ` : `
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

    const printAndClose = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };

    if (printWindow.document.readyState === 'complete') {
      printAndClose();
    } else {
      printWindow.onload = printAndClose;
      setTimeout(printAndClose, 500);
    }
  };

  return { printReceipt };
}
