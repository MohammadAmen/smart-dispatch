export interface SearchTermStat {
  query: string;
  hits: number;
  inCatalog: boolean;
}

export interface OfferSuggestion {
  productId: string;
  name: string;
  imageUrl: string | null;
  price: number;
  cartAdds: number;
  purchases: number;
  suggestedDiscount: number;
}

export interface RevenuePoint {
  label: string;
  gained: number;
  lost: number;
}

export interface ProductProfitRow {
  productId: string;
  name: string;
  revenue: number;
  quantity: number;
  share: number;
}

export interface HourDemandPoint {
  hour: number;
  label: string;
  orders: number;
}

export interface VendorInsightKpis {
  revenue: number;
  revenuePrev: number;
  revenueGrowth: number;
  averageOrder: number;
  aovPrev: number;
  aovGrowth: number;
  completedOrders: number;
  retentionRate: number;
  newCustomerRate: number;
  returningCustomers: number;
  newCustomers: number;
}

export interface VendorInsightsDashboard {
  kpis: VendorInsightKpis;
  searches: SearchTermStat[];
  suggestions: OfferSuggestion[];
  topProducts: ProductProfitRow[];
  peakHours: HourDemandPoint[];
}

export interface VendorReportSummary extends VendorInsightKpis {
  daily: RevenuePoint[];
  weekly: RevenuePoint[];
  platformValue: {
    monthRevenue: number;
    monthOrders: number;
    deliveryFees: number;
  };
}
