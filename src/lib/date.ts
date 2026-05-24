const IST = "Asia/Kolkata";

export function formatDate(date: Date | string | number): string {
  return new Date(date).toLocaleDateString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(date: Date | string | number): string {
  return new Date(date).toLocaleDateString("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateYear2(date: Date | string | number): string {
  return new Date(date).toLocaleDateString("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export function formatDateTime(date: Date | string | number): string {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: IST,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDateTimeShort(date: Date | string | number): string {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: IST,
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatDateTimeFull(date: Date | string | number): string {
  return new Date(date).toLocaleString("en-IN", { timeZone: IST });
}

export function formatDateLong(date: Date | string | number): string {
  return new Date(date).toLocaleDateString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateMedium(date: Date | string | number): string {
  return new Date(date).toLocaleDateString("en-IN", {
    timeZone: IST,
    dateStyle: "medium",
  });
}
