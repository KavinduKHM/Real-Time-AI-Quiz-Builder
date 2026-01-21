const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const mammoth = require('mammoth');
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB (keep in sync with frontend)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX are allowed.'));
    }
  }
});

// Extract text from PDF
const extractTextFromPDF = async (buffer) => {
  try {
    // PDF text extraction is temporarily disabled due to library compatibility issues.
    // Return empty text so the rest of the upload flow can proceed.
    return '';
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    // Fall back to empty text instead of failing the whole upload
    return '';
  }
};

// Extract text from DOC/DOCX
const extractTextFromDoc = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('DOC/DOCX text extraction failed:', error);
    return '';
  }
};

// Extract text from PPT/PPTX
const extractTextFromPpt = async (buffer) => {
  try {
    // office-text-extractor is ESM-only, so we use dynamic import here
    const { getTextExtractor } = await import('office-text-extractor');
    const extractor = getTextExtractor();

    const text = await extractor.extractText({ input: buffer, type: 'buffer' });
    return text;
  } catch (error) {
    console.error('PPT/PPTX text extraction failed:', error);
    return '';
  }
};

// Upload endpoint

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let extractedText = '';
    
    // Extract text based on file type
    if (req.file.mimetype === 'application/pdf') {
      extractedText = await extractTextFromPDF(req.file.buffer);
    } else if (req.file.mimetype.includes('word')) {
      extractedText = await extractTextFromDoc(req.file.buffer);
    } else if (req.file.mimetype.includes('presentation')) {
        extractedText = await extractTextFromPpt(req.file.buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file type for text extraction' });
    }

    // Upload file to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'quiz-files',
          public_id: `quiz_${Date.now()}`
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    res.json({
      success: true,
      fileUrl: uploadResult.secure_url,
      text: extractedText,
      fileName: req.file.originalname,
      fileType: req.file.mimetype
    });

  } 

  catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

