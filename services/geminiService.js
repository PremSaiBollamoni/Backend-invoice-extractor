import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function extractInvoiceData(pdfPath) {
  try {
    // Read PDF file as base64
    const pdfBuffer = await fs.readFile(pdfPath);
    const base64Pdf = pdfBuffer.toString('base64');

    // Use Gemini 1.5 Flash for vision capabilities
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an expert at extracting structured data from Indian invoices. 
Analyze this invoice PDF and extract the following information in JSON format:

{
  "invoiceNumber": "string",
  "invoiceDate": "string (DD/MM/YYYY or DD-MM-YYYY format)",
  "vendorName": "string",
  "vendorAddress": "string (optional)",
  "vendorGSTIN": "string (optional)",
  "customerName": "string (optional)",
  "lineItems": [
    {
      "description": "string",
      "quantity": "number",
      "rate": "number",
      "amount": "number"
    }
  ],
  "subtotal": "number",
  "cgst": "number (optional)",
  "sgst": "number (optional)",
  "igst": "number (optional)",
  "totalAmount": "number",
  "currency": "string (default INR)"
}

Important:
- Extract ALL line items with their description, quantity, rate, and amount
- If GST details are present, include them
- Ensure all numeric values are numbers, not strings
- If a field is not found, use null
- Be precise with the invoice number and date
- Return ONLY valid JSON, no additional text`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Pdf
        }
      },
      prompt
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const extractedData = JSON.parse(jsonText);

    // Validate and clean data
    return {
      invoiceNumber: extractedData.invoiceNumber || 'N/A',
      invoiceDate: extractedData.invoiceDate || 'N/A',
      vendorName: extractedData.vendorName || 'N/A',
      vendorAddress: extractedData.vendorAddress || '',
      vendorGSTIN: extractedData.vendorGSTIN || '',
      customerName: extractedData.customerName || '',
      lineItems: extractedData.lineItems || [],
      subtotal: extractedData.subtotal || 0,
      cgst: extractedData.cgst || 0,
      sgst: extractedData.sgst || 0,
      igst: extractedData.igst || 0,
      totalAmount: extractedData.totalAmount || 0,
      currency: extractedData.currency || 'INR',
      confidence: 'high' // Gemini typically has high confidence
    };

  } catch (error) {
    console.error('Gemini extraction error:', error);
    throw new Error(`Failed to extract invoice data: ${error.message}`);
  }
}
