import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiUsers } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import { visitApi } from '../services/api';
import { getAcademicYearFromDate, getAcademicYearOptions } from '../utils/academicYear';

const branchOptions = ['CSE', 'ECE', 'EEE', 'IT', 'MECH', 'CIVIL'];

function VisitsPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: getAcademicYearFromDate(new Date()),
    search: '',
    department: '',
    company: '',
    branch: '',
    startDate: '',
    endDate: '',
    sort: 'latest',
  });
  const academicYearOptions = getAcademicYearOptions(0);

  const loadVisits = async () => {
    setLoading(true);
    try {
      const { data } = user?.role === 'student' ? await visitApi.getStudent(filters) : await visitApi.getAll(filters);
      setVisits(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, [user?.role, filters.year, filters.search, filters.department, filters.company, filters.branch, filters.startDate, filters.endDate, filters.sort]);

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 md:grid-cols-8">
        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={filters.year}
          onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}
        >
          {academicYearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <input
          placeholder="Search company, location, department"
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
        />
        <input
          placeholder="Filter by department"
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={filters.department}
          onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
        />
        <input
          placeholder="Filter by company"
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={filters.company}
          onChange={(e) => setFilters((prev) => ({ ...prev, company: e.target.value }))}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={filters.branch}
          onChange={(e) => setFilters((prev) => ({ ...prev, branch: e.target.value }))}
        >
          <option value="">All Branches</option>
          {branchOptions.map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={filters.startDate}
          onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
        />
        <input
          type="date"
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={filters.endDate}
          onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={filters.sort}
          onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))}
        >
          <option value="latest">Latest</option>
          <option value="highest_rated">Highest Rated</option>
          <option value="oldest">Oldest</option>
          <option value="company_asc">Company A-Z</option>
          <option value="company_desc">Company Z-A</option>
        </select>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-48" />
          ))}
        </div>
      ) : visits.length === 0 ? (
        <EmptyState
          title="No visits found"
          subtitle={user?.role === 'student' ? 'No visits assigned to your section.' : 'Try adjusting your filters or add a new visit from admin panel.'}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visits.map((visit) => (
            <Card key={visit._id} className="transition hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-3 h-36 overflow-hidden rounded-xl bg-slate-100">
                {visit.images?.[0] ? (
                  <img src={visit.images[0]} alt={visit.companyName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
                )}
              </div>
              <h3 className="font-heading text-lg font-semibold text-ink">{visit.companyName}</h3>
              <p className="mt-1 text-sm text-slate-500">{new Date(visit.date).toLocaleDateString()}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Academic Year: {visit.academicYear}</p>
              <p className="mt-2 text-sm text-slate-600">Branch: {visit.branch} | Section: {visit.section}</p>

              <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1"><FiMapPin /> {visit.location}</span>
                <span className="inline-flex items-center gap-1"><FiUsers /> {visit.studentsCount}</span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-ocean">Avg Rating: {visit.avgRating || 0}</p>
                <Link to={`/visits/${visit._id}`}>
                  <Button variant="secondary">{user?.role === 'student' ? 'Give Feedback' : 'View Details'}</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default VisitsPage;
