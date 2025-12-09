import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateExcel(data, fileName = 'invoice') {
  try {
    const workbook = XLSX.utils.book_new();

    // Invoice Summary Sheet
    const summaryData = [
      ['Invoice Details', ''],
      ['Invoice Number', data.invoiceNumber],
      ['Invoice Date', data.invoiceDate],
      ['Vendor Name', data.vendorName],
      ['Vendor Address', data.vendorAddress || 'N/A'],
      ['Vendor GSTIN', data.vendorGSTIN || 'N/A'],
      ['Customer Name', data.customerName || 'N/A'],
      [''],
      ['Financial Summary', ''],
      ['Subtotal', data.subtotal],
      ['CGST', data.cgst || 0],
      ['SGST', data.sgst || 0],
      ['IGST', data.igst || 0],
      ['Total Amount', data.totalAmount],
      ['Currency', data.currency]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    summarySheet['!cols'] = [
      { wch: 20 },
      { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Line Items Sheet
    if (data.lineItems && data.lineItems.length > 0) {
      const lineItemsData = [
        ['Description', 'Quantity', 'Rate', 'Amount'],
        ...data.lineItems.map(item => [
          item.description,
          item.quantity,
          item.rate,
          item.amount
        ])
      ];

      const lineItemsSheet = XLSX.utils.aoa_to_sheet(lineItemsData);
      
      // Set column widths
      lineItemsSheet['!cols'] = [
        { wch: 40 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 }
      ];

      XLSX.utils.book_append_sheet(workbook, lineItemsSheet, 'Line Items');
    }

    // Save file
    const exportDir = path.join(__dirname, '../exports');
    const timestamp = Date.now();
    const filePath = path.join(exportDir, `${fileName}-${timestamp}.xlsx`);

    XLSX.writeFile(workbook, filePath);

    return filePath;
  } catch (error) {
    console.error('Excel generation error:', error);
    throw new Error('Failed to generate Excel file');
  }
}

export async function generateCSV(data, fileName = 'invoice') {
  try {
    // Create CSV content
    let csvContent = 'Invoice Details\n';
    csvContent += `Invoice Number,${data.invoiceNumber}\n`;
    csvContent += `Invoice Date,${data.invoiceDate}\n`;
    csvContent += `Vendor Name,${data.vendorName}\n`;
    csvContent += `Vendor Address,${data.vendorAddress || 'N/A'}\n`;
    csvContent += `Vendor GSTIN,${data.vendorGSTIN || 'N/A'}\n`;
    csvContent += `Customer Name,${data.customerName || 'N/A'}\n`;
    csvContent += '\n';
    
    csvContent += 'Line Items\n';
    csvContent += 'Description,Quantity,Rate,Amount\n';
    
    if (data.lineItems && data.lineItems.length > 0) {
      data.lineItems.forEach(item => {
        csvContent += `"${item.description}",${item.quantity},${item.rate},${item.amount}\n`;
      });
    }
    
    csvContent += '\n';
    csvContent += 'Financial Summary\n';
    csvContent += `Subtotal,${data.subtotal}\n`;
    csvContent += `CGST,${data.cgst || 0}\n`;
    csvContent += `SGST,${data.sgst || 0}\n`;
    csvContent += `IGST,${data.igst || 0}\n`;
    csvContent += `Total Amount,${data.totalAmount}\n`;
    csvContent += `Currency,${data.currency}\n`;

    // Save file
    const exportDir = path.join(__dirname, '../exports');
    const timestamp = Date.now();
    const filePath = path.join(exportDir, `${fileName}-${timestamp}.csv`);

    await fs.writeFile(filePath, csvContent, 'utf-8');

    return filePath;
  } catch (error) {
    console.error('CSV generation error:', error);
    throw new Error('Failed to generate CSV file');
  }
}
