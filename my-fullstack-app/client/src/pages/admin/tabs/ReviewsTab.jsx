import { useState } from 'react';
import { Star, Check, X, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import Card from '../../../components/admin/Card';
import SectionTitle from '../../../components/admin/SectionTitle';

export default function ReviewsTab({ reviews, reload }) {
  const [view, setView] = useState('pending');
  const [approvedReviews, setApprovedReviews] = useState([]);
  const [loadingApproved, setLoadingApproved] = useState(false);

  const loadApproved = () => {
    setLoadingApproved(true);
    api.get('/admin/reviews', { params: { status: 'approved' } })
      .then(({ data }) => setApprovedReviews(data.reviews))
      .finally(() => setLoadingApproved(false));
  };

  const switchView = (v) => {
    setView(v);
    if (v === 'approved') loadApproved();
  };

  const act = async (id, action) => {
    await api.put(`/admin/reviews/${id}/${action}`);
    reload();
  };

  const remove = async (id) => {
    await api.delete(`/admin/reviews/${id}`);
    loadApproved();
  };

  const visible = view === 'pending' ? reviews : approvedReviews;

  return (
    <Card className="p-4 sm:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <SectionTitle icon={Star}>{view === 'pending' ? 'Pending Reviews' : 'Live Reviews'}</SectionTitle>
        <div className="flex gap-1.5">
          {[['pending', 'Pending'], ['approved', 'Live On Site']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => switchView(v)}
              className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-md transition-colors ${
                view === v ? 'bg-white text-black' : 'text-gray-500 hover:text-white bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'approved' && loadingApproved ? (
        <p className="text-xs text-gray-600 uppercase tracking-widest">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="text-xs text-gray-600 uppercase tracking-widest">
          {view === 'pending' ? 'Nothing to review.' : 'No live reviews yet.'}
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((r) => (
            <div key={r.id} className="border-b border-gray-900 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white font-medium">{r.reviewer_name}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">{r.product_name}</span>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={11} className={i < r.rating ? 'fill-white/70 text-white/70' : 'text-white/20'} />
                ))}
              </div>
              <p className="text-xs text-gray-400 mb-3">"{r.review_text}"</p>
              {r.image_url && (
                <img
                  src={r.image_url}
                  alt="Customer upload"
                  className="w-20 h-20 object-cover rounded-lg border border-gray-800 mb-3"
                />
              )}
              <div className="flex items-center gap-4">
                {view === 'pending' ? (
                  <>
                    <button onClick={() => act(r.id, 'approve')} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors">
                      <Check size={13} /> Approve
                    </button>
                    <button onClick={() => act(r.id, 'reject')} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors">
                      <X size={13} /> Reject
                    </button>
                  </>
                ) : (
                  <button onClick={() => remove(r.id)} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors">
                    <Trash2 size={13} /> Remove From Site
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
