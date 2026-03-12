export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'holidays';

export interface DaySchedule {
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface OperatingHours {
  sunday?: DaySchedule;
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  holidays?: DaySchedule;
}

export interface LightingHours {
  startTime?: string;
  endTime?: string;
}

const dayOrder: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'holidays'];

// Check if a day's schedule represents a "closed" day
export const isDayClosed = (schedule: DaySchedule): boolean => {
  if (schedule.closed) return true;
  // Check for special case where openTime=00:02 and closeTime=23:58 - this indicates closed
  if (schedule.open === '00:02' && schedule.close === '23:58') return true;
  return false;
};

// Check if hours represent 24/7 operation
export const is24HourSchedule = (hours: OperatingHours): boolean => {
  // If there are no hours at all, it's not 24/7
  const hasAnyHours = Object.values(hours).some(day => day !== undefined);
  if (!hasAnyHours) return false;

  // Check if all days are using the special pattern of 00:02-23:58 which indicates 24/7
  const allDaysHaveSpecialClosedPattern = Object.values(hours).every(day => 
    day && !day.closed && day.open === '00:02' && day.close === '23:58'
  );

  if (allDaysHaveSpecialClosedPattern) return true;

  // Also consider 24/7 if all days are open with hours 00:00-00:00 or similar pattern indicating all day
  // But only if all days exist and have valid hours
  const allDaysOpen = Object.values(hours).every(day => 
    day && !day.closed &&
    ((day.open === '00:00' && day.close === '00:00') || 
     (day.open === '00:00' && day.close === '23:59') || 
     (day.open === '00:00' && day.close === '24:00'))
  );

  return allDaysOpen || allDaysHaveSpecialClosedPattern;
};

// Helper function to create a unique key for each schedule type
export const getScheduleKey = (schedule: DaySchedule | undefined): string => {
  if (!schedule) return 'closed';
  if (isDayClosed(schedule)) return 'closed';
  // If it's the special "open all day" pattern (00:00-00:00)
  if (schedule.open === '00:00' && schedule.close === '00:00') return 'openAllDay';
  return `${schedule.open || '00:00'}-${schedule.close || '00:00'}`;
};

// Function to check if all days have identical schedules
export const areAllDaysIdentical = (hours: OperatingHours): boolean => {
  const scheduleKey = getScheduleKey(hours['sunday']);
  return dayOrder.every(day => {
    const daySchedule = hours[day];
    return getScheduleKey(daySchedule) === scheduleKey;
  });
};

// Function to check if all days except holidays have identical schedules
export const areAllNonHolidayDaysIdentical = (hours: OperatingHours): boolean => {
  const nonHolidayDays: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const scheduleKey = getScheduleKey(hours[nonHolidayDays[0]]);
  return nonHolidayDays.every(day => getScheduleKey(hours[day]) === scheduleKey);
};

// Group days with identical schedules
export const groupDaysWithSameHours = (hours: OperatingHours): { 
  groupedDays: Record<string, DayOfWeek[]>,
  hoursByGroup: Record<string, { openTime: string, closeTime: string, isOpen: boolean }>,
  allDaysIdentical: boolean,
  allNonHolidayDaysIdentical: boolean
} => {
  const scheduleGroups: Record<string, DayOfWeek[]> = {};
  const hoursByGroup: Record<string, { openTime: string, closeTime: string, isOpen: boolean }> = {};
  
  // Check if all days (including weekends and holidays) have identical schedules
  const allDaysIdentical = areAllDaysIdentical(hours);
  
  // Check if all days except holidays have identical schedules
  const allNonHolidayDaysIdentical = areAllNonHolidayDaysIdentical(hours);

  // Special case: if all days have identical hours, group them all together
  if (allDaysIdentical && !is24HourSchedule(hours)) {
    const schedule = hours['sunday'];
    const scheduleKey = getScheduleKey(schedule);
    
    scheduleGroups[scheduleKey] = [...dayOrder];
    
    // If schedule is undefined or closed, mark as closed
    if (!schedule || isDayClosed(schedule)) {
      hoursByGroup[scheduleKey] = {
        openTime: '00:00',
        closeTime: '00:00',
        isOpen: false
      };
    } else {
      hoursByGroup[scheduleKey] = {
        openTime: schedule.open || '00:00',
        closeTime: schedule.close || '00:00',
        isOpen: !isDayClosed(schedule)
      };
    }
    
    return { groupedDays: scheduleGroups, hoursByGroup, allDaysIdentical, allNonHolidayDaysIdentical };
  }
  
  // Special case: if all days except holidays have identical hours
  if (allNonHolidayDaysIdentical && !allDaysIdentical && !is24HourSchedule(hours)) {
    const nonHolidayDays: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const holidaySchedule = hours.holidays;
    
    // Group all non-holiday days together
    const schedule = hours['sunday'];
    const scheduleKey = 'all-week';
    
    scheduleGroups[scheduleKey] = [...nonHolidayDays];
    
    // If schedule is undefined or closed, mark as closed
    if (!schedule || isDayClosed(schedule)) {
      hoursByGroup[scheduleKey] = {
        openTime: '00:00',
        closeTime: '00:00',
        isOpen: false
      };
    } else {
      hoursByGroup[scheduleKey] = {
        openTime: schedule.open || '00:00',
        closeTime: schedule.close || '00:00',
        isOpen: !isDayClosed(schedule)
      };
    }
    
    // Add holidays separately
    const holidayKey = 'holiday-only';
    scheduleGroups[holidayKey] = ['holidays'];
    
    // If holiday schedule is undefined or closed, mark as closed
    if (!holidaySchedule || isDayClosed(holidaySchedule)) {
      hoursByGroup[holidayKey] = {
        openTime: '00:00',
        closeTime: '00:00',
        isOpen: false
      };
    } else {
      hoursByGroup[holidayKey] = {
        openTime: holidaySchedule.open || '00:00',
        closeTime: holidaySchedule.close || '00:00',
        isOpen: !isDayClosed(holidaySchedule)
      };
    }
    
    return { groupedDays: scheduleGroups, hoursByGroup, allDaysIdentical, allNonHolidayDaysIdentical };
  }

  // Handle weekdays (Sunday-Thursday)
  const weekdays: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
  
  // Check if all weekdays have identical schedule
  const areAllWeekdaysIdentical = () => {
    const firstDayScheduleKey = getScheduleKey(hours[weekdays[0]]);
    return weekdays.every(day => getScheduleKey(hours[day]) === firstDayScheduleKey);
  };
  
  // Group weekdays if they all have identical schedules
  if (areAllWeekdaysIdentical()) {
    const schedule = hours[weekdays[0]];
    const scheduleKey = getScheduleKey(schedule);
    
    scheduleGroups[scheduleKey] = [...weekdays];
    
    // If schedule is undefined or closed, mark as closed
    if (!schedule || isDayClosed(schedule)) {
      hoursByGroup[scheduleKey] = {
        openTime: '00:00',
        closeTime: '00:00',
        isOpen: false
      };
    } else {
      hoursByGroup[scheduleKey] = {
        openTime: schedule.open || '00:00',
        closeTime: schedule.close || '00:00',
        isOpen: !isDayClosed(schedule)
      };
    }
  } else {
    // Otherwise, group days individually
    weekdays.forEach(day => {
      const daySchedule = hours[day];
      const scheduleKey = getScheduleKey(daySchedule);
      
      if (!scheduleGroups[scheduleKey]) {
        scheduleGroups[scheduleKey] = []; // Initialize the array
        // If schedule is undefined or closed, mark as closed
        if (!daySchedule || isDayClosed(daySchedule)) {
          hoursByGroup[scheduleKey] = {
            openTime: '00:00',
            closeTime: '00:00',
            isOpen: false
          };
        } else {
          hoursByGroup[scheduleKey] = {
            openTime: daySchedule.open || '00:00',
            closeTime: daySchedule.close || '00:00',
            isOpen: !isDayClosed(daySchedule)
          };
        }
      }
      
      scheduleGroups[scheduleKey].push(day);
    });
  }

  // Always handle Friday separately from Sun-Thu
  const fridaySchedule = hours.friday;
  const fridayKey = getScheduleKey(fridaySchedule);
  
  scheduleGroups[`friday-${fridayKey}`] = ['friday'];
  
  // If schedule is undefined or closed, mark as closed
  if (!fridaySchedule || isDayClosed(fridaySchedule)) {
    hoursByGroup[`friday-${fridayKey}`] = {
      openTime: '00:00',
      closeTime: '00:00',
      isOpen: false
    };
  } else {
    hoursByGroup[`friday-${fridayKey}`] = {
      openTime: fridaySchedule.open || '00:00',
      closeTime: fridaySchedule.close || '00:00',
      isOpen: !isDayClosed(fridaySchedule)
    };
  }

  // Handle Saturday and holidays together
  const satSchedule = hours.saturday;
  const holidaySchedule = hours.holidays;
  const satKey = getScheduleKey(satSchedule);
  const holidayKey = getScheduleKey(holidaySchedule);
  
  // Check if Saturday and holidays have the same schedule
  if (satKey === holidayKey) {
    scheduleGroups[`weekend-${satKey}`] = ['saturday', 'holidays'];
    
    // If schedule is undefined or closed, mark as closed
    if (!satSchedule || isDayClosed(satSchedule)) {
      hoursByGroup[`weekend-${satKey}`] = {
        openTime: '00:00',
        closeTime: '00:00',
        isOpen: false
      };
    } else {
      hoursByGroup[`weekend-${satKey}`] = {
        openTime: satSchedule.open || '00:00',
        closeTime: satSchedule.close || '00:00',
        isOpen: !isDayClosed(satSchedule)
      };
    }
  } else {
    // Handle them separately
    if (satSchedule) {
      scheduleGroups[`saturday-${satKey}`] = ['saturday'];
      if (isDayClosed(satSchedule)) {
        hoursByGroup[`saturday-${satKey}`] = {
          openTime: '00:00',
          closeTime: '00:00',
          isOpen: false
        };
      } else {
        hoursByGroup[`saturday-${satKey}`] = {
          openTime: satSchedule.open || '00:00',
          closeTime: satSchedule.close || '00:00',
          isOpen: !isDayClosed(satSchedule)
        };
      }
    } else {
      // Saturday has no schedule, mark as closed
      scheduleGroups[`saturday-closed`] = ['saturday'];
      hoursByGroup[`saturday-closed`] = {
        openTime: '00:00',
        closeTime: '00:00',
        isOpen: false
      };
    }
    
    if (holidaySchedule) {
      scheduleGroups[`holiday-${holidayKey}`] = ['holidays'];
      if (isDayClosed(holidaySchedule)) {
        hoursByGroup[`holiday-${holidayKey}`] = {
          openTime: '00:00',
          closeTime: '00:00',
          isOpen: false
        };
      } else {
        hoursByGroup[`holiday-${holidayKey}`] = {
          openTime: holidaySchedule.open || '00:00',
          closeTime: holidaySchedule.close || '00:00',
          isOpen: !isDayClosed(holidaySchedule)
        };
      }
    } else {
      // Holidays have no schedule, mark as closed
      scheduleGroups[`holiday-closed`] = ['holidays'];
      hoursByGroup[`holiday-closed`] = {
        openTime: '00:00',
        closeTime: '00:00',
        isOpen: false
      };
    }
  }

  return { groupedDays: scheduleGroups, hoursByGroup, allDaysIdentical, allNonHolidayDaysIdentical };
};

// Format a group of days for display
export const formatDayRanges = (days: DayOfWeek[], locale: string = 'en'): string => {
  // Day names translations
  const dayNames: Record<string, { en: string; he: string; short: { en: string; he: string } }> = {
    sunday: { en: 'Sunday', he: 'יום ראשון', short: { en: 'Sun', he: 'א\'' } },
    monday: { en: 'Monday', he: 'יום שני', short: { en: 'Mon', he: 'ב\'' } },
    tuesday: { en: 'Tuesday', he: 'יום שלישי', short: { en: 'Tue', he: 'ג\'' } },
    wednesday: { en: 'Wednesday', he: 'יום רביעי', short: { en: 'Wed', he: 'ד\'' } },
    thursday: { en: 'Thursday', he: 'יום חמישי', short: { en: 'Thu', he: 'ה\'' } },
    friday: { en: 'Friday', he: 'יום שישי', short: { en: 'Fri', he: 'ו\'' } },
    saturday: { en: 'Saturday', he: 'שבתות', short: { en: 'Sat', he: 'ש\'' } },
    holidays: { en: 'Holidays', he: 'חגים', short: { en: 'Holidays', he: 'חגים' } },
  };

  // Hebrew ordinal names without the "יום" prefix, for use with the "ימי" prefix
  const hebrewOrdinals: Partial<Record<DayOfWeek, string>> = {
    sunday: 'ראשון',
    monday: 'שני',
    tuesday: 'שלישי',
    wednesday: 'רביעי',
    thursday: 'חמישי',
    friday: 'שישי',
  };

  const translations: Record<string, { en: string; he: string }> = {
    allWeek: { en: 'All Week', he: 'כל השבוע' },
    days: { en: '', he: 'ימי ' },
    to: { en: 'to', he: '–' },
    satAndHolidays: { en: 'Saturday and Holidays', he: 'שבת וחגים' },
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) return key;
    // Check if locale exists (including empty string), otherwise fall back to English, then key
    if (locale in translation) {
      return translation[locale as 'en' | 'he'];
    }
    if ('en' in translation) {
      return translation.en;
    }
    return key;
  };

  // Check if all days of the week including holidays are in the array
  if (days.length === dayOrder.length) {
    return t('allWeek');
  }

  // Special case for Saturday and Holidays
  if (days.length === 2 && days.includes('saturday') && days.includes('holidays')) {
    return t('satAndHolidays');
  }

  // Sort days according to the day order
  const sortedDays = days.sort((a, b) => 
    dayOrder.indexOf(a) - dayOrder.indexOf(b)
  );

  // If it's just one day
  if (sortedDays.length === 1) {
    const dayKey = sortedDays[0];

    // Hebrew: use "ימי" + ordinal without the "יום" prefix (e.g., "ימי ראשון")
    if (locale === 'he') {
      if (dayKey === 'saturday' || dayKey === 'holidays') {
        return dayNames[dayKey]?.he || dayKey;
      }
      const daysPrefix = t('days');
      const ordinal = hebrewOrdinals[dayKey];
      const baseName =
        ordinal ||
        dayNames[dayKey]?.he.replace(/^יום\s*/, '') ||
        dayNames[dayKey]?.he ||
        dayKey;
      // For Hebrew we already have a trailing space in the prefix
      return daysPrefix ? `${daysPrefix}${baseName}` : baseName;
    }

    // Non-Hebrew locales
    const dayInfo = dayNames[dayKey];
    const dayName = dayInfo ? (dayInfo[locale as 'en' | 'he'] || dayInfo.en || dayKey) : dayKey;

    // Don't add "days" prefix for Saturday and Holidays
    if (dayKey === 'saturday' || dayKey === 'holidays') {
      return dayName;
    }
    const daysPrefix = t('days');
    return daysPrefix ? `${daysPrefix} ${dayName}` : dayName;
  }

  // Check if days are consecutive
  const isConsecutive = sortedDays.every((day, index, array) => {
    if (index === 0) return true;
    const prevDayIndex = dayOrder.indexOf(array[index-1]);
    const currentDayIndex = dayOrder.indexOf(day);
    return currentDayIndex - prevDayIndex === 1;
  });

  if (isConsecutive) {
    const daysPrefix = t('days');
    // Get first and last day with special handling for Friday
    const firstDayKey = sortedDays[0];
    let firstDay: string;
    if (firstDayKey === 'friday') {
      // For Friday with days prefix in Hebrew, use "שישי" instead of "ו"
      firstDay = (daysPrefix && locale === 'he') 
        ? 'שישי'
        : (dayNames['friday'].short[locale as 'en' | 'he'] || dayNames['friday'].short.en);
    } else {
      firstDay = dayNames[firstDayKey]?.short[locale as 'en' | 'he'] || dayNames[firstDayKey]?.short.en || firstDayKey;
    }
    
    const lastDayKey = sortedDays[sortedDays.length-1];
    let lastDay: string;
    if (lastDayKey === 'friday') {
      // For Friday with days prefix in Hebrew, use "שישי" instead of "ו"
      lastDay = (daysPrefix && locale === 'he') 
        ? 'שישי'
        : (dayNames['friday'].short[locale as 'en' | 'he'] || dayNames['friday'].short.en);
    } else {
      lastDay = dayNames[lastDayKey]?.short[locale as 'en' | 'he'] || dayNames[lastDayKey]?.short.en || lastDayKey;
    }
    
    // For Hebrew, no spaces between days and separator; for English, keep spaces
    if (locale === 'he') {
      return daysPrefix ? `${daysPrefix}${firstDay}${t('to')}${lastDay}` : `${firstDay}${t('to')}${lastDay}`;
    }
    return daysPrefix ? `${daysPrefix} ${firstDay} ${t('to')} ${lastDay}` : `${firstDay} ${t('to')} ${lastDay}`;
  }

  // Not consecutive, list them all with special handling for Hebrew
  const daysPrefix = t('days');
  const formattedDays = sortedDays.map(day => {
    // Hebrew: strip the "יום" prefix and use ordinals where available
    if (locale === 'he') {
      if (day === 'saturday' || day === 'holidays') {
        return dayNames[day]?.he || day;
      }
      const ordinal = hebrewOrdinals[day];
      if (ordinal) {
        return ordinal;
      }
      const heName = dayNames[day]?.he;
      if (heName) {
        return heName.replace(/^יום\s*/, '');
      }
      return day;
    }

    const dayInfo = dayNames[day];
    if (dayInfo) {
      return dayInfo[locale as 'en' | 'he'] || dayInfo.en || day;
    }
    return day;
  }).join(', ');
  
  if (locale === 'he') {
    // Prefix already contains trailing space for Hebrew
    return daysPrefix ? `${daysPrefix}${formattedDays}` : formattedDays;
  }
  return daysPrefix ? `${daysPrefix} ${formattedDays}` : formattedDays;
};

// Format time range based on locale
// For Hebrew (RTL): endTime - startTime
// For English (LTR): startTime - endTime
export const formatTimeRange = (startTime: string, endTime: string, locale: string = 'en'): string => {
  if (locale === 'he') {
    return `${endTime} - ${startTime}`;
  }
  return `${startTime} - ${endTime}`;
};

// Format lighting hours with special handling for sunset
// lightingUntil is a string representing the time until which lighting is available (e.g., "22:00" or "sunset")
// Always shows "From sunset until [time]" format if time is provided, otherwise "No lighting"
// Never shows "Until [time]" format
export const formatLightingHours = (lightingUntil: string | undefined, locale: string = 'en'): string => {
  const translations = {
    fromSunsetTill: { en: 'From sunset until', he: 'משקיעה עד' },
    noLighting: { en: 'No lighting', he: 'ללא תאורה' },
  };

  const t = (key: keyof typeof translations): string => {
    const translation = translations[key];
    if (!translation) return key;
    return (translation[locale as 'en' | 'he'] || translation.en) as string;
  };

  // If no lightingUntil provided, show "No lighting"
  if (!lightingUntil) {
    return t('noLighting');
  }

  // Extract time if it's in the string (e.g., "sunset 22:00" or just "22:00")
  // Time format should be HH:MM (e.g., "22:00", "23:30")
  const timeMatch = lightingUntil.match(/(\d{2}:\d{2})/);
  if (timeMatch) {
    return `${t('fromSunsetTill')} ${timeMatch[1]}`;
  }
  
  // If lightingUntil exists but no valid time format found, show "No lighting"
  return t('noLighting');
};

