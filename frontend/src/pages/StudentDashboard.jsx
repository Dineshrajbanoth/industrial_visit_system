import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiMapPin, FiUsers } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { visitApi } from '../services/api';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { getAcademicYearFromDate, getAcademicYearOptions } from '../utils/academicYear';

function StudentDashboard() {
  const { user } = useAuth();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(getAcademicYearFromDate(new Date()));
  const academicYearOptions = getAcademicYearOptions(0);
  const [customYear, setCustomYear] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await visitApi.getStudent({ sort: 'latest', year: academicYear });
        setVisits(data);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [academicYear]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-56" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-slate-700/70 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white shadow-lg shadow-slate-900/20">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Student Dashboard
        </p>
        <h2 className="mt-2 font-heading text-3xl font-bold tracking-tight text-white md:text-4xl">
          Assigned visits for {user?.branch} - {user?.section}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
          Review only the visits assigned to your branch and section, then submit your feedback once per visit.
        </p>
        <div className="mt-4 max-w-sm">
          <label className="text-xs font-medium uppercase tracking-[0.16em] text-slate-300">Academic Year</label>
          <div className="mt-1 flex gap-2">
            <select
              className="flex-1 rounded-lg border border-slate-600 bg-slate-950/70 px-3 py-2 text-sm text-white shadow-inner shadow-black/10 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                setCustomYear('');
              }}
            >
              {(
                academicYearOptions.includes(academicYear)
                  ? academicYearOptions
                  : [academicYear, ...academicYearOptions]
              ).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Or enter year (e.g. 2016 or 2016-2017)"
              value={customYear}
              onChange={(e) => setCustomYear(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = e.target.value.trim();
                  if (/^\d{4}$/.test(val)) {
                    setAcademicYear(`${val}-${Number(val) + 1}`);
                  } else if (/^\d{4}-\d{4}$/.test(val)) {
                    setAcademicYear(val);
                  }
                }
              }}
              className="w-36 rounded-lg border border-slate-600 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30"
            />
          </div>
        </div>
      </Card>

      {!visits.length ? (
        <EmptyState
          title="No visits assigned to your section"
          subtitle="When an industrial visit is mapped to your branch and section, it will appear here automatically."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visits.map((visit) => (
            <Card key={visit._id} className="overflow-hidden transition hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-4 h-40 overflow-hidden rounded-xl bg-slate-100">
                {visit.images?.[0] ? (
                  <img src={visit.images[0]} alt={visit.companyName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No image</div>
                )}
              </div>

              <h3 className="font-heading text-lg font-bold text-slate-900">{visit.companyName}</h3>
              <p className="mt-1 text-sm text-slate-700">{visit.branch} - Section {visit.section}</p>

              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <FiCalendar className="text-slate-600" />
                  <span>{new Date(visit.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiMapPin className="text-slate-600" />
                  <span>{visit.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiUsers className="text-slate-600" />
                  <span>{visit.studentsCount} students</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">Avg Rating: <span className="text-blue-600">{visit.avgRating || 0}</span></p>
                <Link to={`/visits/${visit._id}`}>
                  <Button variant="secondary">Give Feedback</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;