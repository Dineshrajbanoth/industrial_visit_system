import { useEffect, useMemo, useState } from 'react';
import Button from './ui/Button';
import { getAcademicYearFromDate, getAcademicYearOptions } from '../utils/academicYear';

const branchOptions = ['CSE', 'ECE', 'EEE', 'IT', 'MECH', 'CIVIL'];
const sectionOptions = ['A', 'B', 'C', 'D'];

const initialForm = {
  companyName: '',
  date: '',
  academicYear: getAcademicYearFromDate(new Date()),
  branch: 'CSE',
  section: 'A',
  location: '',
  studentsCount: '',
};

function VisitForm({ onSubmit, loading, initialValues, submitLabel = 'Save Visit' }) {
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [fileErrors, setFileErrors] = useState([]);
  const academicYearOptions = useMemo(() => getAcademicYearOptions(0), []);

  useEffect(() => {
    if (initialValues) {
      setForm({
        companyName: initialValues.companyName || '',
        date: initialValues.date ? initialValues.date.slice(0, 10) : '',
        academicYear: initialValues.academicYear || getAcademicYearFromDate(initialValues.date || new Date()),
        branch: initialValues.branch || initialValues.department || 'CSE',
        section: initialValues.section || 'A',
        location: initialValues.location || '',
        studentsCount: initialValues.studentsCount || '',
      });
    }
  }, [initialValues]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (fileErrors.length) return;
    const formData = new FormData();

    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    for (const file of files) {
      formData.append('images', file);
    }
    for (const file of attachments) {
      formData.append('attachments', file);
    }

    onSubmit(formData, () => {
      setForm(initialForm);
      setFiles([]);
    });
  };

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
  const allowedDocExts = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt'];

  function bytesToKB(bytes) {
    return Math.round(bytes / 1024);
  }

  function isAllowedDocument(file) {
    // Frontend only checks file extension (most reliable)
    // Backend will validate MIME types thoroughly
    const lastDot = file.name.lastIndexOf('.');
    if (lastDot === -1) return false; // No extension
    const ext = file.name.substring(lastDot).toLowerCase(); // includes the dot
    return allowedDocExts.includes(ext);
  }

  const handleImageChange = (fileList) => {
    const arr = Array.from(fileList || []);
    const invalid = [];
    const valid = [];

    for (const f of arr) {
      if (!f.type.startsWith('image/')) {
        invalid.push(`${f.name}: not an image`);
        continue;
      }
      if (f.size > MAX_IMAGE_SIZE) {
        invalid.push(`${f.name}: ${bytesToKB(f.size)}KB exceeds ${bytesToKB(MAX_IMAGE_SIZE)}KB`);
        continue;
      }
      valid.push(f);
    }

    setFiles(valid);
    setFileErrors((prev) => [...invalid]);
  };

  const handleAttachmentsChange = (fileList) => {
    const arr = Array.from(fileList || []);
    const invalid = [];
    const valid = [];

    for (const f of arr) {
      if (!isAllowedDocument(f)) {
        const ext = f.name.slice(((f.name.lastIndexOf('.') - 1) >>> 0) + 1).toLowerCase();
        invalid.push(`${f.name}: unsupported file type (.${ext})`);
        continue;
      }
      if (f.size > MAX_DOC_SIZE) {
        invalid.push(`${f.name}: ${bytesToKB(f.size)}KB exceeds ${bytesToKB(MAX_DOC_SIZE)}KB`);
        continue;
      }
      valid.push(f);
    }

    setAttachments(valid);
    setFileErrors((prev) => [...invalid]);
  };

  useEffect(() => {
    // build image previews for selected images
    const urls = files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    setImagePreviews(urls);

    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u.url));
    };
  }, [files]);

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      {[
        ['companyName', 'Company Name', 'text'],
        ['date', 'Date', 'date'],
        ['location', 'Location', 'text'],
        ['studentsCount', 'Student Count', 'number'],
      ].map(([key, label, type]) => (
        <label key={key} className="text-sm font-medium text-slate-600">
          {label}
          <input
            required
            type={type}
            value={form[key]}
            onChange={(e) => {
              const nextValue = e.target.value;

              if (key === 'date') {
                setForm((prev) => ({
                  ...prev,
                  date: nextValue,
                  academicYear: getAcademicYearFromDate(nextValue),
                }));
                return;
              }

              setForm((prev) => ({ ...prev, [key]: nextValue }));
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
          />
        </label>
      ))}

      <label className="text-sm font-medium text-slate-600">
        Academic Year
        <select
          required
          value={form.academicYear}
          onChange={(e) => setForm((prev) => ({ ...prev, academicYear: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
        >
          {academicYearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-slate-600">
        Branch
        <select
          required
          value={form.branch}
          onChange={(e) => setForm((prev) => ({ ...prev, branch: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
        >
          {branchOptions.map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-slate-600">
        Section
        <select
          required
          value={form.section}
          onChange={(e) => setForm((prev) => ({ ...prev, section: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-ocean"
        >
          {sectionOptions.map((section) => (
            <option key={section} value={section}>
              {section}
            </option>
          ))}
        </select>
      </label>

      <label className="md:col-span-2 text-sm font-medium text-slate-600">
        Upload Images
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleImageChange(e.target.files)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
        />
      </label>

      <label className="md:col-span-2 text-sm font-medium text-slate-600">
        Attach Documents (pdf, docx, pptx, txt)
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
          onChange={(e) => handleAttachmentsChange(e.target.files)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
        />
      </label>

      {fileErrors.length ? (
        <div className="md:col-span-2 text-sm text-red-600">
          {fileErrors.map((err, idx) => (
            <div key={idx}>{err}</div>
          ))}
        </div>
      ) : null}

      {imagePreviews.length ? (
        <div className="md:col-span-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          {imagePreviews.map((p) => (
            <div key={p.url} className="rounded-lg border border-slate-200 p-2 text-center">
              <img src={p.url} alt={p.name} className="mx-auto h-24 object-contain" />
              <p className="truncate text-xs mt-2 text-slate-600">{p.name}</p>
            </div>
          ))}
        </div>
      ) : null}

      {attachments.length ? (
        <div className="md:col-span-2 space-y-2">
          {attachments.map((att) => (
            <div key={att.name} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
              <div className="text-sm text-slate-700 truncate">{att.name}</div>
              <div className="text-xs text-slate-500">{Math.round(att.size / 1024)} KB</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="md:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default VisitForm;
