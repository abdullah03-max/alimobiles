export function usePrint() {
  const printReceipt = (contentId: string, receiptWidth: '58mm' | '80mm' = '80mm') => {
    const content = document.getElementById(contentId);
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const clonedContent = content.cloneNode(true) as HTMLElement;

    const style = `
      @page { size: ${receiptWidth} auto; margin: 0; }
      body { font-family: Arial, sans-serif; font-size: 12px; width: ${receiptWidth}; padding: 8px; margin: 0; color: #111; }
      .text-center { text-align: center; }
      .text-left { text-align: left; }
      .text-right { text-align: right; }
      .border-t { border-top: 1px dashed #000; }
      .border-b { border-bottom: 1px dashed #000; }
      .py-1 { padding-top: 4px; padding-bottom: 4px; }
      .my-1 { margin-top: 4px; margin-bottom: 4px; }
      .mt-1 { margin-top: 4px; }
      .mt-2 { margin-top: 8px; }
      .pt-1 { padding-top: 4px; }
      .font-bold { font-weight: bold; }
      .text-base { font-size: 14px; }
      .text-xs { font-size: 11px; }
      .text-orange-500 { color: #f97316; }
      .text-green-600 { color: #16a34a; }
      .text-gray-500 { color: #6b7280; }
      .text-gray-600 { color: #4b5563; }
      .text-gray-800 { color: #1f2937; }
      .bg-gray-50 { background-color: #f9fafb; }
      .border { border: 1px solid #e5e7eb; }
      .border-t { border-top: 1px dashed #000; }
      .border-b { border-bottom: 1px dashed #000; }
      .rounded-lg { border-radius: 0.5rem; }
      .rounded-xl { border-radius: 0.75rem; }
      .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
      .px-1\.5 { padding-left: 0.375rem; padding-right: 0.375rem; }
      .table { width: 100%; border-collapse: collapse; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 4px 0; }
      .w-full { width: 100%; }
      .font-medium { font-weight: 500; }
      .uppercase { text-transform: uppercase; }
      .capitalize { text-transform: capitalize; }
      img { max-width: 100%; height: auto; }
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
