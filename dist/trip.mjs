export function dateValue(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Choose a valid date.');
  const date = new Date(value + 'T12:00:00Z');
  if (!Number.isFinite(+date) || date.toISOString().slice(0,10) !== value) throw new Error('Choose a valid date.');
  return +date;
}
// Only records created before editable departure dates need the legacy fallback.
export function tripEnd(trip) {
  return trip.end ?? (trip.start ? new Date(dateValue(trip.start) + 3*86400000).toISOString().slice(0,10) : '');
}
export function tripDays(start, end) {
  const first = dateValue(start), last = dateValue(end);
  if (last < first) throw new Error('Departure must be on or after arrival.');
  return Array.from({length: Math.round((last-first)/86400000)+1}, (_,i)=>new Date(first+i*86400000).toISOString().slice(0,10));
}
export function allMealSlots(start,end) {
  return tripDays(start,end).flatMap(date=>['Breakfast','Lunch','Dinner'].map(meal=>({id:date+'-'+meal,date,meal})));
}
export function mealSlots(start,end,records=[]) {
  const days=tripDays(start,end);
  return allMealSlots(start,end).filter(slot=>{
    const record=records.find(r=>r.slot===slot.id);
    if (record?.included !== undefined) return record.included;
    if (record?.family || record?.menu) return true;
    return slot.date===start ? slot.meal==='Dinner' : slot.date!==days[days.length-1];
  });
}
export const sizes = [
  "Youth XS",
  "Youth S",
  "Youth M",
  "Youth L",
  "Youth XL",
  "Adult XS",
  "Adult S",
  "Adult M",
  "Adult L",
  "Adult XL",
  "Adult 2XL",
  "Adult 3XL",
  "Adult 4XL",
  "Adult 5XL",
];
export function shirtTotals(people) {
  return people.reduce((totals, p) => {
    if (sizes.includes(p.size)) totals[p.size] = (totals[p.size] || 0) + 1;
    return totals;
  }, {});
}
