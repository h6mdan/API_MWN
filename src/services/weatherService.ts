import { Coordinates, WeatherData, CurrentWeather, DailyForecastItem, AirQuality } from '../types';
import { apiLogger } from './apiLogger';

export function getWeatherConditionInfo(code: number, isDay: boolean = true): { description: string; icon: string; category: string } {
  switch (code) {
    case 0:
      return { description: isDay ? 'Sunny & Clear' : 'Clear Sky', icon: isDay ? 'Sun' : 'Moon', category: 'clear' };
    case 1:
      return { description: isDay ? 'Mainly Sunny' : 'Mainly Clear', icon: isDay ? 'SunDim' : 'MoonStar', category: 'clear' };
    case 2:
      return { description: 'Partly Cloudy', icon: 'CloudSun', category: 'cloudy' };
    case 3:
      return { description: 'Overcast', icon: 'Cloud', category: 'cloudy' };
    case 45:
    case 48:
      return { description: 'Foggy & Mist', icon: 'CloudFog', category: 'fog' };
    case 51:
    case 53:
    case 55:
      return { description: 'Light Drizzle', icon: 'CloudDrizzle', category: 'rain' };
    case 56:
    case 57:
      return { description: 'Freezing Drizzle', icon: 'CloudSnow', category: 'snow' };
    case 61:
      return { description: 'Slight Rain', icon: 'CloudRain', category: 'rain' };
    case 63:
      return { description: 'Moderate Rain', icon: 'CloudRain', category: 'rain' };
    case 65:
      return { description: 'Heavy Rain', icon: 'CloudRainWind', category: 'rain' };
    case 66:
    case 67:
      return { description: 'Freezing Rain', icon: 'CloudSnow', category: 'snow' };
    case 71:
      return { description: 'Slight Snowfall', icon: 'Snowflake', category: 'snow' };
    case 73:
      return { description: 'Moderate Snowfall', icon: 'Snowflake', category: 'snow' };
    case 75:
      return { description: 'Heavy Snowfall', icon: 'Snowflake', category: 'snow' };
    case 77:
      return { description: 'Snow Grains', icon: 'Snowflake', category: 'snow' };
    case 80:
    case 81:
    case 82:
      return { description: 'Rain Showers', icon: 'CloudRain', category: 'rain' };
    case 85:
    case 86:
      return { description: 'Snow Showers', icon: 'Snowflake', category: 'snow' };
    case 95:
      return { description: 'Thunderstorm', icon: 'CloudLightning', category: 'storm' };
    case 96:
    case 99:
      return { description: 'Thunderstorm & Hail', icon: 'CloudLightning', category: 'storm' };
    default:
      return { description: 'Clear', icon: 'Sun', category: 'clear' };
  }
}

export async function fetchWeatherData(coords: Coordinates, locationName: string): Promise<WeatherData> {
  const startTime = performance.now();
  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  
  weatherUrl.searchParams.set('latitude', coords.lat.toFixed(4));
  weatherUrl.searchParams.set('longitude', coords.lng.toFixed(4));
  weatherUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index');
  weatherUrl.searchParams.set('hourly', 'temperature_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m');
  weatherUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max');
  weatherUrl.searchParams.set('timezone', 'auto');
  weatherUrl.searchParams.set('forecast_days', '7');

  const logId = apiLogger.logStart({
    apiName: 'Open-Meteo Weather',
    endpoint: weatherUrl.toString(),
    method: 'GET',
    requestParams: {
      latitude: coords.lat.toFixed(4),
      longitude: coords.lng.toFixed(4),
      timezone: 'auto',
      forecast_days: 7,
    },
    documentationUrl: 'https://open-meteo.com/en/docs',
    purpose: `Fetch real-time weather & 7-day forecast for ${locationName}`,
  });

  try {
    const res = await fetch(weatherUrl.toString());
    const duration = Math.round(performance.now() - startTime);

    if (!res.ok) {
      throw new Error(`Open-Meteo responded with HTTP ${res.status}`);
    }

    const data = await res.json();
    apiLogger.logComplete(logId, res.status, duration, {
      current: data.current,
      daily_units: data.daily_units,
      timezone: data.timezone,
    });

    // Also fetch Air Quality in parallel
    const airQuality = await fetchAirQuality(coords);

    const currentRaw = data.current;
    const condInfo = getWeatherConditionInfo(currentRaw.weather_code, currentRaw.is_day === 1);

    const current: CurrentWeather = {
      temperature: currentRaw.temperature_2m,
      apparentTemperature: currentRaw.apparent_temperature,
      humidity: currentRaw.relative_humidity_2m,
      precipitation: currentRaw.precipitation,
      weatherCode: currentRaw.weather_code,
      weatherDescription: condInfo.description,
      isDay: currentRaw.is_day === 1,
      windSpeed: currentRaw.wind_speed_10m,
      windDirection: currentRaw.wind_direction_10m,
      windGusts: currentRaw.wind_gusts_10m,
      cloudCover: currentRaw.cloud_cover,
      pressure: currentRaw.pressure_msl,
      uvIndex: currentRaw.uv_index,
      time: currentRaw.time,
    };

    // Format daily forecast items
    const dailyItems: DailyForecastItem[] = [];
    if (data.daily && data.daily.time) {
      for (let i = 0; i < data.daily.time.length; i++) {
        const dCode = data.daily.weather_code[i];
        dailyItems.push({
          date: data.daily.time[i],
          weatherCode: dCode,
          weatherDescription: getWeatherConditionInfo(dCode, true).description,
          tempMax: data.daily.temperature_2m_max[i],
          tempMin: data.daily.temperature_2m_min[i],
          precipitationSum: data.daily.precipitation_sum?.[i] || 0,
          precipitationProbabilityMax: data.daily.precipitation_probability_max?.[i] || 0,
          uvIndexMax: data.daily.uv_index_max?.[i] || 0,
          sunrise: data.daily.sunrise[i],
          sunset: data.daily.sunset[i],
          windSpeedMax: data.daily.wind_speed_10m_max[i],
        });
      }
    }

    return {
      coordinates: coords,
      locationName,
      current,
      hourly: {
        time: data.hourly?.time?.slice(0, 24) || [],
        temperature: data.hourly?.temperature_2m?.slice(0, 24) || [],
        weatherCode: data.hourly?.weather_code?.slice(0, 24) || [],
        precipitationProbability: data.hourly?.precipitation_probability?.slice(0, 24) || [],
        precipitation: data.hourly?.precipitation?.slice(0, 24) || [],
        windSpeed: data.hourly?.wind_speed_10m?.slice(0, 24) || [],
      },
      daily: dailyItems,
      airQuality,
      updatedAt: new Date(),
    };
  } catch (err: any) {
    const duration = Math.round(performance.now() - startTime);
    apiLogger.logError(logId, err.message || 'Failed to fetch weather', duration);
    throw err;
  }
}

async function fetchAirQuality(coords: Coordinates): Promise<AirQuality | undefined> {
  const startTime = performance.now();
  const aqiUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  aqiUrl.searchParams.set('latitude', coords.lat.toFixed(4));
  aqiUrl.searchParams.set('longitude', coords.lng.toFixed(4));
  aqiUrl.searchParams.set('current', 'european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone');

  const logId = apiLogger.logStart({
    apiName: 'Open-Meteo Air Quality',
    endpoint: aqiUrl.toString(),
    method: 'GET',
    requestParams: {
      latitude: coords.lat.toFixed(4),
      longitude: coords.lng.toFixed(4),
    },
    documentationUrl: 'https://open-meteo.com/en/docs/air-quality-api',
    purpose: 'Fetch atmospheric composition and Air Quality Index (AQI)',
  });

  try {
    const res = await fetch(aqiUrl.toString());
    const duration = Math.round(performance.now() - startTime);
    if (!res.ok) {
      apiLogger.logError(logId, `Status ${res.status}`, duration);
      return undefined;
    }
    const data = await res.json();
    apiLogger.logComplete(logId, res.status, duration, data.current);

    const c = data.current || {};
    return {
      europeanAqi: c.european_aqi,
      usAqi: c.us_aqi,
      pm10: c.pm10,
      pm2_5: c.pm2_5,
      carbonMonoxide: c.carbon_monoxide,
      nitrogenDioxide: c.nitrogen_dioxide,
      sulphurDioxide: c.sulphur_dioxide,
      ozone: c.ozone,
    };
  } catch (err: any) {
    const duration = Math.round(performance.now() - startTime);
    apiLogger.logError(logId, err.message || 'AQI fetch error', duration);
    return undefined;
  }
}
