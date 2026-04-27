import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { isbn } = await req.json()
    const GOOGLE_BOOKS_API_KEY = Deno.env.get("GOOGLE_BOOKS_API_KEY")
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!isbn) throw new Error("ISBN is required")
    const cleanIsbn = isbn.replace(/[- ]/g, "");

    // 1. Fetch from Google Books (Primary for metadata)
    const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}${GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : ''}`)
    const googleData = await googleRes.json()
    const googleItem = googleData.items?.[0]?.volumeInfo;

    // 2. Fetch from Open Library (Primary for cover)
    const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);
    const olData = await olRes.json();
    const olItem = olData[`ISBN:${cleanIsbn}`];

    if (!googleItem && !olItem) {
      return new Response(JSON.stringify({ error: "Book not found in any provider" }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Logic: Use Open Library cover if available, otherwise Google's
    const coverUrl = olItem?.cover?.large || olItem?.cover?.medium || googleItem?.imageLinks?.thumbnail || googleItem?.imageLinks?.smallThumbnail;
    
    // Upsert into Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const { error } = await supabase
      .from('books')
      .upsert({
        isbn: cleanIsbn,
        title: googleItem?.title || olItem?.title || 'Untitled',
        author: googleItem?.authors?.join(', ') || olItem?.authors?.[0]?.name || 'Unknown',
        cover_url: coverUrl,
        category: googleItem?.categories?.[0] || 'Uncategorized',
        google_data: {
          ...googleItem,
          ol_cover_source: !!olItem?.cover
        }
      })
    
    if (error) throw error
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: { 
        title: googleItem?.title || olItem?.title,
        author: googleItem?.authors?.join(', ') || olItem?.authors?.[0]?.name || 'Unknown',
        cover_url: coverUrl
      } 
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

