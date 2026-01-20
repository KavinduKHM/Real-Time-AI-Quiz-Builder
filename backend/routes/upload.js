const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const pdf = require('pdf-parse');
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
    fileSize: 30 * 1024 * 1024 // 30MB
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
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    throw new Error('Failed to extract text from PDF');
  }
};

// Extract text from DOC/DOCX
const extractTextFromDoc = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error('Failed to extract text from document');
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
    throw new Error('Failed to extract text from PowerPoint');
  }
};

