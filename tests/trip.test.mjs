import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tripDays,mealSlots,shirtTotals,fridays} from '../dist/trip.mjs';
test('Friday to Monday crosses month and year boundaries',()=>assert.deepEqual(tripDays('2027-12-31'),['2027-12-31','2028-01-01','2028-01-02','2028-01-03']));
test('exactly seven meals with none Monday',()=>{const slots=mealSlots('2026-10-09');assert.equal(slots.length,7);assert.equal(slots[0].meal,'Dinner');assert.equal(slots.filter(s=>s.date==='2026-10-10').length,3);assert.equal(slots.filter(s=>s.date==='2026-10-11').length,3);assert.equal(slots.filter(s=>s.date==='2026-10-12').length,0);});
test('invalid dates and non-Friday dates are rejected',()=>{for(const date of ['','2026-10-10','2026-02-30'])assert.throws(()=>tripDays(date));});
test('shirt counts omit missing sizes',()=>assert.deepEqual(shirtTotals([{size:'Adult L'},{size:'Adult L'},{size:''},{size:'Youth S'}]),{'Adult L':2,'Youth S':1}));
test('every Friday of the year, and only Fridays',()=>{const list=fridays(2026);assert.equal(list.length,52);assert.equal(list[0],'2026-01-02');assert.equal(list.at(-1),'2026-12-25');for(const d of list)assert.doesNotThrow(()=>tripDays(d));assert.equal(fridays(2027)[0],'2027-01-01');});
