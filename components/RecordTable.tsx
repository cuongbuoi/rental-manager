import React, { useState } from 'react';
import { CalculatedRecord, RentalRecord } from '../types';
import { Trash2, AlertCircle, Tag, RefreshCw, Pencil, CheckCircle, Circle, Zap, Droplet, Home } from 'lucide-react';
import { store } from '../services/store';

interface Props {
  records: CalculatedRecord[];
  onDelete: () => void;
  onEdit: (record: RentalRecord) => void;
  onTogglePaid: (record: RentalRecord) => void;
}

export const RecordTable: React.FC<Props> = ({ records, onDelete, onEdit, onTogglePaid }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bản ghi này? Việc này có thể ảnh hưởng đến tính toán của các tháng sau.')) {
      setIsDeleting(true);
      try {
        await store.deleteRecord(id);
        onDelete();
      } catch (error) {
        alert('Lỗi khi xóa bản ghi');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const formatNumber = (val: number) => 
    new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(val);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Variable to track pricing group changes during render (for both mobile and desktop loops)
  let lastPricingIdTable: string | undefined | 'init' = 'init';
  let lastPricingIdMobile: string | undefined | 'init' = 'init';

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="w-10 h-10 text-gray-400" />
          <span>Chưa có dữ liệu thu tiền. Hãy thêm tháng đầu tiên.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* --- DESKTOP VIEW (TABLE) --- */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-4 border-b border-r border-gray-200 whitespace-nowrap w-24">Trạng thái</th>
                <th className="px-4 py-4 border-b border-r border-gray-200 whitespace-nowrap">Ngày thu</th>
                <th className="px-4 py-4 border-b border-r border-gray-200 text-right w-24">Điện (Số)</th>
                <th className="px-4 py-4 border-b border-r border-gray-200 text-right w-24">Nước (Số)</th>
                <th className="px-4 py-4 border-b border-gray-200 text-left min-w-[300px]">
                  Công thức & Tổng cộng
                  <div className="text-xs font-normal text-gray-500 mt-1">
                    (Mới - Cũ) x Giá + Thuê
                  </div>
                </th>
                <th className="px-4 py-4 border-b border-l border-gray-200 w-16 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => {
                const isElecReset = record.is_electricity_reset;
                const isWaterReset = record.is_water_reset;
                const isPaid = record.is_paid;
                
                const currentPricing = record.applied_pricing;
                const currentId = currentPricing?.id;
                const showHeader = currentId !== lastPricingIdTable;
                if (showHeader) lastPricingIdTable = currentId;

                return (
                  <React.Fragment key={`desktop-${record.id}`}>
                    {showHeader && (
                      <tr className={`border-y ${currentPricing ? 'bg-blue-50/80 border-blue-100' : 'bg-amber-50/80 border-amber-100'}`}>
                        <td colSpan={6} className="px-4 py-2">
                           <PricingHeader pricing={currentPricing} />
                        </td>
                      </tr>
                    )}
                    <tr className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 border-r border-gray-100 text-center align-top">
                        <button 
                          onClick={() => onTogglePaid(record)}
                          className={`flex items-center justify-center w-full h-full transition-all ${isPaid ? 'text-green-600' : 'text-gray-300 hover:text-green-400'}`}
                          title={isPaid ? "Đánh dấu chưa thanh toán" : "Đánh dấu đã thanh toán"}
                        >
                            {isPaid ? (
                                <CheckCircle className="w-6 h-6" />
                            ) : (
                                <Circle className="w-6 h-6" />
                            )}
                        </button>
                      </td>
                      <td className="px-4 py-3 border-r border-gray-100 font-medium text-gray-900 whitespace-nowrap align-top">
                        <div>
                            {formatDate(record.record_date)}
                        </div>
                        {record.note && <div className="text-xs text-gray-400 font-normal mt-1 max-w-[150px] break-words">{record.note}</div>}
                      </td>
                      <td className="px-4 py-3 border-r border-gray-100 text-right font-mono text-slate-700 align-top">
                        <div className="flex flex-col items-end gap-1">
                          <span>{formatNumber(record.electricity_index)}</span>
                          {isElecReset && <ResetBadge />}
                        </div>
                      </td>
                      <td className="px-4 py-3 border-r border-gray-100 text-right font-mono text-slate-700 align-top">
                         <div className="flex flex-col items-end gap-1">
                            <span>{formatNumber(record.water_index)}</span>
                            {isWaterReset && <ResetBadge />}
                         </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {record.applied_pricing ? (
                          <div className="flex justify-between items-start gap-2">
                            <div className="text-xs text-gray-500 break-words">
                              <div className="flex flex-col gap-0.5">
                                <div>
                                  <span className="font-semibold text-gray-600">Điện: </span>
                                  {isElecReset 
                                    ? `(${formatNumber(record.electricity_index)})` 
                                    : `(${formatNumber(record.electricity_index)} - ${formatNumber(record.prev_electricity_index)})`
                                  } x {formatCurrency(record.applied_pricing.electricity_price)}
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-600">Nước: </span>
                                  {isWaterReset
                                    ? `(${formatNumber(record.water_index)})`
                                    : `(${formatNumber(record.water_index)} - ${formatNumber(record.prev_water_index)})`
                                  } x {formatCurrency(record.applied_pricing.water_price)}
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-600">Thuê: </span>
                                  {formatCurrency(record.applied_pricing.base_rent)}
                                </div>
                              </div>
                            </div>
                            <div className={`font-bold text-base ${isPaid ? 'text-green-600' : 'text-gray-900'}`}>
                              {formatCurrency(record.total_amount)}
                            </div>
                          </div>
                        ) : (
                           <div className="text-gray-400 italic text-xs">Chưa có giá áp dụng</div>
                        )}
                      </td>
                      <td className="px-2 py-3 border-l border-gray-100 text-center align-top">
                         <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                            <button onClick={() => onEdit(record)} disabled={isDeleting} className="text-blue-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition-colors">
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(record.id)} disabled={isDeleting} className="text-gray-300 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MOBILE VIEW (CARDS) --- */}
      <div className="md:hidden space-y-4">
        {records.map((record) => {
           const isPaid = record.is_paid;
           const currentPricing = record.applied_pricing;
           const currentId = currentPricing?.id;
           const showHeader = currentId !== lastPricingIdMobile;
           if (showHeader) lastPricingIdMobile = currentId;

           return (
             <React.Fragment key={`mobile-${record.id}`}>
               {showHeader && (
                 <div className={`p-3 rounded-lg text-xs border ${currentPricing ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'} mt-6 mb-2 first:mt-0`}>
                    <PricingHeader pricing={currentPricing} />
                 </div>
               )}
               
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Card Header */}
                  <div className="px-4 py-3 flex justify-between items-center border-b bg-gray-50 border-gray-100">
                    <div className="flex flex-col">
                       <span className="text-sm font-bold text-gray-800">
                         Ngày {formatDate(record.record_date)}
                       </span>
                    </div>
                    <div 
                      onClick={() => onTogglePaid(record)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer select-none transition-colors active:scale-95 bg-white border border-gray-200 text-gray-600 shadow-sm"
                    >
                      {isPaid ? <CheckCircle size={14} className="text-green-600" /> : <Circle size={14} className="text-gray-300" />}
                      <span>{isPaid ? 'ĐÃ THU' : 'CHƯA THU'}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-4">
                    {/* Note */}
                    {record.note && (
                       <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
                          "{record.note}"
                       </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                       {/* Electricity */}
                       <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-2 mb-2 text-slate-700 font-medium text-sm">
                             <Zap size={14} className="text-yellow-500" /> Điện
                          </div>
                          <div className="flex justify-between items-baseline mb-1">
                             <span className="text-xs text-gray-500">CS Mới</span>
                             <span className="font-mono font-bold text-gray-800">{formatNumber(record.electricity_index)}</span>
                          </div>
                          <div className="flex justify-between items-baseline mb-1">
                             <span className="text-xs text-gray-500">Tiêu thụ</span>
                             <span className="font-mono text-gray-800">
                                {record.is_electricity_reset 
                                  ? formatNumber(record.electricity_index) 
                                  : formatNumber(record.electricity_usage)
                                }
                             </span>
                          </div>
                          <div className="border-t border-slate-200 mt-2 pt-1 text-right font-bold text-slate-800 text-sm">
                             {formatCurrency(record.electricity_cost)}
                          </div>
                       </div>

                       {/* Water */}
                       <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-2 mb-2 text-slate-700 font-medium text-sm">
                             <Droplet size={14} className="text-blue-500" /> Nước
                          </div>
                          <div className="flex justify-between items-baseline mb-1">
                             <span className="text-xs text-gray-500">CS Mới</span>
                             <span className="font-mono font-bold text-gray-800">{formatNumber(record.water_index)}</span>
                          </div>
                          <div className="flex justify-between items-baseline mb-1">
                             <span className="text-xs text-gray-500">Tiêu thụ</span>
                             <span className="font-mono text-gray-800">
                                {record.is_water_reset 
                                  ? formatNumber(record.water_index) 
                                  : formatNumber(record.water_usage)
                                }
                             </span>
                          </div>
                          <div className="border-t border-slate-200 mt-2 pt-1 text-right font-bold text-slate-800 text-sm">
                             {formatCurrency(record.water_cost)}
                          </div>
                       </div>
                    </div>

                    {/* Base Rent Row */}
                    {currentPricing && (
                       <div className="flex justify-between items-center px-2 py-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                             <Home size={14} /> Tiền thuê nhà
                          </div>
                          <span className="font-medium text-gray-800">
                             {formatCurrency(currentPricing.base_rent)}
                          </span>
                       </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                     <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-medium uppercase">Tổng cộng</span>
                        <span className={`text-xl font-bold ${isPaid ? 'text-green-600' : 'text-slate-900'}`}>
                           {formatCurrency(record.total_amount)}
                        </span>
                     </div>
                     <div className="flex gap-2">
                        <button 
                           onClick={() => onEdit(record)}
                           className="p-2 bg-white border border-gray-200 rounded-lg text-blue-600 shadow-sm active:bg-gray-50"
                        >
                           <Pencil size={18} />
                        </button>
                        <button 
                           onClick={() => handleDelete(record.id)}
                           className="p-2 bg-white border border-gray-200 rounded-lg text-red-500 shadow-sm active:bg-gray-50"
                        >
                           <Trash2 size={18} />
                        </button>
                     </div>
                  </div>
               </div>
             </React.Fragment>
           );
        })}
      </div>
    </div>
  );
};

// Helper Components
const PricingHeader = ({ pricing }: { pricing: CalculatedRecord['applied_pricing'] }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (!pricing) {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
        <AlertCircle size={14} />
        <span>Chưa có cấu hình giá áp dụng</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-y-1 gap-x-6 text-xs w-full">
      <div className="flex items-center gap-2 font-bold text-blue-800 shrink-0">
        <Tag size={14} className="text-blue-600"/>
        <span>Áp dụng giá từ {formatDate(pricing.effective_date)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-slate-600 font-medium">
          <span className="flex items-center gap-1"><Zap size={10} className="text-yellow-500"/> {formatCurrency(pricing.electricity_price)}</span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="flex items-center gap-1"><Droplet size={10} className="text-blue-500"/> {formatCurrency(pricing.water_price)}</span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="flex items-center gap-1"><Home size={10} className="text-gray-500"/> {formatCurrency(pricing.base_rent)}</span>
      </div>
    </div>
  );
};

const ResetBadge = () => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
    <RefreshCw size={10} /> Reset
  </span>
);