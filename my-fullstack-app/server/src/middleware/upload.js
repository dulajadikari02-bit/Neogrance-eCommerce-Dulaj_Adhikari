import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { ApiError } from '../utils/catchAsync.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

// Tells multer where to save an uploaded file and what to name it.
// The filename mixes the current time with random bytes so two uploads
// never accidentally overwrite each other, even if they had the same original name.
function makeStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads', subfolder)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  });
}

// Rejects the upload before it's saved if the file isn't an allowed image type.
function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new ApiError(400, 'Only JPEG, PNG, WEBP, or AVIF images are allowed.'));
  }
  cb(null, true);
}

const limits = { fileSize: 5 * 1024 * 1024 }; // 5MB

const productUpload = multer({ storage: makeStorage('products'), fileFilter, limits });
export const uploadProductImage = productUpload;
// Named fields (not a positional array) so admins can fill any subset of the 3 image slots
// without one missing slot silently shifting the rest into the wrong DB column.
export const uploadProductImages = productUpload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'hoverImage', maxCount: 1 },
  { name: 'galleryImage', maxCount: 1 },
]);
export const uploadBannerImage = multer({ storage: makeStorage('banner'), fileFilter, limits });

// Checkout bank-transfer payment slip — allow images or a PDF receipt.
const slipStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'slips')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});
export const uploadPaymentSlip = multer({
  storage: slipStorage,
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype) && file.mimetype !== 'application/pdf') {
      return cb(new ApiError(400, 'Only JPEG, PNG, WEBP, or PDF files are allowed.'));
    }
    cb(null, true);
  },
  limits,
});

// Customer review photos — image only, no PDF.
export const uploadReviewImage = multer({ storage: makeStorage('reviews'), fileFilter, limits });
