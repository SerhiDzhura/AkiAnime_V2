import { useEffect, useState } from "react";
import { getSchedule } from "../../api";
import { IScheduleArray } from "../../types/anime.schedule";
import { AnimeCard } from "../../components/AnimeCard/AnimeCard";

export const AnimeSchedulePage = () => {
  const [schedule, setSchedule] = useState<IScheduleArray>([]);
  const createSchedule = async () => {
   
    try {
      const timeoutSchedule = await getSchedule();
      const sortedSchedule = timeoutSchedule.sort((a, b) => a.day - b.day);
      const correctedSchedule = sortedSchedule.map((daySchedule, index) => ({
        ...daySchedule,
        day: index + 1, 
      }));

      setSchedule(correctedSchedule);
    } catch (error) {
      console.error("Error fetching schedule:", error);
      setSchedule([{ day: 1, list: [] }]);
    }
  };

  useEffect(() => {
    createSchedule();
  }, []);

  return (
    <>
      <div className="container py-[20px]">
        <div>
          {schedule.map((daySchedule, index) => (
            <div key={index} className="py-5">
              <h1 className="text-center font-bold text-3xl">
                {
                  [
                    "Понедельник",
                    "Вторник",
                    "Среда",
                    "Четверг",
                    "Пятница",
                    "Суббота",
                    "Воскресенье",
                  ][daySchedule.day - 1]
                }
              </h1>
              <div className="grid grid-cols-3 gap-5 mt-5">
                {daySchedule.list.map((title) => (
                  <AnimeCard
                    key={title.id}
                    code={title.code}
                    image={title.posters.original.url}
                    title={title.names.ru}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
