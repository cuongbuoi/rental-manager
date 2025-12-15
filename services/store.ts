import { PricingConfig, RentalRecord } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Mock Data for initial view if Supabase isn't set up
const MOCK_PRICING: PricingConfig[] = [
  {
    id: '1',
    effective_date: '2024-01-01',
    electricity_price: 4500,
    water_price: 15000,
    base_rent: 3500000,
  }
];

const MOCK_RECORDS: RentalRecord[] = [
  { id: '1', record_date: '2024-04-15', electricity_index: 2337.6, water_index: 125.4, is_paid: true, note: 'Tháng 4' },
  { id: '2', record_date: '2024-05-15', electricity_index: 2518.5, water_index: 130.3, is_paid: true, note: 'Tháng 5' },
  { id: '3', record_date: '2024-06-15', electricity_index: 2697.0, water_index: 135.5, is_paid: true, note: 'Tháng 6' },
  { id: '4', record_date: '2024-07-15', electricity_index: 2863.8, water_index: 140.5, is_paid: false, note: 'Tháng 7' },
];

class DataStore {
  // --- Pricing Methods ---

  async getPricingConfigs(): Promise<PricingConfig[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('pricing_configs')
        .select('*')
        .order('effective_date', { ascending: false });
      
      if (error) throw error;
      return data as PricingConfig[];
    } else {
      // LocalStorage Fallback
      const stored = localStorage.getItem('rental_pricing');
      return stored ? JSON.parse(stored) : MOCK_PRICING;
    }
  }

  async addPricingConfig(config: Omit<PricingConfig, 'id'>): Promise<PricingConfig> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('pricing_configs')
        .insert([config])
        .select()
        .single();
      
      if (error) throw error;
      return data as PricingConfig;
    } else {
      const newConfig = { ...config, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      const current = await this.getPricingConfigs();
      const updated = [newConfig, ...current].sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());
      localStorage.setItem('rental_pricing', JSON.stringify(updated));
      return newConfig;
    }
  }

  async updatePricingConfig(id: string, config: Partial<PricingConfig>): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('pricing_configs')
        .update(config)
        .eq('id', id);
      if (error) throw error;
    } else {
      const current = await this.getPricingConfigs();
      const updated = current.map(p => p.id === id ? { ...p, ...config } : p)
        .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());
      localStorage.setItem('rental_pricing', JSON.stringify(updated));
    }
  }

  async deletePricingConfig(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('pricing_configs').delete().eq('id', id);
      if (error) throw error;
    } else {
      const current = await this.getPricingConfigs();
      const updated = current.filter(p => p.id !== id);
      localStorage.setItem('rental_pricing', JSON.stringify(updated));
    }
  }

  // --- Record Methods ---

  async getRecords(): Promise<RentalRecord[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('rental_records')
        .select('*')
        .order('record_date', { ascending: true });
      
      if (error) throw error;
      return data as RentalRecord[];
    } else {
      const stored = localStorage.getItem('rental_records');
      return stored ? JSON.parse(stored) : MOCK_RECORDS;
    }
  }

  async addRecord(record: Omit<RentalRecord, 'id'>): Promise<RentalRecord> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('rental_records')
        .insert([record])
        .select()
        .single();
      
      if (error) throw error;
      return data as RentalRecord;
    } else {
      const newRecord = { ...record, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      const current = await this.getRecords();
      // Keep sorted by date
      const updated = [...current, newRecord].sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());
      localStorage.setItem('rental_records', JSON.stringify(updated));
      return newRecord;
    }
  }

  async updateRecord(id: string, updates: Partial<RentalRecord>): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('rental_records')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    } else {
      const current = await this.getRecords();
      const updated = current.map(r => r.id === id ? { ...r, ...updates } : r)
        .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());
      localStorage.setItem('rental_records', JSON.stringify(updated));
    }
  }

  async deleteRecord(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('rental_records').delete().eq('id', id);
      if (error) throw error;
    } else {
      const current = await this.getRecords();
      const updated = current.filter(r => r.id !== id);
      localStorage.setItem('rental_records', JSON.stringify(updated));
    }
  }
}

export const store = new DataStore();