const mongoose = require('mongoose');

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
  const raw = String(value || '').trim().replace('–', '-');

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

const visitSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    academicYear: {
      type: String,
      required: true,
      index: true,
      default() {
        return getAcademicYearFromDate(this.date);
      },
      match: /^\d{4}-\d{4}$/,
    },
    department: {
      type: String,
      trim: true,
      index: true,
    },
    branch: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    studentsCount: {
      type: Number,
      required: true,
      min: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    attachments: {
      type: [
        {
          url: { type: String },
          filename: { type: String },
          mimeType: { type: String },
          resourceType: { type: String },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

visitSchema.pre('validate', function normalizeDepartment(next) {
  if (!this.department && this.branch) {
    this.department = this.branch;
  }

  this.academicYear = normalizeAcademicYear(this.academicYear, this.date);

  next();
});

visitSchema.index({ academicYear: 1, branch: 1, companyName: 1, date: -1 });

module.exports = mongoose.model('Visit', visitSchema);
