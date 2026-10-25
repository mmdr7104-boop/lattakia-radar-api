export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { lat, lon, radius } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing lat/lon parameters' });
  }

  const dist = Math.min(parseInt(radius) || 250, 250);
  const sources = [
    { name: 'adsb.lol', url: `https://api.adsb.lol/v2/point/${lat}/${lon}/${dist}` },
    { name: 'adsb.fi', url: `https://opendata.adsb.fi/api/v2/point/${lat}/${lon}/${dist}` },
    { name: 'airplanes.live', url: `https://api.airplanes.live/v2/point/${lat}/${lon}/${dist}` }
  ];

  for (const src of sources) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(src.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LattakiaRadar/14.0',
          'Accept': 'application/json',
        },
      });
      clearTimeout(timeout);

      if (!response.ok) continue;
      const data = await response.json();
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5');
      return res.status(200).json({
        source: src.name,
        timestamp: Date.now(),
        ac: data.ac || data.aircraft || [],
      });
    } catch (err) {
      continue;
    }
  }
  return res.status(502).json({ error: 'All upstream sources failed' });
}
