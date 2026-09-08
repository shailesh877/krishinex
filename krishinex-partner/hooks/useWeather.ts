import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WEATHER_CACHE_KEY = 'krishinex_weather_cache';
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export function useWeather() {
  const [weatherCity, setWeatherCity] = useState('');
  const [weatherTemp, setWeatherTemp] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number>(0);
  const [weatherHumidity, setWeatherHumidity] = useState<number | null>(null);
  const [weatherRain, setWeatherRain] = useState<number | null>(null);
  const [weatherWind, setWeatherWind] = useState<number | null>(null);
  const [weatherFeels, setWeatherFeels] = useState<number | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const setWeatherData = (data: any) => {
    if (data.city) setWeatherCity(data.city);
    if (data.temp !== undefined) setWeatherTemp(data.temp);
    if (data.code !== undefined) setWeatherCode(data.code);
    if (data.humidity !== undefined) setWeatherHumidity(data.humidity);
    if (data.rain !== undefined) setWeatherRain(data.rain);
    if (data.wind !== undefined) setWeatherWind(data.wind);
    if (data.feels !== undefined) setWeatherFeels(data.feels);
  };

  const loadCachedAndFetch = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setWeatherData(parsed);
        setWeatherLoading(false); // Hide loading since we have cached data
        
        // If cache is still fresh (less than 1 hour old), do nothing more
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
          return;
        }
      }
    } catch (e) {
      console.warn('Weather cache error:', e);
    }
    
    // Fetch silently in background
    await fetchWeather(true);
  }, []);

  useEffect(() => {
    loadCachedAndFetch();
  }, [loadCachedAndFetch]);

  const fetchWeather = async (silent = false) => {
    if (!silent) setWeatherLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setWeatherLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      let city = weatherCity;
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo && geo.length > 0) {
          const g = geo[0];
          const foundCity = g.city || g.subregion || g.region || '';
          const region = g.region || '';
          city = [foundCity, region].filter(Boolean).join(', ');
          setWeatherCity(city);
        }
      } catch (geoErr) {
        console.warn('[Weather] Geocode failed:', geoErr);
      }

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&hourly=precipitation_probability&wind_speed_unit=kmh&timezone=auto`
      );
      const contentType = weatherRes.headers.get('content-type') || '';
      if (!weatherRes.ok || !contentType.includes('application/json')) {
        return;
      }
      const weatherData = await weatherRes.json();
      const c = weatherData.current;
      const prob = weatherData.hourly?.precipitation_probability?.[0] || 0;

      if (c) {
        const temp = c.temperature_2m !== undefined ? Math.round(c.temperature_2m) : null;
        const feels = c.apparent_temperature !== undefined ? Math.round(c.apparent_temperature) : null;
        const humidity = c.relative_humidity_2m !== undefined ? c.relative_humidity_2m : null;
        const rain = prob !== undefined ? prob : null;
        const wind = c.wind_speed_10m !== undefined ? Math.round(c.wind_speed_10m) : null;
        const code = c.weather_code !== undefined ? c.weather_code : 0;

        const newData = { city, temp, feels, humidity, rain, wind, code, timestamp: Date.now() };
        setWeatherData(newData);
        await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(newData));
      }
    } catch (e) {
      console.error('Weather fetch error:', e);
    } finally {
      if (!silent) setWeatherLoading(false);
    }
  };

  return {
    weatherCity,
    weatherTemp,
    weatherCode,
    weatherHumidity,
    weatherRain,
    weatherWind,
    weatherFeels,
    weatherLoading,
    fetchWeather
  };
}
