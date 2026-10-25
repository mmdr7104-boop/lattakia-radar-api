export default {
  async fetch(request) {
    // 1. معالجة طلبات CORS التمهيدية (Preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // 2. قراءة البيانات من الرابط
    const url = new URL(request.url);
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    const radius = url.searchParams.get('radius') || '250';

    if (!lat || !lon) {
      return new Response(JSON.stringify({ error: 'Missing lat/lon' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }

    // 3. قائمة المصادر (نفس المصادر التي كنا نستخدمها)
    const sources = [
      `https://api.adsb.lol/v2/point/${lat}/${lon}/${radius}`,
      `https://opendata.adsb.fi/api/v2/point/${lat}/${lon}/${radius}`,
      `https://api.airplanes.live/v2/point/${lat}/${lon}/${radius}`
    ];

    // 4. محاولة جلب البيانات من المصادر
    for (const src of sources) {
      try {
        const res = await fetch(src, {
          headers: { 'User-Agent': 'LattakiaRadar/14.0' }
        });
        if (!res.ok) continue;
        
        const data = await res.json();
        return new Response(JSON.stringify({
          source: src.split('/')[2],
          timestamp: Date.now(),
          ac: data.ac || data.aircraft || []
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 's-maxage=10'
          }
        });
      } catch (e) {
        continue;
      }
    }

    // 5. إذا فشلت كل المصادر
    return new Response(JSON.stringify({ error: 'All sources failed' }), {
      status: 502,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
};
