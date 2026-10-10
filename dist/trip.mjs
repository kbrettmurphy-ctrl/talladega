export function tripDays(friday) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(friday)) throw new Error('Choose a Friday for arrival.');
  const start = new Date(friday + 'T12:00:00Z');
  if (!Number.isFinite(+start) || start.toISOString().slice(0,10) !== friday || start.getUTCDay() !== 5) throw new Error('Arrival must be a Friday.');
  return Array.from({length:4},(_,i)=>new Date(+start+i*86400000).toISOString().slice(0,10));
}
export function mealSlots(friday) {
  return tripDays(friday).flatMap((date,i)=>(i===0?['Dinner']:i===3?[]:['Breakfast','Lunch','Dinner']).map(meal=>({id:date+'-'+meal,date,meal})));
}
export const sizes=['Youth XS','Youth S','Youth M','Youth L','Youth XL','Adult XS','Adult S','Adult M','Adult L','Adult XL','Adult 2XL','Adult 3XL','Adult 4XL','Adult 5XL'];
export function shirtTotals(people) {
  return people.reduce((totals,p)=>{if(sizes.includes(p.size)) totals[p.size]=(totals[p.size]||0)+1;return totals;},{});
}
export function fridays(year) {
  const day=new Date(Date.UTC(year,0,1,12));
  day.setUTCDate(1+(5-day.getUTCDay()+7)%7);
  const out=[];
  while(day.getUTCFullYear()===year){out.push(day.toISOString().slice(0,10));day.setUTCDate(day.getUTCDate()+7);}
  return out;
}
