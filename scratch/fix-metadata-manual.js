const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const translations = {
  "Hiểu Về Trái Tim": "Understanding the Heart",
  "Đường Mây Qua Xứ Tuyết": "The Way of the White Clouds",
  "Muôn Kiếp Nhân Sinh 2": "Many Lives, Many Masters 2",
  "Muôn Kiếp Nhân Sinh 3": "Many Lives, Many Masters 3",
  "Hành Trình Của Linh Hồn": "Journey of Souls",
  "Thiền Sư Và Em Bé 5 Tuổi": "The Zen Master and the 5-Year-Old",
  "Học Đi Rồi Học Lại": "Learn and Learn Again"
};

async function run() {
  console.log('Applying manual translations...');
  try {
    for (const [vi_title, en_title] of Object.entries(translations)) {
      const { error } = await supabase
        .from('audiobook_metadata')
        .update({ title_en: en_title })
        .eq('title', vi_title);
        
      if (error) console.error(`Error updating ${vi_title}:`, error.message);
      else console.log(`✅ Updated: ${vi_title} -> ${en_title}`);
    }
  } catch(e) {
      console.error(e);
  }
}

run();
