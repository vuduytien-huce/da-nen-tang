import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabase';

export function useAnalytics() {
  const queryClient = useQueryClient();

  const getBorrowingHeatmap = () => useQuery({
    queryKey: ['borrowing-heatmap'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branch_borrow_heatmap').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const getRetentionStats = () => useQuery({
    queryKey: ['retention-stats'],
    queryFn: async () => {
      // Mock or RPC call
      return {
        active_members: 124,
        return_rate: 92,
        new_members_this_month: 15,
        avg_borrow_duration: 12
      };
    }
  });

  const getInventoryHealth = () => useQuery({
    queryKey: ['inventory-health'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('generate_library_report', { report_type: 'INVENTORY' });
      if (error) throw error;
      return data || { out_of_stock_count: 0, dead_stock_count: 0 };
    }
  });

  const getPeakHours = () => useQuery({
    queryKey: ['peak-hours'],
    queryFn: async () => {
      // Mock data for now or aggregate from borrow_records
      return Array.from({ length: 12 }, (_, i) => ({
        hour: (i * 2 + 8) % 24,
        count: Math.floor(Math.random() * 50) + 10
      }));
    }
  });

  const getPredictedDemand = () => useQuery({
    queryKey: ['predicted-demand'],
    queryFn: async () => {
      // Mock data based on demand-prediction.tsx expectations
      return {
        predictions: [
          { title: 'Tâm Lý Học Tội Phạm', category: 'Tâm lý', recentBorrows: 45, borrows: 890 },
          { title: 'Kinh Tế Học Cơ Bản', category: 'Kinh tế', recentBorrows: 38, borrows: 750 },
          { title: 'Nhà Giả Kim', category: 'Văn học', recentBorrows: 32, borrows: 1200 }
        ],
        trendingCategories: [
          { name: 'Công nghệ', count: 156 },
          { name: 'Kỹ năng sống', count: 142 },
          { name: 'Tiểu thuyết', count: 98 }
        ],
        recommendations: [
          { 
            id: '1',
            type: 'PURCHASE', 
            suggestion_text: 'Mua thêm 10 cuốn "Tâm Lý Học Tội Phạm" cho chi nhánh Quận 1', 
            confidence_score: 0.95,
            metadata: { borrow_velocity: 'Very High' }
          }
        ]
      };
    }
  });

  const getDeepInsights = () => useQuery({
    queryKey: ['deep_insights'],
    queryFn: async () => {
      // Aggregate stats and demand forecast
      const { data: rawStats, error: statsError } = await supabase.rpc('get_library_stats_v2');
      if (statsError) console.error('Stats RPC Error:', statsError);
      
      const stats = rawStats?.[0]?.get_library_stats_v2 || rawStats || { active_members: 124, overdue_count: 5 };

      const { data: forecastData, error: forecastError } = await supabase
        .from('book_demand_forecast')
        .select('*')
        .order('confidence', { ascending: false })
        .limit(10);
      
      if (forecastError) console.error('Forecast Query Error:', forecastError);

      const demand = (forecastData || []).map((f: any) => ({
        book_title: f.title,
        confidence: f.confidence,
        velocity: f.velocity,
        predicted_growth: f.predicted_growth,
        recommendation: f.recommendation
      }));

      return {
        stats,
        demand: demand.length > 0 ? demand : [
          { book_title: 'Tâm Lý Học Tội Phạm', confidence: 0.89, velocity: 4.5, predicted_growth: 25, recommendation: 'Mua thêm 5 cuốn' },
          { book_title: 'Kinh Tế Học Cơ Bản', confidence: 0.82, velocity: 3.2, predicted_growth: 15, recommendation: 'Luân chuyển từ chi nhánh 2' }
        ]
      };
    }
  });

  return {
    getBorrowingHeatmap,
    getRetentionStats,
    getInventoryHealth,
    getPeakHours,
    getPredictedDemand,
    getDeepInsights
  };
}
