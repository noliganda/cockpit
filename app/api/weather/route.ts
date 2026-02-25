import { NextResponse } from 'next/server';

// Byron Bay, NSW, Australia
const LAT = -28.6471;
const LNG = 153.6023;

export async function GET() {
  try {
    const [weatherRes, marineRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}` +
        `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index,precipitation` +
        `&daily=uv_index_max,sunrise,sunset` +
        `&timezone=Australia%2FSydney&forecast_days=1`,
        { next: { revalidate: 1800 } }, // cache 30 min
      ),
      fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LNG}` +
        `&hourly=wave_height,wave_direction,swell_wave_height,wave_period` +
        `&timezone=Australia%2FSydney&forecast_days=1`,
        { next: { revalidate: 1800 } },
      ),
    ]);

    if (!weatherRes.ok) throw new Error('Weather API error');
    const weather = await weatherRes.json();
    const marine = marineRes.ok ? await marineRes.json() : null;

    // Get surf for the current hour index
    const hourIndex = new Date().getHours();

    return NextResponse.json({
      temperature: weather.current?.temperature_2m ?? null,
      apparentTemperature: weather.current?.apparent_temperature ?? null,
      weatherCode: weather.current?.weather_code ?? null,
      windSpeed: weather.current?.wind_speed_10m ?? null,
      windDirection: weather.current?.wind_direction_10m ?? null,
      uvIndex: weather.current?.uv_index ?? null,
      precipitation: weather.current?.precipitation ?? null,
      uvIndexMax: weather.daily?.uv_index_max?.[0] ?? null,
      sunrise: weather.daily?.sunrise?.[0] ?? null,
      sunset: weather.daily?.sunset?.[0] ?? null,
      waveHeight: marine?.hourly?.wave_height?.[hourIndex] ?? null,
      swellHeight: marine?.hourly?.swell_wave_height?.[hourIndex] ?? null,
      wavePeriod: marine?.hourly?.wave_period?.[hourIndex] ?? null,
      waveDirection: marine?.hourly?.wave_direction?.[hourIndex] ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
}
