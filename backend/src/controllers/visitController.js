const fs = require('fs');
const path = require('path');

const Visit = require('../models/Visit');
const Feedback = require('../models/Feedback');
const { cloudinary, hasCloudinaryConfig } = require('../config/cloudinary');

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeUpper(value) {
  return normalizeValue(value).toUpperCase();
}

function getAcademicYearFromDate(dateInput) {
  const date = new Date(dateInput);
  const isValidDate = !Number.isNaN(date.getTime());

  if (!isValidDate) {
    return '';
  }

  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month >= 6 ? year : year - 1;

  return `${startYear}-${startYear + 1}`;
}

function normalizeAcademicYear(value, fallbackDate) {
  const raw = normalizeValue(value).replace('–', '-');

  if (!raw) {
    return getAcademicYearFromDate(fallbackDate);
  }

  const match = raw.match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    return raw;
  }

  const start = Number(match[1]);
  const end = Number(match[2]);

  if (end !== start + 1) {
    return raw;
  }

  return `${start}-${end}`;
}

function getVisitScope(req) {
  if (req.user?.role === 'student') {
    return {
      branch: req.user.branch,
      section: req.user.section,
    };
  }

  return {};
}

function applySearchFilters(filter, query = {}) {
  const { search = '', department, company, branch, section, year, academicYear, startDate, endDate } = query;

  if (search) {
    filter.$or = [
      { companyName: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } },
      { branch: { $regex: search, $options: 'i' } },
      { section: { $regex: search, $options: 'i' } },
    ];
  }

  if (department) filter.department = { $regex: department, $options: 'i' };
  if (company) filter.companyName = { $regex: company, $options: 'i' };
  if (branch && !filter.branch) filter.branch = normalizeUpper(branch);
  if (section && !filter.section) filter.section = normalizeUpper(section);

  const requestedAcademicYear = normalizeAcademicYear(year || academicYear);
  if (requestedAcademicYear) {
    filter.academicYear = requestedAcademicYear;
  }

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  return filter;
}

function buildSortMap(sort) {
  const sortMap = {
    latest: { date: -1 },
    oldest: { date: 1 },
    company_asc: { companyName: 1 },
    company_desc: { companyName: -1 },
  };

  return sortMap[sort] || sortMap.latest;
}

async function attachFeedbackStats(visits) {
  if (!visits.length) {
    return [];
  }

  const visitIds = visits.map((visit) => visit._id);

  const feedbackAgg = await Feedback.aggregate([
    { $match: { visitId: { $in: visitIds } } },
    {
      $group: {
        _id: '$visitId',
        avgRating: { $avg: '$rating' },
        totalFeedback: { $sum: 1 },
      },
    },
  ]);

  const feedbackMap = feedbackAgg.reduce((acc, item) => {
    acc[item._id.toString()] = {
      avgRating: Number(item.avgRating.toFixed(2)),
      totalFeedback: item.totalFeedback,
    };
    return acc;
  }, {});

  return visits.map((visit) => {
    const meta = feedbackMap[visit._id.toString()] || { avgRating: 0, totalFeedback: 0 };
    return { ...visit, ...meta };
  });
}

async function uploadToCloudinary(localPath) {
  const result = await cloudinary.uploader.upload(localPath, {
    folder: 'industrial-visits',
  });
  return result.secure_url;
}

async function persistFiles(files = [], forAttachments = false) {
  if (!files || !files.length) return forAttachments ? [] : [];

  if (!hasCloudinaryConfig) {
    // Local paths
    return files.map((file) => {
      const url = `/uploads/${file.filename}`;
      if (forAttachments) return { url, filename: file.originalname, mimeType: file.mimetype };
      return url;
    });
  }

  const results = [];
  for (const file of files) {
    const opts = { folder: 'industrial-visits' };
    if (forAttachments) opts.resource_type = 'auto';

    const uploaded = await cloudinary.uploader.upload(file.path, opts);
    const url = uploaded.secure_url;
    fs.unlinkSync(file.path);

    if (forAttachments) {
      results.push({
        url,
        filename: file.originalname,
        mimeType: file.mimetype,
        resourceType: uploaded.resource_type || 'auto',
      });
    } else {
      results.push(url);
    }
  }

  return results;
}

function extractPublicId(url) {
  const parts = url.split('/');
  const fileName = parts[parts.length - 1];
  const folder = parts[parts.length - 2];
  return `${folder}/${fileName.split('.')[0]}`;
}

async function removeFileByUrl(fileUrl, resourceType = 'image') {
  if (!fileUrl) return;

  if (fileUrl.startsWith('/uploads/')) {
    const localPath = path.join(process.cwd(), fileUrl.replace('/uploads/', 'uploads/'));
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    return;
  }

  if (hasCloudinaryConfig && fileUrl.includes('res.cloudinary.com')) {
    const publicId = extractPublicId(fileUrl);
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || 'image' });
  }
}

async function getVisits(req, res) {
  const filter = applySearchFilters({}, req.query);
  const visits = await Visit.find(filter).sort(buildSortMap(req.query.sort || 'latest')).lean();
  let response = await attachFeedbackStats(visits);

  if ((req.query.sort || 'latest') === 'highest_rated') {
    response = response.sort((a, b) => b.avgRating - a.avgRating);
  }

  res.json(response);
}

async function getStudentVisits(req, res) {
  const filter = applySearchFilters(getVisitScope(req), req.query);
  const visits = await Visit.find(filter).sort(buildSortMap(req.query.sort || 'latest')).lean();
  let response = await attachFeedbackStats(visits);

  if ((req.query.sort || 'latest') === 'highest_rated') {
    response = response.sort((a, b) => b.avgRating - a.avgRating);
  }

  res.json(response);
}

async function getVisitById(req, res) {
  const visit = await Visit.findById(req.params.id).lean();

  if (!visit) {
    return res.status(404).json({ message: 'Visit not found.' });
  }

  if (req.user?.role === 'student') {
    const { branch, section } = req.user;
    if (visit.branch !== branch || visit.section !== section) {
      return res.status(403).json({ message: 'This visit is not assigned to your section.' });
    }
  }

  const feedback = await Feedback.find({ visitId: visit._id }).sort({ createdAt: -1 }).lean();
  const avgRating = feedback.length
    ? Number((feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(2))
    : 0;

  return res.json({
    ...visit,
    avgRating,
    feedbackCount: feedback.length,
    feedback,
  });
}

async function createVisit(req, res) {
  const { companyName, date, department, branch, section, location, studentsCount, academicYear } = req.body;

  const normalizedBranch = normalizeUpper(branch || department);
  const normalizedSection = normalizeUpper(section);
  const normalizedDepartment = normalizeValue(department || branch || normalizedBranch);
  const normalizedAcademicYear = normalizeAcademicYear(academicYear, date);

  if (!companyName || !date || !normalizedBranch || !normalizedSection || !location || !studentsCount) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  const imageUrls = await persistFiles((req.files && req.files.images) || [], false);
  const attachments = await persistFiles((req.files && req.files.attachments) || [], true);

  const visit = await Visit.create({
    companyName: normalizeValue(companyName),
    date,
    academicYear: normalizedAcademicYear,
    department: normalizedDepartment,
    branch: normalizedBranch,
    section: normalizedSection,
    location: normalizeValue(location),
    studentsCount: Number(studentsCount),
    images: imageUrls,
    attachments,
  });

  return res.status(201).json(visit);
}

async function updateVisit(req, res) {
  const { id } = req.params;
  const updates = { ...req.body };

  const visit = await Visit.findById(id);
  if (!visit) {
    return res.status(404).json({ message: 'Visit not found.' });
  }

  const nextBranch = normalizeUpper(updates.branch || updates.department || visit.branch);
  const nextSection = normalizeUpper(updates.section || visit.section);
  const nextDepartment = normalizeValue(updates.department || visit.department || nextBranch);
  const nextDate = updates.date || visit.date;
  const nextAcademicYear = normalizeAcademicYear(updates.academicYear || visit.academicYear, nextDate);

  updates.companyName = normalizeValue(updates.companyName || visit.companyName);
  updates.location = normalizeValue(updates.location || visit.location);
  updates.department = nextDepartment;
  updates.branch = nextBranch;
  updates.section = nextSection;
  updates.academicYear = nextAcademicYear;
  updates.studentsCount = updates.studentsCount ? Number(updates.studentsCount) : visit.studentsCount;

  const newImageUrls = await persistFiles((req.files && req.files.images) || [], false);
  const newAttachments = await persistFiles((req.files && req.files.attachments) || [], true);
  if (newImageUrls.length) updates.images = [...visit.images, ...newImageUrls];
  if (newAttachments.length) updates.attachments = [...(visit.attachments || []), ...newAttachments];

  Object.assign(visit, updates);
  await visit.save();

  return res.json(visit);
}

async function deleteVisit(req, res) {
  const { id } = req.params;

  const visit = await Visit.findById(id);
  if (!visit) {
    return res.status(404).json({ message: 'Visit not found.' });
  }

  for (const imageUrl of visit.images) {
    await removeFileByUrl(imageUrl, 'image');
  }

  for (const attachment of visit.attachments || []) {
    await removeFileByUrl(attachment.url, attachment.resourceType || 'raw');
  }

  await Feedback.deleteMany({ visitId: id });
  await visit.deleteOne();

  return res.json({ message: 'Visit and related feedback deleted successfully.' });
}

async function deleteVisitImage(req, res) {
  const { id } = req.params;
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ message: 'imageUrl is required.' });
  }

  const visit = await Visit.findById(id);
  if (!visit) {
    return res.status(404).json({ message: 'Visit not found.' });
  }

  const attachment = (visit.attachments || []).find((item) => item.url === imageUrl);
  const isImage = (visit.images || []).includes(imageUrl);
  let removed = false;

  if (visit.images && visit.images.includes(imageUrl)) {
    visit.images = visit.images.filter((img) => img !== imageUrl);
    removed = true;
  }

  // remove from attachments array
  if (visit.attachments && visit.attachments.find((a) => a.url === imageUrl)) {
    visit.attachments = visit.attachments.filter((a) => a.url !== imageUrl);
    removed = true;
  }

  if (!removed) {
    return res.status(404).json({ message: 'File not found on this visit.' });
  }

  await visit.save();
  await removeFileByUrl(imageUrl, attachment?.resourceType || (isImage ? 'image' : 'raw'));

  return res.json({ message: 'File deleted successfully.', images: visit.images, attachments: visit.attachments });
}

async function getDashboardAnalytics(req, res) {
  const visitFilter = applySearchFilters(getVisitScope(req), req.query);
  const [totalVisits, visits, studentAgg, topCompanies, visitsPerMonth] = await Promise.all([
    Visit.countDocuments(visitFilter),
    Visit.find(visitFilter, '_id companyName').lean(),
    Visit.aggregate([
      { $match: visitFilter },
      { $group: { _id: null, totalStudents: { $sum: '$studentsCount' } } },
    ]),
    Visit.aggregate([
      { $match: visitFilter },
      { $group: { _id: '$companyName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Visit.aggregate([
      { $match: visitFilter },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  const visitIds = visits.map((visit) => visit._id);

  let feedback = [];
  let ratingDistribution = [];
  let sentimentBreakdown = [];

  if (visitIds.length) {
    [feedback, ratingDistribution, sentimentBreakdown] = await Promise.all([
      Feedback.find({ visitId: { $in: visitIds } }, 'rating sentiment').lean(),
      Feedback.aggregate([
        { $match: { visitId: { $in: visitIds } } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Feedback.aggregate([
        { $match: { visitId: { $in: visitIds } } },
        { $group: { _id: '$sentiment', count: { $sum: 1 } } },
      ]),
    ]);
  }

  const avgRating = feedback.length
    ? Number((feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(2))
    : 0;

  const monthlyChart = visitsPerMonth.map((item) => ({
    month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
    visits: item.count,
  }));

  const ratingChart = [1, 2, 3, 4, 5].map((rating) => {
    const found = ratingDistribution.find((item) => item._id === rating);
    return { rating: `${rating} Star`, count: found ? found.count : 0 };
  });

  const sentimentChart = ['Positive', 'Neutral', 'Negative'].map((key) => {
    const found = sentimentBreakdown.find((item) => item._id === key);
    return { name: key, value: found ? found.count : 0 };
  });

  return res.json({
    cards: {
      totalVisits,
      averageRating: avgRating,
      totalStudents: studentAgg[0]?.totalStudents || 0,
      uniqueCompanies: [...new Set(visits.map((visit) => visit.companyName))].length,
    },
    topCompanies: topCompanies.map((item) => ({ companyName: item._id, count: item.count })),
    charts: {
      visitsPerMonth: monthlyChart,
      ratingsDistribution: ratingChart,
      sentimentBreakdown: sentimentChart,
    },
  });
}

module.exports = {
  getVisits,
  getStudentVisits,
  getVisitById,
  createVisit,
  updateVisit,
  deleteVisit,
  deleteVisitImage,
  getDashboardAnalytics,
};
