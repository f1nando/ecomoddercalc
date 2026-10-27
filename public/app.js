import { DEFAULTS, PROFILES, RULES, parseSpeeds, validate, calculate, csv } from './calc.js';
import { PRESETS } from './presets.js';
const $ = id => document.getElementById(id), form = $('calculator');
const n = (value, digits = 3) => value === null ? '—' : value.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
let snapshot = null, busy = false;
for (const preset of PRESETS) {
  const option = new Option(`${preset.id}. ${preset.name}`, String(preset.id));
  $('preset').add(option);
}
$('preset').add(new Option('Свои параметры', 'custom'));
$('preset').value = '13';
function invalidate() {
  snapshot = null; $('csv').disabled = true; $('print').disabled = true;
  $('run-summary').textContent = 'Параметры изменены — нажмите «Рассчитать».';
  $('rows').replaceChildren(); $('chart').replaceChildren(); $('cda').textContent = '—'; $('max-power').textContent = '—'; $('run-inputs').textContent = '';
}
form.addEventListener('input', event => {
  if (['mass','cd','area','efficiency'].includes(event.target.name)) $('preset').value = 'custom';
  invalidate();
});
$('preset').addEventListener('change', () => {
  const preset = PRESETS.find(p => String(p.id) === $('preset').value);
  if (preset) for (const key of ['mass','cd','area','efficiency']) form.elements.namedItem(key).value = preset[key];
  invalidate();
});
$('profile').addEventListener('change', () => {
  form.elements.namedItem('rho').value = PROFILES[$('profile').value].rho;
  invalidate();
});
const NS = 'http://www.w3.org/2000/svg';
function svgElement(name, attributes = {}, text) {
  const el = document.createElementNS(NS, name);
  for (const [key,value] of Object.entries(attributes)) el.setAttribute(key, String(value));
  if (text !== undefined) el.textContent = text;
  return el;
}
function draw(parameters, maxSpeed) {
  const chart = $('chart'); chart.replaceChildren();
  const xmax = Math.max(1, maxSpeed);
  const points = Array.from({ length: 101 }, (_, i) => calculate(xmax * i / 100, parameters));
  const ymax = Math.max(1, ...points.map(p => p.engineKW)) * 1.08;
  const X = value => 62 + value / xmax * 665, Y = value => 305 - value / ymax * 265;
  chart.append(svgElement('title', {}, 'Механическая мощность в зависимости от скорости'));
  for (let i=0;i<=5;i++) {
    const y = ymax*i/5, x = xmax*i/5;
    chart.append(svgElement('line', { x1:62, x2:727, y1:Y(y), y2:Y(y), stroke:'#e0e6e1' }));
    chart.append(svgElement('text', { x:53, y:Y(y)+4, 'text-anchor':'end' }, n(y, ymax<10?1:0)));
    chart.append(svgElement('text', { x:X(x), y:327, 'text-anchor':'middle' }, n(x, xmax<10?1:0)));
  }
  chart.append(svgElement('path', { d:'M62 40V305H727', fill:'none', stroke:'#aebcb2' }));
  chart.append(svgElement('text', { x:62, y:23 }, 'кВт'));
  chart.append(svgElement('text', { x:727, y:352, 'text-anchor':'end' }, 'км/ч'));
  for (const [field, color] of [['engineKW','#087b39'],['wheelKW','#376fba']]) {
    chart.append(svgElement('polyline', { points:points.map(p=>`${X(p.speed)},${Y(p[field])}`).join(' '), fill:'none', stroke:color, 'stroke-width':2.5, 'stroke-dasharray':field==='wheelKW'?'7 4':'none' }));
  }
}
function readParameters() {
  const values = { ...DEFAULTS, g:PROFILES[$('profile').value].g };
  for (const key of Object.keys(RULES)) {
    if (key === 'g') continue;
    const el = form.elements.namedItem(key);
    if (!el.value.trim()) throw new RangeError('Заполните все числовые поля.');
    values[key] = Number(el.value);
  }
  return validate(values);
}
function render() {
  const parameters = readParameters(), speeds = parseSpeeds($('speeds').value);
  const rows = speeds.map(speed => calculate(speed, parameters));
  const preset = $('preset').selectedOptions[0].textContent;
  const profile = PROFILES[$('profile').value].label;
  const body = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const value of [row.speed,row.rollingForce,row.aeroForce,row.gradeForce,row.wheelKW,row.engineKW,row.litresPer100]) {
      const td = document.createElement('td'); td.textContent = n(value); tr.append(td);
    }
    body.append(tr);
  }
  $('rows').replaceChildren(body);
  $('cda').textContent = `${n(parameters.cd*parameters.area)} м²`;
  const max = rows[rows.length-1];
  $('max-label').textContent = `Двигатель при ${n(max.speed, max.speed%1?2:0)} км/ч`;
  $('max-power').textContent = `${n(max.engineKW)} кВт`;
  $('run-summary').textContent = `${preset} · ${profile}`;
  $('run-inputs').textContent = `m = ${n(parameters.mass,0)} кг · f = ${n(parameters.crr,4)} · Cd = ${n(parameters.cd,3)} · A = ${n(parameters.area,3)} м² · ηтр = ${n(parameters.efficiency,2)}% · ρ = ${n(parameters.rho,4)} кг/м³ · g = ${n(parameters.g,5)} м/с² · подъём ${n(parameters.grade,3)}% · ветер ${n(parameters.wind,2)} км/ч · ηдв = ${n(parameters.engineEfficiency,2)}% · топливо ${n(parameters.fuelWh,0)} Вт·ч/US gal · потребители ${n(parameters.auxiliary,0)} Вт`;
  draw(parameters, max.speed);
  snapshot = { rows, profile, preset, parameters };
  $('csv').disabled = false; $('print').disabled = false;
  $('error').hidden = true;
}
form.addEventListener('submit', event => {
  event.preventDefault(); if (busy) return; busy = true;
  try { render(); } catch (error) { invalidate(); $('error').textContent = error.message; $('error').hidden = false; }
  finally { busy = false; }
});
$('csv').addEventListener('click', () => {
  if (!snapshot) return;
  const url = URL.createObjectURL(new Blob([csv(snapshot.rows, snapshot)], {type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = 'ecomoddercalc.csv'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('print').addEventListener('click', () => { if (snapshot) window.print(); });
render();
