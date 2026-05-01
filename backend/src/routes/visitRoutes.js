const express = require('express');
const {
  getVisits,
  getStudentVisits,
  getVisitById,
  createVisit,
  updateVisit,
  deleteVisit,
  deleteVisitImage,
  getDashboardAnalytics,
} = require('../controllers/visitController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/', authenticate, requireRole('admin', 'examiner'), asyncHandler(getVisits));
router.get('/student', authenticate, requireRole('student'), asyncHandler(getStudentVisits));
router.get('/analytics/overview', authenticate, requireRole('admin', 'examiner'), asyncHandler(getDashboardAnalytics));
router.get('/:id', authenticate, asyncHandler(getVisitById));
router.post(
  '/',
  authenticate,
  requireAdmin,
  upload.fields([
    { name: 'images', maxCount: 8 },
    { name: 'attachments', maxCount: 5 },
  ]),
  asyncHandler(createVisit)
);
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  upload.fields([
    { name: 'images', maxCount: 8 },
    { name: 'attachments', maxCount: 5 },
  ]),
  asyncHandler(updateVisit)
);
router.delete('/:id', authenticate, requireAdmin, asyncHandler(deleteVisit));
router.delete('/:id/images', authenticate, requireAdmin, asyncHandler(deleteVisitImage));

module.exports = router;
