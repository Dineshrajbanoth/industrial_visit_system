import { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import MetricCard from '../components/MetricCard';
import VisitsLineChart from '../components/charts/VisitsLineChart';
import RatingsBarChart from '../components/charts/RatingsBarChart';
import SentimentPieChart from '../components/charts/SentimentPieChart';
import { visitApi } from '../services/api';
import { getAcademicYearFromDate, getAcademicYearOptions } from '../utils/academicYear';

const branchOptions = ['CSE', 'ECE', 'EEE', 'IT', 'MECH', 'CIVIL'];

function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: getAcademicYearFromDate(new Date()),
    branch: '',
    company: '',
  });
  const academicYearOptions = getAcademicYearOptions(6);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await visitApi.analytics(filters);
        setData(data);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [filters.year, filters.branch, filters.company]);

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Total Visits', value: data.cards.totalVisits, accent: 'ocean' },
      { label: 'Average Rating', value: data.cards.averageRating, accent: 'coral' },
      { label: 'Total Students', value: data.cards.totalStudents, accent: 'emerald' },
      { label: 'Unique Companies', value: data.cards.uniqueCompanies, accent: 'indigo' },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!data) {
    return <EmptyState title="No analytics available" subtitle="Please add visit and feedback data." />;
  }

  return (
    <div className="space-y-5">
      <Card className="grid gap-3 md:grid-cols-3">
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
          placeholder="Filter by company"
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={filters.company}
          onChange={(e) => setFilters((prev) => ({ ...prev, company: e.target.value }))}
        />
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} accent={card.accent} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <VisitsLineChart data={data.charts.visitsPerMonth} />
        <RatingsBarChart data={data.charts.ratingsDistribution} />
        <SentimentPieChart data={data.charts.sentimentBreakdown} />
      </section>

      <Card>
        <h3 className="font-heading text-lg font-bold text-slate-900">Top Visited Companies</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {data.topCompanies.map((item) => (
            <div key={item.companyName} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-semibold text-slate-900">{item.companyName}</p>
              <p className="text-sm text-slate-700">Visits: {item.count}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default DashboardPage;
