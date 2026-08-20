import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import sharp from 'sharp';
import { ApiError } from '../utils/catchAsync.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

// Rejects the upload before it's saved if the file isn't an allowed image type.
function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new ApiError(400, 'Only JPEG, PNG, WEBP, or AVIF images are allowed.'));
  }
  cb(null, true);
}

const limits = { fileSize: 5 * 1024 * 1024 }; // 5MB

// Image uploads (products, banners, reviews) go into memory first instead of
// straight to disk — that lets the processImages middleware below shrink and
// compress them with sharp before anything is written to the filesystem.
// Uploaded photos were previously saved exactly as the admin's phone/camera
// produced them (often 1-2MB+ each), which is why the storefront was slow to
// load images.
const memoryUpload = multer({ storage: multer.memoryStorage(), fileFilter, limits });

export const uploadProductImage = memoryUpload;
// Named fields (not a positional array) so admins can fill any subset of the 3 image slots
// without one missing slot silently shifting the rest into the wrong DB column.
export const uploadProductImages = memoryUpload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'hoverImage', maxCount: 1 },
  { name: 'galleryImage', maxCount: 1 },
]);
export const uploadBannerImage = memoryUpload;
export const uploadHeroBannerImage = memoryUpload;
export const uploadReviewImage = memoryUpload;

// Resizes + compresses every image file multer just parsed into memory, then
// writes the result into uploads/<subfolder> — and sets file.filename on each
// one so controllers can keep reading req.file.filename / req.files.X[0].filename
// exactly as before, unaware that any processing happened.
export function processImages(subfolder, maxWidth) {
  return async function processImagesMiddleware(req, res, next) {
    try {
      const files = req.file ? [req.file] : Object.values(req.files || {}).flat();
      if (!files.length) return next();

      const dir = path.join(process.cwd(), 'uploads', subfolder);
      fs.mkdirSync(dir, { recursive: true });

      for (const file of files) {
        const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.jpg`;
        await sharp(file.buffer)
          // Never upscale a smaller image — only shrinks ones bigger than this.
          .resize({ width: maxWidth, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(path.join(dir, filename));
        file.filename = filename;
      }
      next();
    } catch (err) {
      next(new ApiError(400, 'Could not process the uploaded image.'));
    }
  };
}

// Checkout bank-transfer payment slip — allow images or a PDF receipt.
// Kept as a plain disk upload (not resized/compressed): a PDF can't be run
// through sharp, and slips are admin-viewed proof of payment, not
// storefront-facing content, so file size here doesn't affect page load speed.
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
