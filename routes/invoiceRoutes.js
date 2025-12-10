import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractInvoiceData } from '../services/geminiService.js';
import { generateExcel, generateCSV } from '../services/excelService.js';
import { logActivity, getLogs } from '../services/logService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload and extract invoice
router.post('/upload', upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get API key from header
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'Gemini API key is required',
        message: 'Please provide your Gemini API key in the X-API-Key header'
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    // Log upload
    await logActivity({
      action: 'upload',
      fileName,
      status: 'processing',
      timestamp: new Date().toISOString()
    });

    // Extract data using Gemini with provided API key
    const extractedData = await extractInvoiceData(filePath, apiKey);

    // Log success
    await logActivity({
      action: 'extraction',
      fileName,
      status: 'success',
      timestamp: new Date().toISOString(),
      data: extractedData
    });

    res.json({
      success: true,
      data: extractedData,
      fileName
    });

  } catch (error) {
    console.error('Error processing invoice:', error);
    
    // Log failure
    await logActivity({
      action: 'extraction',
      fileName: req.file?.originalname || 'unknown',
      status: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process invoice',
      message: error.message
    });
  }
});

// Export to Excel
router.post('/export/excel', async (req, res) => {
  try {
    const { data, fileName } = req.body;
    const filePath = await generateExcel(data, fileName);
    
    await logActivity({
      action: 'export',
      format: 'excel',
      fileName,
      status: 'success',
      timestamp: new Date().toISOString()
    });

    res.download(filePath, `${fileName || 'invoice'}.xlsx`, (err) => {
      if (err) console.error('Download error:', err);
    });
  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
});

// Export to CSV
router.post('/export/csv', async (req, res) => {
  try {
    const { data, fileName } = req.body;
    const filePath = await generateCSV(data, fileName);
    
    await logActivity({
      action: 'export',
      format: 'csv',
      fileName,
      status: 'success',
      timestamp: new Date().toISOString()
    });

    res.download(filePath, `${fileName || 'invoice'}.csv`, (err) => {
      if (err) console.error('Download error:', err);
    });
  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).json({ error: 'Failed to generate CSV file' });
  }
});

// Get logs
router.get('/logs', async (req, res) => {
  try {
    console.log('Fetching logs...');
    const logs = await getLogs();
    console.log(`Found ${logs.length} logs`);
    
    // Add CORS headers explicitly for this endpoint
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs', message: error.message });
  }
});

// Test endpoint for logs
router.get('/logs/test', async (req, res) => {
  res.json({ 
    message: 'Logs endpoint is working',
    timestamp: new Date().toISOString(),
    logsPath: 'Check /api/invoice/logs for actual logs'
  });
});

export default router;
