import axios from 'axios';
import { IScheduleArray, Title } from '../types/anime.schedule';


export const IMG_HOST = 'https://anilibria.top';
export const VIDEO_HOST = 'https://cache.libria.fun';

export const $api = axios.create({
  baseURL: 'https://api.anilibria.tv/v3/',
});

export const getSchedule = async () =>{
  const schedule:IScheduleArray = (await $api.get('title/schedule')).data;
  console.log(schedule);
  return schedule;
};

export const getTitle = async (code: string) => {
const title: Title = (await $api.get(`/title?code=${code}&playlist_type=array`)
).data;
return title;
}


