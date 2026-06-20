export function usePrint() {
  const printReceipt = (contentId: string, receiptWidth: '58mm' | '80mm' = '80mm') => {
    const content = document.getElementById(contentId);
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const clonedContent = content.cloneNode(true) as HTMLElement;

    const style = `
      @page { size: ${receiptWidth} auto; margin: 0; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: 'Courier New', Courier, monospace;
        font-size: 11px;
        width: ${receiptWidth};
        padding: 8px 6px;
        color: #111;
        background: #fff;
        line-height: 1.2;
      }
      .receipt-container { width: ${receiptWidth}; margin: 0 auto; padding-bottom: 30px; }
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
