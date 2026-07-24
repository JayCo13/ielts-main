import React, { useEffect, useState, useCallback } from 'react';
import { Users, Coins, Gift, Copy, Check, Wallet, Send, Clock } from 'lucide-react';
import { API_BASE } from '../config/api';

const fmt = (n) => (n == null ? '0' : Number(n).toLocaleString('vi-VN'));
const token = () => localStorage.getItem('token');

async function authed(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(opts.headers || {}) },
  });
  const t = await res.text();
  const data = t ? JSON.parse(t) : null;
  if (!res.ok) throw new Error((data && data.detail) || 'Lỗi');
  return data;
}

function TxType({ t }) {
  const map = {
    commission: { label: 'Hoa hồng', cls: 'text-emerald-600' },
    withdraw: { label: 'Rút tiền', cls: 'text-red-500' },
    withdraw_refund: { label: 'Hoàn tiền', cls: 'text-amber-600' },
  };
  const m = map[t] || { label: t, cls: 'text-gray-500' };
  return <span className={`text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

export default function AffiliatePanel({ onGoPayment }) {
  const [info, setInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [payment, setPayment] = useState(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const [i, h, w, p] = await Promise.all([
        authed('/customer/affiliate'),
        authed('/customer/affiliate/history'),
        authed('/customer/affiliate/withdrawals'),
        authed('/customer/affiliate/payment'),
      ]);
      setInfo(i); setHistory(h || []); setWithdrawals(w || []); setPayment(p);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyLink = () => {
    if (!info) return;
    navigator.clipboard.writeText(info.referral_link).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const submitWithdraw = async () => {
    setMsg(null);
    // Warn + require payment setup before withdrawing.
    if (payment && !payment.is_set) {
      setMsg({ type: 'warn', text: 'Bạn chưa thiết lập Thông tin thanh toán. Vui lòng thêm ảnh QR hoặc tài khoản ngân hàng trước khi rút.', action: true });
      return;
    }
    setSubmitting(true);
    try {
      await authed('/customer/affiliate/withdraw', { method: 'POST', body: JSON.stringify({}) });
      setMsg({ type: 'ok', text: 'Đã gửi yêu cầu rút tiền. Admin sẽ xử lý trong vòng 30 ngày.' });
      load();
    } catch (e) { setMsg({ type: 'err', text: e.message }); }
    finally { setSubmitting(false); }
  };

  if (!info) return <div className="p-6 text-gray-400">Đang tải…</div>;

  const stat = [
    { icon: Users, label: 'Lượt đăng ký qua link', value: fmt(info.signup_count), tone: 'text-[#0096b1]' },
    { icon: Gift, label: 'Tổng hoa hồng (xu)', value: fmt(info.total_commission), tone: 'text-emerald-600' },
    { icon: Coins, label: 'Số dư ví (xu)', value: fmt(info.balance), tone: 'text-[#eb7e37]' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#2b5356] flex items-center gap-2"><Gift className="w-6 h-6 text-[#0096b1]" /> Affiliate — Giới thiệu nhận hoa hồng</h2>
        <p className="text-sm text-gray-500 mt-1">Chia sẻ link của bạn. Khi người được giới thiệu mua VIP, bạn nhận <b>10%</b> giá trị đơn (1 xu = 1 VNĐ).</p>
      </div>

      {/* Referral link */}
      <div className="bg-gradient-to-r from-[#0096b1]/10 to-[#2b5356]/5 rounded-xl p-4 border border-[#0096b1]/20">
        <div className="text-sm font-semibold text-[#2b5356] mb-2">Link giới thiệu của bạn</div>
        <div className="flex gap-2">
          <input readOnly value={info.referral_link} className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600" />
          <button onClick={copyLink} className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0096b1] text-white text-sm font-medium hover:bg-[#007d93]">
            {copied ? <><Check className="w-4 h-4" /> Đã copy</> : <><Copy className="w-4 h-4" /> Copy Link</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stat.map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <s.icon className={`w-8 h-8 ${s.tone}`} />
            <div className="min-w-0">
              <div className="text-xl font-bold text-gray-800">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Withdraw */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3"><Wallet className="w-5 h-5 text-[#0096b1]" /><h3 className="font-bold text-gray-800">Rút tiền hoa hồng</h3></div>
        {!info.can_withdraw ? (
          <p className="text-sm text-gray-500">Cần đạt tối thiểu <b>{fmt(info.withdraw_min)} xu</b> mới được rút. Số dư hiện tại: <b>{fmt(info.balance)} xu</b>.</p>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-gray-500">
              Rút toàn bộ số dư: <b className="text-gray-800">{fmt(info.balance)} xu</b>
              {payment && payment.is_set && <span className="block text-xs text-gray-400 mt-0.5">Nhận qua: {payment.qr_url ? 'QR đã lưu' : ''}{payment.qr_url && payment.bank ? ' · ' : ''}{payment.bank ? `${payment.bank} ${payment.account_number || ''}` : ''}</span>}
            </div>
            <button onClick={submitWithdraw} disabled={submitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#eb7e37] text-white text-sm font-semibold hover:bg-[#d96e28] disabled:opacity-50">
              <Send className="w-4 h-4" /> Yêu cầu rút tiền
            </button>
          </div>
        )}
        {msg && (
          <p className={`mt-2 text-sm ${msg.type === 'ok' ? 'text-emerald-600' : msg.type === 'warn' ? 'text-amber-600' : 'text-red-500'}`}>
            {msg.type !== 'ok' && '⚠️ '}{msg.text}
            {msg.action && onGoPayment && <button onClick={onGoPayment} className="ml-2 text-[#0096b1] font-semibold hover:underline">Thiết lập ngay →</button>}
          </p>
        )}
      </div>

      {/* Pending withdrawals */}
      {withdrawals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-gray-400" /> Yêu cầu rút tiền</h3>
          <div className="space-y-2">
            {withdrawals.map(w => (
              <div key={w.withdrawal_id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-600">{fmt(w.amount)} xu · {w.bank} · {w.account_number}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${w.status === 'paid' ? 'text-emerald-700 bg-emerald-50' : w.status === 'rejected' ? 'text-red-600 bg-red-50' : 'text-amber-700 bg-amber-50'}`}>
                  {w.status === 'paid' ? 'Đã thanh toán' : w.status === 'rejected' ? 'Bị từ chối' : 'Chờ xử lý'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wallet history */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-3">Lịch sử ví</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có giao dịch.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 border-b border-gray-100">
                <tr><th className="text-left py-2">Thời gian</th><th className="text-left">Diễn giải</th><th className="text-right">+/- Xu</th><th className="text-right">Số dư</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map(h => (
                  <tr key={h.id}>
                    <td className="py-2 text-gray-500 whitespace-nowrap">{h.created_at ? new Date(h.created_at).toLocaleDateString('vi-VN') : ''}</td>
                    <td className="text-gray-700"><TxType t={h.type} /> {h.description}</td>
                    <td className={`text-right tabular-nums font-medium ${h.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{h.amount >= 0 ? '+' : ''}{fmt(h.amount)}</td>
                    <td className="text-right tabular-nums text-gray-600">{fmt(h.balance_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
