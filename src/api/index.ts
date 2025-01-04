import axios from 'axios';

export const IMG_HOST = 'https://static-libria.weekstorm.us';
export const VIDEO_HOST = 'https://cache.libria.fun';

export const $api = axios.create({
  baseURL: 'https://api.anilibria.tv/v3/',
});
