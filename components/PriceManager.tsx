import React, { useState } from 'react';
import { PricingConfig } from '../types';
import { store } from '../services/store';
import { Plus, Trash2, DollarSign, Calendar, Zap, Droplet, Home, Pencil, Loader2 } from 'lucide-react';

interface Props {
  configs: PricingConfig[];
  onUpdate: () => void;
}

export const PriceManager: React.FC<Props> = ({ configs, onUpdate }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Omit<PricingConfig, 'id'>>({
    effective_date: new Date().toISOString().split('T')[0],
    electricity_price: 4500,
    water_price: 15000,
    base_rent: 3500000,
  });

  const resetForm = () => {
    setFormData({
      effective_date: new Date().toISOString().split('T')[0],
      electricity_price: 4500,
      water_price: 15000,
      base_rent: 3500000,
    });
    setEditingId(null);
  };

  const handleAddNew = () => {
    // Check if we are currently in "Add New" mode (Form open AND no editing ID)
    if (isFormOpen && editingId === null) {
      setIsFormOpen(false);
      resetForm();
    } else {
      // Either form is closed, OR we are in editing mode.
      // Switch to Add New mode.
      resetForm();
      setIsFormOpen(true);
    }
  };

  const handleEdit = (config: PricingConfig) => {
    setFormData({
      effective_date: config.effective_date,
      electricity_price: config.electricity_price,
      water_price: config.water_price,
      base_rent: config.base_rent,
    });
    setEditingId(config.id);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await store.updatePricingConfig(editingId, formData);
      } else {
        await store.addPricingConfig(formData);
      }
      setIsFormOpen(false);
      resetForm();
      onUpdate();
    } catch (error) {
      alert('Lỗi khi lưu cấu hình giá');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cấu hình giá này?')) {
      setIsSubmitting(true);
      try {
        await store.deletePricingConfig(id);
        onUpdate();
      } catch (error) {
        alert('Lỗi khi xóa');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-600" />
          <span className="hidden sm:inline">Cấu hình đơn giá</span>
          <span className="sm:hidden">Đơn giá</span>
        </h2>
        <button
          onClick={handleAddNew}
          disabled={isSubmitting}
          className={`${isFormOpen && editingId === null ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'} text-white px-3 py-2 sm:px-4 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 shadow-sm`}
        >
          <Plus className={`w-4 h-4 ${isFormOpen && editingId === null ? 'rotate-45' : ''} transition-transform`} />
          {isFormOpen && editingId === null ? 'Hủy' : 'Thêm mới'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-200 animate-fade-in relative">
          <div className="absolute top-4 right-4 text-[10px] sm:text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded">
             {editingId ? 'ĐANG SỬA' : 'THÊM MỚI'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày áp dụng</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  required
                  disabled={isSubmitting}
                  className="pl-10 w-full rounded-lg border-gray-300 border p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white disabled:bg-gray-100"
                  value={formData.effective_date}
                  onChange={e => setFormData({ ...formData, effective_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giá điện / kWh</label>
              <div className="relative">
                <Zap className="absolute left-3 top-2.5 h-5 w-5 text-yellow-500" />
                <input
                  type="number"
                  required
                  min="0"
                  step="100"
                  disabled={isSubmitting}
                  className="pl-10 w-full rounded-lg border-gray-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
                  value={formData.electricity_price}
                  onChange={e => setFormData({ ...formData, electricity_price: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giá nước / m3</label>
              <div className="relative">
                <Droplet className="absolute left-3 top-2.5 h-5 w-5 text-blue-500" />
                <input
                  type="number"
                  required
                  min="0"
                  step="100"
                  disabled={isSubmitting}
                  className="pl-10 w-full rounded-lg border-gray-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
                  value={formData.water_price}
                  onChange={e => setFormData({ ...formData, water_price: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiền thuê cơ bản</label>
              <div className="relative">
                <Home className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  disabled={isSubmitting}
                  className="pl-10 w-full rounded-lg border-gray-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100"
                  value={formData.base_rent}
                  onChange={e => setFormData({ ...formData, base_rent: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => { setIsFormOpen(false); resetForm(); }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:bg-green-400 flex items-center gap-2 text-sm"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? 'Cập Nhật' : 'Lưu'}
            </button>
          </div>
        </form>
      )}

      {/* --- DESKTOP VIEW (TABLE) --- */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
              <tr>
                <th className="px-6 py-4">Ngày áp dụng</th>
                <th className="px-6 py-4 text-right">Giá Điện (VNĐ)</th>
                <th className="px-6 py-4 text-right">Giá Nước (VNĐ)</th>
                <th className="px-6 py-4 text-right">Tiền Thuê (VNĐ)</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {configs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                    Chưa có cấu hình giá nào. Hãy thêm giá mới.
                  </td>
                </tr>
              ) : (
                configs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatDate(config.effective_date)}
                    </td>
                    <td className="px-6 py-4 text-right">{formatCurrency(config.electricity_price)}</td>
                    <td className="px-6 py-4 text-right">{formatCurrency(config.water_price)}</td>
                    <td className="px-6 py-4 text-right">{formatCurrency(config.base_rent)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => handleEdit(config)}
                            disabled={isSubmitting}
                            className="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-50 transition-colors disabled:opacity-30"
                            title="Sửa"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleDelete(config.id)}
                            disabled={isSubmitting}
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors disabled:opacity-30"
                            title="Xóa"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MOBILE VIEW (CARDS) --- */}
      <div className="md:hidden space-y-4">
        {configs.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-200">
            <div className="flex flex-col items-center gap-2">
               <DollarSign className="w-10 h-10 text-gray-300" />
               <span>Chưa có cấu hình giá nào.</span>
            </div>
          </div>
        ) : (
          configs.map((config) => (
            <div key={config.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                     <Calendar className="w-4 h-4 text-gray-500" />
                     <span className="font-semibold text-gray-900">
                        {formatDate(config.effective_date)}
                     </span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => handleEdit(config)} disabled={isSubmitting} className="p-2 text-blue-600 bg-white rounded-lg border border-gray-200 shadow-sm active:bg-blue-50">
                        <Pencil size={16} />
                     </button>
                     <button onClick={() => handleDelete(config.id)} disabled={isSubmitting} className="p-2 text-red-500 bg-white rounded-lg border border-gray-200 shadow-sm active:bg-red-50">
                        <Trash2 size={16} />
                     </button>
                  </div>
               </div>
               <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                     <span className="flex items-center gap-2 text-sm text-gray-600">
                        <Zap size={16} className="text-yellow-500" /> Giá điện
                     </span>
                     <span className="font-medium text-slate-800">{formatCurrency(config.electricity_price)} / kWh</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="flex items-center gap-2 text-sm text-gray-600">
                        <Droplet size={16} className="text-blue-500" /> Giá nước
                     </span>
                     <span className="font-medium text-slate-800">{formatCurrency(config.water_price)} / m³</span>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                     <span className="flex items-center gap-2 text-sm text-gray-600">
                        <Home size={16} className="text-gray-500" /> Tiền thuê
                     </span>
                     <span className="font-bold text-blue-600 text-lg">{formatCurrency(config.base_rent)}</span>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};