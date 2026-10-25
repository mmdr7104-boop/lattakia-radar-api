export default {
  async fetch(req) {
    const url = new URL(req.url);
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    const radius = url.searchParams.get('radius') || '250';

    if (!lat || !lon) {
      return new Response(JSON.stringify({ error: 'Missing lat/lon' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const sources = [
      `https://api.adsb.lol/v2/point/${lat}/${lon}/${radius}`,
      `https://opendata.adsb.fi/api/v2/point/${lat}/${lon}/${radius}`,
      `https://api.airplanes.live/v2/point/${lat}/${lon}/${radius}`
    ];

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

    return new Response(JSON.stringify({ error: 'All sources failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};
