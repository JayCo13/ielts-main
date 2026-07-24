import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../partials/Sidebar';
import Header from '../../partials/Header';
import { API_BASE } from '../../config/api';

const fmt = (n) => (n == null ? '0' : Number(n).toLocaleString('vi-VN'));
const getToken = () => localStorage.getItem('access_token');
const authed = async (path, opts = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
        ...opts,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(opts.headers || {}) },
    });
    const t = await res.text();
    const data = t ? JSON.parse(t) : null;
    if (!res.ok) throw new Error((data && data.detail) || 'Lỗi');
    return data;
};

const STATUS = {
    pending: { label: 'Chờ xử lý', cls: 'text-amber-700 bg-amber-100' },
    paid: { label: 'Đã thanh toán', cls: 'text-green-700 bg-green-100' },
    rejected: { label: 'Bị từ chối', cls: 'text-red-600 bg-red-100' },
};

function AffiliateManagement() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [overview, setOverview] = useState(null);
    const [rows, setRows] = useState([]);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [ov, list] = await Promise.all([
                authed('/admin/affiliate/overview'),
                authed(`/admin/affiliate/withdrawals${statusFilter ? `?status=${statusFilter}` : ''}`),
            ]);
            setOverview(ov);
            setRows(Array.isArray(list) ? list : []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

    const openDetail = async (id) => {
        try { setDetail(await authed(`/admin/affiliate/withdrawals/${id}`)); } catch (e) { alert(e.message); }
    };

    const act = async (id, action) => {
        if (action === 'reject' && !window.confirm('Từ chối yêu cầu này? Số tiền sẽ được hoàn lại vào ví của user.')) return;
        setBusy(true);
        try {
            await authed(`/admin/affiliate/withdrawals/${id}/${action}`, { method: 'POST' });
            setDetail(null);
            load();
        } catch (e) { alert(e.message); } finally { setBusy(false); }
    };

    const filtered = rows.filter(r => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        return (r.username || '').toLowerCase().includes(s) || (r.email || '').toLowerCase().includes(s);
    });

    const cards = overview ? [
        { label: 'Tổng hoa hồng phát sinh', value: `${fmt(overview.total_commission)} xu` },
        { label: 'Tổng đã chi trả', value: `${fmt(overview.total_paid)} xu` },
        { label: 'Số dư ví chưa rút', value: `${fmt(overview.total_unwithdrawn)} xu` },
        { label: 'Request đang chờ', value: fmt(overview.pending_requests) },
    ] : [];

    return (
        <div className="flex h-[100dvh] overflow-hidden">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <main className="grow">
                    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
                        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold mb-6">Affiliate</h1>

                        {/* Overview */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {cards.map((c, i) => (
                                <div key={i} className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-4 border border-gray-100 dark:border-gray-700/60">
                                    <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{c.value}</div>
                                    <div className="text-xs text-gray-500 mt-1">{c.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap gap-3 mb-4">
                            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm theo tài khoản / email…"
                                className="form-input flex-1 min-w-[200px]" />
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select">
                                <option value="pending">Chờ xử lý</option>
                                <option value="paid">Đã thanh toán</option>
                                <option value="rejected">Bị từ chối</option>
                                <option value="">Tất cả</option>
                            </select>
                        </div>

                        {/* Table */}
                        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                {loading ? (
                                    <div className="p-8 text-center text-gray-500">Đang tải…</div>
                                ) : filtered.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">Không có yêu cầu</div>
                                ) : (
                                    <table className="table-auto w-full text-sm">
                                        <thead className="text-xs uppercase text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Tài khoản</th>
                                                <th className="px-4 py-3 text-left">Email</th>
                                                <th className="px-4 py-3 text-right">Số dư ví</th>
                                                <th className="px-4 py-3 text-right">Số tiền rút</th>
                                                <th className="px-4 py-3 text-left">Ngày gửi</th>
                                                <th className="px-4 py-3 text-center">Chờ</th>
                                                <th className="px-4 py-3 text-center">Trạng thái</th>
                                                <th className="px-4 py-3 text-right">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                            {filtered.map(r => (
                                                <tr key={r.withdrawal_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer" onClick={() => openDetail(r.withdrawal_id)}>
                                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{r.username}</td>
                                                    <td className="px-4 py-3 text-gray-500">{r.email || '—'}</td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{fmt(r.balance)}</td>
                                                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800 dark:text-gray-100">{fmt(r.amount)}</td>
                                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                                                    <td className="px-4 py-3 text-center text-gray-500">{r.days_waiting} ngày</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS[r.status]?.cls || ''}`}>{STATUS[r.status]?.label || r.status}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                                        {r.status === 'pending' ? (
                                                            <button onClick={() => act(r.withdrawal_id, 'paid')} disabled={busy} className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg px-3 py-1.5 disabled:opacity-50">Đã chuyển tiền</button>
                                                        ) : (
                                                            <button onClick={() => openDetail(r.withdrawal_id)} className="text-xs text-indigo-500 hover:text-indigo-600">Chi tiết</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Detail modal */}
            {detail && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Yêu cầu rút tiền #{detail.withdrawal_id}</h3>
                        <div className="space-y-2 text-sm">
                            {[
                                ['Tài khoản', detail.username],
                                ['Email', detail.email || '—'],
                                ['Chủ tài khoản', detail.account_holder],
                                ['Số tài khoản', detail.account_number],
                                ['Ngân hàng', detail.bank],
                                ['Số tiền yêu cầu', `${fmt(detail.amount)} xu`],
                                ['Số dư ví hiện tại', `${fmt(detail.current_balance)} xu`],
                                ['Ngày gửi', detail.created_at ? new Date(detail.created_at).toLocaleString('vi-VN') : '—'],
                                ['Số ngày đã chờ', `${detail.days_waiting} ngày`],
                            ].map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-4 border-b border-gray-50 dark:border-gray-700/40 pb-1.5">
                                    <span className="text-gray-500">{k}</span>
                                    <span className="font-medium text-gray-800 dark:text-gray-100 text-right">{v}</span>
                                </div>
                            ))}
                            <div className="flex justify-between pt-1">
                                <span className="text-gray-500">Trạng thái</span>
                                <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS[detail.status]?.cls || ''}`}>{STATUS[detail.status]?.label || detail.status}</span>
                            </div>
                        </div>
                        {detail.status === 'pending' && (
                            <div className="flex justify-end gap-2 mt-5">
                                <button onClick={() => act(detail.withdrawal_id, 'reject')} disabled={busy} className="btn text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">Từ chối (hoàn tiền)</button>
                                <button onClick={() => act(detail.withdrawal_id, 'paid')} disabled={busy} className="btn bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Đã chuyển tiền</button>
                            </div>
                        )}
                        <div className="flex justify-end mt-3">
                            <button onClick={() => setDetail(null)} className="text-sm text-gray-500 hover:text-gray-700">Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AffiliateManagement;
