import React from 'react';
import { APPOINTMENT_ROOMS, getRoomColorStyles } from './calendarUtils';
import { t } from '../../utils/translations';

const CalendarRoomLegend: React.FC = () => (
  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4">
    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
      {t.appointments.roomLegend}
    </span>
    {APPOINTMENT_ROOMS.map((room) => {
      const colors = getRoomColorStyles(room);
      return (
        <span key={room} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.dot}`} />
          {room}
        </span>
      );
    })}
  </div>
);

export default CalendarRoomLegend;
