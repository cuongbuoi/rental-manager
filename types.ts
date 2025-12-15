export interface PricingConfig {
  id: string;
  effective_date: string; // ISO Date string YYYY-MM-DD
  electricity_price: number;
  water_price: number;
  base_rent: number;
  created_at?: string;
}

export interface RentalRecord {
  id: string;
  record_date: string; // ISO Date string YYYY-MM-DD
  electricity_index: number;
  water_index: number;
  is_electricity_reset?: boolean;
  is_water_reset?: boolean;
  is_paid?: boolean;
  note?: string;
  created_at?: string;
}

export interface CalculatedRecord extends RentalRecord {
  prev_electricity_index: number;
  prev_water_index: number;
  electricity_usage: number;
  water_usage: number;
  electricity_cost: number;
  water_cost: number;
  total_amount: number;
  applied_pricing: PricingConfig | null;
}