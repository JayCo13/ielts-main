import React, { useEffect, useState, useRef } from 'react';
import { QrCode, Building2, Upload, Trash2, Check, CreditCard } from 'lucide-react';
import { API_BASE } from '../config/api';

const token = () => localStorage.getItem('token');

export default function PaymentPanel() {
  const [data, setData] = useState(null);
  const [bank, setBank] = useState('');
  const [accNo, setAccNo] = useState('');
  const [accHolder, setAccHolder] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/customer/affiliate/payment`, { headers: { Authorization: `Bearer ${token()}` } });
      const d = await res.json();
      setData(d);
      setBank(d.bank || ''); setAccNo(d.account_number || ''); setAccHolder(d.account_holder || '');
    } catch (e) { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  const saveBank = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/customer/affiliate/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ bank, account_number: accNo, account_holder: accHolder }),
      });
      if (!res.ok) throw new Error();
      setMsg({ type: 'ok', text: 'Đã lưu thông tin ngân hàng' });
      load();
    } catch (e) { setMsg({ type: 'err', text: 'Không lưu được' }); }
    finally { setSaving(false); }
  };

  const uploadQr = async (file) => {
    if (!file) return;
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${API_BASE}/customer/affiliate/payment/qr`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd,
      });
      if (!res.ok) throw new Error();
      setMsg({ type: 'ok', text: 'Đã tải ảnh QR' });
      load();
    } catch (e) { setMsg({ type: 'err', text: 'Không tải được ảnh' }); }
  };

  const deleteQr = async () => {
    try {
      await fetch(`${API_BASE}/customer/affiliate/payment/qr`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      load();
    } catch (e) { /* ignore */ }
  };

  if (!data) return <div className="p-6 text-gray-400">Đang tải…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#2b5356] flex items-center gap-2"><CreditCard className="w-6 h-6 text-[#0096b1]" /> Thông tin thanh toán</h2>
        <p className="text-sm text-gray-500 mt-1">Cung cấp <b>ảnh QR</b> hoặc <b>tài khoản ngân hàng</b> để nhận tiền hoa hồng. Khi bạn yêu cầu rút, admin chỉ cần quét QR / chuyển khoản.</p>
        {data.is_set
          ? <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1"><Check className="w-3.5 h-3.5" /> Đã có phương thức nhận tiền</span>
          : <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">Chưa thiết lập — hãy thêm QR hoặc ngân hàng</span>}
      </div>

      {/* QR */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><QrCode className="w-5 h-5 text-[#0096b1]" /> Ảnh QR nhận tiền</h3>
        {data.qr_url ? (
          <div className="flex items-start gap-4">
            <img src={`${API_BASE}${data.qr_url}`} alt="QR" className="w-40 h-40 object-contain rounded-lg border border-gray-200 bg-white" />
            <div className="space-y-2">
              <button onClick={() => fileRef.current && fileRef.current.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"><Upload className="w-4 h-4" /> Đổi ảnh</button>
              <button onClick={deleteQr} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-500 text-sm hover:bg-red-50"><Trash2 className="w-4 h-4" /> Xoá</button>
            </div>
          </div>
        ) : (
          <button onClick={() => fileRef.current && fileRef.current.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#0096b1] hover:text-[#0096b1]">
            <Upload className="w-5 h-5" /> Tải ảnh QR lên
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { uploadQr(e.target.files && e.target.files[0]); e.target.value = ''; }} />
      </div>

      {/* Bank */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Building2 className="w-5 h-5 text-[#0096b1]" /> Tài khoản ngân hàng</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input placeholder="Ngân hàng" value={bank} onChange={e => setBank(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          <input placeholder="Số tài khoản" value={accNo} onChange={e => setAccNo(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          <input placeholder="Chủ tài khoản" value={accHolder} onChange={e => setAccHolder(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm" />
        </div>
        <button onClick={saveBank} disabled={saving} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0096b1] text-white text-sm font-medium hover:bg-[#007d93] disabled:opacity-50">
          {saving ? 'Đang lưu…' : 'Lưu thông tin ngân hàng'}
        </button>
      </div>

      {msg && <p className={`text-sm ${msg.type === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>{msg.text}</p>}
    </div>
  );
}
