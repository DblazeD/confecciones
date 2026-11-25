const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 2 });
export const money = (value: number) => currency.format(value);

const localDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
});

export function today() {
  return localDate.format(new Date());
}

export function deadlineClass(dueDate: string, currentDate: string) {
  const days = (Date.parse(dueDate) - Date.parse(currentDate)) / 86_400_000;
  if (days < 0) return "Vencido";
  if (days <= 3) return "Próximo a vencer";
  return "";
}

export function mediaUrl(path: string) {
  return "/media/" + encodeURIComponent(path);
}

export function whatsappLink(phone: string, message: string) {
  return phone ? "https://wa.me/" + phone + "?text=" + encodeURIComponent(message) : null;
}

export function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
