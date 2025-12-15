import React, { useState, useEffect, useMemo } from 'react';
import { store } from './services/store';
import { PricingConfig, RentalRecord, CalculatedRecord } from './types';
import { PriceManager } from './components/PriceManager';
import { RecordTable } from './components/RecordTable';
import { LayoutDashboard, History, Plus, Settings, TrendingUp, RefreshCw, Loader2, Wallet, Zap, Droplet, Home, Calendar, CheckCircle } from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase';

function App() {
  const [activeTab, setActiveTab] = useState<'records' | 'settings'>('records');
  const [configs, setConfigs] = useState<PricingConfig[]>([]);
  const [records, setRecords] = useState<RentalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for new/edit record
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  
  const [newRecordData, setNewRecordData] = useState({
    record_date: new Date().toISOString().split('T')[0],
    electricity_index: '',
    water_index: '',
    is_electricity_reset: false,
    is_water_reset: false,
    note: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [pricingData, recordsData] = await Promise.all([
        store.getPricingConfigs(),
        store.getRecords()
      ]);
      setConfigs(pricingData);
      setRecords(recordsData);
    } catch (err) {
      console.error(err);
      alert('Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Calculation Logic
  const calculatedRecords: CalculatedRecord[] = useMemo(() => {
    const sortedRecords = [...records].sort((a, b) => 
      new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
    );

    return sortedRecords.map((record, index) => {
      // Find previous record for usage calculation
      const prevRecord = index > 0 ? sortedRecords[index - 1] : null;
      
      // Find applicable pricing: closest effective_date that is <= record_date
      const recordDate = new Date(record.record_date);
      // Configs are already sorted desc by effective_date in the store get method, 
      // but let's re-sort to be safe: Descending date.
      const sortedConfigs = [...configs].sort((a, b) => 
        new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
      );
      
      const appliedPricing = sortedConfigs.find(c => new Date(c.effective_date) <= recordDate) || null;

      const prevElec = prevRecord?.electricity_index || 0;
      const prevWater = prevRecord?.water_index || 0;
      
      // Calculate Usage
      // If reset is flagged, usage is the current index (assuming meter started at 0 or this is a fresh start)
      // Otherwise: current - prev
      const elecUsage = record.is_electricity_reset 
        ? record.electricity_index 
        : (prevRecord ? Math.max(0, record.electricity_index - prevElec) : 0);

      const waterUsage = record.is_water_reset
        ? record.water_index
        : (prevRecord ? Math.max(0, record.water_index - prevWater) : 0);

      let total = 0;
      let eleCost = 0;
      let waterCost = 0;

      // We calculate cost if we have pricing AND (we have a previous record OR it is a reset record)
      // If it's the very first record and NOT a reset, usage is 0, cost is just base rent.
      const canCalculateUsage = prevRecord || record.is_electricity_reset || record.is_water_reset;

      if (appliedPricing) {
        eleCost = elecUsage * appliedPricing.electricity_price;
        waterCost = waterUsage * appliedPricing.water_price;
        total = eleCost + waterCost + appliedPricing.base_rent;
      }

      return {
        ...record,
        prev_electricity_index: prevElec,
        prev_water_index: prevWater,
        electricity_usage: elecUsage,
        water_usage: waterUsage,
        electricity_cost: eleCost,
        water_cost: waterCost,
        total_amount: total,
        applied_pricing: appliedPricing
      };
    });
  }, [records, configs]);

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const recordPayload = {
        record_date: newRecordData.record_date,
        electricity_index: Number(newRecordData.electricity_index),
        water_index: Number(newRecordData.water_index),
        is_electricity_reset: newRecordData.is_electricity_reset,
        is_water_reset: newRecordData.is_water_reset,
        note: newRecordData.note
      };

      if (editingRecordId) {
        await store.updateRecord(editingRecordId, recordPayload);
      } else {
        await store.addRecord(recordPayload);
      }

      setIsAddModalOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      alert('Lỗi khi lưu bản ghi');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePaid = async (record: RentalRecord) => {
    const newStatus = !record.is_paid;
    
    // Optimistic Update: Update local state immediately to avoid table reload
    setRecords(prevRecords => 
      prevRecords.map(r => 
        r.id === record.id ? { ...r, is_paid: newStatus } : r
      )
    );

    try {
      await store.updateRecord(record.id, { is_paid: newStatus });
    } catch (err) {
      console.error(err);
      alert('Không cập nhật được trạng thái');
      // Revert if API fails
      setRecords(prevRecords => 
        prevRecords.map(r => 
          r.id === record.id ? { ...r, is_paid: !newStatus } : r
        )
      );
    }
  };

  const resetForm = () => {
    setNewRecordData({
      record_date: new Date().toISOString().split('T')[0],
      electricity_index: '',
      water_index: '',
      is_electricity_reset: false,
      is_water_reset: false,
      note: ''
    });
    setEditingRecordId(null);
  }

  const handleEditRecord = (record: RentalRecord) => {
    setNewRecordData({
        record_date: record.record_date,
        electricity_index: String(record.electricity_index),
        water_index: String(record.water_index),
        is_electricity_reset: record.is_electricity_reset || false,
        is_water_reset: record.is_water_reset || false,
        note: record.note || ''
    });
    setEditingRecordId(record.id);
    setIsAddModalOpen(true);
  }

  const handleOpenAddModal = () => {
      resetForm();
      if (records.length > 0) {
        autofillFromLatest();
      }
      setIsAddModalOpen(true);
  }

  const getLatestRecord = () => {
    if (records.length === 0) return null;
    return [...records].sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime())[0];
  };

  const autofillFromLatest = () => {
    const latest = getLatestRecord();
    if (latest) {
      // Suggest next month
      const nextDate = new Date(latest.record_date);
      nextDate.setMonth(nextDate.getMonth() + 1);
      
      setNewRecordData(prev => ({
        ...prev,
        record_date: nextDate.toISOString().split('T')[0],
        // Default indices to previous values (user just updates the difference usually)
        electricity_index: String(latest.electricity_index),
        water_index: String(latest.water_index),
        is_electricity_reset: false,
        is_water_reset: false,
      }));
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <TrendingUp size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">
              Quản Lý Tiền Cho Thuê Nhà
            </h1>
            <h1 className="text-lg font-bold tracking-tight text-slate-800 sm:hidden whitespace-nowrap">
              QL Trọ
            </h1>
          </div>
          
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
            <button
              onClick={() => setActiveTab('records')}
              className={`px-3 py-2 sm:px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'records'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <History size={16} />
                <span className="hidden sm:inline">Lịch sử thu tiền</span>
                <span className="sm:hidden">Lịch sử</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-2 sm:px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings size={16} />
                <span className="hidden sm:inline">Cấu hình giá</span>
                <span className="sm:hidden">Cấu hình</span>
              </div>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full relative pb-24 sm:pb-8">
        {!isSupabaseConfigured && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-md shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <Settings className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Chế độ Demo: Dữ liệu đang được lưu cục bộ (LocalStorage). Để đồng bộ hóa, hãy cấu hình Supabase trong mã nguồn (<code>.env</code> hoặc <code>lib/supabase.ts</code>).
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'records' && (
              <div className="space-y-6">
                {/* Prominent Latest Bill Summary */}
                {calculatedRecords.length > 0 && (() => {
                  const latest = calculatedRecords[calculatedRecords.length - 1];
                  const isPaid = latest.is_paid;
                  
                  return (
                    <div className={`rounded-2xl p-6 text-white shadow-lg relative overflow-hidden animate-fade-in-up transition-all duration-500 ${
                      isPaid 
                        ? 'bg-gradient-to-br from-green-600 to-emerald-700' 
                        : 'bg-gradient-to-br from-blue-600 to-indigo-700'
                    }`}>
                       {/* Background decoration */}
                       <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                       <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                       
                       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 gap-4">
                         <div>
                           <div className="flex items-center gap-2 mb-2">
                              <span className={`${isPaid ? 'bg-green-500/30 text-green-50 border-green-400/30' : 'bg-blue-500/30 text-blue-100 border-blue-400/30'} text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1`}>
                                <Calendar className="w-3 h-3"/>
                                Ngày: {formatDate(latest.record_date)}
                              </span>
                              <span className={`${isPaid ? 'text-green-100' : 'text-blue-200'} text-sm font-medium uppercase tracking-wider`}>
                                {isPaid ? 'Đã Thanh Toán' : 'Cần Thanh Toán'}
                              </span>
                           </div>
                           <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
                             {formatCurrency(latest.total_amount)}
                           </h2>
                         </div>
                         <div className="flex items-center gap-4">
                             {!isPaid && (
                                 <button 
                                    onClick={() => handleTogglePaid(latest)}
                                    className="bg-white text-blue-700 px-4 py-2 rounded-full font-bold shadow-sm hover:bg-blue-50 transition-colors text-sm flex items-center gap-2"
                                 >
                                    <CheckCircle size={16} />
                                    Xác nhận đã thu
                                 </button>
                             )}
                             {isPaid && (
                                <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                                    <CheckCircle className="w-8 h-8 text-white" />
                                </div>
                             )}
                             {!isPaid && (
                                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/10 hidden sm:block">
                                   <Wallet className="w-8 h-8 text-blue-100" />
                                </div>
                             )}
                         </div>
                       </div>
                       
                       {/* Breakdown */}
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mt-6 pt-6 border-t border-white/10">
                          <div className="flex items-center gap-3">
                             <div className="bg-white/10 p-2 rounded-lg">
                               <Home className={`w-5 h-5 ${isPaid ? 'text-green-200' : 'text-blue-200'}`} />
                             </div>
                             <div>
                               <p className={`text-xs ${isPaid ? 'text-green-200' : 'text-blue-200'} font-medium`}>Tiền thuê</p>
                               <p className="text-lg font-semibold">{latest.applied_pricing ? formatCurrency(latest.applied_pricing.base_rent) : '---'}</p>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                             <div className={`${isPaid ? 'bg-yellow-500/30' : 'bg-yellow-500/20'} p-2 rounded-lg`}>
                               <Zap className="w-5 h-5 text-yellow-200" />
                             </div>
                             <div>
                               <p className={`text-xs ${isPaid ? 'text-green-200' : 'text-blue-200'} font-medium`}>Tiền điện ({latest.electricity_usage.toLocaleString('vi-VN')} kWh)</p>
                               <p className="text-lg font-semibold">{formatCurrency(latest.electricity_cost)}</p>
                             </div>
                          </div>

                          <div className="flex items-center gap-3">
                             <div className={`${isPaid ? 'bg-cyan-500/30' : 'bg-cyan-500/20'} p-2 rounded-lg`}>
                               <Droplet className="w-5 h-5 text-cyan-200" />
                             </div>
                             <div>
                               <p className={`text-xs ${isPaid ? 'text-green-200' : 'text-blue-200'} font-medium`}>Tiền nước ({latest.water_usage.toLocaleString('vi-VN')} m³)</p>
                               <p className="text-lg font-semibold">{formatCurrency(latest.water_cost)}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                  );
                })()}

                <RecordTable 
                  records={calculatedRecords} 
                  onDelete={loadData} 
                  onEdit={handleEditRecord}
                  onTogglePaid={handleTogglePaid}
                />
              </div>
            )}

            {activeTab === 'settings' && (
              <PriceManager 
                configs={configs} 
                onUpdate={loadData} 
              />
            )}
          </>
        )}
      </main>

      {/* Floating Action Button - Moved to Left */}
      {activeTab === 'records' && (
         <button
            onClick={handleOpenAddModal}
            className="fixed bottom-6 left-6 bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all z-40 flex items-center justify-center transform hover:scale-105 active:scale-95"
            title="Ghi điện nước tháng này"
            aria-label="Thêm bản ghi mới"
            disabled={loading}
          >
            <Plus size={28} />
          </button>
      )}

      {/* Add Record Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">
                {editingRecordId ? 'Chỉnh sửa bản ghi' : 'Ghi sổ tháng mới'}
              </h3>
              <button 
                onClick={() => !isSubmitting && setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                disabled={isSubmitting}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveRecord} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày chốt số</label>
                <input
                  type="date"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white disabled:bg-gray-100 disabled:text-gray-500"
                  value={newRecordData.record_date}
                  onChange={e => setNewRecordData({ ...newRecordData, record_date: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Electricity Section */}
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Điện</label>
                    <div className="flex items-center gap-1">
                       <input 
                        type="checkbox" 
                        id="elecReset"
                        disabled={isSubmitting}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 bg-white"
                        checked={newRecordData.is_electricity_reset}
                        onChange={e => setNewRecordData({...newRecordData, is_electricity_reset: e.target.checked})}
                       />
                       <label htmlFor="elecReset" className="text-xs text-gray-500 cursor-pointer select-none flex items-center gap-1">
                         <RefreshCw size={10} /> Reset
                       </label>
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    required
                    disabled={isSubmitting}
                    placeholder="VD: 2518.5"
                    className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
                    value={newRecordData.electricity_index}
                    onChange={e => setNewRecordData({ ...newRecordData, electricity_index: e.target.value })}
                  />
                  {newRecordData.is_electricity_reset && (
                    <div className="text-xs text-yellow-700 mt-1 italic">
                      *Đã reset đồng hồ. Tính từ 0.
                    </div>
                  )}
                </div>

                {/* Water Section */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Nước</label>
                    <div className="flex items-center gap-1">
                       <input 
                        type="checkbox" 
                        id="waterReset"
                        disabled={isSubmitting}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300 bg-white"
                        checked={newRecordData.is_water_reset}
                        onChange={e => setNewRecordData({...newRecordData, is_water_reset: e.target.checked})}
                       />
                       <label htmlFor="waterReset" className="text-xs text-gray-500 cursor-pointer select-none flex items-center gap-1">
                         <RefreshCw size={10} /> Reset
                       </label>
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    required
                    disabled={isSubmitting}
                    placeholder="VD: 130.3"
                    className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
                    value={newRecordData.water_index}
                    onChange={e => setNewRecordData({ ...newRecordData, water_index: e.target.value })}
                  />
                   {newRecordData.is_water_reset && (
                    <div className="text-xs text-blue-700 mt-1 italic">
                      *Đã reset đồng hồ. Tính từ 0.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (Tùy chọn)</label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder="VD: Tháng 5/2024, Thay đồng hồ điện..."
                  className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
                  value={newRecordData.note}
                  onChange={e => setNewRecordData({ ...newRecordData, note: e.target.value })}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingRecordId ? 'Cập nhật' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;